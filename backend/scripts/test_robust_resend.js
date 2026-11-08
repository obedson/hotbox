const https = require('https');
const dns = require('dns');
require('dotenv').config({ path: __dirname + '/../.env' });

function robustLookup(hostname, options, callback) {
  dns.lookup(hostname, { family: 4 }, (err, address, family) => {
    if (err) {
      setTimeout(() => {
        dns.lookup(hostname, { family: 4 }, callback);
      }, 200);
      return;
    }
    callback(null, address, family);
  });
}

const postData = JSON.stringify({
  from: process.env.EMAIL_FROM || 'Dropboxz Security <notifications@dropboxz.microcbt.com>',
  to: 'afribook.win@gmail.com',
  subject: 'Dropboxz Live Test: 334455',
  html: '<p>Your live verification code is <strong>334455</strong>.</p>'
});

const req = https.request('https://api.resend.com/emails', {
  method: 'POST',
  family: 4,
  lookup: robustLookup,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  let b = '';
  res.on('data', d => b += d.toString());
  res.on('end', () => console.log('RESPONSE:', b));
});

req.on('error', e => console.error('ERROR:', e));
req.write(postData);
req.end();
