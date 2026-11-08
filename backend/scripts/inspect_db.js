const db = require('../src/config/db');

async function main() {
  const tables = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;`);
  console.log('Tables:', tables.rows.map(r => r.table_name));

  // Check columns of users, notifications, shipments, transactions
  for (const t of ['users', 'notifications', 'shipments', 'transactions', 'addresses']) {
    const cols = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position;`, [t]);
    console.log(`\nColumns of ${t}:`);
    console.log(cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
