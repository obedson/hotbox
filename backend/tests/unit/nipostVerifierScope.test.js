const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ROLES, SELF_SIGNUP_ROLES, STAFF_ROLES, PROVISIONABLE_ROLES, portalForRole, canGrantRole
} = require('../../src/config/roles');
const { registerSchema, createStaffSchema } = require('../../src/middleware/validate');
const verificationRouter = require('../../src/routes/verification');
const legacyBoxLinksRouter = require('../../src/routes/operations/legacyBoxLinks');
const usersRouter = require('../../src/routes/operations/users');

// --- router inspection helpers -------------------------------------------------

function routeLayer(router, method, path) {
  return router.stack.find(
    (layer) => layer.route &&
      layer.route.path === path &&
      Object.keys(layer.route.methods).includes(method)
  ) || null;
}

// Middleware that carries an allowlist (see requireRoles).
function routeGates(router, method, path) {
  const layer = routeLayer(router, method, path);
  return layer
    ? layer.route.stack.map((entry) => entry.handle).filter((fn) => Array.isArray(fn.allowedRoles))
    : [];
}

function routerGates(router) {
  return router.stack
    .filter((layer) => !layer.route)
    .map((layer) => layer.handle)
    .filter((fn) => Array.isArray(fn.allowedRoles));
}

function sameRoles(actual, expected) {
  return actual.length === expected.length &&
    [...actual].sort().join('|') === [...expected].sort().join('|');
}

function findGate(list, roles) {
  return list.find((fn) => sameRoles(fn.allowedRoles, roles)) || null;
}

function routeGate(router, method, path, roles) {
  return findGate(routeGates(router, method, path), roles);
}

function routerGate(router, roles) {
  return findGate(routerGates(router), roles);
}

// Invoke a role gate exactly as Express would and report whether it called next.
function probeRoleGate(middleware, role) {
  const outcome = { nextCalled: false, statusCode: null };
  const req = { user: { id: 'actor-1', role }, ip: '127.0.0.1', originalUrl: '/probe' };
  const res = {
    status(code) { outcome.statusCode = code; return this; },
    json() { return this; }
  };
  middleware(req, res, () => { outcome.nextCalled = true; });
  return outcome;
}

function assertAllowed(middleware, role) {
  const result = probeRoleGate(middleware, role);
  assert.equal(result.nextCalled, true, `${role} should pass this gate`);
  assert.equal(result.statusCode, null);
}

function assertDenied(middleware, role) {
  const result = probeRoleGate(middleware, role);
  assert.equal(result.nextCalled, false, `${role} must not pass this gate`);
  assert.equal(result.statusCode, 403);
}

const staffPayload = {
  name: 'NIPOST Field Agent',
  phone: '+2348031112233',
  email: 'agent@nipost.gov.ng',
  password: 'Password123!',
  role: 'nipost_verifier'
};

const FIELD_WORK = ['nipost_verifier', 'compliance_officer', 'super_admin'];
const DESK = ['compliance_officer', 'super_admin'];
const LINK_DESK = ['ops_admin', 'compliance_officer', 'super_admin'];
const LINK_QUEUE = ['nipost_verifier', 'compliance_officer', 'ops_admin', 'super_admin'];

// --- role model ---------------------------------------------------------------

test('nipost_verifier is a staff role an administrator may provision', () => {
  assert.equal(ROLES.NIPOST_VERIFIER, 'nipost_verifier');
  assert.ok(STAFF_ROLES.includes('nipost_verifier'));
  assert.ok(PROVISIONABLE_ROLES.includes('nipost_verifier'));
  assert.equal(SELF_SIGNUP_ROLES.includes('nipost_verifier'), false);
  assert.equal(portalForRole('nipost_verifier'), 'operations');
});

test('nipost_verifier can be provisioned but never self-registered', () => {
  assert.equal(createStaffSchema.parse(staffPayload).role, 'nipost_verifier');
  assert.throws(() => registerSchema.parse(staffPayload));
});

// --- ground-truth field work --------------------------------------------------

test('the ground-truth queue is gated to field verifiers and the desk', () => {
  const gate = routeGate(verificationRouter, 'get', '/field-queue', FIELD_WORK);
  assert.ok(gate, 'field-queue should carry the field-work gate');

  assertAllowed(gate, 'nipost_verifier');
  assertAllowed(gate, 'compliance_officer');
  for (const role of ['customer', 'rider', 'hub_owner', 'ops_admin', 'finance_officer', 'support_agent']) {
    assertDenied(gate, role);
  }
});

test('submitting a field report sits behind the same gate', () => {
  const gate = routeGate(verificationRouter, 'post', '/field-report/:id', FIELD_WORK);
  assert.ok(gate);
  assertAllowed(gate, 'nipost_verifier');
  assertDenied(gate, 'ops_admin');
});

test('the compliance desk queue and decision stay desk-only', () => {
  const deskGate = routerGate(verificationRouter, DESK);
  assert.ok(deskGate, 'the verification router should carry the desk gate');
  assertAllowed(deskGate, 'compliance_officer');
  assertDenied(deskGate, 'nipost_verifier');

  for (const [method, path] of [
    ['get', '/queue'],
    ['get', '/stats'],
    ['post', '/seed'],
    ['post', '/review/:id']
  ]) {
    assert.equal(
      routeGates(verificationRouter, method, path).length,
      0,
      `${method.toUpperCase()} ${path} must not carry a route-level field gate`
    );
  }

  // The desk gate is a router-level middleware that sits between the field
  // routes and the review routes.
  const fieldIndex = verificationRouter.stack.findIndex(
    (layer) => layer.route && layer.route.path === '/field-queue'
  );
  const deskGateIndex = verificationRouter.stack.findIndex(
    (layer) => !layer.route && layer.handle === deskGate
  );
  const queueIndex = verificationRouter.stack.findIndex(
    (layer) => layer.route && layer.route.path === '/queue'
  );
  assert.ok(fieldIndex > -1 && deskGateIndex > fieldIndex && queueIndex > deskGateIndex);
});

// --- legacy box links ---------------------------------------------------------

test('a field verifier may work the link queue', () => {
  const queueGate = routerGate(legacyBoxLinksRouter, LINK_QUEUE);
  assert.ok(queueGate, 'the link router should admit field verifiers');
  assertAllowed(queueGate, 'nipost_verifier');

  // Registry status only reports whether the NIPOST adapter is configured; the
  // verifier needs it to know whether auto-verify will work, so it carries no
  // route-level desk gate.
  assert.equal(
    routeGates(legacyBoxLinksRouter, 'get', '/legacy-box-links/registry-status').length,
    0
  );

  for (const [method, path] of [
    ['get', '/legacy-box-links'],
    ['post', '/legacy-box-links/:id/auto-verify'],
    ['post', '/legacy-box-links/:id/approve'],
    ['post', '/legacy-box-links/:id/reject'],
    ['post', '/legacy-box-links/:id/revoke']
  ]) {
    assert.equal(
      routeGates(legacyBoxLinksRouter, method, path).length,
      0,
      `${method.toUpperCase()} ${path} must stay open to field verifiers`
    );
  }
});

test('link settlement and export are desk-only', () => {
  for (const [method, path] of [
    ['post', '/legacy-box-links/maintenance'],
    ['get', '/legacy-box-links/export'],
    ['get', '/legacy-box-links/remittance'],
    ['get', '/legacy-box-links/remittance/export'],
    ['post', '/legacy-box-links/remittance']
  ]) {
    const gate = routeGate(legacyBoxLinksRouter, method, path, LINK_DESK);
    assert.ok(gate, `${method.toUpperCase()} ${path} should carry the link-desk gate`);
    assertDenied(gate, 'nipost_verifier');
    assertAllowed(gate, 'compliance_officer');
  }
});

// --- role granting ------------------------------------------------------------

test('only an existing super admin may grant the super admin role', () => {
  assert.equal(PROVISIONABLE_ROLES.includes('super_admin'), false);
  assert.ok(STAFF_ROLES.includes('super_admin'), 'super admin is still a staff role');

  assert.equal(canGrantRole('super_admin', 'super_admin'), true);
  assert.equal(canGrantRole('ops_admin', 'super_admin'), false);
  assert.equal(canGrantRole('compliance_officer', 'super_admin'), false);

  assert.equal(canGrantRole('ops_admin', 'ops_admin'), true);
  assert.equal(canGrantRole('ops_admin', 'compliance_officer'), true);
  assert.equal(canGrantRole('super_admin', 'compliance_officer'), true);
  assert.equal(canGrantRole('ops_admin', 'rider'), false);
  assert.equal(canGrantRole('ops_admin', 'customer'), false);
});

test('the create-team-member handler enforces the grant check', () => {
  const layer = usersRouter.stack.find(
    (entry) => entry.route && entry.route.path === '/users' && entry.route.methods.post
  );
  assert.ok(layer, 'POST /users should exist');
  const handles = layer.route.stack.map((entry) => entry.handle);
  const source = handles.map((fn) => fn.toString()).join('\n');
  assert.match(source, /canGrantRole/, 'handler must call canGrantRole');
});