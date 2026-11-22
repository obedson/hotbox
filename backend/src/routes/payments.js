const express = require('express');
const router = express.Router();
const { creditWalletForGatewayReference } = require('../services/walletService');
const {
  verifyPaystackSignature,
  initializePaystackTransaction,
  buildGatewayReference
} = require('../services/paymentService');
const { authenticate } = require('../middleware/auth');

// GET /api/v1/payments/config - client config for the payment gateway.
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

// POST /api/v1/payments/checkout - start a hosted Paystack checkout.
// The customer is redirected to Paystack's hosted page and back to the app,
// so the browser never loads an external popup script.
router.post('/checkout', authenticate, async (req, res) => {
  const email = String((req.body && req.body.email) || req.user.email || '').trim();
  const amountNgn = Number(req.body && req.body.amountNgn);
  const metadata = req.body && req.body.metadata && typeof req.body.metadata === 'object'
    ? req.body.metadata
    : {};

  if (!email || email.indexOf('@') === -1) {
    return res.status(400).json({ error: 'A valid email address is required to start checkout.' });
  }
  if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
    return res.status(400).json({ error: 'A valid payment amount is required.' });
  }

  const reference = buildGatewayReference('HBX');
  const baseUrl = String(process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  const returnUrl = baseUrl + '/?payment=success';

  try {
    const result = await initializePaystackTransaction({
      email,
      amountNgn,
      reference,
      returnUrl,
      metadata: Object.assign({}, metadata, { userId: req.user.id })
    });

    return res.json({
      reference: result.reference,
      authorizationUrl: result.authorizationUrl
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Could not start the checkout. Please try again.' });
  }
});

// POST /api/v1/payments/webhooks/paystack - server-to-server payment confirmation.
// Paystack signs the raw request body with the secret key; the signature is
// checked before any wallet is credited.
router.post('/webhooks/paystack', async (req, res) => {
  const signature = req.get('x-paystack-signature') || '';
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  const signatureMatches = verifyPaystackSignature({
    rawBody,
    signature,
    secret: process.env.PAYSTACK_SECRET_KEY || ''
  });

  if (!signatureMatches) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body || {};
  const reference = event && event.data ? event.data.reference : null;
  const confirmedEvents = ['charge.success', 'transaction.success'];

  if (!reference || confirmedEvents.indexOf(event.event) === -1) {
    return res.json({ received: true, credited: false });
  }

  try {
    const result = await creditWalletForGatewayReference(reference);
    return res.json({ received: true, credited: !result.alreadyCredited });
  } catch (err) {
    return res.status(400).json({ received: true, error: err.message });
  }
});

module.exports = router;