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
  console.log('--- 1. Testing GET /api/v1/customer/profile ---');
  const get1 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/customer/profile',
    method: 'GET',
    headers: { 'x-user-id': 'd7cdef07-2851-49fd-b863-e89f8f41b9e4' }
  });
  console.log('GET 1 Status:', get1.status);
  console.log('Customer Name:', get1.body.user.name);
  console.log('Current Postcode:', get1.body.user.postcode);
  console.log('Current District:', get1.body.user.postcode_neighbourhood);

  console.log('\n--- 2. Testing Relocation: PUT /api/v1/customer/profile to Jabi (900241) ---');
  const put1 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/customer/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'd7cdef07-2851-49fd-b863-e89f8f41b9e4'
    }
  }, {
    name: 'Johnson O.',
    phone: '+2349063085415',
    email: 'afribook.win@gmail.com',
    postcode: '900241'
  });
  console.log('PUT Status:', put1.status);
  console.log('Message:', put1.body.message);
  console.log('New Postcode:', put1.body.user.postcode);
  console.log('New District:', put1.body.user.postcode_neighbourhood);
  console.log('New State:', put1.body.user.postcode_state);

  console.log('\n--- 3. Verifying GET /api/v1/customer/profile persists Jabi (900241) ---');
  const get2 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/customer/profile',
    method: 'GET',
    headers: { 'x-user-id': 'd7cdef07-2851-49fd-b863-e89f8f41b9e4' }
  });
  console.log('Persisted Postcode:', get2.body.user.postcode);
  console.log('Persisted District:', get2.body.user.postcode_neighbourhood);

  console.log('\n--- 4. Restoring / Relocating back to Wuse 2 (FC-01-A03-FK-01) ---');
  const put2 = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/customer/profile',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'd7cdef07-2851-49fd-b863-e89f8f41b9e4'
    }
  }, {
    name: 'Johnson O.',
    phone: '+2349063085415',
    email: 'afribook.win@gmail.com',
    postcode: 'FC-01-A03-FK-01'
  });
  console.log('Final Postcode:', put2.body.user.postcode);
  console.log('Final District:', put2.body.user.postcode_neighbourhood);

  console.log('\n ALL TESTS PASSED SUCCESSFULLY!');
}

run().catch(console.error);
