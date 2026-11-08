const { test } = require('node:test');
const assert = require('node:assert/strict');

test('verifyPaystackReference refuses to run when the gateway is not configured', async () => {
  const modulePath = require.resolve('../../src/services/paymentService');
  const previous = process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_SECRET_KEY;
  delete require.cache[modulePath];

  try {
    const { verifyPaystackReference } = require('../../src/services/paymentService');
    await assert.rejects(
      () => verifyPaystackReference('ref-123'),
      /Payment gateway is not configured/
    );
  } finally {
    if (previous !== undefined) process.env.PAYSTACK_SECRET_KEY = previous;
    delete require.cache[modulePath];
  }
});
