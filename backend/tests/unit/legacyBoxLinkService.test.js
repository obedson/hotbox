const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const settingsService = require('../../src/services/settingsService');
const legacyBoxLinkService = require('../../src/services/legacyBoxLinkService');
const nipostRegistryService = require('../../src/services/nipostRegistryService');
const documentStorage = require('../../src/services/documentStorage');

const originalQuery = db.query;
const originalGetClient = db.getClient;
const originalGetLegacyBoxLinkFees = settingsService.getLegacyBoxLinkFees;
const originalVerifyOwnership = nipostRegistryService.verifyOwnership;
const originalGetNipostRegistry = settingsService.getNipostRegistry;
const originalStoreDocument = documentStorage.storeDocument;

let calls = [];
let handler = async () => ({ rows: [] });
let clientHandler = async () => ({ rows: [] });

function stubClient() {
  return {
    query: (sql, params) => {
      calls.push({ sql, params });
      return clientHandler(sql, params);
    },
    release: () => {}
  };
}

db.query = (sql, params) => {
  calls.push({ sql, params });
  return handler(sql, params);
};
db.getClient = async () => stubClient();

after(() => {
  db.query = originalQuery;
  db.getClient = originalGetClient;
  settingsService.getLegacyBoxLinkFees = originalGetLegacyBoxLinkFees;
  nipostRegistryService.verifyOwnership = originalVerifyOwnership;
  settingsService.getNipostRegistry = originalGetNipostRegistry;
  documentStorage.storeDocument = originalStoreDocument;
});

function reset() {
  calls = [];
  handler = async () => ({ rows: [] });
  clientHandler = async () => ({ rows: [] });
}

const DOCUMENT = 'data:image/png;base64,' + Buffer.from('hotbox-legacy-evidence').toString('base64');

const baseRequest = {
  id: 'req-1',
  user_id: 'user-1',
  box_id: 'box-1',
  legacy_box_number_raw: 'P.O. Box 1234',
  legacy_box_number_norm: '1234',
  status: 'PENDING',
  submitted_at: new Date().toISOString(),
  expires_at: new Date().toISOString()
};

test('createRequest rejects a blank box number', async () => {
  reset();
  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'u', boxId: 'b', legacyBoxNumberRaw: '  ', declaration: true, documentDataUrl: DOCUMENT }),
    /enter your old P.O. Box number/i
  );
});

test('createRequest rejects a submission without the ownership declaration', async () => {
  reset();
  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'u', boxId: 'b', legacyBoxNumberRaw: '1234', documentDataUrl: DOCUMENT }),
    /declaration/i
  );
});

test('createRequest requires an evidence document', async () => {
  reset();
  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'u', boxId: 'b', legacyBoxNumberRaw: '1234', declaration: true }),
    /proof document/i
  );
});

test('createRequest rejects an unsupported document type', async () => {
  reset();
  await assert.rejects(
    () => legacyBoxLinkService.createRequest({
      userId: 'u', boxId: 'b', legacyBoxNumberRaw: '1234', declaration: true,
      documentDataUrl: 'data:text/plain;base64,aGk='
    }),
    /unsupported document type/i
  );
});

test('createRequest refuses a second open request', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes("status IN ('PENDING', 'CONTESTED')")) return { rows: [baseRequest] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: '1234', declaration: true, documentDataUrl: DOCUMENT }),
    (err) => err.status === 409
  );
});

test('createRequest refuses a number already linked to another box', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes("UPPER(legacy_box_number_norm) = $1 AND status = 'PENDING'")) return { rows: [] };
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [] };
    if (sql.includes('FROM digital_boxes')) return { rows: [{ id: 'box-2', user_id: 'someone-else' }] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: '1234', declaration: true, documentDataUrl: DOCUMENT }),
    (err) => err.status === 409
  );
});

test('createRequest stores the raw text, the canonical key, the document and an expiry', async () => {
  reset();
  handler = async (sql) => {
    if (sql.startsWith('INSERT INTO legacy_box_link_requests')) {
      return { rows: [{ ...baseRequest, status: 'PENDING' }] };
    }
    if (sql.includes("UPPER(legacy_box_number_norm) = $1 AND status = 'PENDING'")) return { rows: [] };
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [] };
    if (sql.includes('FROM digital_boxes')) return { rows: [] };
    return { rows: [] };
  };

  const created = await legacyBoxLinkService.createRequest({
    userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: 'P.O. Box 1234', declaration: true, documentDataUrl: DOCUMENT
  });

  assert.equal(created.status, 'PENDING');
  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO legacy_box_link_requests'));
  assert.equal(insert.params[2], 'P.O. Box 1234');
  assert.equal(insert.params[3], '1234');
  assert.equal(insert.params[4], 'PENDING');
  assert.equal(insert.params[5], null);
  assert.equal(insert.params[6], true);
  assert.equal(insert.params[7], DOCUMENT);
  assert.match(insert.params[8], /^[a-f0-9]{64}$/);
  assert.ok(insert.params[9] instanceof Date);
});

test('createRequest contests an existing pending claim', async () => {
  reset();
  handler = async (sql) => {
    if (sql.startsWith('INSERT INTO legacy_box_link_requests')) {
      return { rows: [{ ...baseRequest, id: 'req-2', status: 'CONTESTED' }] };
    }
    if (sql.includes("UPPER(legacy_box_number_norm) = $1 AND status = 'PENDING'")) {
      return { rows: [{ ...baseRequest, id: 'req-1', user_id: 'user-2' }] };
    }
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [] };
    if (sql.includes('FROM digital_boxes')) return { rows: [] };
    return { rows: [] };
  };

  const created = await legacyBoxLinkService.createRequest({
    userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: '1234', declaration: true, documentDataUrl: DOCUMENT
  });

  assert.equal(created.status, 'CONTESTED');
  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO legacy_box_link_requests'));
  assert.equal(insert.params[4], 'CONTESTED');
  assert.ok(calls.some((call) => call.sql.includes("status = 'CONTESTED', contested_at = NOW()")));
  const notice = calls.find((call) => call.sql.includes('INSERT INTO notifications'));
  assert.match(notice.params[1], /contested/i);
});

test('createRequest stores the object key when storage is configured', async () => {
  reset();
  documentStorage.storeDocument = async ({ userId, kind, mimeType }) => ({
    key: `documents/${kind}/${userId}/evidence.png`,
    hash: 'h'.repeat(64),
    mimeType,
    byteLength: 18
  });
  handler = async (sql) => {
    if (sql.startsWith('INSERT INTO legacy_box_link_requests')) {
      return { rows: [{ ...baseRequest, status: 'PENDING' }] };
    }
    if (sql.includes("UPPER(legacy_box_number_norm) = $1 AND status = 'PENDING'")) return { rows: [] };
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [] };
    if (sql.includes('FROM digital_boxes')) return { rows: [] };
    return { rows: [] };
  };

  try {
    await legacyBoxLinkService.createRequest({
      userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: '1234', declaration: true, documentDataUrl: DOCUMENT
    });

    const insert = calls.find((call) => call.sql.startsWith('INSERT INTO legacy_box_link_requests'));
    assert.equal(insert.params[7], 'documents/legacy-box-link/user-1/evidence.png');
    assert.match(insert.params[8], /^[a-f0-9]{64}$/);
  } finally {
    documentStorage.storeDocument = originalStoreDocument;
  }
});

test('approveRequest links the box and retires competing open claims', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [baseRequest] };
    if (sql.includes("status = 'APPROVED', reviewed_by")) return { rows: [{ ...baseRequest, status: 'APPROVED' }] };
    if (sql.includes('UPDATE digital_boxes')) return { rows: [{ id: 'box-1', box_number: 'HBX-0001', legacy_box_status: 'APPROVED' }] };
    return { rows: [] };
  };

  const result = await legacyBoxLinkService.approveRequest({ requestId: 'req-1', reviewerId: 'nipost-1' });

  assert.equal(result.box.legacy_box_status, 'APPROVED');
  assert.ok(calls.some((call) => call.sql.includes('INSERT INTO audit_logs')));
  const competing = calls.find((call) => call.sql.includes('Another claim for this P.O. Box number was approved.'));
  assert.ok(competing, 'competing claim should be retired');
  const approved = calls.find((call) => call.sql.includes("status = 'APPROVED', reviewed_by"));
  assert.match(approved.sql, /CASE WHEN \$6::text IS NOT NULL/);
});

test('approveRequest charges the configured fee and records both line items', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [baseRequest] };
    if (sql.includes('FROM wallets')) return { rows: [{ id: 'w-1', balance_ngn: '5000.00' }] };
    if (sql.includes("status = 'APPROVED', reviewed_by")) return { rows: [{ ...baseRequest, status: 'APPROVED' }] };
    if (sql.includes('UPDATE digital_boxes')) return { rows: [{ id: 'box-1', box_number: 'HBX-0001' }] };
    return { rows: [] };
  };

  await legacyBoxLinkService.approveRequest({
    requestId: 'req-1',
    reviewerId: 'nipost-1',
    charge: { totalNgn: 2500, nipostFeeNgn: 2000, hotboxFeeNgn: 500 }
  });

  const txns = calls.filter((call) => call.sql.includes('INSERT INTO transactions'));
  assert.equal(txns.length, 2);
  assert.equal(txns[0].params[1], 'LEGACY_LINK_FEE');
  assert.equal(txns[0].params[2], 2000);
  assert.equal(txns[1].params[1], 'LEGACY_LINK_PLATFORM_FEE');
  assert.equal(txns[1].params[2], 500);

  const walletUpdate = calls.find((call) => call.sql.includes('UPDATE wallets SET balance_ngn'));
  assert.equal(walletUpdate.params[0], 2500);

  const approved = calls.find((call) => call.sql.includes("status = 'APPROVED', reviewed_by"));
  assert.equal(approved.params[3], 2500);
  assert.match(approved.params[4], /^LEGACY-LINK-/);
});

test('approveRequest refuses approval when the wallet cannot cover the fee', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [baseRequest] };
    if (sql.includes('FROM wallets')) return { rows: [{ id: 'w-1', balance_ngn: '100.00' }] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.approveRequest({
      requestId: 'req-1',
      reviewerId: 'nipost-1',
      charge: { totalNgn: 2500, nipostFeeNgn: 2000, hotboxFeeNgn: 500 }
    }),
    (err) => err.status === 402 && err.required === 2500
  );
  assert.ok(!calls.some((call) => call.sql.includes('UPDATE digital_boxes')));
});

test('approveRequest refuses a request that is not pending', async () => {
  reset();
  clientHandler = async () => ({ rows: [{ ...baseRequest, status: 'APPROVED' }] });

  await assert.rejects(
    () => legacyBoxLinkService.approveRequest({ requestId: 'req-1', reviewerId: 'nipost-1' }),
    (err) => err.status === 409
  );
});

test('rejectRequest requires a reason', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [baseRequest] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.rejectRequest({ requestId: 'req-1', reviewerId: 'nipost-1', reason: '   ' }),
    /rejection reason/i
  );
});

test('revokeRequest clears the approved link and audits it', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [{ ...baseRequest, status: 'APPROVED' }] };
    if (sql.includes('UPDATE digital_boxes')) {
      return { rows: [{ id: 'box-1', box_number: 'HBX-0001', legacy_box_status: 'UNLINKED' }] };
    }
    if (sql.includes("status = 'REVOKED', reviewed_by")) return { rows: [{ ...baseRequest, status: 'REVOKED' }] };
    return { rows: [] };
  };

  const result = await legacyBoxLinkService.revokeRequest({
    requestId: 'req-1', reviewerId: 'nipost-1', reason: 'Ownership disputed'
  });

  assert.equal(result.request.status, 'REVOKED');
  const boxUpdate = calls.find((call) => call.sql.includes('UPDATE digital_boxes'));
  assert.match(boxUpdate.sql, /legacy_box_status = 'UNLINKED'/);
  assert.match(boxUpdate.sql, /legacy_box_number_norm = NULL/);
  const audit = calls.find((call) => call.sql.includes('INSERT INTO audit_logs'));
  assert.equal(audit.params[1], 'LEGACY_LINK_REVOKED');
});

test('revokeRequest refuses a request that is not approved', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [baseRequest] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.revokeRequest({ requestId: 'req-1', reviewerId: 'nipost-1', reason: 'x' }),
    (err) => err.status === 409
  );
});

test('revokeRequest requires a reason', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [{ ...baseRequest, status: 'APPROVED' }] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.revokeRequest({ requestId: 'req-1', reviewerId: 'nipost-1', reason: '  ' }),
    /revocation reason/i
  );
});

test('withdrawRequest closes an open claim', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes("status = 'WITHDRAWN'")) return { rows: [{ ...baseRequest, status: 'WITHDRAWN' }] };
    return { rows: [] };
  };

  const withdrawn = await legacyBoxLinkService.withdrawRequest({ requestId: 'req-1', userId: 'user-1' });
  assert.equal(withdrawn.status, 'WITHDRAWN');

  reset();
  handler = async () => ({ rows: [] });
  await assert.rejects(
    () => legacyBoxLinkService.withdrawRequest({ requestId: 'req-1', userId: 'user-1' }),
    (err) => err.status === 409
  );
});

test('findLegacyLinkState reports APPROVED only for a linked box', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('FROM digital_boxes')) return { rows: [{ id: 'box-1', legacy_box_status: 'APPROVED' }] };
    return { rows: [] };
  };
  assert.equal((await legacyBoxLinkService.findLegacyLinkState('P.O. Box 1234')).state, 'APPROVED');

  reset();
  handler = async () => ({ rows: [] });
  assert.equal((await legacyBoxLinkService.findLegacyLinkState('1234')).state, 'UNKNOWN');
});

test('findLegacyLinkState reports PENDING while a claim awaits NIPOST', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('FROM digital_boxes')) return { rows: [] };
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [{ status: 'PENDING' }] };
    return { rows: [] };
  };

  const state = await legacyBoxLinkService.findLegacyLinkState('P.O. Box 1234');
  assert.equal(state.state, 'PENDING');
  assert.equal(state.box, null);
});

test('findLegacyLinkState reports NOT_APPROVED for a decided claim', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('FROM digital_boxes')) return { rows: [] };
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [{ status: 'REJECTED' }] };
    return { rows: [] };
  };
  assert.equal((await legacyBoxLinkService.findLegacyLinkState('1234')).state, 'NOT_APPROVED');
});

test('getOpenRequestForUser returns the pending claim', async () => {
  reset();
  handler = async () => ({ rows: [baseRequest] });
  const open = await legacyBoxLinkService.getOpenRequestForUser('user-1');
  assert.equal(open.id, 'req-1');
  assert.match(calls[0].sql, /status IN \('PENDING', 'CONTESTED'\)/);
});

test('getLatestRequestForUser returns the newest request regardless of status', async () => {
  reset();
  handler = async () => ({ rows: [{ ...baseRequest, status: 'REJECTED' }] });
  const latest = await legacyBoxLinkService.getLatestRequestForUser('user-1');
  assert.equal(latest.status, 'REJECTED');
  assert.match(calls[0].sql, /ORDER BY submitted_at DESC LIMIT 1/);
});

test('getRequestById returns the request or null', async () => {
  reset();
  handler = async () => ({ rows: [baseRequest] });
  assert.equal((await legacyBoxLinkService.getRequestById('req-1')).id, 'req-1');

  reset();
  handler = async () => ({ rows: [] });
  assert.equal(await legacyBoxLinkService.getRequestById('missing'), null);
});

test('listRequests applies the status filter, pagination and claim counts', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('SELECT count(*)::int AS total')) return { rows: [{ total: 7 }] };
    if (sql.includes('FROM legacy_box_link_requests r')) {
      return { rows: [{ ...baseRequest, user_name: 'Obed Uchenna', user_email: 'obed@x.com', user_phone: '09063085415', box_number: 'HBX-0001', open_claims: 2 }] };
    }
    return { rows: [] };
  };

  const result = await legacyBoxLinkService.listRequests({ status: 'PENDING', search: 'P.O. Box 1234', limit: 10, offset: 0 });
  assert.equal(result.total, 7);
  assert.equal(result.rows[0].box_number, 'HBX-0001');
  assert.equal(result.rows[0].open_claims, 2);

  const rowsCall = calls.find((call) => call.sql.includes('LIMIT $'));
  assert.match(rowsCall.sql, /LIMIT \$3 OFFSET \$4/);
  assert.equal(rowsCall.params[2], 10);
  assert.equal(rowsCall.params[3], 0);
  assert.match(rowsCall.sql, /UPPER\(o\.legacy_box_number_norm\) = UPPER\(r\.legacy_box_number_norm\)/);
});

test('expireOverdueRequests closes requests past their expiry', async () => {
  reset();
  handler = async () => ({ rows: [{ id: 'req-1' }, { id: 'req-2' }] });
  const expired = await legacyBoxLinkService.expireOverdueRequests();
  assert.equal(expired, 2);
  assert.match(calls[0].sql, /expires_at < NOW\(\)/);
});

test('runMaintenance expires overdue claims and reminds the rest', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('expires_at < NOW()')) return { rows: [{ id: 'req-1' }] };
    if (sql.includes('reminder_sent_at IS NULL')) {
      return { rows: [{ ...baseRequest, user_id: 'user-1', expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }] };
    }
    return { rows: [] };
  };

  const result = await legacyBoxLinkService.runMaintenance();
  assert.equal(result.expired, 1);
  assert.equal(result.reminded, 1);
  const notice = calls.find((call) => call.sql.includes('INSERT INTO notifications'));
  assert.match(notice.params[1], /awaiting NIPOST/i);
  assert.ok(calls.some((call) => call.sql.includes('reminder_sent_at = NOW()')));
});

test('getApprovalCharge reads the configured fees', async () => {
  settingsService.getLegacyBoxLinkFees = async () => ({
    nipostVerificationFeeNgn: 2000,
    hotboxPlatformFeeNgn: 500,
    totalNgn: 2500
  });
  const charge = await legacyBoxLinkService.getApprovalCharge();
  assert.equal(charge.nipostFeeNgn, 2000);
  assert.equal(charge.hotboxFeeNgn, 500);
  assert.equal(charge.totalNgn, 2500);
});

test('approveRequest reports a missing request', async () => {
  reset();
  clientHandler = async () => ({ rows: [] });
  await assert.rejects(
    () => legacyBoxLinkService.approveRequest({ requestId: 'missing', reviewerId: 'nipost-1' }),
    (err) => err.status === 404
  );
});

test('rejectRequest records the decision and audits it', async () => {
  reset();
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [baseRequest] };
    if (sql.includes("status = 'REJECTED', reviewed_by")) return { rows: [{ ...baseRequest, status: 'REJECTED', review_note: 'Name mismatch' }] };
    return { rows: [] };
  };

  const rejected = await legacyBoxLinkService.rejectRequest({
    requestId: 'req-1', reviewerId: 'nipost-1', reason: 'Name mismatch'
  });
  assert.equal(rejected.status, 'REJECTED');
  const audit = calls.find((call) => call.sql.includes('INSERT INTO audit_logs'));
  assert.equal(audit.params[1], 'LEGACY_LINK_REJECTED');
});

test('autoVerifyRequest approves and records the registry source on a match', async () => {
  reset();
  settingsService.getNipostRegistry = async () => ({ enabled: true, matchPolicy: 'name_or_phone' });
  nipostRegistryService.verifyOwnership = async () => ({
    match: true, configured: true, source: 'NIPOST_REGISTRY', reference: 'NIPOST-REF-9',
    reason: 'Owner name matched the NIPOST registry.'
  });
  settingsService.getLegacyBoxLinkFees = async () => ({
    nipostVerificationFeeNgn: 0, hotboxPlatformFeeNgn: 0, totalNgn: 0
  });

  handler = async (sql) => {
    if (sql.includes('SELECT name, phone FROM users')) return { rows: [{ name: 'Obed Uchenna', phone: '08108525262' }] };
    if (sql.includes('SELECT * FROM legacy_box_link_requests WHERE id = $1')) return { rows: [baseRequest] };
    return { rows: [] };
  };
  clientHandler = async (sql) => {
    if (sql.includes('FOR UPDATE')) return { rows: [baseRequest] };
    if (sql.includes("status = 'APPROVED', reviewed_by")) return { rows: [{ ...baseRequest, status: 'APPROVED', registry_source: 'NIPOST_REGISTRY' }] };
    if (sql.includes('UPDATE digital_boxes')) return { rows: [{ id: 'box-1', box_number: 'HBX-0001', legacy_box_status: 'APPROVED' }] };
    return { rows: [] };
  };

  const result = await legacyBoxLinkService.autoVerifyRequest({ requestId: 'req-1', reviewerId: 'nipost-1' });
  assert.equal(result.request.status, 'APPROVED');
  assert.equal(result.verdict.match, true);

  const approved = calls.find((call) => call.sql.includes("status = 'APPROVED', reviewed_by"));
  assert.equal(approved.params[5], 'NIPOST_REGISTRY');
  assert.equal(approved.params[6], 'NIPOST-REF-9');
});

test('autoVerifyRequest leaves a non-matching claim for a human reviewer', async () => {
  reset();
  settingsService.getNipostRegistry = async () => ({ enabled: true, matchPolicy: 'name_or_phone' });
  nipostRegistryService.verifyOwnership = async () => ({
    match: false, configured: true, source: null, reference: null,
    reason: 'No NIPOST registry record matched this claim.'
  });
  handler = async (sql) => {
    if (sql.includes('SELECT name, phone FROM users')) return { rows: [{ name: 'Obed Uchenna' }] };
    if (sql.includes('SELECT * FROM legacy_box_link_requests WHERE id = $1')) return { rows: [baseRequest] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.autoVerifyRequest({ requestId: 'req-1', reviewerId: 'nipost-1' }),
    (err) => err.status === 409 && err.verdict && err.verdict.match === false
  );

  const audit = calls.find((call) => call.sql.includes('INSERT INTO audit_logs'));
  assert.equal(audit.params[1], 'LEGACY_LINK_REGISTRY_NO_MATCH');
});

test('autoVerifyRequest refuses when the registry is not configured', async () => {
  reset();
  settingsService.getNipostRegistry = async () => ({ enabled: true, matchPolicy: 'name_or_phone' });
  nipostRegistryService.verifyOwnership = async () => ({
    match: false, configured: false, reason: 'NIPOST registry is not configured.'
  });
  handler = async (sql) => {
    if (sql.includes('SELECT name, phone FROM users')) return { rows: [{ name: 'Obed Uchenna' }] };
    if (sql.includes('SELECT * FROM legacy_box_link_requests WHERE id = $1')) return { rows: [baseRequest] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.autoVerifyRequest({ requestId: 'req-1', reviewerId: 'nipost-1' }),
    (err) => err.status === 503
  );
});

test('recordRemittance stores NIPOST and Hotbox amounts separately and is idempotent', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('GROUP BY t.transaction_type')) {
      return { rows: [
        { transaction_type: 'LEGACY_LINK_FEE', line_count: 1, amount_ngn: 2000 },
        { transaction_type: 'LEGACY_LINK_PLATFORM_FEE', line_count: 1, amount_ngn: 500 }
      ] };
    }
    if (sql.includes('INSERT INTO legacy_link_remittances')) return { rows: [{ id: 'rem-1', status: 'RECORDED' }] };
    return { rows: [] };
  };

  const first = await legacyBoxLinkService.recordRemittance({
    from: '2026-11-01', to: '2026-11-30', reviewerId: 'ops-1', reference: 'REM-1'
  });
  assert.equal(first.created, true);
  assert.equal(first.remittance.id, 'rem-1');

  const insert = calls.find((call) => call.sql.includes('INSERT INTO legacy_link_remittances'));
  assert.equal(insert.params[2], 2000);
  assert.equal(insert.params[3], 500);
  assert.equal(insert.params[4], 2500);

  reset();
  handler = async (sql) => {
    if (sql.includes('GROUP BY t.transaction_type')) {
      return { rows: [{ transaction_type: 'LEGACY_LINK_FEE', line_count: 1, amount_ngn: 2000 }] };
    }
    if (sql.includes('INSERT INTO legacy_link_remittances')) return { rows: [] };
    if (sql.includes('SELECT * FROM legacy_link_remittances WHERE period_start')) {
      return { rows: [{ id: 'rem-1', status: 'RECORDED' }] };
    }
    return { rows: [] };
  };

  const second = await legacyBoxLinkService.recordRemittance({
    from: '2026-11-01', to: '2026-11-30', reviewerId: 'ops-1'
  });
  assert.equal(second.created, false);
});

test('summarizeRemittance rejects an invalid period', async () => {
  reset();
  await assert.rejects(
    () => legacyBoxLinkService.summarizeRemittance({ from: 'not-a-date', to: '2026-11-30' }),
    (err) => err.status === 400
  );
});

test('autoVerifyRequest refuses when the registry toggle is disabled', async () => {
  reset();
  settingsService.getNipostRegistry = async () => ({ enabled: false, matchPolicy: 'name_or_phone' });
  handler = async (sql) => {
    if (sql.includes('SELECT * FROM legacy_box_link_requests WHERE id = $1')) return { rows: [baseRequest] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.autoVerifyRequest({ requestId: 'req-1', reviewerId: 'nipost-1' }),
    (err) => err.status === 503 && /disabled/i.test(err.message)
  );
  assert.ok(!calls.some((call) => call.sql.includes('INSERT INTO audit_logs')));
});
