const https = require('https');
require('dotenv').config({ path: __dirname + '/../.env' });

console.log('Testing Termii with family: 4...');
const postData = JSON.stringify({
  to: '+2349063085415',
  from: process.env.TERMII_SENDER_ID || 'Dropboxz',
  sms: 'Test from Dropboxz',
  type: 'plain',
  channel: 'generic',
  api_key: process.env.TERMII_API_KEY
});

const req = https.request('https://api.ng.termii.com/api/sms/send', {
  method: 'POST',
  family: 4,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  console.log('TERMII STATUS:', res.statusCode);
  let body = '';
  res.on('data', d => body += d.toString());
  res.on('end', () => console.log('TERMII RESPONSE:', body));
});

req.on('error', (e) => {
  console.error('TERMII ERROR:', e);
});

req.write(postData);
req.end();
