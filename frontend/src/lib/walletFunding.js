import { apiFetch } from './api';
import { openPaystackCheckout } from './paystack';

export const buildGatewayReference = (prefix = 'HBXTOPUP') => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${Date.now()}${rand}`;
};

// Opens the Paystack checkout for an amount and, once the gateway confirms the
// payment, asks the API to verify the reference and credit the wallet.
export function fundWalletWithCard({ amountNgn, email, reference, metadata, onCredited }) {
  const gatewayReference = reference || buildGatewayReference();

  return new Promise((resolve, reject) => {
    openPaystackCheckout({
      email,
      amountNgn,
      reference: gatewayReference,
      description: 'Hotbox wallet top-up',
      metadata,
      onCancel: () => reject(new Error('Payment cancelled.')),
      onSuccess: async (response) => {
        try {
          const res = await apiFetch('/api/v1/wallets/topup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gatewayReference: (response && response.reference) || gatewayReference
            })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Your payment could not be confirmed. Please contact support.');
          }
          if (onCredited) await onCredited(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      }
    }).catch(reject);
  });
}

// Makes sure the wallet can cover `requiredAmount`, topping up the shortfall by
// card when needed. Returns the wallet balance afterwards.
export async function ensureWalletFunds({ requiredAmount, email, balance, onBalanceRefreshed }) {
  const currentBalance = Number(balance || 0);
  if (currentBalance >= requiredAmount) return currentBalance;

  await fundWalletWithCard({
    amountNgn: requiredAmount - currentBalance,
    email,
    metadata: { reason: 'wallet_shortfall' },
    onCredited: async () => {
      if (onBalanceRefreshed) await onBalanceRefreshed();
    }
  });

  return requiredAmount;
}