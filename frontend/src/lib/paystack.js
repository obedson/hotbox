import { apiFetch } from './api';

const PAYSTACK_SCRIPT_URL = 'https://js.paystack.co/v1/inline.js';

let configPromise = null;
let scriptPromise = null;

export function getPaystackConfig() {
  if (!configPromise) {
    configPromise = apiFetch('/api/v1/payments/config')
      .then((res) => res.json())
      .catch(() => ({ enabled: false, publicKey: '' }));
  }
  return configPromise;
}

// Test helper: drop the cached config/script so a new environment is picked up.
export function resetPaystackConfig() {
  configPromise = null;
  scriptPromise = null;
}

function loadPaystackScript() {
  if (typeof window !== 'undefined' && window.PaystackPop) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PAYSTACK_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Unable to load the payment gateway. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// Opens the Paystack inline checkout. Resolves nothing; the caller reacts to
// onSuccess (gateway confirmed) or onCancel (customer closed the popup).
export async function openPaystackCheckout({
  email,
  amountNgn,
  reference,
  description = 'Hotbox payment',
  metadata = {},
  onSuccess,
  onCancel
}) {
  const config = await getPaystackConfig();
  if (!config.enabled || !config.publicKey) {
    throw new Error('Card payments are not available yet. Please contact support.');
  }

  await loadPaystackScript();

  const handler = window.PaystackPop.setup({
    key: config.publicKey,
    email,
    amount: Math.round(Number(amountNgn) * 100),
    currency: 'NGN',
    ref: reference,
    label: description,
    metadata: { ...metadata, reference },
    callback: (response) => {
      if (onSuccess) onSuccess(response);
    },
    onClose: () => {
      if (onCancel) onCancel();
    }
  });

  handler.openIframe();
}