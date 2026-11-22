const crypto = require('crypto');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function verifyPaystackReference(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Payment gateway is not configured. Set PAYSTACK_SECRET_KEY to enable wallet top-ups.');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    signal: AbortSignal.timeout(10000)
  });

  const data = await response.json();
  if (!data.status || !data.data || data.data.status !== 'success') {
    throw new Error(data.message || 'Payment verification failed.');
  }

  return {
    reference: data.data.reference,
    amountNgn: data.data.amount / 100,
    currency: data.data.currency,
    status: data.data.status,
    customerEmail: data.data.customer?.email || null,
    paidAt: data.data.paid_at || null
  };
}

// Confirms a Paystack webhook really came from the gateway. Paystack signs
// the raw request body with the secret key using HMAC-SHA512.
function verifyPaystackSignature({ rawBody, signature, secret }) {
  if (!secret || !signature) return false;

  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = { verifyPaystackReference, verifyPaystackSignature };
