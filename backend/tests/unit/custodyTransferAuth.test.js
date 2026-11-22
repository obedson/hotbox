const { test } = require('node:test');
const assert = require('node:assert/strict');

const custodyRouter = require('../../src/routes/custody');
const { HANDOVER_TYPE_ROLES } = require('../../src/config/custodyRoles');

function transferRouteHandlers() {
  const layer = custodyRouter.stack.find(
    (entry) => entry.route && entry.route.path === '/transfer' && entry.route.methods.post
  );
  assert.ok(layer, 'POST /transfer route should exist');
  return layer.route.stack.map((entry) => entry.handle);
}

function runHandler(handler, { handoverType, role }) {
  const outcome = { nextCalled: false, statusCode: null, body: null };
  const req = {
    body: { handoverType },
    user: { id: 'actor-1', role },
    ip: '127.0.0.1',
    originalUrl: '/api/v1/custody/transfer'
  };
  const res = {
    status(code) { outcome.statusCode = code; return this; },
    json(payload) { outcome.body = payload; return this; }
  };
  handler(req, res, () => { outcome.nextCalled = true; });
  return outcome;
}

// The inline gate is the handler that answers a forbidden role with 403. Probing
// for the effect rather than a property keeps the test honest if the route
// middleware is ever wrapped or renamed.
function roleGateHandler() {
  const probe = { handoverType: 'RIDER_TO_HUB', role: 'customer' };
  const gates = transferRouteHandlers()
    .map((handler) => ({ handler, outcome: runHandler(handler, probe) }))
    .filter((entry) => entry.outcome.statusCode === 403);
  assert.equal(gates.length, 1, 'the transfer route should carry exactly one role gate');
  return gates[0].handler;
}

function runGate(handoverType, role) {
  return runHandler(roleGateHandler(), { handoverType, role });
}

test('the transfer route admits the role that owns the transition', () => {
  const outcome = runGate('RIDER_TO_HUB', 'hub_owner');
  assert.equal(outcome.nextCalled, true);
  assert.equal(outcome.statusCode, null);
});

test('the transfer route rejects a rider attempting hub intake with 403', () => {
  const outcome = runGate('RIDER_TO_HUB', 'rider');
  assert.equal(outcome.nextCalled, false);
  assert.equal(outcome.statusCode, 403);
});

test('the transfer route rejects a customer for every transition', () => {
  const transitions = Object.keys(HANDOVER_TYPE_ROLES);
  assert.ok(transitions.length > 0);
  for (const handoverType of transitions) {
    const outcome = runGate(handoverType, 'customer');
    assert.equal(outcome.nextCalled, false, `${handoverType} must reject a customer`);
    assert.equal(outcome.statusCode, 403);
  }
});

test('an unsupported handover type is refused with 400 before role checks', () => {
  const outcome = runGate('TELEPORT', 'super_admin');
  assert.equal(outcome.nextCalled, false);
  assert.equal(outcome.statusCode, 400);
});