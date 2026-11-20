import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import LegacyBoxLinkRequests from './LegacyBoxLinkRequests';
import LegacyBoxLinkManagement from '../LegacyBoxLinkManagement';

const queuePayload = {
  requests: [
    {
      id: 'req-1',
      boxId: 'box-1',
      boxNumber: 'HBX-0005',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      userPhone: '+2348104143399',
      legacyBoxNumber: 'P.O.BOX 1576',
      status: 'PENDING',
      declaration: true,
      hasDocument: true,
      submittedAt: '2026-11-18T09:00:00.000Z'
    }
  ],
  total: 1,
  page: 1,
  pageSize: 10
};

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/reject')) {
      return { ok: true, status: 200, json: async () => ({ message: 'Link request rejected.' }) };
    }
    if (urlStr.includes('/registry-status')) {
      return { ok: true, status: 200, json: async () => ({ configured: true }) };
    }
    if (urlStr.includes('/legacy-box-links')) {
      return { ok: true, status: 200, json: async () => queuePayload };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
}

describe('LegacyBoxLinkRequests', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('sends the rejection reason so the API can record it', async () => {
    render(<LegacyBoxLinkRequests currentUser={{ id: 'officer-1', role: 'compliance_officer' }} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByPlaceholderText('Reason for rejection'), {
      target: { value: 'Reupload original documents' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));

    await waitFor(() => {
      const call = window.fetch.mock.calls.find(([url]) => String(url).includes('/reject'));
      expect(call).toBeTruthy();
      const options = call[1];
      expect(JSON.parse(options.body)).toEqual({ reason: 'Reupload original documents' });
    });
    expect(await screen.findByText('Rejected P.O.BOX 1576.')).toBeInTheDocument();
  });

  it('refuses to reject without a reason', async () => {
    render(<LegacyBoxLinkRequests currentUser={{ id: 'officer-1', role: 'compliance_officer' }} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));

    expect(await screen.findByText('A rejection reason is required.')).toBeInTheDocument();
    expect(window.fetch.mock.calls.some(([url]) => String(url).includes('/reject'))).toBe(false);
  });

  it('shows the pending queue count on the Review queue tab', async () => {
    render(<LegacyBoxLinkManagement currentUser={{ id: 'officer-1', role: 'compliance_officer' }} />);

    expect(await screen.findByRole('button', { name: 'Review queue 1' })).toBeInTheDocument();
  });
});
