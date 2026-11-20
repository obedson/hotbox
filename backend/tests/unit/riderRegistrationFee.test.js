const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const ridersRouter = require('../../src/routes/riders');
const db = require('../../src/config/db');
const { PLACEHOLDER_LICENCE, missingRiderClearance } = require('../../src/utils/riderClearance');

const originalQuery = db.query;
const originalGetClient = db.getClient;
after(() => { db.query = originalQuery; db.getClient = originalGetClient; });

const baseRider = {
  id: 'rider-1',
  user_id: 'user-1',
  vehicle_type: 'motorcycle',
  plate_number: 'ABJ-432-QA',
  drivers_license_no: 'DL-REAL-1',
  nin: '12345678901',
  operational_postcodes: ['FC-01-A03-FK-01'],
  status: 'pending',
  registration_fee_paid_at: null
};

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

// Stubs both the pool and the dedicated transaction client, recording statements.
function fakeDb({ riderRow = baseRider, walletRow = null, feeNgn = 0 } = {}) {
  const calls = [];
  const clientCalls = [];
  const client = {
    query: async (sql, params) => {
      clientCalls.push({ sql, params });
      return { rows: [] };
    },
    release: () => {}
  };
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    if (/FROM riders WHERE user_id = \$1/.test(sql)) return { rows: riderRow ? [riderRow] : [] };
    if (/FROM system_settings/.test(sql)) return { rows: [{ setting_value: { registration_fee_ngn: feeNgn } }] };
    if (/FROM wallets WHERE user_id = \$1/.test(sql)) return { rows: walletRow ? [walletRow] : [] };
    return { rows: [] };
  };
  db.getClient = async () => client;
  return { calls, clientCalls };
}

test('missingRiderClearance is empty for a fully evidenced, paid rider', () => {
  assert.deepEqual(
    missingRiderClearance({
      rider: baseRider,
      postcode: 'FC-01-A03-FK-01',
      registrationFeeNgn: 2500,
      registrationFeePaid: true
    }),
    []
  );
});

test('missingRiderClearance reports every outstanding requirement', () => {
  assert.deepEqual(
    missingRiderClearance({
      rider: { ...baseRider, nin: null, drivers_license_no: PLACEHOLDER_LICENCE },
      postcode: null,
      registrationFeeNgn: 2500,
      registrationFeePaid: false
    }),
    ['NIN', "driver's licence number", 'home postcode', 'registration fee payment']
  );
});

test('missingRiderClearance ignores the fee while it is set to zero', () => {
  assert.deepEqual(
    missingRiderClearance({
      rider: baseRider,
      postcode: 'FC-01-A03-FK-01',
      registrationFeeNgn: 0,
      registrationFeePaid: false
    }),
    []
  );
});

test('POST /registration-fee/pay refuses when no fee is configured', async () => {
  fakeDb({ feeNgn: 0 });
  const outcome = await call(handlerFor('post', '/registration-fee/pay'));
  assert.equal(outcome.statusCode, 400);
  assert.match(outcome.body.error, /No rider registration fee is configured/);
});

test('POST /registration-fee/pay refuses a duplicate payment', async () => {
  fakeDb({ feeNgn: 2500, riderRow: { ...baseRider, registration_fee_paid_at: '2026-01-01T00:00:00.000Z' } });
  const outcome = await call(handlerFor('post', '/registration-fee/pay'));
  assert.equal(outcome.statusCode, 409);
  assert.match(outcome.body.error, /already been paid/);
});

test('POST /registration-fee/pay refuses an underfunded wallet', async () => {
  fakeDb({ feeNgn: 2500, walletRow: { id: 'wallet-1', balance_ngn: '1000.00' } });
  const outcome = await call(handlerFor('post', '/registration-fee/pay'));
  assert.equal(outcome.statusCode, 400);
  assert.equal(outcome.body.required, 2500);
  assert.equal(outcome.body.currentBalance, 1000);
});

test('POST /registration-fee/pay settles from the wallet and records the clearance', async () => {
  const { clientCalls } = fakeDb({
    feeNgn: 2500,
    walletRow: { id: 'wallet-1', balance_ngn: '5000.00' }
  });
  const outcome = await call(handlerFor('post', '/registration-fee/pay'));

  assert.equal(outcome.statusCode, null);
  assert.equal(outcome.body.registrationFeePaid, true);
  assert.equal(outcome.body.newBalance, 2500);
  assert.match(outcome.body.reference, /^RIDER-REG-/);

  const debit = clientCalls.find((c) => /UPDATE wallets SET/.test(c.sql));
  assert.deepEqual(debit.params, [2500, 'wallet-1']);

  const txn = clientCalls.find((c) => /INSERT INTO transactions/.test(c.sql));
  assert.equal(txn.params[1], 2500);
  assert.equal(txn.params[2], 5000);
  assert.equal(txn.params[3], 2500);
  assert.equal(txn.params[4], outcome.body.reference);

  const stamp = clientCalls.find((c) => /UPDATE riders SET registration_fee_paid_at/.test(c.sql));
  assert.deepEqual(stamp.params, ['rider-1']);

  const audit = clientCalls.find((c) => /INSERT INTO audit_logs/.test(c.sql));
  assert.match(audit.sql, /RIDER_REGISTRATION_FEE_PAID/);
  assert.deepEqual(audit.params[0], 'user-1');
});