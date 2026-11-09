const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
// POST /api/v1/customer/claims
router.post('/claims', authenticate, async (req, res) => {
  const {
    shipmentId,
    claimType = 'DAMAGED_PARCEL',
    description,
    claimAmountNgn = 5000.00,
    evidenceUrls = []
  } = req.body;

  if (!shipmentId || !description) {
    return res.status(400).json({ error: 'Shipment ID and claim description are required.' });
  }

  try {
    const result = await db.query(`
      INSERT INTO claims (
        shipment_id, claimant_id, claim_type, description,
        claim_amount_ngn, evidence_urls, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED')
      RETURNING *
    `, [shipmentId, req.user.id, claimType, description, claimAmountNgn, evidenceUrls]);

    res.status(201).json({ message: 'Claim submitted successfully. Under review by support.', claim: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/customer/claims
router.get('/claims', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, s.tracking_code, s.package_description
      FROM claims c
      JOIN shipments s ON c.shipment_id = s.id
      WHERE c.claimant_id = $1
      ORDER BY c.created_at DESC
    `, [req.user.id]);

    res.json({ claims: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/customer/claims/:id (Update submitted claim)
router.put('/claims/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { claimType, description, claimAmountNgn } = req.body;

  try {
    const existing = await db.query('SELECT * FROM claims WHERE id = $1 AND claimant_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found or unauthorized.' });
    }

    const claim = existing.rows[0];
    if (claim.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `Cannot edit claim in '${claim.status}' status. Only newly SUBMITTED claims can be edited.` });
    }

    const result = await db.query(`
      UPDATE claims
      SET claim_type = COALESCE($1, claim_type),
          description = COALESCE($2, description),
          claim_amount_ngn = COALESCE($3, claim_amount_ngn),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [claimType, description, claimAmountNgn ? parseFloat(claimAmountNgn) : null, id]);

    res.json({ message: 'Claim updated successfully.', claim: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/claims/:id/cancel (Cancel claim submission)
router.post('/claims/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.query('SELECT * FROM claims WHERE id = $1 AND claimant_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found or unauthorized.' });
    }

    const claim = existing.rows[0];
    if (claim.status === 'SETTLED' || claim.status === 'APPROVED') {
      return res.status(400).json({ error: `Cannot cancel an already ${claim.status.toLowerCase()} claim.` });
    }

    const result = await db.query(`
      UPDATE claims
      SET status = 'CANCELLED',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    res.json({ message: 'Claim submission cancelled successfully.', claim: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
