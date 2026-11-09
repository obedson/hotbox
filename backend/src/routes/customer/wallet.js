const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const { creditWalletForPayment } = require('../../services/walletService');
// POST /api/v1/customer/wallet/topup (verify a gateway payment, then credit)
router.post('/wallet/topup', authenticate, async (req, res) => {
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
      message: `Wallet credited with ₦${result.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} prepaid logistics credit.`,
      newBalance: result.balanceAfter,
      transaction: result.transaction
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
