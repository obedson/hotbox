const https = require('https');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: __dirname + '/../.env' });

function sendTwilioSms(accountSid, authToken, sender, to, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${accountSid.trim()}:${authToken.trim()}`).toString('base64');
    const params = { To: to, Body: body };
    if (sender.startsWith('MG')) {
      params.MessagingServiceSid = sender.trim();
    } else {
      params.From = sender.trim();
    }
    const postData = new URLSearchParams(params).toString();

    const req = https.request(`https://api.twilio.com/2010-04-01/Accounts/${accountSid.trim()}/Messages.json`, {
      method: 'POST',
      family: 4,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk.toString());
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function test() {
  const res = await sendTwilioSms(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_PHONE_NUMBER,
    '+2349063085415',
    'Your Hotbox OTP is 894102'
  );
  console.log('RESULT:', res);
  process.exit(0);
}

test();
