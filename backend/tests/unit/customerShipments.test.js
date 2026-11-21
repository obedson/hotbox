const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../../src/routes/customer/shipments');
const db = require('../../src/config/db');

const originalQuery = db.query;
after(() => { db.query = originalQuery; });

function handlerFor(method, path) {
  const layer = router.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function shipmentRow(overrides = {}) {
  return {
    id: 'ship-1',
    tracking_code: 'HBX-FC01A0-9781',
    service_type: 'DOOR_TO_HUB',
    sender_id: 'user-sender',
    sender_name: 'Ada Sender',
    sender_phone: '+2348000000001',
    sender_postcode: 'FC-01-A03-FK-01',
    sender_address_text: 'Wuse 2, Abuja',
    recipient_name: 'Obi Recipient',
    recipient_phone: '+2348000000002',
    recipient_postcode: 'FC-01-A03-FK-01',
    recipient_address_text: 'Wuse 2, Abuja',
    status: 'BOOKED',
    pricing_total_ngn: '2500.00',
    pickup_otp: '111111',
    pickup_otp_expires_at: null,
    pickup_otp_attempts: 0,
    pickup_otp_consumed_at: null,
    delivery_otp: '222222',
    collection_qr_token: 'QR-PASS-ABC123',
    ...overrides
  };
}

async function listShipments(user, rows) {
  db.query = async (sql) => {
    if (/COUNT\(\*\)/i.test(sql)) return { rows: [{ count: String(rows.length) }] };
    return { rows };
  };

  const outcome = { statusCode: null, body: null };
  const res = {
    status(code) { outcome.statusCode = code; return this; },
    json(payload) { outcome.body = payload; return this; }
  };

  await handlerFor('get', '/shipments')({ user, query: {} }, res, () => {});
  return outcome.body;
}

test('a sender never receives collection credentials or pickup OTPs', async () => {
  const body = await listShipments(
    { id: 'user-sender', phone: '+2348000000009' },
    [shipmentRow()]
  );

  const row = body.shipments[0];
  assert.equal(row.is_sender, true);
  assert.equal(row.is_recipient, false);
  assert.equal(row.delivery_otp, undefined);
  assert.equal(row.collection_qr_token, undefined);
  assert.equal(row.pickup_otp, undefined);
  assert.equal(row.pickup_otp_expires_at, undefined);
  assert.equal(row.pickup_otp_attempts, undefined);
  assert.equal(row.pickup_otp_consumed_at, undefined);
  // Non-credential fields still reach the sender.
  assert.equal(row.tracking_code, 'HBX-FC01A0-9781');
  assert.equal(row.sender_name, 'Ada Sender');
});

test('a recipient receives their own collection credentials', async () => {
  const body = await listShipments(
    { id: 'user-recipient', phone: '+2348000000002' },
    [shipmentRow()]
  );

  const row = body.shipments[0];
  assert.equal(row.is_sender, false);
  assert.equal(row.is_recipient, true);
  assert.equal(row.delivery_otp, '222222');
  assert.equal(row.collection_qr_token, 'QR-PASS-ABC123');
  assert.equal(row.pickup_otp, undefined);
});

test('a booking customer who is also the recipient keeps their credentials', async () => {
  const body = await listShipments(
    { id: 'user-sender', phone: '+2348000000002' },
    [shipmentRow()]
  );

  const row = body.shipments[0];
  assert.equal(row.is_sender, true);
  assert.equal(row.is_recipient, true);
  assert.equal(row.delivery_otp, '222222');
});