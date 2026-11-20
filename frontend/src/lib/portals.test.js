import { describe, it, expect } from 'vitest';
import { authorizedPortalsForRole, isRoleAuthorizedForPortal, allowedOperationsNavForRole, PROVISIONABLE_ROLES, STAFF_ROLES } from './portals';

describe('portal authorization', () => {
  it('offers a rider only the surfaces a rider may open', () => {
    expect(authorizedPortalsForRole('rider').map((portal) => portal.id)).toEqual(['customer', 'rider']);
  });

  it('offers a customer only the customer portal', () => {
    expect(authorizedPortalsForRole('customer').map((portal) => portal.id)).toEqual(['customer']);
  });

  it('offers a hub owner the hub station and customer portal', () => {
    expect(authorizedPortalsForRole('hub_owner').map((portal) => portal.id)).toEqual(['customer', 'hub_owner']);
  });

  it('offers an operations administrator every surface', () => {
    expect(authorizedPortalsForRole('ops_admin')).toHaveLength(5);
    expect(authorizedPortalsForRole('super_admin')).toHaveLength(5);
  });

  it('never offers operations to a hub owner or rider', () => {
    expect(isRoleAuthorizedForPortal('hub_owner', 'operations')).toBe(false);
    expect(isRoleAuthorizedForPortal('rider', 'operations')).toBe(false);
    expect(isRoleAuthorizedForPortal('rider', 'enterprise')).toBe(false);
  });

  it('denies anonymous visitors', () => {
    expect(isRoleAuthorizedForPortal(null, 'customer')).toBe(false);
    expect(authorizedPortalsForRole(undefined)).toEqual([]);
  });
  it('gives a NIPOST field verifier only the link queue and ground-truth queue', () => {
    expect(allowedOperationsNavForRole('nipost_verifier')).toEqual(['legacy_links', 'ground_truth']);
    expect(PROVISIONABLE_ROLES).toContain('nipost_verifier');
  });

  it('never offers super admin as a grantable role, but still counts it as staff', () => {
    expect(PROVISIONABLE_ROLES).not.toContain('super_admin');
    expect(STAFF_ROLES).toContain('super_admin');
    expect(PROVISIONABLE_ROLES).toContain('ops_admin');
  });

  it('gives a compliance officer the verification desk, link queue and hub applications', () => {
    expect(allowedOperationsNavForRole('compliance_officer')).toEqual([
      'hub_applications',
      'rider_applications',
      'ground_truth',
      'legacy_links',
      'verification'
    ]);
  });
});
