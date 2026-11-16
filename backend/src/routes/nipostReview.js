// Public email-fallback approval for legacy P.O. Box link requests.
// The signed token in the email is the only capability required; it is scoped to
// one request and one action and expires. No session is involved.
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const legacyBoxLinkService = require('../services/legacyBoxLinkService');
const mailer = require('../services/legacyBoxReviewMailer');

function notifyCustomer(userId, title, message) {
  return db.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
     VALUES ($1, $2, $3, 'SYSTEM_NOTICE', FALSE, NOW())`,
    [userId, title, message]
  );
}

async function decide({ action, token, reason }) {
  const { requestId } = mailer.verifyReviewToken(token);

  const request = await legacyBoxLinkService.getRequestById(requestId);
  if (!request) {
    const error = new Error('This review link is no longer valid.');
    error.status = 404;
    throw error;
  }
  if (!legacyBoxLinkService.OPEN_STATUSES.includes(request.status)) {
    const error = new Error('This request has already been decided.');
    error.status = 409;
    throw error;
  }

  if (action === 'approve') {
    const charge = await legacyBoxLinkService.getApprovalCharge();
    const result = await legacyBoxLinkService.approveRequest({
      requestId,
      reviewerId: null,
      note: 'Approved by NIPOST via email link.',
      charge
    });

    const feeLine = charge.totalNgn > 0
      ? ` The approved link fee of ₦${Number(charge.totalNgn).toFixed(2)} was charged to the customer's Hotbox wallet.`
      : '';

    await notifyCustomer(
      request.user_id,
      'Legacy P.O. Box Verified',
      `Your old P.O. Box ${request.legacy_box_number_raw} was verified by NIPOST and is now linked to Digital P.O. Box ${result.box.box_number}.${feeLine}`
    );

    return {
      status: 200,
      message: `Old P.O. Box ${request.legacy_box_number_raw} is now linked to Digital P.O. Box ${result.box.box_number}.`
    };
  }

  const finalReason = (reason || 'Rejected by NIPOST via email link.').trim() || 'Rejected by NIPOST via email link.';
  await legacyBoxLinkService.rejectRequest({ requestId, reviewerId: null, reason: finalReason });

  await notifyCustomer(
    request.user_id,
    'Legacy P.O. Box Link Not Approved',
    `Your request to link old P.O. Box ${request.legacy_box_number_raw} was not approved. Reason: ${finalReason}`
  );

  return {
    status: 200,
    message: `The request for old P.O. Box ${request.legacy_box_number_raw} was rejected.`
  };
}

function tokenFrom(req) {
  return req.body?.token || req.query.token || null;
}

function handleGet(action) {
  return async (req, res) => {
    try {
      const result = await decide({ action, token: tokenFrom(req), reason: req.query.reason });
      res.status(result.status).type('html').send(
        mailer.decisionPage({ action, ok: true, message: result.message })
      );
    } catch (err) {
      res.status(err.status || 500).type('html').send(
        mailer.decisionPage({ action, ok: false, message: err.message })
      );
    }
  };
}

function handlePost(action) {
  return async (req, res) => {
    try {
      const result = await decide({ action, token: tokenFrom(req), reason: req.body?.reason });
      res.status(result.status).json({ message: result.message });
    } catch (err) {
      const body = { error: err.message };
      if (err.status === 402) {
        body.required = err.required;
        body.currentBalance = err.currentBalance;
      }
      res.status(err.status || 500).json(body);
    }
  };
}

router.get('/approve', handleGet('approve'));
router.post('/approve', handlePost('approve'));
router.get('/reject', handleGet('reject'));
router.post('/reject', handlePost('reject'));

module.exports = router;