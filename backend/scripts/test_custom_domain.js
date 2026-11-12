const https = require('https');
require('dotenv').config({ path: __dirname + '/../.env' });

console.log('Testing Resend with verified domain hotbox.microcbt.com to afribook.win@gmail.com...');
const postData = JSON.stringify({
  from: 'Hotbox Security <notifications@hotbox.microcbt.com>',
  to: 'afribook.win@gmail.com',
  subject: 'Hotbox Domain Verification Test: 998877',
  html: '<p>Your Hotbox Verification Code is <strong>998877</strong>.</p>'
});

const req = https.request('https://api.resend.com/emails', {
  method: 'POST',
  family: 4,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  let body = '';
  res.on('data', d => body += d.toString());
  res.on('end', () => console.log('RESPONSE:', body));
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
