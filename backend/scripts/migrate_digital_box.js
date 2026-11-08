const db = require('../src/config/db');

async function main() {
  console.log('--- Migrating Database for Hotbox Digital P.O. Box & Relocation Tracking ---');

  await db.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS digital_box JSONB DEFAULT jsonb_build_object(
      'status', 'ACTIVE',
      'annualFeeNgn', 3500.00,
      'groundTruthingFeeNgn', 2500.00,
      'isGroundTruthVerified', false,
      'expiresAt', (NOW() + INTERVAL '365 days')::text,
      'relocations', '[]'::jsonb
    );
  `);

  console.log('✅ users.digital_box JSONB column ready');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
