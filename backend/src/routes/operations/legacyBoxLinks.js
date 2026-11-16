const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate, requireRoles } = require('../../middleware/auth');
const legacyBoxLinkService = require('../../services/legacyBoxLinkService');
const nipostRegistryService = require('../../services/nipostRegistryService');
const settingsService = require('../../services/settingsService');

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
    documentHash: row.document_hash || null,
    hasDocument: Boolean(row.document_url),
    openClaims: Number(row.open_claims) || 0,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    reviewNote: row.review_note || null,
    reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at).toISOString() : null,
    contestedAt: row.contested_at ? new Date(row.contested_at).toISOString() : null,
    feeNgn: row.fee_ngn != null ? Number(row.fee_ngn) : null,
    feeReference: row.fee_reference || null,
    registrySource: row.registry_source || null,
    registryRef: row.registry_ref || null,
    registryVerifiedAt: row.registry_verified_at ? new Date(row.registry_verified_at).toISOString() : null,
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

router.get('/legacy-box-links', async (req, res) => {
  try {
    await legacyBoxLinkService.runMaintenance();

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

router.post('/legacy-box-links/maintenance', async (req, res) => {
  try {
    const result = await legacyBoxLinkService.runMaintenance();
    res.json({ message: 'Link request maintenance complete.', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function sendCsv(res, filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get('/legacy-box-links/registry-status', async (req, res) => {
  try {
    const registry = await settingsService.getNipostRegistry();
    const configured = nipostRegistryService.isConfigured();
    res.json({
      configured,
      enabled: Boolean(registry.enabled && configured),
      matchPolicy: registry.matchPolicy
    });
  } catch (err) {
    res.json({ configured: nipostRegistryService.isConfigured(), enabled: false, matchPolicy: 'name_or_phone' });
  }
});

router.get('/legacy-box-links/export', async (req, res) => {
  try {
    const status = req.query.status && req.query.status !== 'ALL' ? req.query.status : null;
    const search = req.query.search || null;
    const { rows } = await legacyBoxLinkService.listRequests({ status, search, limit: 5000, offset: 0 });

    const headers = [
      'Request ID', 'Old P.O. Box', 'Normalized', 'Customer', 'Email', 'Phone', 'Digital Box',
      'Status', 'Declaration', 'Evidence', 'Submitted At', 'Reviewed By', 'Reviewed At',
      'Review Note', 'Fee NGN', 'Fee Reference', 'Registry Source', 'Open Claims'
    ];
    sendCsv(res, 'legacy-box-link-requests.csv', headers, rows.map((row) => [
      row.id,
      row.legacy_box_number_raw,
      row.legacy_box_number_norm,
      row.user_name,
      row.user_email,
      row.user_phone,
      row.box_number,
      row.status,
      row.declaration ? 'Yes' : 'No',
      row.document_url ? 'Attached' : 'None',
      row.submitted_at ? new Date(row.submitted_at).toISOString() : '',
      row.reviewed_by || '',
      row.reviewed_at ? new Date(row.reviewed_at).toISOString() : '',
      row.review_note || '',
      row.fee_ngn != null ? row.fee_ngn : '',
      row.fee_reference || '',
      row.registry_source || '',
      row.open_claims
    ]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/legacy-box-links/remittance', async (req, res) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    const [summary, lineItems, remittances] = await Promise.all([
      legacyBoxLinkService.summarizeRemittance({ from, to }),
      legacyBoxLinkService.listRemittanceLineItems({ from, to }),
      legacyBoxLinkService.listRemittances()
    ]);
    res.json({ summary, lineItems, remittances });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/legacy-box-links/remittance/export', async (req, res) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    const summary = await legacyBoxLinkService.summarizeRemittance({ from, to });
    const lineItems = await legacyBoxLinkService.listRemittanceLineItems({ from, to, limit: 2000 });

    const headers = ['Date', 'Reference', 'Type', 'Legacy Box', 'Digital Box', 'Customer', 'Email', 'Amount NGN'];
    const rows = lineItems.map((item) => [
      item.created_at ? new Date(item.created_at).toISOString() : '',
      item.reference,
      item.transaction_type,
      item.legacy_box_number || '',
      item.box_number || '',
      item.user_name || '',
      item.user_email || '',
      item.amount_ngn
    ]);
    rows.push([]);
    rows.push(['', '', '', '', '', '', 'NIPOST verification fee', summary.nipostAmountNgn]);
    rows.push(['', '', '', '', '', '', 'Hotbox platform fee', summary.hotboxAmountNgn]);
    rows.push(['', '', '', '', '', '', 'Total', summary.totalAmountNgn]);

    sendCsv(res, `legacy-link-remittance-${summary.period.from}-${summary.period.to}.csv`, headers, rows);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/legacy-box-links/remittance', async (req, res) => {
  try {
    const { from = null, to = null, reference = null, notes = null } = req.body || {};
    const result = await legacyBoxLinkService.recordRemittance({
      from, to, reviewerId: req.user.id, reference, notes
    });
    res.status(result.created ? 201 : 200).json({
      message: result.created
        ? 'Remittance recorded for the period.'
        : 'A remittance for this period already exists.',
      ...result
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/legacy-box-links/:id/auto-verify', async (req, res) => {
  try {
    const { request, box, verdict } = await legacyBoxLinkService.autoVerifyRequest({
      requestId: req.params.id,
      reviewerId: req.user.id
    });

    await notifyCustomer(
      request.user_id,
      'Legacy P.O. Box Verified',
      `Your old P.O. Box ${request.legacy_box_number_raw} was verified against the NIPOST registry and is now linked to Digital P.O. Box ${box.box_number}.`
    );

    res.json({
      message: 'NIPOST registry confirmed the claim and the old P.O. Box is now active.',
      request: serialize(request),
      verdict
    });
  } catch (err) {
    const body = { error: err.message };
    if (err.verdict) body.verdict = err.verdict;
    res.status(err.status || 500).json(body);
  }
});
router.post('/legacy-box-links/:id/approve', async (req, res) => {
  try {
    const charge = await legacyBoxLinkService.getApprovalCharge();
    const { request, box } = await legacyBoxLinkService.approveRequest({
      requestId: req.params.id,
      reviewerId: req.user.id,
      note: req.body.note || null,
      charge
    });

    const feeLine = charge.totalNgn > 0
      ? ` The approved link fee of ₦${Number(charge.totalNgn).toFixed(2)} was charged to your Hotbox wallet.`
      : '';

    await notifyCustomer(
      request.user_id,
      'Legacy P.O. Box Verified',
      `Your old P.O. Box ${request.legacy_box_number_raw} was verified by NIPOST and is now linked to Digital P.O. Box ${box.box_number}. Mail addressed to either number now reaches you.${feeLine}`
    );

    res.json({
      message: 'Link request approved and the old P.O. Box is now active.',
      request: serialize(request),
      fee: { totalNgn: charge.totalNgn, reference: request.fee_reference || null }
    });
  } catch (err) {
    const body = { error: err.message };
    if (err.status === 402) {
      body.required = err.required;
      body.currentBalance = err.currentBalance;
    }
    res.status(err.status || 500).json(body);
  }
});

router.post('/legacy-box-links/:id/reject', async (req, res) => {
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

router.post('/legacy-box-links/:id/revoke', async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'A revocation reason is required.' });

    const { request, box } = await legacyBoxLinkService.revokeRequest({
      requestId: req.params.id,
      reviewerId: req.user.id,
      reason
    });

    await notifyCustomer(
      request.user_id,
      'Legacy P.O. Box Link Revoked',
      `The verified link between old P.O. Box ${request.legacy_box_number_raw} and Digital P.O. Box ${box.box_number} was revoked. Reason: ${reason}. Mail addressed to the old number will no longer be forwarded.`
    );

    res.json({
      message: 'Legacy link revoked. Mail addressed to the old number will no longer be forwarded.',
      request: serialize(request)
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;