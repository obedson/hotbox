const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const ridersRouter = require('../../src/routes/riders');
const db = require('../../src/config/db');

const { requireVerifiedRider } = ridersRouter;

const originalQuery = db.query;

after(() => {
  db.query = originalQuery;
});

async function probe({ role, rows, fail = false }) {
  let captured = null;
  db.query = async (sql, params) => {
    captured = { sql, params };
    if (fail) throw new Error('db down');
    return { rows: rows || [] };
  };

  const outcome = { nextCalled: false, statusCode: null, body: null };
  const req = { user: { id: 'user-1', role } };
  const res = {
    status(code) { outcome.statusCode = code; return this; },
    json(payload) { outcome.body = payload; return this; }
  };

  await requireVerifiedRider(req, res, () => { outcome.nextCalled = true; });
  outcome.captured = captured;
  return outcome;
}

test('the dispatch routes carry the rider verification gate', () => {
  for (const [method, path] of [
    ['get', '/lookup'],
    ['get', '/radar/jobs'],
    ['post', '/jobs/:id/accept'],
    ['get', '/me/jobs']
  ]) {
    const layer = ridersRouter.stack.find(
      (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
    );
    assert.ok(layer, `${method.toUpperCase()} ${path} should exist`);
    const handles = layer.route.stack.map((entry) => entry.handle);
    assert.equal(handles.length, 2, `${method.toUpperCase()} ${path} should have a guard and a handler`);
    assert.match(handles[0].toString(), /verified/, `${method.toUpperCase()} ${path} should be gated`);
  }

  // The console must still be able to read its own status, ungated.
  const me = ridersRouter.stack.find(
    (entry) => entry.route && entry.route.path === '/me' && entry.route.methods.get
  );
  assert.ok(me, 'GET /me should exist');
  const meHandles = me.route.stack.map((entry) => entry.handle);
  assert.equal(meHandles.length, 2, 'GET /me should have authenticate and a handler');
  assert.doesNotMatch(meHandles[0].toString(), /verified/, 'GET /me should not be gated');
});

test('staff bypass the rider verification gate', async () => {
  const outcome = await probe({ role: 'ops_admin', rows: [{ status: 'pending' }] });
  assert.equal(outcome.nextCalled, true);
  assert.equal(outcome.statusCode, null);
  assert.equal(outcome.captured, null);
});

test('a verified rider passes the gate', async () => {
  const outcome = await probe({ role: 'rider', rows: [{ status: 'verified' }] });
  assert.equal(outcome.nextCalled, true);
  assert.equal(outcome.statusCode, null);
  assert.match(outcome.captured.sql, /FROM riders/);
  assert.deepEqual(outcome.captured.params, ['user-1']);
});

test('a pending rider is blocked with its status', async () => {
  const outcome = await probe({ role: 'rider', rows: [{ status: 'pending' }] });
  assert.equal(outcome.nextCalled, false);
  assert.equal(outcome.statusCode, 403);
  assert.equal(outcome.body.status, 'pending');
  assert.match(outcome.body.error, /not been verified/i);
});

test('a suspended rider is blocked', async () => {
  const outcome = await probe({ role: 'rider', rows: [{ status: 'suspended' }] });
  assert.equal(outcome.nextCalled, false);
  assert.equal(outcome.statusCode, 403);
  assert.equal(outcome.body.status, 'suspended');
});

test('a rider with no rider record is blocked rather than trusted', async () => {
  const outcome = await probe({ role: 'rider', rows: [] });
  assert.equal(outcome.nextCalled, false);
  assert.equal(outcome.statusCode, 403);
  assert.equal(outcome.body.status, 'unknown');
});

test('a lookup failure is reported, not silently allowed', async () => {
  const outcome = await probe({ role: 'rider', fail: true });
  assert.equal(outcome.nextCalled, false);
  assert.equal(outcome.statusCode, 500);
});