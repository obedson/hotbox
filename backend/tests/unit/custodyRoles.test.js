const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  HANDOVER_TYPE_ROLES,
  rolesForHandoverType,
  isRoleAllowedForHandover
} = require('../../src/config/custodyRoles');
const { ROLES } = require('../../src/config/roles');

const TRANSITIONS = [
  'SENDER_TO_RIDER',
  'RIDER_TO_HUB',
  'HUB_TO_RECIPIENT',
  'RIDER_TO_RECIPIENT',
  'HUB_TO_RIDER',
  'HUB_TO_RETURN'
];

test('every custody transition has a role allowlist', () => {
  for (const transition of TRANSITIONS) {
    assert.ok(HANDOVER_TYPE_ROLES[transition], `${transition} must be gated`);
    assert.ok(HANDOVER_TYPE_ROLES[transition].length > 0);
  }
});

test('unknown or unsupported transitions are never admitted', () => {
  assert.equal(rolesForHandoverType('TELEPORT'), null);
  assert.equal(isRoleAllowedForHandover('TELEPORT', ROLES.RIDER), false);
  assert.equal(isRoleAllowedForHandover(undefined, ROLES.RIDER), false);
});

test('a rider may only pick up and complete door deliveries', () => {
  assert.equal(isRoleAllowedForHandover('SENDER_TO_RIDER', ROLES.RIDER), true);
  assert.equal(isRoleAllowedForHandover('RIDER_TO_RECIPIENT', ROLES.RIDER), true);
  assert.equal(isRoleAllowedForHandover('RIDER_TO_HUB', ROLES.RIDER), false);
  assert.equal(isRoleAllowedForHandover('HUB_TO_RECIPIENT', ROLES.RIDER), false);
});

test('a hub host may only intake and release parcels', () => {
  assert.equal(isRoleAllowedForHandover('RIDER_TO_HUB', ROLES.HUB_OWNER), true);
  assert.equal(isRoleAllowedForHandover('RIDER_TO_HUB', ROLES.HUB_STAFF), true);
  assert.equal(isRoleAllowedForHandover('HUB_TO_RECIPIENT', ROLES.HUB_OWNER), true);
  assert.equal(isRoleAllowedForHandover('SENDER_TO_RIDER', ROLES.HUB_OWNER), false);
  assert.equal(isRoleAllowedForHandover('RIDER_TO_RECIPIENT', ROLES.HUB_OWNER), false);
});

test('a customer can never perform a custody handover', () => {
  for (const transition of TRANSITIONS) {
    assert.equal(isRoleAllowedForHandover(transition, ROLES.CUSTOMER), false);
  }
});

test('operations staff hold an override on every transition', () => {
  for (const transition of TRANSITIONS) {
    assert.equal(isRoleAllowedForHandover(transition, ROLES.OPS_ADMIN), true);
    assert.equal(isRoleAllowedForHandover(transition, ROLES.SUPER_ADMIN), true);
  }
});

test('the allowlist is a copy, so callers cannot mutate the source of truth', () => {
  const roles = rolesForHandoverType('RIDER_TO_HUB');
  roles.push(ROLES.CUSTOMER);
  assert.equal(isRoleAllowedForHandover('RIDER_TO_HUB', ROLES.CUSTOMER), false);
});