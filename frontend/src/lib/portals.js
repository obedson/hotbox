import { ShieldCheck, Building2, Package, Store, Bike } from 'lucide-react';

export const PORTALS = [
  { id: 'operations', label: 'Operations', icon: ShieldCheck, color: 'bg-amber-500 text-slate-950 font-bold' },
  { id: 'enterprise', label: 'Enterprise B2B', icon: Building2, color: 'bg-indigo-600 text-white font-semibold' },
  { id: 'customer', label: 'Customer Portal', icon: Package, color: 'bg-emerald-600 text-white font-semibold' },
  { id: 'hub_owner', label: 'Hub Station', icon: Store, color: 'bg-teal-600 text-white font-semibold' },
  { id: 'rider', label: 'Rider Radar', icon: Bike, color: 'bg-blue-600 text-white font-semibold' }
];

const OPERATIONS_ROLES = ['ops_admin', 'compliance_officer', 'nipost_verifier', 'super_admin'];
const ENTERPRISE_ROLES = ['enterprise_shipper', 'courier_company', 'ops_admin', 'super_admin'];
const HUB_ROLES = ['hub_owner', 'hub_staff', 'ops_admin', 'super_admin'];
const RIDER_ROLES = ['rider', 'courier_company', 'ops_admin', 'super_admin'];

// Single source of truth for portal access. Both the router guard and the
// portal switcher read this, so the dropdown can never offer a surface the
// signed-in role would be blocked from opening.
export function isRoleAuthorizedForPortal(role, portal) {
  if (!role) return false;
  if (role === 'super_admin' || role === 'admin') return true;

  switch (portal) {
    case 'customer':
      return true;
    case 'operations':
      return OPERATIONS_ROLES.includes(role);
    case 'enterprise':
      return ENTERPRISE_ROLES.includes(role);
    case 'hub_owner':
      return HUB_ROLES.includes(role);
    case 'rider':
      return RIDER_ROLES.includes(role);
    default:
      return false;
  }
}

// Roles an administrator may provision. Mirrors PROVISIONABLE_ROLES in the
// backend so the Team screen and the API can never drift apart.
export const PROVISIONABLE_ROLES = [
  'ops_admin',
  'compliance_officer',
  'nipost_verifier',
  'finance_officer',
  'support_agent',
  'hub_owner'
];

// Every role Hotbox employs rather than a visitor registers for itself. Mirrors
// STAFF_ROLES in the backend and drives staff reporting on the Team screen.
export const STAFF_ROLES = [
  'ops_admin',
  'compliance_officer',
  'nipost_verifier',
  'finance_officer',
  'support_agent',
  'hub_staff',
  'courier_company',
  'super_admin'
];

// The operations navigation each staff role may use. A role absent from this
// map sees the full operations navigation.
export const OPERATIONS_NAV_BY_ROLE = {
  nipost_verifier: ['legacy_links', 'ground_truth'],
  compliance_officer: ['hub_applications', 'rider_applications', 'ground_truth', 'legacy_links', 'verification']
};

export function allowedOperationsNavForRole(role) {
  return OPERATIONS_NAV_BY_ROLE[role] || null;
}

// Roles that may settle, export or reconfigure operations data. A NIPOST field
// verifier works the queue but never touches money, exports or settings.
export const OPERATIONS_DESK_ROLES = ['ops_admin', 'compliance_officer', 'super_admin'];

export function isOperationsDeskRole(role) {
  return OPERATIONS_DESK_ROLES.includes(role);
}

export function authorizedPortalsForRole(role) {
  return PORTALS.filter((portal) => isRoleAuthorizedForPortal(role, portal.id));
}
// The portal to restore after a stored session is confirmed. A portal saved
// by an earlier session must never override the current user's authorization.
export function resolveRestoredPortal({ role, portal, savedPortal }) {
  if (savedPortal && isRoleAuthorizedForPortal(role, savedPortal)) return savedPortal;
  return portal || 'customer';
}
