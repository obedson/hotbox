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

    // Scoped to the create-form role select: the team filter legitimately still
    // offers "Super admin" so an existing super admin can be filtered to.
    const roleSelect = screen.getByDisplayValue('Compliance officer');
    const roleLabels = Array.from(roleSelect.querySelectorAll('option')).map((option) => option.textContent);
    expect(roleLabels).not.toContain('Super admin');
    expect(roleLabels).toContain('Operations admin');
  });
});

function mockCreateFetch({ emailSent }) {
  window.fetch = vi.fn(async (url, options) => {
    const urlStr = String(url);
    if (urlStr === '/api/v1/operations/users' && options?.method === 'POST') {
      return {
        ok: true,
        json: async () => ({
          user: {
            id: 'u3',
            name: 'Amina Bello',
            role: 'compliance_officer',
            email: 'amina@hotbox.ng',
            status: 'active'
          },
          temporaryPassword: 'TempPass123!',
          emailSent
        })
      };
    }
    if (urlStr === '/api/v1/operations/users/u3/onboarding-email') {
      return { ok: true, json: async () => ({ emailSent: true }) };
    }
    if (urlStr.includes('/operations/users')) {
      return { ok: true, json: async () => ({ users: [], count: 0 }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

function fillCreateForm() {
  fireEvent.change(screen.getByPlaceholderText('Amina Bello'), { target: { value: 'Amina Bello' } });
  fireEvent.change(screen.getByPlaceholderText('amina@hotbox.ng'), { target: { value: 'amina@hotbox.ng' } });
  fireEvent.change(screen.getByPlaceholderText('+234 803 000 0000'), { target: { value: '+2348030000000' } });
  fireEvent.click(screen.getByText('Create account'));
}

describe('TeamPanel onboarding email', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('confirms the set-password instructions were emailed', async () => {
    mockCreateFetch({ emailSent: true });
    render(<TeamPanel currentUser={{ id: 'u1', name: 'Obedson Uchenna', role: 'super_admin' }} showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText('Add team member')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add team member'));

    fillCreateForm();

    expect(await screen.findByText(/instructions emailed to amina@hotbox\.ng/)).toBeInTheDocument();
    expect(screen.queryByText('Resend instructions')).not.toBeInTheDocument();
  });

  it('warns and can resend when the onboarding email fails', async () => {
    mockCreateFetch({ emailSent: false });
    render(<TeamPanel currentUser={{ id: 'u1', name: 'Obedson Uchenna', role: 'super_admin' }} showToast={() => {}} />);
    await waitFor(() => expect(screen.getByText('Add team member')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add team member'));

    fillCreateForm();

    expect(await screen.findByText(/Could not email amina@hotbox\.ng/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Resend instructions'));

    await waitFor(() => expect(window.fetch).toHaveBeenCalledWith(
      '/api/v1/operations/users/u3/onboarding-email',
      expect.objectContaining({ method: 'POST' })
    ));
    expect(await screen.findByText(/instructions emailed to amina@hotbox\.ng/)).toBeInTheDocument();
  });
});