const { test } = require('node:test');
const assert = require('node:assert/strict');

// custodyService captures sendCollectionCredentials at require time, so install
// a delegating stub before loading it and vary the behaviour per test.
const collection = require('../../src/services/collectionNotificationService');
let notifyBehavior = async () => ({ success: true, receipt: {} });
collection.sendCollectionCredentials = (...args) => notifyBehavior(...args);

const db = require('../../src/config/db');
const { processCustodyTransfer } = require('../../src/services/custodyService');

const SHIPMENT = {
  id: 'd0000000-0000-0000-0000-000000000001',
  tracking_code: 'HBX-FC01A0-5901',
  recipient_name: 'Ngozi Eze',
  recipient_phone: '+2348108525262',
  recipient_email: 'ngozi@example.com',
  collection_qr_token: 'QR-PASS-ABC123',
  delivery_otp: '482916',
  destination_hub_id: 'c2088c80-600d-4673-bada-a8d470869dbf',
  assigned_rider_id: '7a8c8ea6-3c8c-4353-a50c-23a92cda5964',
  sender_id: '97816548-06cf-4650-82b6-73b4d9fb2a16',
  status: 'IN_TRANSIT_TO_HUB'
};

function fakeClient() {
  const calls = [];
  return {
    calls,
    async query(sql) {
      calls.push({ sql });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM shipments WHERE id = $1 FOR UPDATE')) return { rows: [SHIPMENT] };
      if (sql.includes('FROM hubs WHERE id = $1')) return { rows: [{ business_name: 'Hotbox Community Hub' }] };
      if (sql.includes('UPDATE hub_storage_bays')) return { rows: [{ id: 'bay-1' }] };
      if (sql.includes('INSERT INTO custody_ledger')) return { rows: [{ id: 'ledger-1' }] };
      return { rows: [] };
    },
    release() {}
  };
}

function transferPayload() {
  return {
    shipmentId: SHIPMENT.id,
    handoverType: 'RIDER_TO_HUB',
    verificationMethod: 'QR_SCAN',
    verificationToken: 'QR-PASS-ABC123',
    actorId: 'a0000000-0000-0000-0000-000000000001',
    actorRole: 'hub_owner',
    bayCode: 'BAY-01'
  };
}

test('hub intake delivers the collection credentials to the recipient', async () => {
  const original = db.getClient;
  const client = fakeClient();
  db.getClient = async () => client;

  const seen = [];
  notifyBehavior = async (payload) => { seen.push(payload); return { success: true, receipt: {} }; };

  try {
    const result = await processCustodyTransfer(transferPayload());

    assert.equal(result.newStatus, 'STORED_IN_BAY');
    assert.equal(seen.length, 1, 'credentials must be delivered exactly once on intake');
    assert.equal(seen[0].hubName, 'Hotbox Community Hub');
    assert.equal(seen[0].recipientPhone, '+2348108525262');
    assert.equal(seen[0].recipientEmail, 'ngozi@example.com');
    assert.equal(seen[0].shipment.collection_qr_token, 'QR-PASS-ABC123');
    assert.equal(seen[0].shipment.delivery_otp, '482916');
  } finally {
    db.getClient = original;
  }
});

test('a failed delivery does not roll back a completed intake', async () => {
  const original = db.getClient;
  const client = fakeClient();
  db.getClient = async () => client;

  notifyBehavior = async () => { throw new Error('SMS gateway down'); };

  try {
    const result = await processCustodyTransfer(transferPayload());
    assert.equal(result.newStatus, 'STORED_IN_BAY');
    assert.ok(client.calls.some((c) => c.sql === 'COMMIT'), 'the transfer must still commit');
  } finally {
    db.getClient = original;
    notifyBehavior = async () => ({ success: true, receipt: {} });
  }
});