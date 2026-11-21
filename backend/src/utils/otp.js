const crypto = require('crypto');

// Pickup OTP policy. Industry standard for a 6-digit courier handover code:
// cryptographically secure generation, a short validity window, and a hard
// attempt ceiling so the code cannot be brute-forced.
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

function generateOtp() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH;
  return crypto.randomInt(min, max).toString();
}

function otpExpiryFromNow(minutes = OTP_EXPIRY_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = {
  generateOtp,
  otpExpiryFromNow,
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS
};
