const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate, registerSchema, bookingSchema, custodyTransferSchema } = require('../../src/middleware/validate');

test('registerSchema defaults the role to customer', () => {
  const parsed = registerSchema.parse({ name: 'Test User', phone: '+2348037778899' });
  assert.equal(parsed.role, 'customer');
});

test('registerSchema rejects an unknown role', () => {
  assert.throws(() => registerSchema.parse({ name: 'Test User', phone: '+2348037778899', role: 'wizard' }));
});

test('bookingSchema applies service defaults', () => {
  const parsed = bookingSchema.parse({
    senderPhone: '+2348037778899',
    senderPostcode: 'FC-01-A03-FK-01',
    senderAddressText: 'Plot 10',
    recipientName: 'Amina Bello',
    recipientPhone: '+2348033334445',
    recipientPostcode: 'FC-01-A03-FK-01',
    recipientAddressText: 'Jabi Lake Mall'
  });
  assert.equal(parsed.serviceType, 'DOOR_TO_HUB');
  assert.equal(parsed.size, 'medium');
  assert.equal(parsed.weightKg, 1.0);
});

test('custodyTransferSchema defaults the verification method to OTP', () => {
  const parsed = custodyTransferSchema.parse({
    shipmentId: 'ship-1',
    handoverType: 'SENDER_TO_RIDER',
    verificationToken: '1234'
  });
  assert.equal(parsed.verificationMethod, 'OTP');
});

test('validate middleware responds 400 with field details on invalid input', () => {
  const req = { body: { name: 'X', phone: '123' } };
  const res = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  let nextCalled = false;

  validate(registerSchema)(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.ok(Array.isArray(res.payload.details));
});

test('validate middleware calls next and attaches the parsed body on valid input', () => {
  const req = { body: { name: 'Test User', phone: '+2348037778899' } };
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  let nextCalled = false;

  validate(registerSchema)(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.validatedBody.role, 'customer');
});
