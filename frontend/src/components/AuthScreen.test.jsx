import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('../lib/api', () => ({
  apiFetch: (...args) => apiFetchMock(...args)
}));

import AuthScreen from './AuthScreen';

afterEach(() => {
  cleanup();
  localStorage.clear();
  apiFetchMock.mockReset();
});

describe('AuthScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    apiFetchMock.mockReset();
  });

  it('renders the sign-in panel by default', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('+2348108525262, 08108525262 or you@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your password')).toBeInTheDocument();
  });

  it('blocks an empty sign-in submission without calling the API', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your phone number or email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('signs in and hands the session to the app shell', async () => {
    const onAuthenticated = vi.fn();
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'tok-1', user: { id: 'u1', name: 'Tunde Fashola', role: 'customer', portal: 'customer' } })
    });

    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByPlaceholderText('+2348108525262, 08108525262 or you@email.com'), { target: { value: '+2348037778899' } });
    fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalled());

    const session = onAuthenticated.mock.calls[0][0];
    expect(session.name).toBe('Tunde Fashola');
    expect(localStorage.getItem('hotbox_token')).toBe('tok-1');
  });

  it('shows the server error message when sign-in fails', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials. Please check your details and try again.' })
    });

    render(<AuthScreen onAuthenticated={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('+2348108525262, 08108525262 or you@email.com'), { target: { value: '+2348037778899' } });
    fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/Invalid credentials/)).toBeInTheDocument();
  });

  it('offers the four self-service account types on the register panel', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    for (const title of ['Individual', 'Hub Partner', 'Dispatch Rider', 'Enterprise']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('reveals the fields for the selected account type', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    fireEvent.click(screen.getByText('Enterprise'));

    expect(screen.getByText('Company name')).toBeInTheDocument();
    expect(screen.getByText('CAC registration number')).toBeInTheDocument();
  });

  it('requires the terms acceptance before registering', () => {
    render(<AuthScreen onAuthenticated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Tunde Fashola'), { target: { value: 'Tunde Fashola' } });
    fireEvent.change(screen.getByPlaceholderText('you@email.com'), { target: { value: 'tunde@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('08108525262'), { target: { value: '+2348037778899' } });
    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByPlaceholderText('Repeat your password'), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Individual account/ }));

    expect(screen.getByText('Please accept the terms to continue.')).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('keeps update disabled when the reset link has no token', () => {
    render(<AuthScreen initialView="reset" onAuthenticated={() => {}} />);

    expect(screen.getByText('Choose a new password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update password' })).toBeDisabled();
  });

  it('enables update and submits the reset token from the link', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Your password has been updated. You can now sign in.' })
    });

    render(<AuthScreen initialView="reset" resetToken="tok-reset" onAuthenticated={() => {}} />);

    const submit = screen.getByRole('button', { name: 'Update password' });
    expect(submit).not.toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), { target: { value: 'NewPassword123!' } });
    fireEvent.change(screen.getByPlaceholderText('Repeat your new password'), { target: { value: 'NewPassword123!' } });
    fireEvent.click(submit);

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'tok-reset', password: 'NewPassword123!' })
      })
    );
  });
});
