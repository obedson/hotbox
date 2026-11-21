const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const ridersRouter = require('../../src/routes/riders');
const db = require('../../src/config/db');

const originalQuery = db.query;
after(() => { db.query = originalQuery; });

function handlerFor(method, path) {
  const layer = ridersRouter.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

const credentialColumns = /pickup_otp|delivery_otp|collection_qr_token/;

async function callRoute(path, user) {
  const calls = [];
  db.query = async (sql) => {
    calls.push(sql);
    if (/FROM riders WHERE user_id = \$1/.test(sql)) return { rows: [{ id: 'rider-1' }] };
    return { rows: [] };
  };

  const outcome = { statusCode: null, body: null };
  const res = {
    status(code) { outcome.statusCode = code; return this; },
    json(payload) { outcome.body = payload; return this; }
  };

  await handlerFor('get', path)({ user, query: {} }, res, () => {});
  return { outcome, calls };
}

function shipmentQuery(calls) {
  const sql = calls.find((entry) => /FROM shipments s/.test(entry));
  assert.ok(sql, 'expected a shipment query');
  return sql;
}

test('rider job radar never selects custody credentials', async () => {
  await callRoute('/radar/jobs', { id: 'user-1', role: 'rider' }).then(({ calls }) => {
    const sql = shipmentQuery(calls);
    assert.match(sql, /s\.id/);
    assert.match(sql, /s\.tracking_code/);
    assert.doesNotMatch(sql, /s\.\*/);
    assert.doesNotMatch(sql, credentialColumns);
  });
});

test('rider active jobs never selects custody credentials', async () => {
  await callRoute('/me/jobs', { id: 'user-1', role: 'rider' }).then(({ calls }) => {
    const sql = shipmentQuery(calls);
    assert.match(sql, /s\.id/);
    assert.match(sql, /s\.tracking_code/);
    assert.doesNotMatch(sql, /s\.\*/);
    assert.doesNotMatch(sql, credentialColumns);
  });
});

test('rider job payloads still carry the fields the console renders', async () => {
  await callRoute('/radar/jobs', { id: 'user-1', role: 'rider' }).then(({ calls }) => {
    const sql = shipmentQuery(calls);
    for (const column of ['s.status', 's.service_type', 's.size', 's.weight_kg', 's.pricing_total_ngn']) {
      assert.match(sql, new RegExp(column.replace('.', '\\.')));
    }
  });
});