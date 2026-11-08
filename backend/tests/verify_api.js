const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const app = require('../src/index');

async function testBackend() {
  console.log('=== RUNNING BACKEND INTEGRATION VERIFICATION ===');
  
  let server = null;
  let baseUrl = 'http://127.0.0.1:5000';
  try {
    const check = await fetch('http://127.0.0.1:5000/api/health');
    if (check.ok) {
      baseUrl = 'http://127.0.0.1:5000';
    } else {
      server = app.listen(5099, '127.0.0.1');
      baseUrl = 'http://127.0.0.1:5099';
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (e) {
    server = app.listen(5099, '127.0.0.1');
    baseUrl = 'http://127.0.0.1:5099';
    await new Promise(r => setTimeout(r, 1500));
  }

  async function req(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      method: options.method || 'GET',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await req('/api/health');
    assert('Health Check UP', health.status === 200 && health.data.status === 'UP', JSON.stringify(health.data));

    // 2. Postcode Lookup (Abuja Wuse 2 - NDAPS Alphanumeric)
    const pc = await req('/api/v1/postcodes/FC-01-A03-FK-01');
    assert('Postcode FC-01-A03-FK-01 Resolved', pc.status === 200 && pc.data.postcode === 'FC-01-A03-FK-01', JSON.stringify(pc.data));

    // 3. Hubs Ranking
    const hubs = await req('/api/v1/hubs/nearby?lat=9.0765&lng=7.4985&radius=10');
    assert('Ranked Nearby Hubs Returned', hubs.status === 200 && hubs.data.hubs.length > 0, `Count: ${hubs.data?.hubs?.length}`);

    // 4. Auth: Login with seeded customer
    const login = await req('/api/v1/auth/login', {
      method: 'POST',
      body: { identifier: '+2348037778899' }
    });
    assert('Customer Auth Login', login.status === 200 && login.data.token, JSON.stringify(login.data));
    const token = login.data.token;

    // 5. Book Shipment
    const book = await req('/api/v1/shipments/book', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        serviceType: 'DOOR_TO_HUB',
        senderName: 'Tunde Fashola',
        senderPhone: '+2348037778899',
        senderPostcode: 'FC-01-A03-FK-01',
        senderAddressText: 'Plot 10 Emeka Anyaoku, Wuse 2',
        recipientName: 'Amina Bello',
        recipientPhone: '+2348033334445',
        recipientPostcode: '900241',
        recipientAddressText: 'Jabi Lake Mall',
        destinationHubId: hubs.data.hubs[0].id,
        size: 'medium',
        packageDescription: 'Camera gear'
      }
    });
    assert('Shipment Booking with OTPs & QR Pass', book.status === 201 && book.data.shipment?.tracking_code, JSON.stringify(book.data));

    const newShipment = book.data.shipment;
    const trackingCode = newShipment.tracking_code;
    const pickupOtp = book.data.pickupOtp;

    // 6. Track Shipment
    const track = await req(`/api/v1/shipments/track/${trackingCode}`);
    assert('Public Parcel Tracking with Timeline', track.status === 200 && track.data.shipment.status === 'BOOKED');

    // 7. Execute Custody Handover (SENDER_TO_RIDER via Pickup OTP)
    const transfer = await req('/api/v1/custody/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-user-id': 'a0000000-0000-0000-0000-000000000006' // Musa Danladi (Rider)
      },
      body: {
        shipmentId: newShipment.id,
        handoverType: 'SENDER_TO_RIDER',
        verificationMethod: 'OTP',
        verificationToken: pickupOtp,
        lat: 9.0765,
        lng: 7.4985,
        notes: 'Verified pickup from sender'
      }
    });
    assert('Custody Handover (SENDER -> RIDER)', transfer.status === 200 && transfer.data.newStatus === 'IN_TRANSIT_TO_HUB', JSON.stringify(transfer.data));

    // 8. Verify Updated Timeline
    const trackAfter = await req(`/api/v1/shipments/track/${trackingCode}`);
    assert('Shipment Status is IN_TRANSIT_TO_HUB', trackAfter.data.shipment.status === 'IN_TRANSIT_TO_HUB');
    assert('Custody Ledger Has Entry', trackAfter.data.timeline.length > 0);

    // 9. Operations Control Tower Stats (requires ops admin / super admin)
    const opsLogin = await req('/api/v1/auth/login', {
      method: 'POST',
      body: { identifier: '+2348000000000' } // System Super Admin
    });
    const opsToken = opsLogin.data.token;

    const stats = await req('/api/v1/operations/stats', {
      headers: { Authorization: `Bearer ${opsToken}` }
    });
    assert('Operations Stats Endpoint', stats.status === 200 && stats.data.hubs.total >= 5);

    // 10. Verification Queue (Compliance review with Compliance Officer login)
    const compLogin = await req('/api/v1/auth/login', {
      method: 'POST',
      body: { identifier: '+2348079988776' } // Oluwaseun Adeyemi (compliance_officer)
    });
    const compToken = compLogin.data.token;

    const queue = await req('/api/v1/verification/queue', {
      headers: { Authorization: `Bearer ${compToken}` }
    });
    assert('Compliance Verification Queue Authorized', queue.status === 200 && queue.data.records !== undefined);

    console.log(`\n=== ALL TESTS PASSED: ${passed}/${passed + failed} ===\n`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

testBackend();
