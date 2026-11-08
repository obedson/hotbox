const https = require('https');
require('dotenv').config({ path: __dirname + '/../.env' });

async function testFrom(senderName, channel = 'generic') {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      to: '2349063085415',
      from: senderName,
      sms: 'Test from Dropboxz',
      type: 'plain',
      channel,
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
      let body = '';
      res.on('data', d => body += d.toString());
      res.on('end', () => resolve({ senderName, channel, status: res.statusCode, body }));
    });

    req.on('error', e => resolve({ senderName, error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  const senders = ['Termii', 't-alert', 'N-Alert', 'Dropboxz'];
  for (const s of senders) {
    const res = await testFrom(s, 'generic');
    console.log(`[generic] ${s}:`, res.status, res.body);
    const resDnd = await testFrom(s, 'dnd');
    console.log(`[dnd] ${s}:`, resDnd.status, resDnd.body);
  }
  process.exit(0);
}

run();
