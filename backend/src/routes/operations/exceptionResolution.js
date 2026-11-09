const express = require('express');
const router = express.Router();
const db = require('../../config/db');
// GET /api/v1/operations/exceptions/:id/details (Comprehensive Investigation Dossier)
router.get('/exceptions/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID is claim or shipment
    let claimRow = null;
    let shipmentId = id;

    const claimRes = await db.query('SELECT * FROM claims WHERE id = $1 LIMIT 1', [id]);
    if (claimRes.rows.length > 0) {
      claimRow = claimRes.rows[0];
      shipmentId = claimRow.shipment_id;
    }

    // Fetch shipment with hub and rider
    const shipRes = await db.query(`
      SELECT 
        s.*,
        h.business_name as hub_name,
        h.postcode as hub_postcode,
        h.phone as hub_phone,
        h.address_text as hub_address,
        r.plate_number as rider_plate,
        r.vehicle_type as rider_vehicle,
        u_rider.name as rider_name,
        u_rider.phone as rider_phone
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      LEFT JOIN riders r ON s.assigned_rider_id = r.id
      LEFT JOIN users u_rider ON r.user_id = u_rider.id
      WHERE s.id = $1 LIMIT 1
    `, [shipmentId]);

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment record not found' });
    }

    const shipment = shipRes.rows[0];

    // Fetch custody timeline
    const custodyRes = await db.query(`
      SELECT *
      FROM custody_ledger
      WHERE shipment_id = $1
      ORDER BY created_at ASC
    `, [shipmentId]);

    // Available replacement riders for reassignment
    const activeRidersRes = await db.query(`
      SELECT r.id, r.plate_number, r.vehicle_type, r.rating, u.name, u.phone
      FROM riders r
      JOIN users u ON r.user_id = u.id
      WHERE r.is_active = TRUE
      LIMIT 10
    `);

    res.json({
      shipment,
      claim: claimRow,
      timeline: custodyRes.rows,
      available_riders: activeRidersRes.rows
    });
  } catch (err) {
    console.error('Exception details error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/exceptions/:id/resolve (Resolve or Settle Claim)
router.post('/exceptions/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, resolutionAmountNgn, resolutionNotes } = req.body;

    if (!action) return res.status(400).json({ error: 'Resolution action is required.' });

    // Check if claim
    const claimRes = await db.query('SELECT * FROM claims WHERE id = $1', [id]);
    if (claimRes.rows.length > 0) {
      const claim = claimRes.rows[0];
      const newStatus = action === 'APPROVE' ? 'APPROVED' : action === 'SETTLE' ? 'SETTLED' : 'REJECTED';
      const finalAmount = parseFloat(resolutionAmountNgn) || (action === 'REJECT' ? 0 : parseFloat(claim.claim_amount_ngn));

      await db.query(`
        UPDATE claims
        SET status = $1, resolution_amount_ngn = $2, resolution_notes = $3, resolved_at = NOW(), updated_at = NOW()
        WHERE id = $4
      `, [newStatus, finalAmount, resolutionNotes || `Actioned by Operations Desk (${action})`, id]);

      // If settled/approved, update shipment status to CANCELLED or RETURNED
      if (newStatus === 'SETTLED') {
        await db.query("UPDATE shipments SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [claim.shipment_id]);
      }

      // Audit log
      await db.query(`
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'claim', $3, $4)
      `, [
        req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
        `CLAIM_${newStatus}`,
        id,
        JSON.stringify({ previousStatus: claim.status, newStatus, resolutionAmountNgn: finalAmount, resolutionNotes })
      ]);

      return res.json({
        success: true,
        message: `Claim successfully updated to ${newStatus} with settlement of ₦${finalAmount.toLocaleString()}.`
      });
    }

    // Otherwise update shipment exception status
    const shipRes = await db.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (shipRes.rows.length === 0) return res.status(404).json({ error: 'Exception record not found' });

    const newShipStatus = action === 'CLOSE' ? 'COLLECTED_AT_HUB' : 'RETURNED_TO_SENDER';
    await db.query('UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2', [newShipStatus, id]);

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'EXCEPTION_RESOLVED', 'shipment', $2, $3)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      id,
      JSON.stringify({ action, resolutionNotes })
    ]);

    res.json({
      success: true,
      message: `Shipment exception resolved and marked as ${newShipStatus}.`
    });
  } catch (err) {
    console.error('Resolve exception error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/exceptions/reassign-courier (Reassign Stalled Parcel to Active Rider)
router.post('/exceptions/reassign-courier', async (req, res) => {
  try {
    const { shipmentId, newRiderId, reason = 'Stalled transit courier reassignment' } = req.body;

    if (!shipmentId || !newRiderId) {
      return res.status(400).json({ error: 'shipmentId and newRiderId are required.' });
    }

    // Verify rider exists
    const riderRes = await db.query('SELECT r.*, u.name as rider_name FROM riders r JOIN users u ON r.user_id = u.id WHERE r.id = $1', [newRiderId]);
    if (riderRes.rows.length === 0) return res.status(404).json({ error: 'New rider not found.' });

    // Update shipment
    await db.query(`
      UPDATE shipments
      SET assigned_rider_id = $1, status = 'IN_TRANSIT_TO_HUB', updated_at = NOW()
      WHERE id = $2
    `, [newRiderId, shipmentId]);

    // Append to custody ledger
    await db.query(`
      INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, new_holder_type, new_holder_id,
        handover_type, status_after_handover, verification_method, actor_id, actor_role, notes
      ) VALUES (
        $1, 'RIDER', 'RIDER', $2, 'HUB_TO_RIDER', 'IN_TRANSIT_TO_HUB', 'ADMIN_OVERRIDE',
        $3, 'ops_admin', $4
      )
    `, [
      shipmentId,
      newRiderId,
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      `Reassigned to rider ${riderRes.rows[0].rider_name} (${riderRes.rows[0].plate_number}): ${reason}`
    ]);

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'COURIER_REASSIGNED', 'shipment', $2, $3)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      shipmentId,
      JSON.stringify({ newRiderId, riderName: riderRes.rows[0].rider_name, reason })
    ]);

    res.json({
      success: true,
      message: `Shipment successfully reassigned to ${riderRes.rows[0].rider_name}.`
    });
  } catch (err) {
    console.error('Reassign courier error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/exceptions/authorize-return (Trigger Return to Sender)
router.post('/exceptions/authorize-return', async (req, res) => {
  try {
    const { shipmentId, reason = 'Customer request / recipient unreachable' } = req.body;

    if (!shipmentId) return res.status(400).json({ error: 'shipmentId is required.' });

    await db.query(`
      UPDATE shipments
      SET status = 'RETURN_REQUESTED', updated_at = NOW()
      WHERE id = $1
    `, [shipmentId]);

    // Append to custody ledger
    await db.query(`
      INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, new_holder_type,
        handover_type, status_after_handover, verification_method, actor_id, actor_role, notes
      ) VALUES (
        $1, 'HUB', 'RETURN_STATION', 'HUB_TO_RETURN', 'RETURN_REQUESTED', 'ADMIN_OVERRIDE',
        $2, 'ops_admin', $3
      )
    `, [
      shipmentId,
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      `Return-to-Sender authorized: ${reason}`
    ]);

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'RETURN_TO_SENDER_AUTHORIZED', 'shipment', $2, $3)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      shipmentId,
      JSON.stringify({ reason })
    ]);

    res.json({
      success: true,
      message: 'Return-to-Sender workflow officially authorized and committed to ledger.'
    });
  } catch (err) {
    console.error('Authorize return error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
