const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const settingsService = require('../../services/settingsService');
const { missingRiderClearance } = require('../../utils/riderClearance');
// GET /api/v1/operations/riders (Comprehensive Fleet Ledger & Dispatch Monitor)
router.get('/riders', async (req, res) => {
  try {
    const { search, status, vehicle_type, courier_id } = req.query;

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      conditions.push(`(
        u.name ILIKE $${paramIdx} OR
        u.phone ILIKE $${paramIdx} OR
        u.email ILIKE $${paramIdx} OR
        r.plate_number ILIKE $${paramIdx} OR
        r.drivers_license_no ILIKE $${paramIdx} OR
        r.nin ILIKE $${paramIdx} OR
        c.company_name ILIKE $${paramIdx} OR
        array_to_string(r.operational_postcodes, ',') ILIKE $${paramIdx}
      )`);
      params.push(q);
      paramIdx++;
    }

    if (vehicle_type && vehicle_type !== 'ALL') {
      conditions.push(`r.vehicle_type = $${paramIdx}`);
      params.push(vehicle_type);
      paramIdx++;
    }

    if (courier_id && courier_id !== 'ALL') {
      if (courier_id === 'INDEPENDENT') {
        conditions.push(`r.courier_id IS NULL`);
      } else {
        conditions.push(`r.courier_id = $${paramIdx}`);
        params.push(courier_id);
        paramIdx++;
      }
    }

    if (status && status !== 'ALL') {
      if (status === 'ONLINE') {
        conditions.push(`r.is_available = TRUE AND r.is_active = TRUE AND r.status = 'verified'`);
      } else if (status === 'ON_ROUTE') {
        conditions.push(`active_shipments.tracking_code IS NOT NULL`);
      } else if (status === 'PENDING') {
        conditions.push(`r.status = 'pending'`);
      } else if (status === 'SUSPENDED') {
        conditions.push(`(r.status = 'suspended' OR r.is_active = FALSE)`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        r.*,
        u.name,
        u.phone,
        u.email,
        c.company_name,
        w.balance_ngn as wallet_balance_ngn,
        active_shipments.id as active_shipment_id,
        active_shipments.tracking_code as active_shipment_code,
        active_shipments.status as active_shipment_status,
        active_shipments.recipient_name as active_shipment_recipient,
        active_shipments.recipient_postcode as active_shipment_postcode
      FROM riders r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN courier_companies c ON r.courier_id = c.id
      LEFT JOIN wallets w ON w.user_id = r.user_id
      LEFT JOIN LATERAL (
        SELECT id, tracking_code, status, recipient_name, recipient_postcode
        FROM shipments
        WHERE assigned_rider_id = r.id 
          AND status IN ('RIDER_ASSIGNED', 'PICKED_UP_FROM_SENDER', 'IN_TRANSIT_TO_HUB', 'OUT_FOR_DELIVERY')
        ORDER BY updated_at DESC
        LIMIT 1
      ) active_shipments ON true
      ${whereClause}
      ORDER BY r.is_available DESC, r.total_deliveries DESC, r.created_at DESC
    `;

    const result = await db.query(query, params);

    // Compute status counts across all fleet riders
    const countsRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE r.is_available = TRUE AND r.is_active = TRUE AND r.status = 'verified') as online,
        count(*) FILTER (WHERE cur_s.id IS NOT NULL) as on_route,
        count(*) FILTER (WHERE r.status = 'pending') as pending,
        count(*) FILTER (WHERE r.status = 'suspended' OR r.is_active = FALSE) as suspended
      FROM riders r
      LEFT JOIN LATERAL (
        SELECT id FROM shipments
        WHERE assigned_rider_id = r.id 
          AND status IN ('RIDER_ASSIGNED', 'PICKED_UP_FROM_SENDER', 'IN_TRANSIT_TO_HUB', 'OUT_FOR_DELIVERY')
        LIMIT 1
      ) cur_s ON true
    `);

    // Fetch courier companies for filter dropdown
    const companiesRes = await db.query('SELECT id, company_name FROM courier_companies ORDER BY company_name ASC');

    res.json({
      riders: result.rows,
      total: result.rows.length,
      counts: countsRes.rows[0],
      companies: companiesRes.rows
    });
  } catch (err) {
    console.error('Operations riders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/riders/:id/toggle-status (Suspend or Reinstate Courier)
router.post('/riders/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason = 'Operations administrative review' } = req.body; // action: 'suspend' | 'reinstate'

    const newStatus = action === 'suspend' ? 'suspended' : 'verified';
    const isActive = action !== 'suspend';
    const isAvailable = action !== 'suspend';

    // Reinstatement is a clearance decision: a rider may only return to duty
    // once identity, driving privilege, service postcode and any
    // administrator-set registration fee are all in place.
    if (action !== 'suspend') {
      const riderRes = await db.query(
        'SELECT r.*, u.postcode AS user_postcode, u.phone AS user_phone FROM riders r JOIN users u ON u.id = r.user_id WHERE r.id = $1',
        [id]
      );
      const record = riderRes.rows[0];
      if (!record) {
        return res.status(404).json({ error: 'Rider not found' });
      }
      const { registrationFeeNgn } = await settingsService.getRiderRegistrationFees();
      const documentsRes = await db.query(
        `SELECT document_type, status FROM verification_records
         WHERE entity_type = 'rider' AND entity_id = $1`,
        [id]
      );
      const missing = missingRiderClearance({
        rider: record,
        postcode: record.user_postcode,
        phone: record.user_phone,
        registrationFeeNgn,
        registrationFeePaid: Boolean(record.registration_fee_paid_at),
        documents: documentsRes.rows
      });
      if (missing.length > 0) {
        return res.status(409).json({
          error: 'This rider has not completed every verification requirement and cannot be reinstated yet.',
          missing
        });
      }
    }

    const updateRes = await db.query(`
      UPDATE riders
      SET status = $1, is_active = $2, is_available = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [newStatus, isActive, isAvailable, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, 'rider', $3, $4)
    `, [
      req.user.id,
      action === 'suspend' ? 'RIDER_SUSPENDED' : 'RIDER_REINSTATED',
      id,
      JSON.stringify({ role: 'ops_admin', reason, previousStatus: updateRes.rows[0].status, newStatus })
    ]);

    res.json({
      success: true,
      rider: updateRes.rows[0],
      message: `Courier status successfully updated to ${newStatus}.`
    });
  } catch (err) {
    console.error('Toggle rider status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/riders/:id/assign-shipment (Manual Dispatch Assignment)
router.post('/riders/:id/assign-shipment', async (req, res) => {
  try {
    const { id } = req.params;
    const { shipmentId } = req.body;

    if (!shipmentId) {
      return res.status(400).json({ error: 'Shipment ID is required for assignment.' });
    }

    const shipRes = await db.query(`
      UPDATE shipments
      SET assigned_rider_id = $1,
          status = 'RIDER_ASSIGNED',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [id, shipmentId]);

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Mark rider as on-route
    await db.query(`UPDATE riders SET is_available = FALSE, updated_at = NOW() WHERE id = $1`, [id]);

    // Ledger audit
    await db.query(`
      INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, previous_holder_id, new_holder_type, new_holder_id,
        handover_type, status_after_handover, verification_method, actor_id, actor_role, notes
      ) VALUES ($1, 'DISPATCH_DESK', $1, 'RIDER', $2, 'RIDER_ASSIGNED', 'RIDER_ASSIGNED', 'MANUAL_DISPATCH', $3, 'ops_admin', $4)
    `, [
      shipmentId,
      id,
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      `Manual dispatch assignment by Operations Admin`
    ]);

    res.json({
      success: true,
      shipment: shipRes.rows[0],
      message: `Shipment ${shipRes.rows[0].tracking_code} successfully assigned to courier.`
    });
  } catch (err) {
    console.error('Assign shipment error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
