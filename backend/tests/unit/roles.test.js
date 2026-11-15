const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SELF_SIGNUP_ROLES, STAFF_ROLES, portalForRole, isStaffRole, DEFAULT_PORTAL
} = require('../../src/config/roles');

test('every role belongs to exactly one of the self-signup or staff groups', () => {
  const overlap = SELF_SIGNUP_ROLES.filter((role) => STAFF_ROLES.includes(role));
  assert.deepEqual(overlap, []);
});

test('staff roles can never be self-assigned', () => {
  for (const role of STAFF_ROLES) {
    assert.equal(isStaffRole(role), true, `${role} should be staff`);
    assert.equal(SELF_SIGNUP_ROLES.includes(role), false);
  }
});

test('every role routes to a product surface', () => {
  for (const role of [...SELF_SIGNUP_ROLES, ...STAFF_ROLES]) {
    assert.equal(typeof portalForRole(role), 'string');
    assert.ok(portalForRole(role).length > 0);
  }
});

test('unknown roles fall back to the customer portal', () => {
  assert.equal(portalForRole('wizard'), DEFAULT_PORTAL);
  assert.equal(portalForRole(undefined), DEFAULT_PORTAL);
});
