const db = require('../src/config/db');

async function resetAfribook() {
  await db.query("UPDATE users SET email = 'afribook.win@gmail.com', is_email_verified = FALSE WHERE phone = '+2349063085415'");
  console.log('Johnson email restored to afribook.win@gmail.com and unverified!');
  process.exit(0);
}

resetAfribook();
