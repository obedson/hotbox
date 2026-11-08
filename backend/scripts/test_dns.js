const dns = require('dns');

dns.lookup('api.twilio.com', { family: 4 }, (err, address, family) => {
  console.log('DNS lookup result:', err, address, family);
  process.exit(0);
});
