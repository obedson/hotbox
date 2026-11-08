const https = require('https');
require('dotenv').config({ path: __dirname + '/../.env' });

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const auth = Buffer.from(`${sid}:${token}`).toString('base64');

const postData = new URLSearchParams({
  To: '+2349063085415',
  MessagingServiceSid: 'MG08c38836e3d51c3c4da0b7617a885729',
  Body: 'Your Dropboxz test OTP is 123456'
}).toString();

console.log('Sending Twilio POST...');
const req = https.request('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
  method: 'POST',
  family: 4,
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  let body = '';
  res.on('data', d => body += d.toString());
  res.on('end', () => console.log('RESPONSE:', body));
});

req.on('error', e => console.error('ERROR:', e));
req.write(postData);
req.end();
