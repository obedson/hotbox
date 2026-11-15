// One-off guardrail: a person must not be able to hold two accounts with the
// same email or phone number. Backfills canonical phone numbers, then adds the
// unique indexes that enforce it. Safe to run repeatedly.
const db = require('../src/config/db');
const { normalizePhone } = require('../src/lib/phone');

async function main() {
  const { rows } = await db.query("SELECT id, phone FROM users WHERE phone IS NOT NULL AND phone <> ''");

  let updated = 0;
  for (const row of rows) {
    const canonical = normalizePhone(row.phone);
    if (canonical && canonical !== row.phone) {
      await db.query('UPDATE users SET phone = $1 WHERE id = $2', [canonical, row.id]);
      updated += 1;
    }
  }

  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uidx ON users (lower(email))');
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS users_phone_uidx ON users (phone)');

  console.log(`Normalized ${updated} phone number(s) and enforced unique email/phone.`);
}

main()
  .then(() => db.pool.end())
  .catch((err) => {
    console.error('Uniqueness migration failed:', err.message);
    return db.pool.end().then(() => process.exit(1));
  });
