const assert = require('node:assert/strict');
const crypto = require('node:crypto');

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

test('verifyPaystackSignature accepts a correctly signed webhook body', () => {
  const secret = 'sk_test_unit';
  const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-123' } }));
  const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  const { verifyPaystackSignature } = loadPaymentService();
  assert.equal(verifyPaystackSignature({ rawBody, signature, secret }), true);
});

test('verifyPaystackSignature rejects a missing or mismatched signature', () => {
  const rawBody = Buffer.from('{"event":"charge.success"}');
  const secret = 'sk_test_unit';
  const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  const { verifyPaystackSignature } = loadPaymentService();
  assert.equal(verifyPaystackSignature({ rawBody, signature: 'deadbeef', secret }), false);
  assert.equal(verifyPaystackSignature({ rawBody, signature, secret: 'sk_test_other' }), false);
  assert.equal(verifyPaystackSignature({ rawBody, signature, secret: '' }), false);
  assert.equal(verifyPaystackSignature({ rawBody, signature: '', secret }), false);
});

test('initializePaystackTransaction refuses to run when the gateway is not configured', async () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  const { initializePaystackTransaction } = loadPaymentService();
  await assert.rejects(
    () => initializePaystackTransaction({ email: 'payer@example.com', amountNgn: 5000, reference: 'HBX-1', returnUrl: 'https://hotbox.example/' }),
    /Payment gateway is not configured/
  );
});

test('initializePaystackTransaction sends kobo, callback URL and reference to Paystack', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit';
  let captured;
  global.fetch = async (url, options) => {
    captured = { url, options };
    return {
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc',
          access_code: 'abc',
          reference: 'HBX-1'
        }
      })
    };
  };

  const { initializePaystackTransaction } = loadPaymentService();
  const result = await initializePaystackTransaction({
    email: 'payer@example.com',
    amountNgn: 2500.5,
    reference: 'HBX-1',
    returnUrl: 'https://hotbox.example/?payment=success',
    metadata: { reason: 'wallet_topup' }
  });

  assert.equal(captured.url, 'https://api.paystack.co/transaction/initialize');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.amount, 250050);
  assert.equal(body.currency, 'NGN');
  assert.equal(body.reference, 'HBX-1');
  assert.equal(body.callback_url, 'https://hotbox.example/?payment=success');
  assert.equal(body.email, 'payer@example.com');
  assert.equal(body.metadata.reason, 'wallet_topup');
  assert.equal(result.authorizationUrl, 'https://checkout.paystack.com/abc');
  assert.equal(result.accessCode, 'abc');
  assert.equal(result.reference, 'HBX-1');
});

test('initializePaystackTransaction throws when the gateway rejects the request', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit';
  global.fetch = async () => ({
    json: async () => ({ status: false, message: 'Could not initialize transaction' })
  });

  const { initializePaystackTransaction } = loadPaymentService();
  await assert.rejects(
    () => initializePaystackTransaction({ email: 'payer@example.com', amountNgn: 1000, reference: 'HBX-2', returnUrl: 'https://hotbox.example/' }),
    /Could not initialize transaction/
  );
});

test('buildGatewayReference uses the prefix and is unique', () => {
  const { buildGatewayReference } = loadPaymentService();
  const first = buildGatewayReference('HBX');
  const second = buildGatewayReference('HBX');

  assert.match(first, /^HBX-\d+-[0-9A-F]{12}$/);
  assert.notEqual(first, second);
});
test('verifyPaystackReference explains an unpaid reference', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit';
  global.fetch = async () => ({
    json: async () => ({
      status: true,
      message: 'Verification successful',
      data: { status: 'abandoned', reference: 'ref-123' }
    })
  });

  const { verifyPaystackReference } = loadPaymentService();
  await assert.rejects(
    () => verifyPaystackReference('ref-123'),
    /not been completed/
  );
});
