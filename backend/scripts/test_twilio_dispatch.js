require('dotenv').config({ path: __dirname + '/../.env' });
const notification = require('../src/services/notificationService');

async function testTwilio() {
  console.log('Testing Twilio SMS Dispatch to +2349063085415...');
  console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID);
  console.log('Sender / Service:', process.env.TWILIO_PHONE_NUMBER);

  const res = await notification.sendSmsOtp('+2349063085415', '458921');
  console.log('\n--- TWILIO DISPATCH RESULT ---');
  console.log(JSON.stringify(res, null, 2));

  process.exit(0);
}

testTwilio().catch(err => {
  console.error('Twilio test failed:', err);
  process.exit(1);
});
