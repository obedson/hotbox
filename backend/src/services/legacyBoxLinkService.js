// Legacy P.O. Box linking. A customer requests a link, NIPOST verifies ownership
// against its own archives, and only an approval activates forwarding. Nothing in
// this service links a legacy number without a recorded NIPOST decision.
const crypto = require('crypto');
const db = require('../config/db');
const { canonicalLegacyKey } = require('../utils/legacyBoxNumber');
const { parseDocumentDataUrl } = require('../utils/documentUpload');
const settingsService = require('./settingsService');

const REQUEST_TTL_DAYS = 30;
const REMINDER_WINDOW_DAYS = 3;
const OPEN_STATUSES = ['PENDING', 'CONTESTED'];

function failure(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function expiryDate() {
  return new Date(Date.now() + REQUEST_TTL_DAYS * 24 * 3600 * 1000);
}

function notify(userId, title, message) {
  return db.query(
    `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
     VALUES ($1, $2, $3, 'SYSTEM_NOTICE', FALSE, NOW())`,
    [userId, title, message]
  );
}

async function createRequest({
  userId, boxId, legacyBoxNumberRaw, registeredPhone = null, declaration = false, documentDataUrl = null
}) {
  const raw = String(legacyBoxNumberRaw || '').trim();
  if (!raw) throw failure('Please enter your old P.O. Box number.');
  if (!declaration) throw failure('Please confirm the ownership declaration before submitting.');

  // Approval requires evidence. The document is validated and content-hashed
  // before anything is written so a claim can never be stored without it.
  const document = parseDocumentDataUrl(documentDataUrl);

  const key = canonicalLegacyKey(raw);
  if (!key) throw failure('That does not look like a valid P.O. Box number.');

  const open = await db.query(
    `SELECT * FROM legacy_box_link_requests
      WHERE user_id = $1 AND status IN ('PENDING', 'CONTESTED')
      ORDER BY submitted_at DESC LIMIT 1`,
    [userId]
  );
  if (open.rows.length > 0) {
    throw failure('You already have a link request awaiting NIPOST verification.', 409);
  }

  const taken = await db.query(
    `SELECT * FROM digital_boxes
      WHERE legacy_box_number_norm = $1 AND legacy_box_status = 'APPROVED'
      LIMIT 1`,
    [key]
  );
  if (taken.rows.length > 0) {
    throw failure('That old P.O. Box number is already linked to another Digital P.O. Box.', 409);
  }

  // A second claim for the same number contests the first: neither resolves
  // until NIPOST decides, and the first claimant is told immediately.
  const pending = await db.query(
    `SELECT * FROM legacy_box_link_requests
      WHERE UPPER(legacy_box_number_norm) = $1 AND status = 'PENDING'
      ORDER BY submitted_at DESC LIMIT 1`,
    [key]
  );

  let status = 'PENDING';
  if (pending.rows.length > 0) {
    status = 'CONTESTED';
    await db.query(
      `UPDATE legacy_box_link_requests
          SET status = 'CONTESTED', contested_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [pending.rows[0].id]
    );
    await notify(
      pending.rows[0].user_id,
      'Legacy P.O. Box Claim Contested',
      `Another customer has claimed old P.O. Box ${pending.rows[0].legacy_box_number_raw}. NIPOST will decide ownership before mail forwarding starts.`
    );
  }

  const insert = () => db.query(
    `INSERT INTO legacy_box_link_requests
       (user_id, box_id, legacy_box_number_raw, legacy_box_number_norm, status,
        registered_phone, declaration, document_url, document_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [userId, boxId, raw, key, status, registeredPhone || null, Boolean(declaration), document.dataUrl, document.hash, expiryDate()]
  );

  try {
    const res = await insert();
    return res.rows[0];
  } catch (err) {
    // Two claims arriving at the same instant: the partial unique index on
    // PENDING rejects the insert, so retire the rival claim and retry as a
    // contested claim.
    if (err.code === '23505') {
      await db.query(
        `UPDATE legacy_box_link_requests
            SET status = 'CONTESTED', contested_at = NOW(), updated_at = NOW()
          WHERE UPPER(legacy_box_number_norm) = $1 AND status = 'PENDING'`,
        [key]
      );
      const retry = await insert();
      return retry.rows[0];
    }
    throw err;
  }
}

async function getOpenRequestForUser(userId) {
  const res = await db.query(
    `SELECT * FROM legacy_box_link_requests
      WHERE user_id = $1 AND status IN ('PENDING', 'CONTESTED')
      ORDER BY submitted_at DESC LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function getLatestRequestForUser(userId) {
  const res = await db.query(
    `SELECT * FROM legacy_box_link_requests
      WHERE user_id = $1
      ORDER BY submitted_at DESC LIMIT 1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function getRequestById(requestId) {
  const res = await db.query('SELECT * FROM legacy_box_link_requests WHERE id = $1', [requestId]);
  return res.rows[0] || null;
}

async function listRequests({ status = null, search = null, limit = 20, offset = 0 } = {}) {
  const where = [];
  const params = [];

  if (status) {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(search.trim());
    const key = canonicalLegacyKey(search);
    where.push(`(
      r.legacy_box_number_raw ILIKE '%' || $${params.length} || '%'
      OR b.box_number ILIKE '%' || $${params.length} || '%'
      OR u.name ILIKE '%' || $${params.length} || '%'
      ${key ? `OR UPPER(r.legacy_box_number_norm) = '${key.replace(/'/g, "''")}'` : ''}
    )`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await db.query(
    `SELECT count(*)::int AS total
       FROM legacy_box_link_requests r
       JOIN users u ON u.id = r.user_id
       JOIN digital_boxes b ON b.id = r.box_id
       ${whereSql}`,
    params
  );

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const rowsRes = await db.query(
    `SELECT r.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone, b.box_number,
            (SELECT count(*)::int FROM legacy_box_link_requests o
              WHERE UPPER(o.legacy_box_number_norm) = UPPER(r.legacy_box_number_norm)
                AND o.status IN ('PENDING', 'CONTESTED')) AS open_claims
       FROM legacy_box_link_requests r
       JOIN users u ON u.id = r.user_id
       JOIN digital_boxes b ON b.id = r.box_id
       ${whereSql}
      ORDER BY r.submitted_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  return { rows: rowsRes.rows, total: countRes.rows[0].total };
}

async function getApprovalCharge() {
  const fees = await settingsService.getLegacyBoxLinkFees();
  return {
    nipostFeeNgn: fees.nipostVerificationFeeNgn,
    hotboxFeeNgn: fees.hotboxPlatformFeeNgn,
    totalNgn: fees.totalNgn
  };
}

async function approveRequest({ requestId, reviewerId, note = null, charge = null }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const current = await client.query(
      'SELECT * FROM legacy_box_link_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    const request = current.rows[0];
    if (!request) throw failure('Link request not found.', 404);
    if (!OPEN_STATUSES.includes(request.status)) {
      throw failure('Only a pending link request can be approved.', 409);
    }

    // Fees are captured on approval, inside the same transaction as the link,
    // so a charge can never exist without an active forwarding alias.
    let chargeReference = null;
    if (charge && charge.totalNgn > 0) {
      const walletRes = await client.query('SELECT * FROM wallets WHERE user_id = $1', [request.user_id]);
      let wallet = walletRes.rows[0];
      if (!wallet) {
        const created = await client.query(
          'INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0.00, 0.00) RETURNING *',
          [request.user_id]
        );
        wallet = created.rows[0];
      }

      const balance = parseFloat(wallet.balance_ngn || 0);
      if (balance < charge.totalNgn) {
        const error = failure(
          `Insufficient prepaid wallet balance for the legacy link fees (₦${charge.totalNgn.toFixed(2)} required). Ask the customer to top up before approving.`,
          402
        );
        error.required = charge.totalNgn;
        error.currentBalance = balance;
        throw error;
      }

      const reference = `LEGACY-LINK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const lines = [
        { type: 'LEGACY_LINK_FEE', amount: Number(charge.nipostFeeNgn) || 0, suffix: 'NIPOST' },
        { type: 'LEGACY_LINK_PLATFORM_FEE', amount: Number(charge.hotboxFeeNgn) || 0, suffix: 'HBX' }
      ].filter((line) => line.amount > 0);

      let runningBalance = balance;
      for (const line of lines) {
        const before = runningBalance;
        runningBalance -= line.amount;
        await client.query(
          `INSERT INTO transactions (
             wallet_id, transaction_type, amount_ngn, fee_ngn, net_amount_ngn, balance_before_ngn,
             balance_after_ngn, reference, payment_gateway, gateway_reference, status, metadata
           ) VALUES ($1, $2, $3, 0.00, $3, $4, $5, $6, 'WALLET', $6, 'COMPLETED', $7)`,
          [
            wallet.id,
            line.type,
            line.amount,
            before,
            runningBalance,
            `${reference}-${line.suffix}`,
            JSON.stringify({
              request_id: requestId,
              line_item: line.suffix,
              legacy_box_number: request.legacy_box_number_raw
            })
          ]
        );
      }

      await client.query(
        'UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2',
        [runningBalance, wallet.id]
      );
      chargeReference = reference;
    }

    const reviewed = await client.query(
      `UPDATE legacy_box_link_requests
          SET status = 'APPROVED', reviewed_by = $2, reviewed_at = NOW(),
              review_note = $3, fee_ngn = $4, fee_reference = $5, updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [
        requestId,
        reviewerId,
        note,
        charge && charge.totalNgn > 0 ? charge.totalNgn : null,
        chargeReference
      ]
    );

    const box = await client.query(
      `UPDATE digital_boxes
          SET legacy_box_number = $2, legacy_box_number_norm = $3,
              legacy_box_status = 'APPROVED', legacy_box_approved_at = NOW(), updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [request.box_id, request.legacy_box_number_raw, request.legacy_box_number_norm]
    );

    await client.query(
      `UPDATE legacy_box_link_requests
          SET status = 'REJECTED', reviewed_by = $2, reviewed_at = NOW(),
              review_note = 'Another claim for this P.O. Box number was approved.', updated_at = NOW()
        WHERE UPPER(legacy_box_number_norm) = $1
          AND status IN ('PENDING', 'CONTESTED')
          AND id <> $3`,
      [request.legacy_box_number_norm, reviewerId, requestId]
    );

    await client.query(
      `UPDATE legacy_box_link_requests
          SET status = 'REVOKED', reviewed_by = $2, reviewed_at = NOW(),
              review_note = 'Superseded by a newer approved link.', updated_at = NOW()
        WHERE box_id = $1 AND status = 'APPROVED' AND id <> $3`,
      [request.box_id, reviewerId, requestId]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'legacy_box_link_request', $3, $4)`,
      [
        reviewerId,
        'LEGACY_LINK_APPROVED',
        requestId,
        JSON.stringify({
          box_id: request.box_id,
          legacy_box_number: request.legacy_box_number_raw,
          legacy_box_number_norm: request.legacy_box_number_norm,
          fee_ngn: charge && charge.totalNgn > 0 ? charge.totalNgn : 0,
          fee_reference: chargeReference,
          note
        })
      ]
    );

    await client.query('COMMIT');
    return { request: reviewed.rows[0], box: box.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function rejectRequest({ requestId, reviewerId, reason }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const current = await client.query(
      'SELECT * FROM legacy_box_link_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    const request = current.rows[0];
    if (!request) throw failure('Link request not found.', 404);
    if (!OPEN_STATUSES.includes(request.status)) {
      throw failure('Only a pending link request can be rejected.', 409);
    }
    if (!reason || !reason.trim()) throw failure('A rejection reason is required.');

    const reviewed = await client.query(
      `UPDATE legacy_box_link_requests
          SET status = 'REJECTED', reviewed_by = $2, reviewed_at = NOW(),
              review_note = $3, updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [requestId, reviewerId, reason.trim()]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'legacy_box_link_request', $3, $4)`,
      [
        reviewerId,
        'LEGACY_LINK_REJECTED',
        requestId,
        JSON.stringify({
          box_id: request.box_id,
          legacy_box_number: request.legacy_box_number_raw,
          reason: reason.trim()
        })
      ]
    );

    await client.query('COMMIT');
    return reviewed.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function revokeRequest({ requestId, reviewerId, reason }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const current = await client.query(
      'SELECT * FROM legacy_box_link_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    const request = current.rows[0];
    if (!request) throw failure('Link request not found.', 404);
    if (request.status !== 'APPROVED') {
      throw failure('Only an approved link can be revoked.', 409);
    }
    if (!reason || !reason.trim()) throw failure('A revocation reason is required.');

    const box = await client.query(
      `UPDATE digital_boxes
          SET legacy_box_number_norm = NULL, legacy_box_status = 'UNLINKED',
              legacy_box_approved_at = NULL, updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [request.box_id]
    );
    if (box.rows.length === 0) throw failure('The linked Digital P.O. Box no longer exists.', 409);

    const reviewed = await client.query(
      `UPDATE legacy_box_link_requests
          SET status = 'REVOKED', reviewed_by = $2, reviewed_at = NOW(),
              review_note = $3, updated_at = NOW()
        WHERE id = $1 RETURNING *`,
      [requestId, reviewerId, reason.trim()]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'legacy_box_link_request', $3, $4)`,
      [
        reviewerId,
        'LEGACY_LINK_REVOKED',
        requestId,
        JSON.stringify({
          box_id: request.box_id,
          legacy_box_number: request.legacy_box_number_raw,
          reason: reason.trim()
        })
      ]
    );

    await client.query('COMMIT');
    return { request: reviewed.rows[0], box: box.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function withdrawRequest({ requestId, userId }) {
  const res = await db.query(
    `UPDATE legacy_box_link_requests
        SET status = 'WITHDRAWN', updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status IN ('PENDING', 'CONTESTED')
      RETURNING *`,
    [requestId, userId]
  );
  if (res.rows.length === 0) {
    throw failure('That link request is no longer open.', 409);
  }
  return res.rows[0];
}

async function expireOverdueRequests() {
  const res = await db.query(
    `UPDATE legacy_box_link_requests
        SET status = 'EXPIRED', updated_at = NOW()
      WHERE status IN ('PENDING', 'CONTESTED') AND expires_at IS NOT NULL AND expires_at < NOW()
      RETURNING id`
  );
  return res.rows.length;
}

async function remindExpiringRequests() {
  const res = await db.query(
    `SELECT * FROM legacy_box_link_requests
      WHERE status IN ('PENDING', 'CONTESTED')
        AND reminder_sent_at IS NULL
        AND expires_at IS NOT NULL
        AND expires_at > NOW()
        AND expires_at < NOW() + ($1 || ' days')::INTERVAL
      ORDER BY expires_at ASC`,
    [String(REMINDER_WINDOW_DAYS)]
  );

  let reminded = 0;
  for (const request of res.rows) {
    const due = new Date(request.expires_at).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    await notify(
      request.user_id,
      'Legacy P.O. Box Claim Awaiting NIPOST',
      `Your request to link old P.O. Box ${request.legacy_box_number_raw} is still awaiting NIPOST verification and expires on ${due}.`
    );
    await db.query(
      'UPDATE legacy_box_link_requests SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1',
      [request.id]
    );
    reminded += 1;
  }
  return reminded;
}

async function runMaintenance() {
  const expired = await expireOverdueRequests();
  const reminded = await remindExpiringRequests();
  return { expired, reminded };
}

async function findLegacyLinkState(input) {
  const key = canonicalLegacyKey(input);
  if (!key) return { state: 'UNKNOWN', box: null };

  const box = await db.query(
    `SELECT * FROM digital_boxes
      WHERE legacy_box_number_norm = $1 AND legacy_box_status = 'APPROVED'
      LIMIT 1`,
    [key]
  );
  if (box.rows[0]) return { state: 'APPROVED', box: box.rows[0] };

  const request = await db.query(
    `SELECT status FROM legacy_box_link_requests
      WHERE UPPER(legacy_box_number_norm) = $1
      ORDER BY submitted_at DESC LIMIT 1`,
    [key]
  );
  const status = request.rows[0] ? request.rows[0].status : 'UNKNOWN';
  if (OPEN_STATUSES.includes(status)) return { state: 'PENDING', box: null };
  if (status === 'UNKNOWN') return { state: 'UNKNOWN', box: null };
  return { state: 'NOT_APPROVED', box: null };
}

module.exports = {
  REQUEST_TTL_DAYS,
  REMINDER_WINDOW_DAYS,
  OPEN_STATUSES,
  createRequest,
  getOpenRequestForUser,
  getLatestRequestForUser,
  getRequestById,
  listRequests,
  getApprovalCharge,
  approveRequest,
  rejectRequest,
  revokeRequest,
  withdrawRequest,
  expireOverdueRequests,
  remindExpiringRequests,
  runMaintenance,
  findLegacyLinkState
};