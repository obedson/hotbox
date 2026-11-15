const crypto = require('crypto');
const db = require('../config/db');
const { verifyPaystackReference } = require('./paymentService');

// Credits a wallet only after the gateway confirms the payment. The gateway
// reference is unique per transaction, so a replayed reference cannot credit
// the same wallet twice.
async function creditVerifiedPayment(userId, payment) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM transactions WHERE gateway_reference = $1',
      [payment.reference]
    );
    if (existing.rows.length > 0) {
      await client.query('COMMIT');
      return { alreadyCredited: true, amount: payment.amountNgn };
    }

    const walletRes = await client.query('SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
    let wallet = walletRes.rows[0];
    if (!wallet) {
      const created = await client.query(
        'INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0.00, 0.00) RETURNING *',
        [userId]
      );
      wallet = created.rows[0];
    }

    const balanceBefore = parseFloat(wallet.balance_ngn);
    const balanceAfter = balanceBefore + payment.amountNgn;
    const txRef = `TOPUP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await client.query(
      'UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2',
      [balanceAfter, wallet.id]
    );

    const txRes = await client.query(
      `INSERT INTO transactions (
         wallet_id, transaction_type, amount_ngn, net_amount_ngn,
         balance_before_ngn, balance_after_ngn, reference, payment_gateway,
         gateway_reference, status
       ) VALUES ($1, 'WALLET_TOPUP', $2, $2, $3, $4, $5, 'PAYSTACK', $6, 'COMPLETED')
       RETURNING *`,
      [wallet.id, payment.amountNgn, balanceBefore, balanceAfter, txRef, payment.reference]
    );

    await client.query('COMMIT');
    return {
      alreadyCredited: false,
      amount: payment.amountNgn,
      balanceAfter,
      transaction: txRes.rows[0]
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Client path: the signed-in customer verifies a reference they just paid with.
async function creditWalletForPayment(userId, gatewayReference) {
  const payment = await verifyPaystackReference(gatewayReference);
  return creditVerifiedPayment(userId, payment);
}

// Webhook path: the gateway notifies us directly, so the Hotbox account is
// resolved from the payer email before the wallet is credited.
async function creditWalletForGatewayReference(gatewayReference) {
  const payment = await verifyPaystackReference(gatewayReference);
  if (!payment.customerEmail) {
    throw new Error('Payment has no customer email to match a Hotbox account.');
  }

  const userRes = await db.query('SELECT id FROM users WHERE email = $1', [payment.customerEmail]);
  if (userRes.rows.length === 0) {
    throw new Error('No Hotbox account matches the payer email.');
  }

  return creditVerifiedPayment(userRes.rows[0].id, payment);
}

module.exports = { creditWalletForPayment, creditWalletForGatewayReference };
