require('dotenv').config({ path: __dirname + '/../.env' });
const notification = require('../src/services/notificationService');

async function test() {
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'FOUND (' + process.env.RESEND_API_KEY.slice(0, 8) + '...)' : 'MISSING');
  console.log('TERMII_API_KEY:', process.env.TERMII_API_KEY ? 'FOUND (' + process.env.TERMII_API_KEY.slice(0, 8) + '...)' : 'MISSING');

  console.log('\n--- 1. Testing Resend Email Dispatch ---');
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: 'afribook.win@gmail.com',
        subject: 'Test Subject',
        html: '<p>Test</p>'
      })
    });
    console.log('Resend status:', res.status);
    const data = await res.json();
    console.log('Resend data:', data);
  } catch (e) {
    console.error('Resend fetch error cause:', e.cause || e);
  }

  console.log('\n--- 2. Testing Termii SMS Dispatch ---');
  const smsRes = await notification.sendSmsOtp('+2349063085415', '789123');
  console.log('SMS Result:', smsRes);

  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
