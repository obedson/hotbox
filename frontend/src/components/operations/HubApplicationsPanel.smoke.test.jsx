import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import HubApplicationsPanel from './HubApplicationsPanel';

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/operations/users')) {
      return {
        ok: true,
        json: async () => ({
          users: [
            { id: 'u1', name: 'Ops Admin', role: 'ops_admin', email: 'ops@example.com' },
            { id: 'u2', name: 'Compliance Officer', role: 'compliance_officer', email: 'compliance@example.com' }
          ]
        })
      };
    }
    if (urlStr.includes('/hub-applications')) {
      return {
        ok: true,
        json: async () => ({
          applications: [
            {
              id: 'a1',
              reference: 'HBA-00001',
              status: 'SUBMITTED',
              businessName: 'Wuse 2 Express Mart',
              postcode: 'FC-01-A03-FK-01',
              formData: { premisesType: 'Shop' },
              applicant: { name: 'Owner', email: 'owner@example.com', phone: '+2348030000000' },
              submittedAt: '2026-11-17T09:00:00Z'
            }
          ],
          total: 1,
          counts: { submitted: 1, inspection_scheduled: 0, inspected: 0, info_required: 0 }
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  });
}

describe('HubApplicationsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the accreditation queue', async () => {
    render(<HubApplicationsPanel />);
    await waitFor(() => expect(screen.getByText('Hub Accreditation Applications')).toBeInTheDocument());
    expect(screen.getByText('HBA-00001')).toBeInTheDocument();
    expect(screen.getByText('Wuse 2 Express Mart')).toBeInTheDocument();
  });
});