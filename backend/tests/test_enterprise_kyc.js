const http = require('http');

const data = JSON.stringify({
  postcode: 'FC-01-A03-FK-01',
  phone: '+2349063085415',
  name: 'Johnson O.'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/enterprise/verify-address',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'a0000000-0000-0000-0000-000000000009',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
