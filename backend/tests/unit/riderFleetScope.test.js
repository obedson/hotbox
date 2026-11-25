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

function responder() {
  const outcome = { statusCode: null, body: null };
  const res = {
    status(code) { outcome.statusCode = code; return this; },
    json(payload) { outcome.body = payload; return this; }
  };
  return { outcome, res };
}

test('a logistics partner radar is scoped to its own fleet', async () => {
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    if (/FROM courier_companies/.test(sql)) return { rows: [{ id: 'co-1' }] };
    return { rows: [] };
  };

  const { outcome, res } = responder();
  await handlerFor('get', '/radar/jobs')({ user: { id: 'user-1', role: 'logistics_partner' }, query: {} }, res, () => {});
  assert.equal(outcome.statusCode, null);

  const shipmentCall = calls.find((entry) => /FROM shipments s/.test(entry.sql));
  assert.ok(shipmentCall, 'expected a shipment query');
  assert.match(shipmentCall.sql, /assigned_rider_id IN \(SELECT id FROM riders WHERE courier_id = \$1\)/);
  assert.deepEqual(shipmentCall.params, ['co-1']);
});

test('a logistics partner with no company record sees no jobs at all', async () => {
  const calls = [];
  db.query = async (sql) => {
    calls.push({ sql });
    if (/FROM courier_companies/.test(sql)) return { rows: [] };
    return { rows: [] };
  };

  const { outcome, res } = responder();
  await handlerFor('get', '/radar/jobs')({ user: { id: 'user-1', role: 'logistics_partner' }, query: {} }, res, () => {});
  assert.deepEqual(outcome.body, { jobs: [], total: 0 });
  assert.equal(calls.some((entry) => /FROM shipments s/.test(entry.sql)), false);
});

test('a logistics partner cannot accept a dispatch job', async () => {
  let queried = false;
  db.query = async () => { queried = true; return { rows: [] }; };

  const { outcome, res } = responder();
  await handlerFor('post', '/jobs/:id/accept')(
    { user: { id: 'user-1', role: 'logistics_partner' }, params: { id: 'ship-1' } },
    res,
    () => {}
  );
  assert.equal(outcome.statusCode, 403);
  assert.match(outcome.body.error, /only a verified rider/i);
  assert.equal(queried, false);
});

test('a rider radar request is left untouched by fleet scoping', async () => {
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [] };
  };

  const { outcome, res } = responder();
  await handlerFor('get', '/radar/jobs')({ user: { id: 'user-1', role: 'rider' }, query: {} }, res, () => {});
  assert.equal(outcome.statusCode, null);
  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0].sql, /courier_id/);
});