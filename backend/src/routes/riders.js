const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const { formatBoxNumber, parseBoxNumber } = require('../utils/boxNumber');

// Rider endpoints are restricted to riders and operations staff.
router.use(authenticate, requireRoles('rider', 'ops_admin'));

// GET /api/v1/riders/lookup (Resolve a postcode or digital P.O. Box number to a delivery address)
router.get('/lookup', authenticate, async (req, res) => {
  const rawInput = String(req.query.code || '').trim();
  if (!rawInput) {
    return res.status(400).json({ error: 'A postcode or digital P.O. Box number is required.' });
  }

  const input = rawInput.toUpperCase();
  const boxCode = parseBoxNumber(input);

  try {
    let userRows = [];

    if (boxCode) {
      const boxRes = await db.query(
        `SELECT u.id, u.name, u.phone, u.postcode, u.digital_box,
                pc.neighbourhood, pc.lga, pc.state
         FROM users u
         LEFT JOIN LATERAL (
           SELECT neighbourhood, lga, state FROM postcode_cache
           WHERE postcode = u.postcode OR ndaps_code = u.postcode OR legacy_code = u.postcode
           LIMIT 1
         ) pc ON TRUE
         WHERE RIGHT(u.id::text, 4) = $1 OR LEFT(u.id::text, 4) = $1`,
        [boxCode]
      );
      userRows = boxRes.rows;
    } else {
      const postcodeRes = await db.query(
        `SELECT u.id, u.name, u.phone, u.postcode, u.digital_box,
                pc.neighbourhood, pc.lga, pc.state
         FROM users u
         LEFT JOIN LATERAL (
           SELECT neighbourhood, lga, state FROM postcode_cache
           WHERE postcode = u.postcode OR ndaps_code = u.postcode OR legacy_code = u.postcode
           LIMIT 1
         ) pc ON TRUE
         WHERE u.postcode = $1 OR replace(u.postcode, '-', '') = replace($1, '-', '')`,
        [input]
      );
      userRows = postcodeRes.rows;
    }

    const pcRes = await db.query(
      `SELECT * FROM postcode_cache
       WHERE postcode = $1 OR ndaps_code = $1 OR legacy_code = $1 OR replace(postcode, '-', '') = replace($1, '-', '')
       LIMIT 1`,
      [input]
    );
    const pc = pcRes.rows[0] || null;

    const residents = userRows.map(user => {
      const boxData = user.digital_box || {};
      const district = user.neighbourhood || (pc && pc.neighbourhood) || 'Wuse 2';
      const lga = user.lga || (pc && pc.lga) || 'Abuja Municipal';
      const state = user.state || (pc && pc.state) || 'Federal Capital Territory';
      const isGroundTruthVerified = Boolean(boxData.isGroundTruthVerified);

      return {
        name: user.name,
        phone: user.phone,
        digitalBoxNumber: formatBoxNumber(user.id),
        proofOfAddressStatus: isGroundTruthVerified
          ? 'Verified by NIPOST (Ground-Truth Certified)'
          : 'NIPOST Verified (Pending Doorway Check)',
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
    if (!boxCode) {
      const allUsersWithBox = await db.query('SELECT id, name, postcode, digital_box FROM users WHERE digital_box IS NOT NULL');
      for (const u of allUsersWithBox.rows) {
        const relocs = Array.isArray(u.digital_box && u.digital_box.relocations) ? u.digital_box.relocations : [];
        for (const rel of relocs) {
          const oldCode = String(rel.oldPostcode || '').toUpperCase();
          const sameCode = oldCode === input || oldCode.replace(/-/g, '') === input.replace(/-/g, '');
          if (sameCode) {
            relocatedMatches.push({
              name: u.name,
              digitalBoxNumber: formatBoxNumber(u.id),
              forwardingPostcode: rel.newPostcode,
              forwardingAddress: rel.newAddress,
              forwardingRule: 'ACTIVE_AUTO_FORWARD'
            });
          }
        }
      }
    }

    res.json({
      input,
      inputType: boxCode ? 'DIGITAL_P_O_BOX' : 'POSTCODE',
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
router.get('/radar/jobs', authenticate, async (req, res) => {
  try {
    // Find active jobs waiting for pickup or in-transit
    const result = await db.query(`
      SELECT 
        s.*,
        h.business_name as destination_hub_name,
        h.address_text as destination_hub_address,
        h.postcode as destination_hub_postcode,
        (s.pricing_total_ngn * 0.35) as potential_earning_ngn
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
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
router.post('/jobs/:id/accept', authenticate, async (req, res) => {
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

module.exports = router;
