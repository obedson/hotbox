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

// PATCH /api/v1/hubs/mine - hub owner updates their own hub capacity
router.patch('/mine', authenticate, async (req, res) => {
  const { capacity } = req.body || {};

  if (capacity === undefined || capacity === null || capacity === '') {
    return res.status(400).json({ error: 'Capacity is required.' });
  }

  try {
    const existing = await db.query(
      'SELECT * FROM hubs WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'No hub linked to this account.' });
    }

    const hub = existing.rows[0];
    const parsed = parseInt(capacity, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return res.status(400).json({ error: 'Capacity must be a positive whole number.' });
    }
    if (parsed < parseInt(hub.current_load, 10)) {
      return res.status(400).json({ error: 'Capacity cannot be lower than the current load of ' + hub.current_load + '.' });
    }

    const updated = await db.query(
      'UPDATE hubs SET capacity = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [parsed, hub.id]
    );

    res.json({ hub: updated.rows[0], message: 'Hub capacity updated successfully.' });
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

module.exports = router;