import { startHostedCheckout } from './hostedCheckout';

export const buildGatewayReference = (prefix = 'HBXTOPUP') => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${Date.now()}${rand}`;
};

// Starts the Paystack hosted checkout for a wallet top-up. The browser is
// redirected to Paystack; the return page credits the wallet and resumes any
// pending action stored in the intent. `onCredited` is kept for call-site
// compatibility and is not awaited across the redirect.
export function fundWalletWithCard({ amountNgn, email, metadata, resume, onCredited }) {
  return startHostedCheckout({ email, amountNgn, metadata, resume });
}

// Makes sure the wallet can cover `requiredAmount`, topping up the shortfall by
// card when needed. Returns the wallet balance afterwards.
export async function ensureWalletFunds({ requiredAmount, email, balance, resume, onBalanceRefreshed }) {
  const currentBalance = Number(balance || 0);
  if (currentBalance >= requiredAmount) return currentBalance;

  await fundWalletWithCard({
    amountNgn: requiredAmount - currentBalance,
    email,
    metadata: { reason: 'wallet_shortfall' },
    resume,
    onCredited: onBalanceRefreshed
  });

  return requiredAmount;
}