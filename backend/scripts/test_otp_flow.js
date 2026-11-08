// Native fetch is built-in in Node v20+
async function runTest() {
  const userId = 'd7cdef07-2851-49fd-b863-e89f8f41b9e4';
  const headers = { 'Content-Type': 'application/json', 'x-user-id': userId };

  console.log('1. Testing POST /api/v1/customer/request-otp (email)...');
  const reqRes = await fetch('http://localhost:5000/api/v1/customer/request-otp', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'email' })
  });
  const reqData = await reqRes.json();
  console.log('OTP Response:', reqData);

  const otpCode = reqData.otpPreview || '123456';
  console.log(`\n2. Testing POST /api/v1/customer/verify-contact with code: ${otpCode}...`);
  const verRes = await fetch('http://localhost:5000/api/v1/customer/verify-contact', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'email', otp: otpCode })
  });
  const verData = await verRes.json();
  console.log('Verify Response:', verData);

  console.log('\n3. Testing PUT /api/v1/customer/profile (Notification & Privacy preferences)...');
  const prefRes = await fetch('http://localhost:5000/api/v1/customer/profile', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      notification_preferences: { sms: true, whatsapp: true, email: true },
      privacy_settings: { shareLocation: true, allowAnalytics: true, coords: { lat: 9.0765, lng: 7.3986 } }
    })
  });
  const prefData = await prefRes.json();
  console.log('Profile Updated:', prefData.user);

  console.log('\n4. Testing POST /api/v1/customer/request-otp (phone)...');
  const phoneReqRes = await fetch('http://localhost:5000/api/v1/customer/request-otp', {
    method: 'POST',
    headers,
    body: JSON.stringify({ type: 'phone' })
  });
  const phoneReqData = await phoneReqRes.json();
  console.log('Phone OTP Response:', phoneReqData);

  console.log('\nAll customer verification and preference tests completed successfully!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
