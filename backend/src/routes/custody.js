const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const { processCustodyTransfer } = require('../services/custodyService');
const { validate, custodyTransferSchema } = require('../middleware/validate');
const { rolesForHandoverType } = require('../config/custodyRoles');

// POST /api/v1/custody/transfer
// Atomically executes physical handover with OTP or QR verification
router.post('/transfer', authenticate, validate(custodyTransferSchema), (req, res, next) => {
  // Each transition belongs to one side of the chain. Resolve the allowlist
  // from the handover type so the route can never admit a role the service
  // would reject anyway.
  const allowedRoles = rolesForHandoverType(req.body.handoverType);
  if (!allowedRoles) {
    return res.status(400).json({ error: `Unsupported handover type '${req.body.handoverType}'.` });
  }
  requireRoles(...allowedRoles)(req, res, next);
}, async (req, res) => {
  const {
    shipmentId,
    handoverType,
    verificationMethod = 'OTP',
    verificationToken,
    lat,
    lng,
    bayCode,
    notes
  } = req.body;

  if (!shipmentId || !handoverType || !verificationToken) {
    return res.status(400).json({
      error: 'shipmentId, handoverType, and verificationToken (OTP or QR token) are required.'
    });
  }

  try {
    const result = await processCustodyTransfer({
      shipmentId,
      handoverType,
      verificationMethod,
      verificationToken: verificationToken.trim(),
      actorId: req.user.id,
      actorRole: req.user.role,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      bayCode: bayCode ? bayCode.trim() : null,
      notes: notes || `Custody handover processed by ${req.user.role}`
    });

    res.json({
      message: 'Custody transfer confirmed and logged to immutable ledger.',
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/custody/timeline/:shipmentId
router.get('/timeline/:shipmentId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, u.name as actor_name
       FROM custody_ledger c
       LEFT JOIN users u ON c.actor_id = u.id
       WHERE c.shipment_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.shipmentId]
    );

    res.json({ timeline: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
