const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const { parseBoxNumber } = require('../utils/boxNumber');
const digitalBoxService = require('../services/digitalBoxService');
const legacyBoxLinkService = require('../services/legacyBoxLinkService');

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

module.exports = router;
// Exposed so the verification gate can be asserted directly.
module.exports.requireVerifiedRider = requireVerifiedRider;
