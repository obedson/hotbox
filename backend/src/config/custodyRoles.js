// Custody handover authorisation. Each transition is performed by exactly one
// side of the chain, so the role allowed to execute it is fixed here rather
// than trusted from the client. `ops_admin` and `super_admin` are staff
// overrides and are appended to every transition.
const { ROLES } = require('./roles');

const STAFF_OVERRIDE_ROLES = [ROLES.OPS_ADMIN, ROLES.SUPER_ADMIN];

const HANDOVER_TYPE_ROLES = {
  // A rider collects the parcel from the sender.
  SENDER_TO_RIDER: [ROLES.RIDER, ROLES.COURIER_COMPANY],
  // A hub host scans the parcel QR pass and shelves it.
  RIDER_TO_HUB: [ROLES.HUB_OWNER, ROLES.HUB_STAFF],
  // A hub host releases the parcel to the recipient.
  HUB_TO_RECIPIENT: [ROLES.HUB_OWNER, ROLES.HUB_STAFF],
  // A rider completes a door delivery.
  RIDER_TO_RECIPIENT: [ROLES.RIDER, ROLES.COURIER_COMPANY],
  // Hub dispatch back to a rider, and hub return to sender, are staff-run.
  HUB_TO_RIDER: [ROLES.HUB_OWNER, ROLES.HUB_STAFF],
  HUB_TO_RETURN: [ROLES.HUB_OWNER, ROLES.HUB_STAFF]
};

// Every transition the custody service can execute must have an allowlist,
// otherwise a new handover type would silently become ungated.
function rolesForHandoverType(handoverType) {
  const roles = HANDOVER_TYPE_ROLES[handoverType];
  if (!roles) return null;
  return [...roles, ...STAFF_OVERRIDE_ROLES];
}

function isRoleAllowedForHandover(handoverType, role) {
  const allowed = rolesForHandoverType(handoverType);
  if (!allowed) return false;
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return true;
  return allowed.includes(role);
}

module.exports = {
  HANDOVER_TYPE_ROLES,
  STAFF_OVERRIDE_ROLES,
  rolesForHandoverType,
  isRoleAllowedForHandover
};