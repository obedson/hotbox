import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import RiderApplicationsPanel from './RiderApplicationsPanel';

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/verification/rider-applications')) {
      return {
        ok: true,
        json: async () => ({
          riders: [
            {
              id: 'r1',
              name: 'John Deo',
              email: 'john@example.com',
              phone: '+2348108525262',
              user_postcode: 'FC-01-A03-FK-01',
              plate_number: 'ABJ-123-XY',
              vehicle_type: 'motorcycle',
              status: 'pending',
              nin: '12345678901',
              drivers_license_no: 'DL-ABC-123',
              registration_fee_paid_at: null,
              documents: [
                { id: 'd1', document_type: 'NIN', document_number: '12345678901', status: 'PENDING', submitted_at: '2026-11-18T09:00:00Z' }
              ],
              pendingDocuments: 1,
              rejectedDocuments: 0,
              missingClearance: [],
              readyForApproval: true
            }
          ],
          registrationFeeNgn: 0,
          counts: { awaiting: 1, rejected: 0, verified: 0, suspended: 0, total: 1 }
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  });
}

describe('RiderApplicationsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the rider verification queue', async () => {
    render(<RiderApplicationsPanel currentUser={{ role: 'compliance_officer' }} />);
    await waitFor(() => expect(screen.getByText('Rider Verification Applications')).toBeInTheDocument());
    expect(screen.getByText('John Deo')).toBeInTheDocument();
    expect(screen.getAllByText(/Awaiting review/).length).toBeGreaterThan(0);
  });

  it('shows the reviewer a decision action for a pending rider', async () => {
    render(<RiderApplicationsPanel currentUser={{ role: 'compliance_officer' }} />);
    await waitFor(() => expect(screen.getByText('John Deo')).toBeInTheDocument());
    screen.getByText('John Deo').click();
    await waitFor(() => expect(screen.getByText('Approve rider & grant dispatch clearance')).toBeInTheDocument());
  });
});
