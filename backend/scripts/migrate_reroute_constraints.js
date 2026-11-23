const db = require('../src/config/db');

async function main() {
  console.log('--- Migrating Database Constraints for Dual-Party Reroute Alerts ---');

  // 1. notifications_type_check
  try {
    await db.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;`);
    await db.query(`
      ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('SHIPMENT_UPDATE', 'OTP_ALERT', 'PAYOUT', 'KYC_APPROVAL', 'SYSTEM_NOTICE', 'REROUTE_ALERT'));
    `);
    console.log('✅ notifications_type_check migrated to allow REROUTE_ALERT');
  } catch (err) {
    console.error('Error updating notifications_type_check:', err.message);
  }

  // 2. transactions_transaction_type_check
  try {
    await db.query(`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;`);
    await db.query(`
      ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check
      CHECK (transaction_type IN ('BOOKING_PAYMENT', 'HUB_COMMISSION', 'RIDER_PAYOUT', 'HOLDING_FEE', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'DISPUTE_REFUND', 'WITHDRAWAL', 'LEGACY_LINK_FEE', 'LEGACY_LINK_PLATFORM_FEE', 'WALLET_TOPUP', 'REROUTE_SMS_FEE', 'REROUTE_WHATSAPP_FEE', 'REROUTE_ALERT_FEE'));
    `);
    console.log('✅ transactions_transaction_type_check migrated to allow REROUTE fees');
  } catch (err) {
    console.error('Error updating transactions_transaction_type_check:', err.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
