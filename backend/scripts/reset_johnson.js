const db = require('../src/config/db');

async function reset() {
  await db.query("UPDATE users SET is_phone_verified = FALSE, is_email_verified = FALSE WHERE email = 'afribook.win@gmail.com'");
  console.log('Johnson verification reset: Phone = Unverified, Email = Unverified!');
  process.exit(0);
}

reset();
