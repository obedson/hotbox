import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './api';
import {
  readStoredIntent,
  clearStoredIntent,
  capturePaymentReturn,
  readPaymentReturn,
  clearPaymentReturn,
  startHostedCheckout,
  runPaymentResume
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

  it('falls back to the stored intent reference when the callback omits it', () => {
    sessionStorage.setItem('hotbox_payment_intent', JSON.stringify({ reference: 'HBX-FALLBACK' }));
    window.history.replaceState({}, '', '/?payment=success');

    expect(capturePaymentReturn()).toEqual({ status: 'success', reference: 'HBX-FALLBACK' });
  });
});

describe('payment resume actions', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('resumes a digital box activation against the activation endpoint', async () => {
    sessionStorage.setItem('hotbox_payment_intent', JSON.stringify({
      reference: 'HBX-ACT',
      amountNgn: 3500,
      email: 'payer@example.com',
      resume: { kind: 'activateDigitalBox' },
      startedAt: 1
    }));
    apiFetch.mockResolvedValue({ ok: true, json: async () => ({ boxNumber: 'HBX-0042' }) });

    const result = await runPaymentResume();

    expect(result).toEqual({ kind: 'activateDigitalBox', ok: true, data: { boxNumber: 'HBX-0042' } });
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/customer/digital-box/activate', { method: 'POST' });
    expect(readStoredIntent()).toBeNull();
  });
});
