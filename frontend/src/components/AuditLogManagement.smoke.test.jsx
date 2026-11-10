import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import AuditLogManagement from './AuditLogManagement';

function mockFetch() {
  window.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ summary: {}, custodyTransfers: [], auditLogs: [] })
  }));
}

describe('AuditLogManagement smoke render', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the audit desk without crashing', () => {
    const { container } = render(<AuditLogManagement onSelectShipment={() => {}} />);
    expect(container.innerHTML.length).toBeGreaterThan(50);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the custody ledger view', () => {
    render(<AuditLogManagement onSelectShipment={() => {}} />);
    expect(screen.getAllByText(/Custody/i).length).toBeGreaterThan(0);
  });
});
