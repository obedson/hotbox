const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate, requireRoles } = require('../../middleware/auth');
const legacyBoxLinkService = require('../../services/legacyBoxLinkService');

router.use(authenticate, requireRoles('nipost_verifier', 'compliance_officer', 'ops_admin', 'super_admin'));

function serialize(row) {
  return {
    id: row.id,
    userId: row.user_id,
    boxId: row.box_id,
    boxNumber: row.box_number,
    userName: row.user_name,
    userEmail: row.user_email,
    userPhone: row.user_phone,
    legacyBoxNumber: row.legacy_box_number_raw,
    legacyBoxNumberNorm: row.legacy_box_number_norm,
    status: row.status,
    registeredPhone: row.registered_phone,
    declaration: Boolean(row.declaration),
    documentUrl: row.document_url,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    reviewNote: row.review_note || null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null
  };
}

function notifyCustomer(userId, title, message) {
  return db.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
     VALUES ($1, $2, $3, 'SYSTEM_NOTICE', FALSE, NOW())`,
    [userId, title, message]
  );
}

router.get('/', async (req, res) => {
  try {
    await legacyBoxLinkService.expireOverdueRequests();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const status = req.query.status || null;
    const search = req.query.search || null;

    const { rows, total } = await legacyBoxLinkService.listRequests({
      status, search, limit: pageSize, offset: (page - 1) * pageSize
    });

    res.json({ requests: rows.map(serialize), total, page, pageSize });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const { request, box } = await legacyBoxLinkService.approveRequest({
      requestId: req.params.id,
      reviewerId: req.user.id,
      note: req.body.note || null
    });

    await notifyCustomer(
      request.user_id,
      'Legacy P.O. Box Verified',
      `Your old P.O. Box ${request.legacy_box_number_raw} was verified by NIPOST and is now linked to Digital P.O. Box ${box.box_number}. Mail addressed to either number now reaches you.`
    );

    res.json({ message: 'Link request approved and the old P.O. Box is now active.', request: serialize(request) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const reason = req.body.reason || '';
    const request = await legacyBoxLinkService.rejectRequest({
      requestId: req.params.id,
      reviewerId: req.user.id,
      reason
    });

    await notifyCustomer(
      request.user_id,
      'Legacy P.O. Box Link Not Approved',
      `Your request to link old P.O. Box ${request.legacy_box_number_raw} was not approved. Reason: ${reason.trim()}. You may submit a new request with additional evidence.`
    );

    res.json({ message: 'Link request rejected.', request: serialize(request) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;