import { apiFetch } from './api';

let configPromise = null;

export function getPaystackConfig() {
  if (!configPromise) {
    configPromise = apiFetch('/api/v1/payments/config')
      .then((res) => res.json())
      .catch(() => ({ enabled: false, publicKey: '' }));
  }
  return configPromise;
}

// Test helper: drop the cached config so a new environment is picked up.
export function resetPaystackConfig() {
  configPromise = null;
}

export { startHostedCheckout } from './hostedCheckout';