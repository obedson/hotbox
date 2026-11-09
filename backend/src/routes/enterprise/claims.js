const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
// ==========================================
// B2B CLAIMS & DISPUTES ENDPOINTS (TAB 7)
// ==========================================

// GET /api/v1/enterprise/claims (List all claims for this enterprise account)
router.get('/claims', authenticate, async (req, res) => {
  try {
    const claimsRes = await db.query(`
      SELECT 
        c.id, 
        c.shipment_id, 
        c.claimant_id, 
        c.claim_type, 
        c.description, 
        c.evidence_urls,
        c.claim_amount_ngn, 
        c.resolution_amount_ngn, 
        c.status, 
        c.assigned_to,
        c.resolution_notes, 
        c.resolved_at, 
        c.created_at, 
        c.updated_at,
        s.tracking_code, 
        s.service_type, 
        s.recipient_name, 
        s.recipient_phone,
        s.recipient_postcode,
        s.pricing_total_ngn,
        h.business_name as destination_hub,
        u.name as assigned_to_name
      FROM claims c
      JOIN shipments s ON s.id = c.shipment_id
      LEFT JOIN hubs h ON h.id = s.destination_hub_id
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.claimant_id = $1 OR s.sender_id = $1
      ORDER BY c.created_at DESC
    `, [req.user.id]);

    res.json({ claims: claimsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enterprise claims: ' + err.message });
  }
});

// GET /api/v1/enterprise/claims/summary (Claims KPI metrics)
router.get('/claims/summary', authenticate, async (req, res) => {
  try {
    const summaryRes = await db.query(`
      SELECT
        COUNT(c.id)::int as total_claims,
        COUNT(CASE WHEN c.status IN ('SUBMITTED', 'UNDER_REVIEW') THEN 1 END)::int as under_review_count,
        COUNT(CASE WHEN c.status IN ('APPROVED', 'SETTLED') THEN 1 END)::int as resolved_count,
        COUNT(CASE WHEN c.status = 'SETTLED' THEN 1 END)::int as settled_count,
        COALESCE(SUM(c.claim_amount_ngn), 0)::numeric as total_claimed_ngn,
        COALESCE(SUM(c.resolution_amount_ngn), 0)::numeric as total_recovered_ngn
      FROM claims c
      JOIN shipments s ON s.id = c.shipment_id
      WHERE c.claimant_id = $1 OR s.sender_id = $1
    `, [req.user.id]);

    res.json({ summary: summaryRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims summary: ' + err.message });
  }
});

// GET /api/v1/enterprise/claims/eligible-shipments (Shipments eligible for filing B2B claims)
router.get('/claims/eligible-shipments', authenticate, async (req, res) => {
  try {
    const shipmentsRes = await db.query(`
      SELECT 
        s.id, 
        s.tracking_code, 
        s.status, 
        s.recipient_name, 
        s.recipient_postcode,
        s.pricing_total_ngn, 
        s.created_at,
        h.business_name as destination_hub
      FROM shipments s
      LEFT JOIN hubs h ON h.id = s.destination_hub_id
      WHERE s.sender_id = $1
        AND s.id NOT IN (
          SELECT shipment_id FROM claims WHERE claimant_id = $1 AND status NOT IN ('REJECTED', 'CANCELLED')
        )
      ORDER BY 
        CASE WHEN s.status = 'DISPUTED' THEN 0 ELSE 1 END,
        s.created_at DESC
      LIMIT 100
    `, [req.user.id]);

    res.json({ shipments: shipmentsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch eligible shipments: ' + err.message });
  }
});

// POST /api/v1/enterprise/claims (Submit new B2B claim)
router.post('/claims', authenticate, async (req, res) => {
  try {
    const { shipmentId, claimType, claimAmountNgn, description, evidenceUrls } = req.body;

    if (!shipmentId || !claimType || !claimAmountNgn || !description) {
      return res.status(400).json({ error: 'Missing required claim fields: shipmentId, claimType, claimAmountNgn, description.' });
    }

    const validClaimTypes = ['LOST_PARCEL', 'DAMAGED_PARCEL', 'DELAYED_DELIVERY', 'WRONG_HANDOVER', 'EXCESS_HOLDING_FEE'];
    if (!validClaimTypes.includes(claimType)) {
      return res.status(400).json({ 
        error: `Invalid claim type "${claimType}". Allowed types: ${validClaimTypes.join(', ')}` 
      });
    }

    // Verify shipment belongs to this merchant
    const shipRes = await db.query(
      'SELECT id, tracking_code, status FROM shipments WHERE id = $1 AND sender_id = $2',
      [shipmentId, req.user.id]
    );
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found or does not belong to your account.' });
    }

    const shipment = shipRes.rows[0];

    // Check if open claim already exists
    const existingRes = await db.query(
      "SELECT id FROM claims WHERE shipment_id = $1 AND claimant_id = $2 AND status NOT IN ('REJECTED', 'CANCELLED')",
      [shipmentId, req.user.id]
    );
    if (existingRes.rows.length > 0) {
      return res.status(400).json({ error: 'An active claim is already filed for this shipment.' });
    }

    const evidenceArray = Array.isArray(evidenceUrls) ? evidenceUrls : (evidenceUrls ? [evidenceUrls] : []);

    const insertRes = await db.query(`
      INSERT INTO claims (
        shipment_id,
        claimant_id,
        claim_type,
        description,
        evidence_urls,
        claim_amount_ngn,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED', NOW(), NOW())
      RETURNING *
    `, [shipmentId, req.user.id, claimType, description, evidenceArray, claimAmountNgn]);

    // Update shipment status to DISPUTED if not already
    if (shipment.status !== 'DISPUTED') {
      await db.query("UPDATE shipments SET status = 'DISPUTED', updated_at = NOW() WHERE id = $1", [shipmentId]);
    }

    res.status(201).json({
      message: 'B2B claim submitted successfully and placed in investigation queue.',
      claim: insertRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit claim: ' + err.message });
  }
});

// GET /api/v1/enterprise/claims/:id (Detailed Claim Case Investigation)
router.get('/claims/:id', authenticate, async (req, res) => {
  try {
    const claimRes = await db.query(`
      SELECT 
        c.*,
        s.tracking_code,
        s.service_type,
        s.recipient_name,
        s.recipient_phone,
        s.recipient_postcode,
        s.recipient_address_text,
        s.pricing_total_ngn,
        s.status as shipment_status,
        h.business_name as destination_hub,
        u.name as investigator_name,
        u.email as investigator_email
      FROM claims c
      JOIN shipments s ON s.id = c.shipment_id
      LEFT JOIN hubs h ON h.id = s.destination_hub_id
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE c.id = $1 AND (c.claimant_id = $2 OR s.sender_id = $2)
    `, [req.params.id, req.user.id]);

    if (claimRes.rows.length === 0) {
      return res.status(404).json({ error: 'Claim investigation case not found.' });
    }

    res.json({ claim: claimRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim detail: ' + err.message });
  }
});

module.exports = router;
