require('dotenv').config({ path: __dirname + '/../.env' });
const notification = require('../src/services/notificationService');

async function test() {
  console.log('Testing Resend with user obedsonfield@gmail.com...');
  const resendOwner = await notification.sendEmailOtp('obedsonfield@gmail.com', '112233');
  console.log('Resend to owner result:', resendOwner);

  console.log('\nTesting Resend with user afribook.win@gmail.com...');
  const resendOther = await notification.sendEmailOtp('afribook.win@gmail.com', '112233');
  console.log('Resend to other result:', resendOther);

  console.log('\nTesting Termii with 2349063085415...');
  const termiiRes = await notification.sendSmsOtp('2349063085415', '112233');
  console.log('Termii result:', termiiRes);

  process.exit(0);
}

test();
