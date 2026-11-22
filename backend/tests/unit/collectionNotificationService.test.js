const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const notificationService = require('../../src/services/notificationService');
const { buildSmsMessage, sendCollectionCredentials } = require('../../src/services/collectionNotificationService');

const originalSms = notificationService.sendSmsNotification;
const originalEmail = notificationService.sendEmailNotification;

const calls = { sms: [], email: [] };
notificationService.sendSmsNotification = async (payload) => { calls.sms.push(payload); return { success: true, delivered: true, provider: 'TEST' }; };
notificationService.sendEmailNotification = async (payload) => { calls.email.push(payload); return { success: true, delivered: true }; };

after(() => {
  notificationService.sendSmsNotification = originalSms;
  notificationService.sendEmailNotification = originalEmail;
});

const shipment = {
  tracking_code: 'HBX-FC01A0-5901',
  recipient_name: 'Ngozi Eze',
  collection_qr_token: 'QR-PASS-ABC123',
  delivery_otp: '482916'
};

test('the SMS carries both credentials with the QR pass first', () => {
  const message = buildSmsMessage({ shipment, hubName: 'Hotbox Community Hub' });
  assert.match(message, /HBX-FC01A0-5901/);
  assert.match(message, /Hotbox Community Hub/);
  assert.match(message, /QR-PASS-ABC123/);
  assert.match(message, /482916/);
  assert.ok(message.indexOf('QR-PASS-ABC123') < message.indexOf('482916'), 'QR pass should be presented before the OTP');
});

test('the SMS names the recipient when one is on the shipment', () => {
  assert.match(buildSmsMessage({ shipment, hubName: 'Hotbox Community Hub' }), /Hi Ngozi Eze/);
  const anonymous = buildSmsMessage({ shipment: { ...shipment, recipient_name: null }, hubName: 'Hotbox Community Hub' });
  assert.doesNotMatch(anonymous, /Hi null/);
});

test('credentials are delivered to both channels with a receipt', async () => {
  calls.sms.length = 0;
  calls.email.length = 0;

  const result = await sendCollectionCredentials({
    shipment,
    hubName: 'Hotbox Community Hub',
    recipientPhone: '+2348108525262',
    recipientEmail: 'ngozi@example.com'
  });

  assert.equal(result.success, true);
  assert.equal(result.receipt.sms.delivered, true);
  assert.equal(result.receipt.email.delivered, true);
  assert.equal(calls.sms.length, 1);
  assert.equal(calls.email.length, 1);
  assert.equal(calls.sms[0].phone, '+2348108525262');
  assert.match(calls.sms[0].message, /QR-PASS-ABC123/);
  assert.equal(calls.email[0].to, 'ngozi@example.com');
  assert.match(calls.email[0].html, /QR-PASS-ABC123/);
  assert.match(calls.email[0].html, /482916/);
});

test('a shipment without an email still gets the SMS', async () => {
  calls.sms.length = 0;
  calls.email.length = 0;

  const result = await sendCollectionCredentials({
    shipment,
    hubName: 'Hotbox Community Hub',
    recipientPhone: '+2348108525262',
    recipientEmail: null
  });

  assert.equal(calls.sms.length, 1);
  assert.equal(calls.email.length, 0);
  assert.equal(result.receipt.email.delivered, false);
});

test('a failing channel never rejects the delivery', async () => {
  notificationService.sendSmsNotification = async () => { throw new Error('gateway down'); };
  try {
    const result = await sendCollectionCredentials({
      shipment,
      hubName: 'Hotbox Community Hub',
      recipientPhone: '+2348108525262',
      recipientEmail: 'ngozi@example.com'
    });
    assert.equal(result.success, true);
    assert.equal(result.receipt.sms.delivered, false);
    assert.match(result.receipt.sms.error, /gateway down/);
    assert.equal(result.receipt.email.delivered, true);
  } finally {
    notificationService.sendSmsNotification = async (payload) => { calls.sms.push(payload); return { success: true, delivered: true, provider: 'TEST' }; };
  }
});