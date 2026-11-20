const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const { parseBoxNumber } = require('../utils/boxNumber');
const digitalBoxService = require('../services/digitalBoxService');
const legacyBoxLinkService = require('../services/legacyBoxLinkService');
const { parseDocumentDataUrl } = require('../utils/documentUpload');
const settingsService = require('../services/settingsService');
const { PLACEHOLDER_LICENCE } = require('../utils/riderClearance');

// Rider endpoints are restricted to riders and operations staff.
router.use(authenticate, requireRoles('rider', 'ops_admin'));

// A rider account is created at signup, but it must clear regulatory review
// before it can operate. Staff keep full access. `GET /riders/me` stays open so
// the console can show the rider their own verification state.
const requireVerifiedRider = async (req, res, next) => {
  if (req.user.role !== 'rider') return next();
  try {
    const result = await db.query('SELECT status FROM riders WHERE user_id = $1', [req.user.id]);
    const status = result.rows.length ? result.rows[0].status : 'unknown';
    if (status !== 'verified') {
      return res.status(403).json({
        error: 'Your rider account has not been verified yet.',
        status,
        reason: 'Rider accounts can only operate after regulatory verification is approved.'
      });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Could not confirm rider verification status.' });
  }
};

// GET /api/v1/riders/lookup (Resolve any posted identifier to a delivery address)
router.get('/lookup', requireVerifiedRider, async (req, res) => {
  const rawInput = String(req.query.code || '').trim();
  if (!rawInput) {
    return res.status(400).json({ error: 'A postcode or digital P.O. Box number is required.' });
  }

  const input = rawInput.toUpperCase();
  const boxNumber = parseBoxNumber(rawInput);

  const userColumns = `
    u.id, u.name, u.phone, u.postcode,
    b.box_number, b.is_ground_truth_verified,
    pc.neighbourhood, pc.lga, pc.state`;

  const postcodeJoin = `
    LEFT JOIN LATERAL (
      SELECT neighbourhood, lga, state FROM postcode_cache
      WHERE postcode = u.postcode OR ndaps_code = u.postcode OR legacy_code = u.postcode
      LIMIT 1
    ) pc ON TRUE`;

  try {
    let userRows = [];
    let inputType = 'POSTCODE';

    if (boxNumber) {
      inputType = 'DIGITAL_P_O_BOX';
      const boxRes = await db.query(
        `SELECT ${userColumns}
         FROM digital_boxes b
         JOIN users u ON u.id = b.user_id
         ${postcodeJoin}
         WHERE b.box_number = $1
         LIMIT 1`,
        [boxNumber]
      );
      userRows = boxRes.rows;
    } else {
      // An old P.O. Box number resolves only when NIPOST has approved the link.
      const legacyState = await legacyBoxLinkService.findLegacyLinkState(rawInput);
      if (legacyState.state === 'PENDING') {
        return res.json({
          input,
          inputType: 'LEGACY_P_O_BOX',
          matched: false,
          pendingVerification: true,
          reason: 'This old P.O. Box number is under verification and cannot be used for delivery yet.',
          postcodeValid: false,
          hierarchy: null,
          residents: [],
          relocatedMatches: []
        });
      }
      if (legacyState.state === 'APPROVED' && legacyState.box) {
        inputType = 'LEGACY_P_O_BOX';
        const legacyRes = await db.query(
          `SELECT ${userColumns}
           FROM users u
           LEFT JOIN digital_boxes b ON b.user_id = u.id
           ${postcodeJoin}
           WHERE u.id = $1
           LIMIT 1`,
          [legacyState.box.user_id]
        );
        userRows = legacyRes.rows;
      } else {
        const postcodeRes = await db.query(
          `SELECT ${userColumns}
           FROM users u
           LEFT JOIN digital_boxes b ON b.user_id = u.id
           ${postcodeJoin}
           WHERE u.postcode = $1 OR replace(u.postcode, '-', '') = replace($1, '-', '')`,
          [input]
        );
        userRows = postcodeRes.rows;
      }
    }

    const pcRes = await db.query(
      `SELECT * FROM postcode_cache
       WHERE postcode = $1 OR ndaps_code = $1 OR legacy_code = $1 OR replace(postcode, '-', '') = replace($1, '-', '')
       LIMIT 1`,
      [input]
    );
    const pc = pcRes.rows[0] || null;

    const residents = userRows.map((user) => {
      const district = user.neighbourhood || (pc && pc.neighbourhood) || 'Wuse 2';
      const lga = user.lga || (pc && pc.lga) || 'Abuja Municipal';
      const state = user.state || (pc && pc.state) || 'Federal Capital Territory';
      const isGroundTruthVerified = Boolean(user.is_ground_truth_verified);

      return {
        name: user.name,
        phone: user.phone,
        digitalBoxNumber: user.box_number,
        proofOfAddressStatus: isGroundTruthVerified ? 'Ground-Truth Verified' : 'Registry Verified',
        isGroundTruthVerified,
        deliveryAddress: {
          postcode: user.postcode,
          neighbourhood: district,
          lga,
          state,
          fullAddress: `${district}, ${lga}, ${state}`
        },
        relocation: {
          status: 'ACTIVE_RESIDENT',
          forwardingPostcode: null,
          forwardingAddress: null,
          forwardingRule: null
        }
      };
    });

    const relocatedMatches = [];
    if (!boxNumber) {
      const relocatedRes = await db.query(
        `SELECT r.old_postcode, r.old_address, r.new_postcode, r.new_address,
                u.name, b.box_number
         FROM relocations r
         JOIN digital_boxes b ON b.id = r.box_id
         JOIN users u ON u.id = b.user_id
         WHERE r.old_postcode = $1 OR replace(r.old_postcode, '-', '') = replace($1, '-', '')`,
        [input]
      );
      for (const row of relocatedRes.rows) {
        relocatedMatches.push({
          name: row.name,
          digitalBoxNumber: row.box_number,
          forwardingPostcode: row.new_postcode,
          forwardingAddress: row.new_address,
          forwardingRule: 'ACTIVE_AUTO_FORWARD'
        });
      }
    }

    res.json({
      input,
      inputType,
      matched: residents.length > 0,
      reason: residents.length > 0 ? null : 'No registered resident found for this code.',
      postcodeValid: Boolean(pc),
      hierarchy: pc ? { district: pc.neighbourhood, lga: pc.lga, state: pc.state } : null,
      residents,
      relocatedMatches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/riders/radar/jobs (Active jobs within rider operational zone)
router.get('/radar/jobs', requireVerifiedRider, async (req, res) => {
  try {
    // Find active jobs waiting for pickup or in-transit
    const result = await db.query(`
      SELECT 
        s.*,
        h.business_name as destination_hub_name,
        h.address_text as destination_hub_address,
        h.postcode as destination_hub_postcode,
        oh.business_name as origin_hub_name,
        oh.address_text as origin_hub_address,
        oh.postcode as origin_hub_postcode,
        (s.pricing_total_ngn * 0.35) as potential_earning_ngn
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      LEFT JOIN hubs oh ON s.origin_hub_id = oh.id
      WHERE s.status IN ('BOOKED', 'RIDER_ASSIGNED')
      ORDER BY s.created_at DESC
      LIMIT 30
    `);

    res.json({ jobs: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delivery jobs: ' + err.message });
  }
});

// POST /api/v1/riders/jobs/:id/accept
router.post('/jobs/:id/accept', requireVerifiedRider, async (req, res) => {
  const shipmentId = req.params.id;
  try {
    // Find rider id linked to authenticated user
    const riderRes = await db.query('SELECT id, status FROM riders WHERE user_id = $1', [req.user.id]);
    const riderId = riderRes.rows.length > 0 ? riderRes.rows[0].id : null;

    const updateRes = await db.query(
      `UPDATE shipments 
       SET assigned_rider_id = COALESCE($1, assigned_rider_id),
           status = 'RIDER_ASSIGNED',
           updated_at = NOW()
       WHERE id = $2 AND status = 'BOOKED'
       RETURNING *`,
      [riderId, shipmentId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(400).json({ error: 'Job is no longer available or already assigned.' });
    }

    res.json({
      message: 'Job successfully accepted by rider.',
      shipment: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept job: ' + err.message });
  }
});

// GET /api/v1/riders/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const riderRes = await db.query(
      `SELECT r.*, u.name, u.phone, u.email
       FROM riders r
       JOIN users u ON r.user_id = u.id
       WHERE r.user_id = $1`,
      [req.user.id]
    );

    if (riderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Rider profile not found for this user.' });
    }

    const walletRes = await db.query('SELECT balance_ngn FROM wallets WHERE user_id = $1', [req.user.id]);

    res.json({
      rider: riderRes.rows[0],
      walletBalance: walletRes.rows.length > 0 ? parseFloat(walletRes.rows[0].balance_ngn) : 0.00
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/riders/me/jobs - shipments assigned to the signed-in rider (active + completed)
router.get('/me/jobs', requireVerifiedRider, async (req, res) => {
  try {
    const riderRes = await db.query('SELECT id FROM riders WHERE user_id = $1', [req.user.id]);
    if (riderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Rider profile not found for this user.' });
    }

    const result = await db.query(
      `SELECT s.*,
              h.business_name as destination_hub_name,
              h.address_text as destination_hub_address,
              h.postcode as destination_hub_postcode,
              oh.business_name as origin_hub_name,
              oh.address_text as origin_hub_address,
              oh.postcode as origin_hub_postcode,
              (s.pricing_total_ngn * 0.35) as potential_earning_ngn
       FROM shipments s
       LEFT JOIN hubs h ON s.destination_hub_id = h.id
       LEFT JOIN hubs oh ON s.origin_hub_id = oh.id
       WHERE s.assigned_rider_id = $1
         AND s.status IN ('RIDER_ASSIGNED', 'PICKED_UP_FROM_SENDER', 'IN_TRANSIT_TO_HUB', 'STORED_IN_BAY', 'COLLECTED_AT_HUB', 'DELIVERED_TO_RECIPIENT')
       ORDER BY s.updated_at DESC
       LIMIT 50`,
      [riderRes.rows[0].id]
    );

    res.json({ jobs: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rider KYC (Track B regulatory) -----------------------------------------
// A pending rider must be able to submit these, so they sit behind the router's
// role gate rather than `requireVerifiedRider`.

const TRACK_B_DOCUMENT_TYPES = ['NIN', 'DRIVERS_LICENSE', 'COURIER_LICENCE', 'PROOF_OF_ADDRESS'];
const VEHICLE_TYPES = ['bicycle', 'motorcycle', 'van', 'truck'];

const getRiderRecord = async (userId) => {
  const result = await db.query('SELECT * FROM riders WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
};

// GET /api/v1/riders/verification
// The rider's own Track B profile fields and submitted documents.
router.get('/verification', async (req, res) => {
  try {
    const rider = await getRiderRecord(req.user.id);
    if (!rider) {
      return res.status(404).json({ error: 'Rider profile not found for this user.' });
    }

    const recordsRes = await db.query(
      `SELECT id, track, document_type, document_number, status, submitted_at, reviewed_at, reviewer_notes
       FROM verification_records
       WHERE entity_type = 'rider' AND entity_id = $1
       ORDER BY submitted_at DESC`,
      [rider.id]
    );
    const userRes = await db.query('SELECT postcode FROM users WHERE id = $1', [req.user.id]);
    const fees = await settingsService.getRiderRegistrationFees();

    res.json({
      profile: {
        nin: rider.nin,
        driversLicenseNo: rider.drivers_license_no,
        vehicleType: rider.vehicle_type,
        plateNumber: rider.plate_number,
        operationalPostcodes: rider.operational_postcodes,
        postcode: userRes.rows[0]?.postcode || null,
        registrationFeeNgn: fees.registrationFeeNgn,
        registrationFeePaid: Boolean(rider.registration_fee_paid_at),
        status: rider.status
      },
      records: recordsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your verification details.' });
  }
});

// PATCH /api/v1/riders/profile
// The rider's own identity, vehicle and corridor details.
router.patch('/profile', async (req, res) => {
  const body = req.body || {};

  const nin = typeof body.nin === 'string' ? body.nin.trim() : '';
  const licence = typeof body.driversLicenseNo === 'string' ? body.driversLicenseNo.trim() : '';
  const vehicleType = typeof body.vehicleType === 'string' ? body.vehicleType.trim() : '';
  const plate = typeof body.plateNumber === 'string' ? body.plateNumber.trim() : '';
  const homePostcode = typeof body.postcode === 'string' ? body.postcode.trim() : '';
  const corridors = Array.isArray(body.operationalPostcodes)
    ? body.operationalPostcodes.map((value) => String(value).trim()).filter(Boolean)
    : null;

  if (body.nin !== undefined && !/^\d{11}$/.test(nin)) {
    return res.status(400).json({ error: 'Enter your 11-digit NIN.' });
  }
  if (body.driversLicenseNo !== undefined && !licence) {
    return res.status(400).json({ error: "Driver's licence number is required." });
  }
  if (body.postcode !== undefined && !homePostcode) {
    return res.status(400).json({ error: 'Enter the postcode where you operate.' });
  }
  if (licence.length > 50) {
    return res.status(400).json({ error: "Driver's licence number is too long." });
  }
  if (body.vehicleType !== undefined && vehicleType && !VEHICLE_TYPES.includes(vehicleType)) {
    return res.status(400).json({ error: 'Select a valid vehicle type.' });
  }
  if (plate.length > 30) {
    return res.status(400).json({ error: 'Plate number is too long.' });
  }
  if (homePostcode.length > 20) {
    return res.status(400).json({ error: 'Postcode is too long.' });
  }
  if (corridors && corridors.length > 20) {
    return res.status(400).json({ error: 'Too many operational postcodes.' });
  }

  try {
    const rider = await getRiderRecord(req.user.id);
    if (!rider) {
      return res.status(404).json({ error: 'Rider profile not found for this user.' });
    }

    const sets = [];
    const params = [];
    let idx = 1;
    const add = (column, value) => {
      params.push(value);
      sets.push(`${column} = $${idx}`);
      idx += 1;
    };

    if (body.nin !== undefined) add('nin', nin || null);
    if (body.driversLicenseNo !== undefined) add('drivers_license_no', licence || PLACEHOLDER_LICENCE);
    if (body.vehicleType !== undefined) add('vehicle_type', vehicleType || 'motorcycle');
    if (body.plateNumber !== undefined) add('plate_number', plate || 'ABJ-000-XX');
    if (corridors) add('operational_postcodes', corridors);

    if (sets.length) {
      await db.query(
        `UPDATE riders SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
        [...params, rider.id]
      );
    }
    if (body.postcode !== undefined) {
      await db.query(
        'UPDATE users SET postcode = $1, updated_at = NOW() WHERE id = $2',
        [homePostcode || null, req.user.id]
      );
    }

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'RIDER_KYC_UPDATED', 'rider', $2, $3)`,
      [req.user.id, rider.id, JSON.stringify({ fields: Object.keys(body) })]
    );

    res.json({ rider: await getRiderRecord(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: 'Could not save your rider details.' });
  }
});

// POST /api/v1/riders/verification/documents
// Submits one identity document as a Track B record for operations to review.
router.post('/verification/documents', async (req, res) => {
  const { documentType, documentNumber, documentUrl } = req.body || {};

  if (!TRACK_B_DOCUMENT_TYPES.includes(documentType)) {
    return res.status(400).json({ error: 'Select a document type that belongs to rider verification.' });
  }

  const number = typeof documentNumber === 'string' ? documentNumber.trim() : '';
  if (documentType === 'NIN' && number && !/^\d{11}$/.test(number)) {
    return res.status(400).json({ error: 'Enter the 11-digit NIN exactly as shown on your slip.' });
  }
  if (number.length > 80) {
    return res.status(400).json({ error: 'Document number is too long.' });
  }

  let parsed;
  try {
    parsed = parseDocumentDataUrl(documentUrl);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  try {
    const rider = await getRiderRecord(req.user.id);
    if (!rider) {
      return res.status(404).json({ error: 'Rider profile not found for this user.' });
    }

    const inserted = await db.query(
      `INSERT INTO verification_records
         (entity_type, entity_id, track, document_type, document_number, document_url, status)
       VALUES ('rider', $1, 'TRACK_B_REGULATORY', $2, $3, $4, 'PENDING')
       RETURNING id, track, document_type, document_number, status, submitted_at`,
      [rider.id, documentType, number || null, parsed.dataUrl]
    );

    // Keep the profile fields in step with the first submitted identity document
    // so the console reflects what has actually been evidenced.
    if (documentType === 'NIN' && !rider.nin) {
      await db.query('UPDATE riders SET nin = $1, updated_at = NOW() WHERE id = $2', [number || null, rider.id]);
    }
    if (documentType === 'DRIVERS_LICENSE'
        && (!rider.drivers_license_no || rider.drivers_license_no === PLACEHOLDER_LICENCE)) {
      await db.query(
        'UPDATE riders SET drivers_license_no = $1, updated_at = NOW() WHERE id = $2',
        [number || null, rider.id]
      );
    }

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'RIDER_KYC_DOCUMENT_SUBMITTED', 'rider', $2, $3)`,
      [req.user.id, rider.id, JSON.stringify({ documentType, hash: parsed.hash })]
    );

    res.status(201).json({ record: inserted.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not submit that document.' });
  }
});

// POST /api/v1/riders/registration-fee/pay
// Settles the administrator-configured registration fee from the rider's
// prepaid wallet. Operations cannot grant dispatch clearance until this is
// settled, so the amount is read fresh from settings on every attempt.
router.post('/registration-fee/pay', async (req, res) => {
  try {
    const rider = await getRiderRecord(req.user.id);
    if (!rider) {
      return res.status(404).json({ error: 'Rider profile not found for this user.' });
    }

    const { registrationFeeNgn } = await settingsService.getRiderRegistrationFees();
    const fee = Number(registrationFeeNgn) || 0;
    if (fee <= 0) {
      return res.status(400).json({ error: 'No rider registration fee is configured.' });
    }
    if (rider.registration_fee_paid_at) {
      return res.status(409).json({ error: 'Your rider registration fee has already been paid.' });
    }

    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    const wallet = walletRes.rows[0];
    const currentBalance = wallet ? parseFloat(wallet.balance_ngn || 0) : 0;
    if (currentBalance < fee) {
      return res.status(400).json({
        error: `Insufficient prepaid wallet balance for the rider registration fee (₦${fee.toFixed(2)} required). Please top up your wallet.`,
        required: fee,
        currentBalance
      });
    }

    const newBalance = currentBalance - fee;
    const reference = `RIDER-REG-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2',
        [newBalance, wallet.id]
      );
      await client.query(
        `INSERT INTO transactions (
           wallet_id, transaction_type, amount_ngn, fee_ngn, net_amount_ngn,
           balance_before_ngn, balance_after_ngn, reference, payment_gateway,
           gateway_reference, status, metadata
         ) VALUES ($1, 'BOOKING_PAYMENT', $2, 0.00, $2, $3, $4, $5, 'WALLET', $5, 'COMPLETED', $6)`,
        [wallet.id, fee, currentBalance, newBalance, reference, JSON.stringify({ description: 'Rider Registration Fee' })]
      );
      await client.query(
        'UPDATE riders SET registration_fee_paid_at = NOW(), updated_at = NOW() WHERE id = $1',
        [rider.id]
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'RIDER_REGISTRATION_FEE_PAID', 'rider', $2, $3)`,
        [req.user.id, rider.id, JSON.stringify({ amountNgn: fee, reference })]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({
      message: 'Rider registration fee paid.',
      reference,
      newBalance,
      registrationFeePaid: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not settle the rider registration fee.' });
  }
});

module.exports = router;
// Exposed so the verification gate can be asserted directly.
module.exports.requireVerifiedRider = requireVerifiedRider;
