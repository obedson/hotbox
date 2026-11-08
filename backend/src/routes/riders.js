const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');

// Rider endpoints are restricted to riders and operations staff.
router.use(authenticate, requireRoles('rider', 'ops_admin'));

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
