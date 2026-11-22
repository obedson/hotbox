import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './api';
import {
  readStoredIntent,
  clearStoredIntent,
  capturePaymentReturn,
  readPaymentReturn,
  clearPaymentReturn,
  startHostedCheckout
} from './hostedCheckout';

describe('hosted checkout storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.clearAllMocks();
  });

  it('returns no intent when nothing is stored', () => {
    expect(readStoredIntent()).toBeNull();
  });

  it('reads back a stored intent and clears it', () => {
    const intent = {
      reference: 'HBX-1',
      amountNgn: 5000,
      resume: { kind: 'renewDigitalBox' },
      startedAt: 1
    };
    sessionStorage.setItem('hotbox_payment_intent', JSON.stringify(intent));

    expect(readStoredIntent()).toEqual(intent);
    clearStoredIntent();
    expect(readStoredIntent()).toBeNull();
  });

  it('captures a successful payment return and cleans the URL', () => {
    window.history.replaceState({}, '', '/?payment=success&reference=HBX-123');

    const record = capturePaymentReturn();

    expect(record).toEqual({ status: 'success', reference: 'HBX-123' });
    expect(window.location.search).toBe('');
    expect(readPaymentReturn()).toEqual(record);
    clearPaymentReturn();
    expect(readPaymentReturn()).toBeNull();
  });

  it('captures a cancelled payment return', () => {
    window.history.replaceState({}, '', '/?payment=cancel&reference=HBX-9');

    expect(capturePaymentReturn()).toEqual({ status: 'cancel', reference: 'HBX-9' });
  });

  it('ignores a URL without a payment marker', () => {
    window.history.replaceState({}, '', '/?reset=abc');

    expect(capturePaymentReturn()).toBeNull();
    expect(readPaymentReturn()).toBeNull();
  });

  it('rejects when the checkout endpoint refuses the request', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'A valid payment amount is required.' })
    });

    await expect(
      startHostedCheckout({ email: 'payer@example.com', amountNgn: 0 })
    ).rejects.toThrow('A valid payment amount is required.');
  });
});