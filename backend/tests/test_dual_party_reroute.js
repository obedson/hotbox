const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('=== TEST: AUTOMATED DUAL-PARTY REROUTE ALERTS & CHANNEL PRICING ===\n');

  // Customer: Tunde Fashola (+2348037778899)
  const loginRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { identifier: '+2348037778899' });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    console.error('Failed to log in test customer:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.token;
  console.log('1. Customer logged in successfully.');

  // Test 1: Update Notification Preferences with Free In-App & Email + Paid SMS
  console.log('\n2. Testing PUT /api/v1/customer/notification-preferences...');
  const prefRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/customer/notification-preferences',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  }, {
    inapp: true,
    email: true,
    sms: true,
    whatsapp: false
  });

  console.log('Status:', prefRes.status);
  console.log('Preferences:', prefRes.body.preferences);
  console.log('Channel Pricing Table:', prefRes.body.pricing);

  if (prefRes.status !== 200) {
    console.error('Preferences update failed!');
    process.exit(1);
  }

  // Test 2: Trigger Dual-Party Reroute Alert Simulation
  console.log('\n3. Testing POST /api/v1/customer/test-reroute-alert...');
  const rerouteRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/customer/test-reroute-alert',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  }, {
    oldPostcode: 'LA-01-A01-AA-01',
    newPostcode: 'FC-01-A03-FK-01'
  });

  console.log('Status:', rerouteRes.status);
  console.log('Message:', rerouteRes.body.message);
  console.log('Recipient Notice:', JSON.stringify(rerouteRes.body.dispatchResult?.recipient, null, 2));
  console.log('Sender Notice:', JSON.stringify(rerouteRes.body.dispatchResult?.sender, null, 2));
  console.log('Wallet Balance:', rerouteRes.body.walletBalance);

  // Test 3: Fetch in-app notifications to verify instant delivery
  console.log('\n4. Verifying in-app notifications feed...');
  const notifRes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/notifications',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Total notifications:', notifRes.body.notifications?.length);
  const rerouteNotif = notifRes.body.notifications?.find(n => n.type === 'REROUTE_ALERT');
  console.log('Latest Reroute Alert found in DB:', rerouteNotif ? rerouteNotif.title : 'None');

  if (rerouteRes.status === 200 && rerouteNotif) {
    console.log('\n✅ ALL DUAL-PARTY REROUTE ALERT TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('\n❌ Test failed: reroute notification not verified in database.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
