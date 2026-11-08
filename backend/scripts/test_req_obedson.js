const fetch = globalThis.fetch;

async function test() {
  const res = await fetch('http://localhost:5000/api/v1/customer/request-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'd7cdef07-2851-49fd-b863-e89f8f41b9e4'
    },
    body: JSON.stringify({ type: 'email' })
  });
  const data = await res.json();
  console.log('REQUEST OTP RESPONSE:', data);
  process.exit(0);
}

test();
