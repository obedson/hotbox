const db = require('../src/config/db');

async function main() {
  const c1 = await db.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='notifications_type_check';");
  console.log('notifications_type_check:', c1.rows[0]?.pg_get_constraintdef);

  const c2 = await db.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='transactions_payment_gateway_check';");
  console.log('transactions_payment_gateway_check:', c2.rows[0]?.pg_get_constraintdef);

  const c3 = await db.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='transactions_transaction_type_check';");
  console.log('transactions_transaction_type_check:', c3.rows[0]?.pg_get_constraintdef);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
