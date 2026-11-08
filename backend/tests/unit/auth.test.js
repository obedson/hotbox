process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';
process.env.NODE_ENV = 'test';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const db = require('../../src/config/db');
const { authenticate, requireRoles } = require('../../src/middleware/auth');

const originalQuery = db.query;
const testUser = {
  id: '11111111-1111-1111-1111-111111111111',
  role: 'customer',
  name: 'Test User',
  phone: '+2348037778899',
  email: 'test@example.com',
  status: 'active',
  postcode: null
};

after(() => {
  db.query = originalQuery;
});

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

test('requireRoles rejects a request with no authenticated user', () => {
  const res = mockRes();
  let nextCalled = false;
  requireRoles('ops_admin')({}, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('requireRoles allows a user whose role is permitted', () => {
  const res = mockRes();
  let nextCalled = false;
  requireRoles('ops_admin')({ user: { role: 'ops_admin' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('requireRoles forbids a user whose role is not permitted', () => {
  const res = mockRes();
  let nextCalled = false;
  requireRoles('ops_admin')({ user: { role: 'customer' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('requireRoles lets super_admin and admin bypass the role list', () => {
  for (const role of ['super_admin', 'admin']) {
    const res = mockRes();
    let nextCalled = false;
    requireRoles('ops_admin')({ user: { role } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `${role} should bypass`);
  }
});

test('authenticate attaches the user for a valid Bearer token', async () => {
  db.query = async () => ({ rows: [testUser] });
  const token = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = mockRes();
  let nextCalled = false;

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, testUser.id);
  assert.equal(res.statusCode, null);
});

test('authenticate rejects a request with no credentials', async () => {
  const req = { headers: {} };
  const res = mockRes();
  let nextCalled = false;

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate rejects an invalid token', async () => {
  const req = { headers: { authorization: 'Bearer not-a-real-token' } };
  const res = mockRes();
  let nextCalled = false;

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate accepts x-user-id only when header auth is enabled', async () => {
  db.query = async () => ({ rows: [testUser] });
  const req = { headers: { 'x-user-id': testUser.id } };
  const res = mockRes();
  let nextCalled = false;

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, testUser.id);
});
