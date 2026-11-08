const db = require('../src/config/db');

async function migrate() {
  const client = await db.getClient();
  try {
    console.log('Creating verification_codes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('email', 'phone')),
        contact_value VARCHAR(150) NOT NULL,
        code VARCHAR(10) NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id, contact_type, code);
    `);
    console.log('verification_codes table ready!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
