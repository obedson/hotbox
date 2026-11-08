const https = require('https');
require('dotenv').config({ path: __dirname + '/../.env' });

const postData = JSON.stringify({
  api_key: process.env.TERMII_API_KEY,
  message_type: 'NUMERIC',
  to: '2349063085415',
  from: 'N-Alert',
  channel: 'dnd',
  pin_attempts: 3,
  pin_time_to_live: 10,
  pin_length: 6,
  pin_placeholder: '< 1234 >',
  message_text: 'Your Dropboxz confirmation code is < 1234 >'
});

const req = https.request('https://api.ng.termii.com/api/sms/otp/send', {
  method: 'POST',
  family: 4,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let b = '';
  res.on('data', d => b += d.toString());
  res.on('end', () => {
    console.log('OTP STATUS:', res.statusCode, b);
    process.exit(0);
  });
});

req.write(postData);
req.end();
