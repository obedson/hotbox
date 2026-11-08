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
