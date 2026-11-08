const assert = require('node:assert/strict');

const { test, after } = require('node:test');

function loadPaymentService() {
  const modulePath = require.resolve('../../src/services/paymentService');
  delete require.cache[modulePath];
  return require('../../src/services/paymentService');
}

const originalFetch = global.fetch;
const originalKey = process.env.PAYSTACK_SECRET_KEY;

after(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = originalKey;
});

test('verifyPaystackReference refuses to run when the gateway is not configured', async () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  const { verifyPaystackReference } = loadPaymentService();
  await assert.rejects(
    () => verifyPaystackReference('ref-123'),
    /Payment gateway is not configured/
  );
});

test('verifyPaystackReference returns the naira amount for a successful payment', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit';
  global.fetch = async () => ({
    json: async () => ({
      status: true,
      data: {
        status: 'success',
        reference: 'ref-123',
        amount: 500000,
        currency: 'NGN',
        customer: { email: 'payer@example.com' },
        paid_at: '2026-11-09T10:00:00.000Z'
      }
    })
  });

  const { verifyPaystackReference } = loadPaymentService();
  const result = await verifyPaystackReference('ref-123');

  assert.equal(result.amountNgn, 5000);
  assert.equal(result.reference, 'ref-123');
  assert.equal(result.currency, 'NGN');
  assert.equal(result.customerEmail, 'payer@example.com');
});

test('verifyPaystackReference throws when the gateway rejects the reference', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit';
  global.fetch = async () => ({
    json: async () => ({ status: false, message: 'Transaction reference not found' })
  });

  const { verifyPaystackReference } = loadPaymentService();
  await assert.rejects(
    () => verifyPaystackReference('ref-missing'),
    /Transaction reference not found/
  );
});
