const db = require('../src/config/db');

async function setObedson() {
  await db.query("UPDATE users SET email = 'obedsonfield@gmail.com', is_email_verified = FALSE WHERE phone = '+2349063085415'");
  console.log('Johnson email updated to obedsonfield@gmail.com');
  process.exit(0);
}

setObedson();
