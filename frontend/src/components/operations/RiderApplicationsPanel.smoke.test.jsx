import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

import RiderApplicationsPanel from './RiderApplicationsPanel';

const baseRider = {
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
  documents: [],
  pendingDocuments: 0,
  rejectedDocuments: 0,
  missingClearance: ['approved NIN document', "approved driver's licence document"],
  readyForApproval: false
};

function mockFetch(rider = baseRider) {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/verification/rider-applications')) {
      return {
        ok: true,
        json: async () => ({
          riders: [rider],
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
  });

  it('renders the rider verification queue', async () => {
    mockFetch();
    render(<RiderApplicationsPanel currentUser={{ role: 'compliance_officer' }} />);
    await waitFor(() => expect(screen.getByText('Rider Verification Applications')).toBeInTheDocument());
    expect(screen.getByText('John Deo')).toBeInTheDocument();
    expect(screen.getAllByText(/Awaiting review/).length).toBeGreaterThan(0);
  });

  it('shows the submitted values and withholds clearance without approved evidence', async () => {
    mockFetch({
      ...baseRider,
      documents: [
        { id: 'd1', document_type: 'NIN', document_number: '12345678901', status: 'PENDING', submitted_at: '2026-11-18T09:00:00Z' }
      ]
    });
    render(<RiderApplicationsPanel currentUser={{ role: 'compliance_officer' }} />);
    await waitFor(() => expect(screen.getByText('John Deo')).toBeInTheDocument());
    screen.getByText('John Deo').click();

    const checklistHeading = await screen.findByText('Clearance checklist');
    const checklistBox = checklistHeading.parentElement;
    expect(screen.getAllByText('12345678901').length).toBeGreaterThan(0);
    expect(screen.getByText('DL-ABC-123')).toBeInTheDocument();
    expect(within(checklistBox).getByText('Under review')).toBeInTheDocument();
    expect(within(checklistBox).getAllByText('Provided').length).toBe(4);
    expect(within(checklistBox).queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.getByText('Approval is disabled until every clearance item above is provided.')).toBeInTheDocument();
  });

  it('grants the approve action once every item is evidenced and approved', async () => {
    mockFetch({
      ...baseRider,
      documents: [
        { id: 'd1', document_type: 'NIN', document_number: '12345678901', status: 'APPROVED', submitted_at: '2026-11-18T09:00:00Z' },
        { id: 'd2', document_type: 'DRIVERS_LICENSE', document_number: 'DL-ABC-123', status: 'APPROVED', submitted_at: '2026-11-18T09:00:00Z' },
        { id: 'd3', document_type: 'VEHICLE_ROADWORTHINESS', document_number: 'ABJ-123-XY', status: 'APPROVED', submitted_at: '2026-11-18T09:00:00Z' }
      ],
      missingClearance: [],
      readyForApproval: true
    });
    render(<RiderApplicationsPanel currentUser={{ role: 'compliance_officer' }} />);
    await waitFor(() => expect(screen.getByText('John Deo')).toBeInTheDocument());
    screen.getByText('John Deo').click();

    expect(await screen.findByText('Approve rider & grant dispatch clearance')).toBeInTheDocument();
    const checklistHeading = screen.getByText('Clearance checklist');
    expect(within(checklistHeading.parentElement).getAllByText('Verified').length).toBe(3);
    expect(screen.getByText('5/5 clearance items')).toBeInTheDocument();
  });
});
