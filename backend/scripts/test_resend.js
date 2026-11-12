const https = require('https');
require('dotenv').config({ path: __dirname + '/../.env' });

console.log('Testing Resend email with family: 4...');
const postData = JSON.stringify({
  from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  to: 'afribook.win@gmail.com',
  subject: 'Hotbox Verification Code: 550542',
  html: '<p>Your Hotbox Verification Code is <strong>550542</strong>.</p>'
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
  console.log('RESEND STATUS:', res.statusCode);
  let body = '';
  res.on('data', d => body += d.toString());
  res.on('end', () => console.log('RESEND RESPONSE:', body));
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
