import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EnterprisePortal from './EnterprisePortal';

function renderAt(activeNav) {
  return render(<EnterprisePortal activeNav={activeNav} setActiveNav={() => {}} />);
}

describe('EnterprisePortal smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    window.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  });

  it.each([
    'dashboard',
    'kyc_verify',
    'shipments',
    'address_book',
    'api_keys',
    'webhooks',
    'billing',
    'claims',
    'settings'
  ])('renders the %s section without crashing', (nav) => {
    const { container } = renderAt(nav);
    expect(container.innerHTML.length).toBeGreaterThan(50);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
