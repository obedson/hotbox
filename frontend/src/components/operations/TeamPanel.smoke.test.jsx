import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import TeamPanel from './TeamPanel';

function mockFetch() {
  window.fetch = vi.fn(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/operations/users')) {
      return {
        ok: true,
        json: async () => ({
          users: [
            { id: 'u1', name: 'Obedson Uchenna', role: 'super_admin', email: 'obedsonfield@gmail.com', phone: '+2349063085415', status: 'active' },
            { id: 'u2', name: 'Adaeze Okoro', role: 'compliance_officer', email: 'adaeze@example.com', phone: '+2348030000000', status: 'active' }
          ],
          count: 2
        })
      };
    }
    return { ok: true, json: async () => ({}) };
  });
}

describe('TeamPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('lists provisioned staff and their roles', async () => {
    render(<TeamPanel currentUser={{ id: 'u1', name: 'Obedson Uchenna', role: 'super_admin' }} showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText('Team & Access')).toBeInTheDocument());
    expect(screen.getByText('Adaeze Okoro')).toBeInTheDocument();
    expect(screen.getAllByText('Compliance officer').length).toBeGreaterThan(0);
  });

  it('opens the add team member form limited to provisionable roles', async () => {
    render(<TeamPanel currentUser={{ id: 'u1', name: 'Obedson Uchenna', role: 'super_admin' }} showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText('Add team member')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add team member'));
    expect(await screen.findByText('Staff roles are provisioned here and can never be self-assigned.')).toBeInTheDocument();
    expect(screen.queryByText('Customer')).not.toBeInTheDocument();
  });
});