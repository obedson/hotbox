import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import HubApplicationForm from './HubApplicationForm';

function mockFetch(payload) {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/hub-applications/mine')) {
      return { ok: true, json: async () => payload };
    }
    return { ok: true, json: async () => ({}) };
  });
}

describe('HubApplicationForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prompts a hub owner with no application to start one', async () => {
    mockFetch({ application: null, inspections: [] });
    render(<HubApplicationForm showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Apply to host a Hotbox hub/i)).toBeInTheDocument());
    expect(screen.getByText(/Every hub is accredited/i)).toBeInTheDocument();
  });

  it('renders the application sections for a saved draft', async () => {
    mockFetch({
      application: {
        id: 'a1',
        reference: 'HBA-00001',
        status: 'DRAFT',
        businessName: 'Wuse 2 Express Mart',
        postcode: 'FC-01-A03-FK-01',
        formData: { businessName: 'Wuse 2 Express Mart', postcode: 'FC-01-A03-FK-01' },
        applicant: { name: 'Owner', email: 'owner@example.com', phone: '+2348030000000' }
      },
      hub: null,
      inspections: []
    });
    render(<HubApplicationForm showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText('Business identity')).toBeInTheDocument());
    expect(screen.getByText('Premises & location')).toBeInTheDocument();
    expect(screen.getByText('Operations & capacity')).toBeInTheDocument();
    expect(screen.getByText('Security & compliance')).toBeInTheDocument();
  });
});