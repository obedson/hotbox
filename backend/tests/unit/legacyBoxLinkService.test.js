const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const legacyBoxLinkService = require('../../src/services/legacyBoxLinkService');

const originalQuery = db.query;
const originalGetClient = db.getClient;

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
});

function reset() {
  calls = [];
  handler = async () => ({ rows: [] });
  clientHandler = async () => ({ rows: [] });
}

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
    () => legacyBoxLinkService.createRequest({ userId: 'u', boxId: 'b', legacyBoxNumberRaw: '  ', declaration: true }),
    /enter your old P.O. Box number/i
  );
});

test('createRequest rejects a submission without the ownership declaration', async () => {
  reset();
  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'u', boxId: 'b', legacyBoxNumberRaw: '1234' }),
    /declaration/i
  );
});

test('createRequest refuses a second open request', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes("status IN ('PENDING', 'CONTESTED')")) return { rows: [baseRequest] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: '1234', declaration: true }),
    (err) => err.status === 409
  );
});

test('createRequest refuses a number already linked to another box', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [] };
    if (sql.includes('FROM digital_boxes')) return { rows: [{ id: 'box-2', user_id: 'someone-else' }] };
    return { rows: [] };
  };

  await assert.rejects(
    () => legacyBoxLinkService.createRequest({ userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: '1234', declaration: true }),
    (err) => err.status === 409
  );
});

test('createRequest stores the raw text, the canonical key and an expiry', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [] };
    if (sql.includes('FROM digital_boxes')) return { rows: [] };
    if (sql.startsWith('INSERT INTO legacy_box_link_requests')) {
      return { rows: [{ ...baseRequest, status: 'PENDING' }] };
    }
    return { rows: [] };
  };

  const created = await legacyBoxLinkService.createRequest({
    userId: 'user-1', boxId: 'box-1', legacyBoxNumberRaw: 'P.O. Box 1234', declaration: true
  });

  assert.equal(created.status, 'PENDING');
  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO legacy_box_link_requests'));
  assert.equal(insert.params[2], 'P.O. Box 1234');
  assert.equal(insert.params[3], '1234');
  assert.equal(insert.params[4], null);
  assert.equal(insert.params[5], true);
  assert.match(insert.sql, /'PENDING'/);
  assert.ok(insert.params[7] instanceof Date);
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
    /reason is required/i
  );
});

test('withdrawRequest only touches the owner open request', async () => {
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

test('listRequests applies the status filter and pagination', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('count(*)::int')) return { rows: [{ total: 7 }] };
    if (sql.includes('FROM legacy_box_link_requests r')) {
      return { rows: [{ ...baseRequest, user_name: 'Obed Uchenna', user_email: 'obed@x.com', user_phone: '09063085415', box_number: 'HBX-0001' }] };
    }
    return { rows: [] };
  };

  const result = await legacyBoxLinkService.listRequests({ status: 'PENDING', search: 'P.O. Box 1234', limit: 10, offset: 0 });
  assert.equal(result.total, 7);
  assert.equal(result.rows[0].box_number, 'HBX-0001');

  const rowsCall = calls.find((call) => call.sql.includes('LIMIT $'));
  assert.match(rowsCall.sql, /LIMIT \$3 OFFSET \$4/);
  assert.equal(rowsCall.params[2], 10);
  assert.equal(rowsCall.params[3], 0);
});

test('expireOverdueRequests closes requests past their expiry', async () => {
  reset();
  handler = async () => ({ rows: [{ id: 'req-1' }, { id: 'req-2' }] });
  const expired = await legacyBoxLinkService.expireOverdueRequests();
  assert.equal(expired, 2);
  assert.match(calls[0].sql, /expires_at < NOW\(\)/);
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

test('findLegacyLinkState reports NOT_APPROVED for a decided claim', async () => {
  reset();
  handler = async (sql) => {
    if (sql.includes('FROM digital_boxes')) return { rows: [] };
    if (sql.includes('FROM legacy_box_link_requests')) return { rows: [{ status: 'REJECTED' }] };
    return { rows: [] };
  };
  assert.equal((await legacyBoxLinkService.findLegacyLinkState('1234')).state, 'NOT_APPROVED');
});