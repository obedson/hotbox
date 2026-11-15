const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  bookingSchema, custodyTransferSchema
} = require('../../src/middleware/validate');
const { SELF_SIGNUP_ROLES, STAFF_ROLES } = require('../../src/config/roles');

const validRegistration = {
  name: 'Test User',
  phone: '+2348037778899',
  email: 'test@example.com',
  password: 'Password123!'
};

test('registerSchema defaults the role to customer', () => {
  const parsed = registerSchema.parse(validRegistration);
  assert.equal(parsed.role, 'customer');
});

test('registerSchema rejects an unknown role', () => {
  assert.throws(() => registerSchema.parse({ ...validRegistration, role: 'wizard' }));
});

test('registerSchema rejects privileged roles on the self-service path', () => {
  for (const role of STAFF_ROLES) {
    assert.throws(
      () => registerSchema.parse({ ...validRegistration, role }),
      `${role} must never be self-assignable`
    );
  }
});

test('registerSchema only exposes the four public account types', () => {
  for (const role of SELF_SIGNUP_ROLES) {
    const parsed = registerSchema.parse({ ...validRegistration, role });
    assert.equal(parsed.role, role);
  }
});

test('registerSchema requires a verified contact channel and a strong password', () => {
  assert.throws(() => registerSchema.parse({ ...validRegistration, email: undefined }));
  assert.throws(() => registerSchema.parse({ ...validRegistration, email: 'not-an-email' }));
  assert.throws(() => registerSchema.parse({ ...validRegistration, password: undefined }));
  assert.throws(() => registerSchema.parse({ ...validRegistration, password: 'short' }));
});

test('loginSchema requires both an identifier and a password', () => {
  const parsed = loginSchema.parse({ identifier: 'test@example.com', password: 'Password123!' });
  assert.equal(parsed.identifier, 'test@example.com');
  assert.throws(() => loginSchema.parse({ identifier: 'test@example.com' }));
  assert.throws(() => loginSchema.parse({ password: 'Password123!' }));
});

test('password recovery schemas validate their inputs', () => {
  assert.throws(() => forgotPasswordSchema.parse({ email: 'nope' }));
  assert.ok(forgotPasswordSchema.parse({ email: 'test@example.com' }));
  assert.throws(() => resetPasswordSchema.parse({ token: 'short', password: 'Password123!' }));
  assert.ok(resetPasswordSchema.parse({ token: 'a'.repeat(32), password: 'Password123!' }));
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
  const req = { body: validRegistration };
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  let nextCalled = false;

  validate(registerSchema)(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.validatedBody.role, 'customer');
});
