const express = require('express');
const router = express.Router();

// GET /api/v1/payments/config - client config for the Paystack checkout popup.
// The secret key never leaves the server; only the public key is exposed here.
router.get('/config', (req, res) => {
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
  const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

  res.json({
    provider: 'paystack',
    enabled: Boolean(publicKey && secretKey),
    publicKey
  });
});

module.exports = router;