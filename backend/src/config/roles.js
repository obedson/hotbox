// Central role model for Hotbox. Keeping the role names, the self-signup
// allowlist, and the portal routing in one place means the auth screen, the API
// guards and the UI guards can never drift apart.
const ROLES = {
  CUSTOMER: 'customer',
  HUB_OWNER: 'hub_owner',
  HUB_STAFF: 'hub_staff',
  RIDER: 'rider',
  COURIER_COMPANY: 'courier_company',
  ENTERPRISE_SHIPPER: 'enterprise_shipper',
  OPS_ADMIN: 'ops_admin',
  COMPLIANCE_OFFICER: 'compliance_officer',
  FINANCE_OFFICER: 'finance_officer',
  SUPPORT_AGENT: 'support_agent',
  NIPOST_VERIFIER: 'nipost_verifier',
  SUPER_ADMIN: 'super_admin'
};

// Accounts a visitor is allowed to create for themselves. Staff roles are
// provisioned by an administrator so privileges can never be self-assigned.
const SELF_SIGNUP_ROLES = [
  ROLES.CUSTOMER,
  ROLES.HUB_OWNER,
  ROLES.RIDER,
  ROLES.ENTERPRISE_SHIPPER
];

const STAFF_ROLES = [
  ROLES.OPS_ADMIN,
  ROLES.COMPLIANCE_OFFICER,
  ROLES.NIPOST_VERIFIER,
  ROLES.FINANCE_OFFICER,
  ROLES.SUPPORT_AGENT,
  ROLES.HUB_STAFF,
  ROLES.COURIER_COMPANY,
  ROLES.SUPER_ADMIN
];

// Roles an administrator may provision from the Team screen. Self-service roles
// are excluded on purpose: customers, riders and enterprise shippers register
// themselves. `hub_staff` is excluded because a staff seat is only meaningful
// once it is linked to an accredited hub.
const PROVISIONABLE_ROLES = [
  ROLES.OPS_ADMIN,
  ROLES.COMPLIANCE_OFFICER,
  ROLES.NIPOST_VERIFIER,
  ROLES.FINANCE_OFFICER,
  ROLES.SUPPORT_AGENT,
  ROLES.HUB_OWNER,
  ROLES.SUPER_ADMIN
];

// Which product surface a role lands on immediately after signing in.
const PORTAL_BY_ROLE = {
  [ROLES.CUSTOMER]: 'customer',
  [ROLES.ENTERPRISE_SHIPPER]: 'enterprise',
  [ROLES.COURIER_COMPANY]: 'enterprise',
  [ROLES.HUB_OWNER]: 'hub_owner',
  [ROLES.HUB_STAFF]: 'hub_owner',
  [ROLES.RIDER]: 'rider',
  [ROLES.OPS_ADMIN]: 'operations',
  [ROLES.COMPLIANCE_OFFICER]: 'operations',
  [ROLES.NIPOST_VERIFIER]: 'operations',
  [ROLES.FINANCE_OFFICER]: 'operations',
  [ROLES.SUPPORT_AGENT]: 'operations',
  [ROLES.SUPER_ADMIN]: 'operations'
};

const DEFAULT_PORTAL = 'customer';

const portalForRole = (role) => PORTAL_BY_ROLE[role] || DEFAULT_PORTAL;

const isStaffRole = (role) => STAFF_ROLES.includes(role);

module.exports = {
  ROLES,
  SELF_SIGNUP_ROLES,
  STAFF_ROLES,
  PROVISIONABLE_ROLES,
  PORTAL_BY_ROLE,
  DEFAULT_PORTAL,
  portalForRole,
  isStaffRole
};
