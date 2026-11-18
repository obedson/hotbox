import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import GroundTruthQueue from './GroundTruthQueue';

const RECORDS = [
  {
    id: 'r1',
    applicantName: 'Lisa Jones',
    applicantEmail: 'lisa@example.com',
    applicantPhone: '+2348030000000',
    postcode: 'FC-01-A03-FK-01',
    postcodeDescription: 'Wuse 2, Abuja',
    status: 'PENDING',
    submittedAt: '2026-11-18T09:00:00Z',
    fieldReportedAt: null,
    fieldReportNotes: null,
    fieldReportedBy: null,
    lat: null,
    lng: null,
    accuracyM: null
  },
  {
    id: 'r2',
    applicantName: 'Ada Obi',
    applicantEmail: 'ada@example.com',
    applicantPhone: '+2348030000001',
    postcode: 'FC-01-A02-FK-02',
    postcodeDescription: 'Maitama, Abuja',
    status: 'PENDING',
    submittedAt: '2026-11-18T08:00:00Z',
    fieldReportedAt: '2026-11-18T10:00:00Z',
    fieldReportNotes: 'Doorway verified, occupant matched.',
    fieldReportedBy: 'NIPOST Agent',
    lat: 9.0765,
    lng: 7.4985,
    accuracyM: 4
  }
];

function mockFetch() {
  window.fetch = vi.fn(async (url, options) => {
    const urlStr = String(url);
    if (urlStr.includes('/verification/field-queue')) {
      return {
        ok: true,
        json: async () => ({
          records: RECORDS,
          counts: { awaiting_fieldwork: 1, reported: 1, approved: 0 }
        })
      };
    }
    if (urlStr.includes('/verification/field-report/')) {
      return { ok: true, json: async () => ({ message: 'submitted' }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

describe('GroundTruthQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('lists inspections awaiting fieldwork', async () => {
    render(<GroundTruthQueue currentUser={{ id: 'v1', name: 'NIPOST Agent', role: 'nipost_verifier' }} showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText('Ground-Truth Queue')).toBeInTheDocument());
    expect(screen.getByText('Lisa Jones')).toBeInTheDocument();
    expect(screen.getByText('Awaiting')).toBeInTheDocument();
  });

  it('submits a doorway inspection report for compliance review', async () => {
    render(<GroundTruthQueue currentUser={{ id: 'v1', name: 'NIPOST Agent', role: 'nipost_verifier' }} showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText('Open inspection')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Open inspection'));
    expect(await screen.findByText('Doorway inspection')).toBeInTheDocument();
    expect(screen.getAllByText('Lisa Jones').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText(/premises, signage/), {
      target: { value: 'Doorway verified, occupant matched the registered name.' }
    });
    fireEvent.click(screen.getByText('Submit for compliance review'));

    await waitFor(() => expect(window.fetch).toHaveBeenCalledWith(
      '/api/v1/verification/field-report/r1',
      expect.objectContaining({ method: 'POST' })
    ));
  });
});