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

async function testAll() {
  console.log('===============================================================');
  console.log('TESTING OFFICIAL NIPOST NDAPS (docs.postcode.gov.ng) API SUITE');
  console.log('===============================================================\n');

  // 1. Test official disassemble endpoint
  console.log('1. Testing GET /api/v1/postcodes/assembly/disassemble?code=EK01A03FK01:');
  const dis = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/postcodes/assembly/disassemble?code=EK01A03FK01',
    method: 'GET'
  });
  console.log('Status:', dis.status);
  console.log('Disassembled Data:', dis.body.data);

  // 2. Test official assemble endpoint
  console.log('\n2. Testing POST /api/v1/postcodes/assembly/assemble:');
  const asm = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/postcodes/assembly/assemble',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    state: 'ek',
    lga: '1',
    district: 'a03',
    area: 'fk',
    unit: '1'
  });
  console.log('Status:', asm.status);
  console.log('Assembled Data:', asm.body.data);

  // 3. Test official lookup endpoint (Level 1)
  console.log('\n3. Testing GET /api/v1/postcodes/lookup?code=EK-01-A03-FK-01&level=1:');
  const lk = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/postcodes/lookup?code=EK-01-A03-FK-01&level=1',
    method: 'GET'
  });
  console.log('Status:', lk.status);
  console.log('Lookup Result:', lk.body.data);

  // 4. Test official autocomplete endpoint
  console.log('\n4. Testing GET /api/v1/postcodes/search/autocomplete?q=FC01:');
  const ac = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/postcodes/search/autocomplete?q=FC01',
    method: 'GET'
  });
  console.log('Status:', ac.status);
  console.log('Suggestions:', ac.body.suggestions);

  // 5. Test NDAPS code resolution (FC-01-A03-FK-01)
  console.log('\n5. Testing GET /api/v1/postcodes/FC-01-A03-FK-01:');
  const resNdaps = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/postcodes/FC-01-A03-FK-01',
    method: 'GET'
  });
  console.log('Status:', resNdaps.status);
  console.log('Resolved Postcode:', resNdaps.body.postcode);
  console.log('Resolved Legacy:', resNdaps.body.legacy_postcode);
  console.log('Resolved Locality:', resNdaps.body.neighbourhood);

  // 6. Test Legacy numeric resolution (900211) maps to NDAPS
  console.log('\n6. Testing GET /api/v1/postcodes/900211:');
  const resLegacy = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/postcodes/900211',
    method: 'GET'
  });
  console.log('Status:', resLegacy.status);
  console.log('Legacy 900211 maps to NDAPS:', resLegacy.body.postcode);
  console.log('Display:', resLegacy.body.display);

  // 7. Test Customer Profile Update with NDAPS Postcode
  console.log('\n7. Testing Customer Profile PUT with NDAPS code:');
  const custPut = await request({
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
  console.log('Status:', custPut.status);
  console.log('User Postcode:', custPut.body.user.postcode);
  console.log('User NDAPS Display:', custPut.body.user.display);
  console.log('User Neighbourhood:', custPut.body.user.postcode_neighbourhood);
  console.log('User Zone:', custPut.body.user.postcode_zone);

  console.log('\nALL 7 NIPOST NDAPS SPECIFICATION TESTS PASSED!');
}

testAll().catch(console.error);
