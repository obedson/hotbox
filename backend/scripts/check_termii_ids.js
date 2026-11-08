const https = require('https');
require('dotenv').config({ path: __dirname + '/../.env' });

console.log('Querying available sender IDs from Termii...');
const req = https.request(`https://api.ng.termii.com/api/sender-id?api_key=${process.env.TERMII_API_KEY}`, {
  method: 'GET',
  family: 4
}, (res) => {
  console.log('STATUS:', res.statusCode);
  let body = '';
  res.on('data', d => body += d.toString());
  res.on('end', () => console.log('SENDER IDS:', body));
});

req.on('error', e => console.error(e));
req.end();
