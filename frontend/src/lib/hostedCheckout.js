import { apiFetch } from './api';

const INTENT_KEY = 'hotbox_payment_intent';
const RETURN_KEY = 'hotbox_payment_return';

export function readStoredIntent() {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function clearStoredIntent() {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch (e) {}
}

function storeIntent(intent) {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  } catch (e) {}
}

// Starts the Paystack hosted checkout. The browser is redirected to Paystack
// and returns with ?payment=success&reference=... The intent (including any
// action to resume afterwards) is persisted before the redirect.
export async function startHostedCheckout({ email, amountNgn, metadata = {}, resume = null }) {
  const res = await apiFetch('/api/v1/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amountNgn, metadata })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Could not start the secure checkout. Please try again.');
  }
  if (!data.authorizationUrl) {
    throw new Error('The payment gateway did not return a checkout link. Please try again.');
  }

  storeIntent({
    reference: data.reference,
    amountNgn: Number(amountNgn),
    email,
    metadata,
    resume,
    startedAt: Date.now()
  });

  window.location.assign(data.authorizationUrl);

  // The page is navigating away. Never settle so callers cannot accidentally
  // continue their flow on the old page after the redirect starts.
  return new Promise(() => {});
}

// Reads the payment marker from the current URL and stores it so the wallet
// can be credited once a session is available (including after a fresh login).
export function capturePaymentReturn() {
  try {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    const reference = params.get('reference');
    if (!status || !reference) return null;
    const record = { status, reference };
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(record));
    window.history.replaceState({}, '', window.location.pathname);
    return record;
  } catch (e) {
    return null;
  }
}

export function readPaymentReturn() {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function clearPaymentReturn() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch (e) {}
}

// Runs the action the customer was in the middle of when the checkout
// redirected them away. Called only after the wallet has been credited.
export async function runPaymentResume({ onResult } = {}) {
  const intent = readStoredIntent();
  if (!intent) return { kind: 'none' };
  clearStoredIntent();

  const resume = intent.resume;
  if (!resume || typeof resume !== 'object') return { kind: 'none' };

  const report = (result) => {
    if (onResult) onResult(result);
    return result;
  };

  try {
    if (resume.kind === 'renewDigitalBox') {
      const res = await apiFetch('/api/v1/customer/renew-digital-box', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      return report({ kind: resume.kind, ok: res.ok, data });
    }
    if (resume.kind === 'requestGroundTruth') {
      const res = await apiFetch('/api/v1/customer/request-ground-truthing', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      return report({ kind: resume.kind, ok: res.ok, data });
    }
    if (resume.kind === 'riderRegistrationFee') {
      const res = await apiFetch('/api/v1/riders/registration-fee/pay', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      return report({ kind: resume.kind, ok: res.ok, data });
    }
    if (resume.kind === 'booking' && resume.draft) {
      const res = await apiFetch('/api/v1/shipments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resume.draft)
      });
      const data = await res.json().catch(() => ({}));
      return report({ kind: resume.kind, ok: res.ok, data });
    }
    return { kind: 'unknown' };
  } catch (err) {
    return report({ kind: resume.kind, ok: false, error: err.message });
  }
}