const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { rankHubs } = require('../services/rankingService');
const { authenticate, requireRoles } = require('../middleware/auth');

// GET /api/v1/hubs/nearby
router.get('/nearby', async (req, res) => {
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lng = req.query.lng ? parseFloat(req.query.lng) : null;
  const postcode = req.query.postcode ? req.query.postcode.trim() : null;
  const radius = req.query.radius ? parseFloat(req.query.radius) : 25;

  try {
    const hubs = await rankHubs({
      userLat: lat,
      userLng: lng,
      targetPostcode: postcode,
      maxRadiusKm: radius
    });
    res.json({ hubs, total: hubs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rank nearby hubs: ' + err.message });
  }
});

// GET /api/v1/hubs (All hubs for directory / map)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        h.*,
        (h.capacity - h.current_load) as available_slots,
        u.name as owner_name
      FROM hubs h
      LEFT JOIN users u ON h.owner_id = u.id
      ORDER BY h.created_at DESC
    `);
    res.json({ hubs: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hubs/mine - the hub owned by (or staffed by) the signed-in user.
router.get('/mine', authenticate, async (req, res) => {
  try {
    const staffRole = ['ops_admin', 'super_admin', 'compliance_officer', 'finance_officer', 'support_agent'].includes(req.user.role);
    let hub = null;

    if (staffRole && req.query.hub_id) {
      const r = await db.query(
        'SELECT h.*, u.name as owner_name FROM hubs h LEFT JOIN users u ON u.id = h.owner_id WHERE h.id = $1',
        [req.query.hub_id]
      );
      hub = r.rows[0] || null;
    } else {
      const ownerRes = await db.query(
        'SELECT h.*, u.name as owner_name FROM hubs h LEFT JOIN users u ON u.id = h.owner_id WHERE h.owner_id = $1 ORDER BY h.created_at DESC LIMIT 1',
        [req.user.id]
      );
      hub = ownerRes.rows[0] || null;

      if (!hub) {
        const staffRes = await db.query(
          `SELECT h.*, u.name as owner_name
           FROM hubs h
           JOIN hub_staff hs ON hs.hub_id = h.id
           LEFT JOIN users u ON u.id = h.owner_id
           WHERE hs.user_id = $1
           LIMIT 1`,
          [req.user.id]
        );
        hub = staffRes.rows[0] || null;
      }
    }

    if (!hub) {
      return res.json({ hub: null, bays: [], stats: null, parcels: [], staff: [] });
    }

    const baysRes = await db.query(
      `SELECT b.id, b.bay_code, b.size_tier, b.is_occupied, b.current_shipment_id,
              s.tracking_code, s.recipient_name, s.recipient_postcode,
              s.status AS shipment_status, s.received_at_hub_at, s.created_at AS shipment_created_at
       FROM hub_storage_bays b
       LEFT JOIN shipments s ON b.current_shipment_id = s.id
       WHERE b.hub_id = $1
       ORDER BY b.bay_code ASC`,
      [hub.id]
    );

    const statsRes = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM shipments WHERE destination_hub_id = $1 AND created_at >= CURRENT_DATE) AS inbound_today,
         (SELECT COUNT(*)::int FROM shipments WHERE destination_hub_id = $1 AND status IN ('COLLECTED_AT_HUB','DELIVERED_TO_RECIPIENT')) AS collected_total,
         (SELECT COUNT(*)::int FROM hub_storage_bays WHERE hub_id = $1 AND is_occupied) AS occupied_bays,
         (SELECT COUNT(*)::int FROM hub_storage_bays WHERE hub_id = $1 AND NOT is_occupied) AS open_bays,
         (SELECT COUNT(*)::int FROM shipments WHERE destination_hub_id = $1 AND status IN ('RECEIVED_AT_HUB','STORED_IN_BAY') AND received_at_hub_at < NOW() - (free_holding_days || ' days')::interval) AS overdue
       FROM hubs WHERE id = $1`,
      [hub.id]
    );

    const parcelsRes = await db.query(
      `SELECT id, tracking_code, recipient_name, recipient_postcode, status, size, created_at, received_at_hub_at
       FROM shipments WHERE destination_hub_id = $1
       ORDER BY created_at DESC LIMIT 12`,
      [hub.id]
    );

    const staffRes = await db.query(
      `SELECT hs.role, hs.is_active, u.name, u.phone, u.email
       FROM hub_staff hs JOIN users u ON u.id = hs.user_id
       WHERE hs.hub_id = $1 ORDER BY hs.created_at ASC`,
      [hub.id]
    );

    res.json({
      hub,
      bays: baysRes.rows,
      stats: statsRes.rows[0] || null,
      parcels: parcelsRes.rows,
      staff: staffRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hubs/:id
router.get('/:id', async (req, res) => {
  try {
    const hubRes = await db.query(
      `SELECT h.*, (h.capacity - h.current_load) as available_slots, u.name as owner_name
       FROM hubs h
       LEFT JOIN users u ON h.owner_id = u.id
       WHERE h.id = $1`,
      [req.params.id]
    );

    if (hubRes.rows.length === 0) {
      return res.status(404).json({ error: 'Hub not found.' });
    }

    const baysRes = await db.query(
      'SELECT id, bay_code, size_tier, is_occupied, current_shipment_id FROM hub_storage_bays WHERE hub_id = $1 ORDER BY bay_code ASC',
      [req.params.id]
    );

    res.json({
      hub: hubRes.rows[0],
      bays: baysRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hubs/apply (Hub Onboarding Application)
router.post('/apply', authenticate, async (req, res) => {
  const {
    businessName,
    cacNumber,
    phone,
    email,
    postcode,
    addressText,
    neighbourhood,
    lga,
    state,
    lat,
    lng,
    capacity = 50,
    openingHours = '08:00 - 20:00'
  } = req.body;

  if (!businessName || !phone || !postcode || !addressText) {
    return res.status(400).json({ error: 'Business name, phone, postcode, and address are required.' });
  }

  try {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const hubRes = await client.query(
        `INSERT INTO hubs (
           owner_id, business_name, cac_number, phone, email, postcode,
           address_text, neighbourhood, lga, state, lat, lng,
           capacity, opening_hours, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
         RETURNING *`,
        [
          req.user.id,
          businessName,
          cacNumber || null,
          phone,
          email || req.user.email,
          postcode,
          addressText,
          neighbourhood || 'Neighborhood',
          lga || 'Abuja Municipal',
          state || 'Abuja (FCT)',
          lat || 9.0765,
          lng || 7.4985,
          capacity,
          openingHours
        ]
      );

      const newHub = hubRes.rows[0];

      // Auto-create initial storage bays for this hub
      const defaultBays = [
        ['BAY-01', 'small'],
        ['BAY-02', 'medium'],
        ['BAY-03', 'medium'],
        ['BAY-04', 'large'],
        ['BAY-05', 'large']
      ];

      for (const [code, size] of defaultBays) {
        await client.query(
          'INSERT INTO hub_storage_bays (hub_id, bay_code, size_tier) VALUES ($1, $2, $3)',
          [newHub.id, code, size]
        );
      }

      // Record Track C accreditation application in verification records
      await client.query(
        `INSERT INTO verification_records (
           entity_type, entity_id, track, document_type, document_number, status
         ) VALUES ('hub', $1, 'TRACK_C_ACCREDITATION', 'HUB_SPACE_PHOTOS', $2, 'PENDING')`,
        [newHub.id, `APP-${Date.now()}`]
      );

      await client.query('COMMIT');
      res.status(201).json({ hub: newHub, message: 'Hub application submitted for accreditation review.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Hub registration failed: ' + err.message });
  }
});

module.exports = router;
