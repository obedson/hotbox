const { test } = require('node:test');
const assert = require('node:assert/strict');

// The service calls the notification helpers at call time, so stubbing the
// module properties before each scenario is enough to capture deliveries.
const notificationService = require('../../src/services/notificationService');
let smsCalls = [];
let emailCalls = [];
let smsBehavior = async () => ({ success: true, delivered: true });
let emailBehavior = async () => ({ success: true, delivered: true });

notificationService.sendSmsNotification = (...args) => {
  smsCalls.push(args[0]);
  return smsBehavior(...args);
};
notificationService.sendEmailNotification = (...args) => {
  emailCalls.push(args[0]);
  return emailBehavior(...args);
};

const db = require('../../src/config/db');
let queries = [];
db.query = async (sql, params) => {
  queries.push({ sql, params });
  return { rows: [{ email: 'sender@example.com' }] };
};

const pickupOtpService = require('../../src/services/pickupOtpService');

const SHIPMENT = {
  id: 'd0000000-0000-0000-0000-000000000009',
  tracking_code: 'HBX-FC01A0-5901',
  sender_id: '97816548-06cf-4650-82b6-73b4d9fb2a16',
  sender_phone: '+2348108525262',
  sender_address_text: 'Wuse 2, Abuja'
};

function reset() {
  queries = [];
  smsCalls = [];
  emailCalls = [];
  smsBehavior = async () => ({ success: true, delivered: true });
  emailBehavior = async () => ({ success: true, delivered: true });
}

test('issuePickupOtp stores a fresh code with a 10-minute window and resets attempts', async () => {
  reset();
  const before = Date.now();
  const result = await pickupOtpService.issuePickupOtp({
    shipmentId: SHIPMENT.id,
    trackingCode: SHIPMENT.tracking_code,
    phone: SHIPMENT.sender_phone,
    email: 'sender@example.com',
    arrived: true
  });
  const after = Date.now();

  assert.match(result.pickupOtp, /^\d{6}$/);
  const expiry = new Date(result.pickupOtpExpiresAt).getTime();
  assert.ok(expiry >= before + 9 * 60 * 1000, 'expiry should be about 10 minutes out');
  assert.ok(expiry <= after + 11 * 60 * 1000, 'expiry should be about 10 minutes out');

  const update = queries.find(q => q.sql.includes('UPDATE shipments'));
  assert.ok(update, 'expected an UPDATE on shipments');
  assert.ok(update.sql.includes('pickup_otp_attempts = 0'));
  assert.ok(update.sql.includes('pickup_otp_consumed_at = NULL'));
  assert.equal(update.params[0], result.pickupOtp);
  assert.equal(update.params[2], SHIPMENT.id);
});

test('issuePickupOtp delivers the code to SMS and email with an arrival message', async () => {
  reset();
  const result = await pickupOtpService.issuePickupOtp({
    shipmentId: SHIPMENT.id,
    trackingCode: SHIPMENT.tracking_code,
    phone: SHIPMENT.sender_phone,
    email: 'sender@example.com',
    arrived: true
  });

  assert.equal(smsCalls.length, 1);
  assert.equal(smsCalls[0].phone, SHIPMENT.sender_phone);
  assert.ok(smsCalls[0].message.includes(result.pickupOtp));
  assert.ok(smsCalls[0].message.toLowerCase().includes('arrived'));
  assert.ok(smsCalls[0].message.includes('10 minutes'));

  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].to, 'sender@example.com');
  assert.ok(emailCalls[0].text.includes(result.pickupOtp));
});

test('notifyRiderOnTheWay tells the sender a rider is coming without any OTP', async () => {
  reset();
  const receipt = await pickupOtpService.notifyRiderOnTheWay({
    shipment: SHIPMENT,
    riderName: 'John Rider',
    riderPhone: '+2348030000000'
  });

  assert.equal(smsCalls.length, 1);
  assert.ok(smsCalls[0].message.includes('John Rider'));
  assert.ok(smsCalls[0].message.includes('on the way'));
  assert.ok(smsCalls[0].message.includes(SHIPMENT.tracking_code));
  assert.doesNotMatch(smsCalls[0].message, /\b\d{6}\b/, 'no OTP may be sent before arrival');

  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].to, 'sender@example.com');
  assert.doesNotMatch(emailCalls[0].text, /\b\d{6}\b/);
  assert.deepEqual(receipt.sms, { success: true, delivered: true });
});

test('a failed SMS delivery does not block the email and is reported', async () => {
  reset();
  smsBehavior = async () => { throw new Error('SMS gateway down'); };
  const result = await pickupOtpService.issuePickupOtp({
    shipmentId: SHIPMENT.id,
    trackingCode: SHIPMENT.tracking_code,
    phone: SHIPMENT.sender_phone,
    email: 'sender@example.com',
    arrived: true
  });

  assert.equal(result.receipt.sms.success, false);
  assert.equal(emailCalls.length, 1);
  assert.ok(result.receipt.email.delivered);
});

test('senderEmailOf returns null when the sender has no row', async () => {
  reset();
  const original = db.query;
  db.query = async () => ({ rows: [] });
  const email = await pickupOtpService.senderEmailOf('missing-id');
  db.query = original;
  assert.equal(email, null);
});