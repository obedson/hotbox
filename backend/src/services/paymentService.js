const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function verifyPaystackReference(reference) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Payment gateway is not configured. Set PAYSTACK_SECRET_KEY to enable wallet top-ups.');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
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

module.exports = { verifyPaystackReference };
