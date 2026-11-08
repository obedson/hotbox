const db = require('../src/config/db');

async function check() {
  try {
    const res = await db.query('SELECT id, name, email, phone, role, is_phone_verified, is_email_verified FROM users');
    console.log('USERS COUNT:', res.rows.length);
    console.log('USERS:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

check();
