const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const ridersRouter = require('../../src/routes/riders');
const db = require('../../src/config/db');

const originalQuery = db.query;
after(() => { db.query = originalQuery; });

const rider = {
  id: 'rider-1',
  user_id: 'user-1',
  vehicle_type: 'motorcycle',
  plate_number: 'ABJ-432-QA',
  drivers_license_no: 'DL-PENDING',
  nin: null,
  operational_postcodes: ['FC-01-A03-FK-01'],
  status: 'pending'
};

const tinyPng = 'data:image/png;base64,' + Buffer.from('hotbox-rider-kyc').toString('base64');

function handlerFor(method, path) {
  const layer = ridersRouter.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack[0].handle;
}

async function call(handler, { user = { id: 'user-1', role: 'rider' }, body = {} } = {}) {
  const outcome = { statusCode: null, body: null };
  const res = {
    status(code) { outcome.statusCode = code; return this; },
    json(payload) { outcome.body = payload; return this; }
  };
  await handler({ user, body }, res, () => {});
  return outcome;
}

function fakeDb({ riderRow = rider, userRow = { postcode: 'FC-01-A03-FK-01', phone: '+2348108525262' }, inserted = null, settingsRow = null } = {}) {
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    if (/FROM riders WHERE user_id = \$1/.test(sql)) return { rows: riderRow ? [riderRow] : [] };
    if (/SELECT postcode, phone FROM users/.test(sql)) return { rows: userRow ? [userRow] : [] };
    if (/FROM system_settings/.test(sql)) return { rows: settingsRow ? [settingsRow] : [] };
    if (/FROM verification_records/.test(sql)) return { rows: [{ id: 'rec-1', status: 'PENDING' }] };
    if (/INSERT INTO verification_records/.test(sql)) return { rows: inserted ? [inserted] : [] };
    return { rows: [] };
  };
  return calls;
}

test('the KYC routes exist and are not behind the dispatch gate', () => {
  for (const [method, path] of [
    ['get', '/verification'],
    ['patch', '/profile'],
    ['post', '/verification/documents']
  ]) {
    const layer = ridersRouter.stack.find(
      (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
    );
    assert.ok(layer, `${method.toUpperCase()} ${path} should exist`);
    assert.equal(
      layer.route.stack.length, 1,
      `${method.toUpperCase()} ${path} must stay reachable while the rider is unverified`
    );
  }
});

test('GET /verification returns the rider profile and their Track B records', async () => {
  const calls = fakeDb();
  const outcome = await call(handlerFor('get', '/verification'));

  assert.equal(outcome.statusCode, null);
  assert.equal(outcome.body.profile.nin, null);
  assert.equal(outcome.body.profile.driversLicenseNo, 'DL-PENDING');
  assert.equal(outcome.body.profile.vehicleType, 'motorcycle');
  assert.equal(outcome.body.profile.status, 'pending');
  assert.deepEqual(outcome.body.profile.operationalPostcodes, ['FC-01-A03-FK-01']);
  assert.equal(outcome.body.profile.phone, '+2348108525262');
  assert.equal(outcome.body.records.length, 1);
  assert.match(calls.find((c) => /FROM verification_records/.test(c.sql)).sql, /entity_type = 'rider'/) ;
  assert.deepEqual(calls.find((c) => /FROM verification_records/.test(c.sql)).params, ['rider-1']);
});

test('GET /verification reports a missing rider profile', async () => {
  fakeDb({ riderRow: null });
  const outcome = await call(handlerFor('get', '/verification'));
  assert.equal(outcome.statusCode, 404);
});

test('GET /verification surfaces the administrator-set registration fee', async () => {
  fakeDb({ settingsRow: { setting_value: { registration_fee_ngn: 2500 } } });
  const outcome = await call(handlerFor('get', '/verification'));
  assert.equal(outcome.body.profile.registrationFeeNgn, 2500);
  assert.equal(outcome.body.profile.registrationFeePaid, false);
});

test('GET /verification reports a settled registration fee', async () => {
  fakeDb({
    settingsRow: { setting_value: { registration_fee_ngn: 2500 } },
    riderRow: { ...rider, registration_fee_paid_at: '2026-01-01T00:00:00.000Z' }
  });
  const outcome = await call(handlerFor('get', '/verification'));
  assert.equal(outcome.body.profile.registrationFeeNgn, 2500);
  assert.equal(outcome.body.profile.registrationFeePaid, true);
});

test('PATCH /profile rejects a malformed NIN', async () => {
  const calls = fakeDb();
  const outcome = await call(handlerFor('patch', '/profile'), { body: { nin: '12345' } });
  assert.equal(outcome.statusCode, 400);
  assert.match(outcome.body.error, /11-digit NIN/);
  assert.equal(calls.length, 0);
});

test('PATCH /profile rejects an unknown vehicle type', async () => {
  const outcome = await call(handlerFor('patch', '/profile'), { body: { vehicleType: 'canoe' } });
  assert.equal(outcome.statusCode, 400);
  assert.match(outcome.body.error, /valid vehicle type/);
});

test('PATCH /profile writes only the supplied fields and audits the change', async () => {
  const calls = fakeDb();
  const outcome = await call(handlerFor('patch', '/profile'), {
    body: { nin: '12345678901', driversLicenseNo: 'DL-998877', plateNumber: 'ABJ-432-QA' }
  });

  assert.equal(outcome.statusCode, null);
  assert.equal(outcome.body.rider.id, 'rider-1');

  const update = calls.find((c) => /^UPDATE riders SET/.test(c.sql));
  assert.match(update.sql, /nin = \$1/);
  assert.match(update.sql, /drivers_license_no = \$2/);
  assert.match(update.sql, /plate_number = \$3/);
  assert.deepEqual(update.params, ['12345678901', 'DL-998877', 'ABJ-432-QA', 'rider-1']);

  const audit = calls.find((c) => /INSERT INTO audit_logs/.test(c.sql));
  assert.match(audit.sql, /RIDER_KYC_UPDATED/);
  assert.deepEqual(audit.params[0], 'user-1');
});

test('PATCH /profile stores the home postcode on the user', async () => {
  const calls = fakeDb();
  await call(handlerFor('patch', '/profile'), { body: { postcode: 'FC-01-A02-FK-02' } });
  const userUpdate = calls.find((c) => /UPDATE users SET postcode/.test(c.sql));
  assert.ok(userUpdate, 'users.postcode should be updated');
  assert.deepEqual(userUpdate.params, ['FC-01-A02-FK-02', 'user-1']);
});

test('PATCH /profile rejects an invalid phone number', async () => {
  const calls = fakeDb();
  const outcome = await call(handlerFor('patch', '/profile'), { body: { phone: '12345' } });
  assert.equal(outcome.statusCode, 400);
  assert.match(outcome.body.error, /valid phone number/);
  assert.equal(calls.length, 0);
});

test('PATCH /profile stores a normalised phone number on the user', async () => {
  const calls = fakeDb();
  const outcome = await call(handlerFor('patch', '/profile'), { body: { phone: '08108525262' } });
  assert.equal(outcome.statusCode, null);
  const userUpdate = calls.find((c) => /UPDATE users SET phone/.test(c.sql));
  assert.ok(userUpdate, 'users.phone should be updated');
  assert.deepEqual(userUpdate.params, ['+2348108525262', 'user-1']);
});

test('PATCH /profile refuses a phone number already registered to another account', async () => {
  db.query = async (sql) => {
    if (/FROM riders WHERE user_id = \$1/.test(sql)) return { rows: [rider] };
    if (/SELECT id FROM users WHERE phone = \$1 AND id <> \$2/.test(sql)) return { rows: [{ id: 'user-2' }] };
    return { rows: [] };
  };
  const outcome = await call(handlerFor('patch', '/profile'), { body: { phone: '+2348108525262' } });
  assert.equal(outcome.statusCode, 409);
  assert.match(outcome.body.error, /already registered/);
});

test('document submission rejects a type outside rider verification', async () => {
  const outcome = await call(handlerFor('post', '/verification/documents'), {
    body: { documentType: 'CAC_CERTIFICATE', documentUrl: tinyPng }
  });
  assert.equal(outcome.statusCode, 400);
  assert.match(outcome.body.error, /belongs to rider verification/);
});

test('document submission rejects an unreadable attachment', async () => {
  const outcome = await call(handlerFor('post', '/verification/documents'), {
    body: { documentType: 'NIN', documentNumber: '12345678901', documentUrl: 'https://example.com/nin.png' }
  });
  assert.equal(outcome.statusCode, 400);
  assert.match(outcome.body.error, /attach a proof document/);
});

test('document submission rejects a malformed NIN number', async () => {
  const outcome = await call(handlerFor('post', '/verification/documents'), {
    body: { documentType: 'NIN', documentNumber: '12345', documentUrl: tinyPng }
  });
  assert.equal(outcome.statusCode, 400);
  assert.match(outcome.body.error, /11-digit NIN/);
});

test('document submission stores a PENDING Track B record', async () => {
  const calls = fakeDb({ inserted: { id: 'rec-9', status: 'PENDING' } });
  const outcome = await call(handlerFor('post', '/verification/documents'), {
    body: { documentType: 'NIN', documentNumber: '12345678901', documentUrl: tinyPng }
  });

  assert.equal(outcome.statusCode, 201);
  assert.equal(outcome.body.record.id, 'rec-9');

  const insert = calls.find((c) => /INSERT INTO verification_records/.test(c.sql));
  assert.match(insert.sql, /TRACK_B_REGULATORY/);
  assert.equal(insert.params[0], 'rider-1');
  assert.equal(insert.params[1], 'NIN');
  assert.equal(insert.params[2], '12345678901');
  assert.equal(insert.params[3], tinyPng);

  const audit = calls.find((c) => /INSERT INTO audit_logs/.test(c.sql));
  assert.match(audit.sql, /RIDER_KYC_DOCUMENT_SUBMITTED/);
});

test('a NIN document fills an empty profile NIN', async () => {
  const calls = fakeDb();
  await call(handlerFor('post', '/verification/documents'), {
    body: { documentType: 'NIN', documentNumber: '12345678901', documentUrl: tinyPng }
  });
  const mirror = calls.find((c) => /UPDATE riders SET nin/.test(c.sql));
  assert.ok(mirror, 'the profile NIN should be filled from the document');
  assert.deepEqual(mirror.params, ['12345678901', 'rider-1']);
});

test('a licence document replaces only the placeholder licence', async () => {
  const calls = fakeDb({ riderRow: { ...rider, drivers_license_no: 'DL-REAL-1' } });
  await call(handlerFor('post', '/verification/documents'), {
    body: { documentType: 'DRIVERS_LICENSE', documentNumber: 'DL-998877', documentUrl: tinyPng }
  });
  assert.equal(
    calls.find((c) => /UPDATE riders SET drivers_license_no/.test(c.sql)),
    undefined,
    'an existing licence number must not be overwritten'
  );
});
