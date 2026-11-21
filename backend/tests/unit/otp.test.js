const test = require('node:test');
const assert = require('node:assert');
const {
  generateOtp,
  otpExpiryFromNow,
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS
} = require('../../src/utils/otp');

test('generateOtp returns a 6-digit numeric string', () => {
  for (let i = 0; i < 500; i++) {
    const otp = generateOtp();
    assert.equal(typeof otp, 'string');
    assert.equal(otp.length, OTP_LENGTH);
    assert.match(otp, /^[0-9]{6}$/);
    assert.ok(Number(otp) >= 100000, 'must not have a leading zero');
  }
});

test('generateOtp produces a wide, non-repeating spread', () => {
  const samples = new Set(Array.from({ length: 300 }, () => generateOtp()));
  assert.ok(samples.size > 200, 'expected cryptographic randomness, got heavy collisions');
});

test('otpExpiryFromNow defaults to a 10 minute validity window', () => {
  const before = Date.now();
  const expiry = otpExpiryFromNow();
  const delta = expiry.getTime() - before;
  assert.ok(delta > (OTP_EXPIRY_MINUTES - 1) * 60 * 1000);
  assert.ok(delta <= OTP_EXPIRY_MINUTES * 60 * 1000);
});

test('pickup OTP policy matches courier-industry defaults', () => {
  assert.equal(OTP_LENGTH, 6);
  assert.equal(OTP_EXPIRY_MINUTES, 10);
  assert.equal(OTP_MAX_ATTEMPTS, 5);
});
