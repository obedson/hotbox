const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { creditWalletForPayment } = require('../services/walletService');

// GET /api/v1/wallets/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const walletRes = await db.query(
      'SELECT id, balance_ngn, ledger_balance_ngn, currency, updated_at FROM wallets WHERE user_id = $1',
      [req.user.id]
    );

    let wallet = walletRes.rows[0];
    if (!wallet) {
      const created = await db.query(
        'INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0.00, 0.00) RETURNING *',
        [req.user.id]
      );
      wallet = created.rows[0];
    }

    const txRes = await db.query(
      `SELECT t.*, s.tracking_code 
       FROM transactions t
       LEFT JOIN shipments s ON t.shipment_id = s.id
       WHERE t.wallet_id = $1 
       ORDER BY t.created_at DESC 
       LIMIT 50`,
      [wallet.id]
    );

    res.json({
      wallet: {
        id: wallet.id,
        balance: parseFloat(wallet.balance_ngn),
        ledgerBalance: parseFloat(wallet.ledger_balance_ngn),
        currency: wallet.currency
      },
      transactions: txRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/wallets/topup (verify a gateway payment, then credit)
router.post('/topup', authenticate, async (req, res) => {
  const { gatewayReference } = req.body;
  if (!gatewayReference) {
    return res.status(400).json({ error: 'A gatewayReference is required. Complete a payment through the gateway first.' });
  }

  try {
    const result = await creditWalletForPayment(req.user.id, gatewayReference);
    if (result.alreadyCredited) {
      return res.status(409).json({ error: 'This payment reference has already been credited.' });
    }
    res.json({
      message: 'Wallet successfully topped up.',
      newBalance: result.balanceAfter,
      transaction: result.transaction
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
