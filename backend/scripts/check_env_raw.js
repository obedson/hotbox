require('dotenv').config({ path: __dirname + '/../.env' });

console.log('ACCOUNT SID RAW:', JSON.stringify(process.env.TWILIO_ACCOUNT_SID));
console.log('AUTH TOKEN RAW:', JSON.stringify(process.env.TWILIO_AUTH_TOKEN));
console.log('PHONE NUMBER RAW:', JSON.stringify(process.env.TWILIO_PHONE_NUMBER));
