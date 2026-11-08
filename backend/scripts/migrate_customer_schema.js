const db = require('../src/config/db');

async function migrate() {
  const client = await db.getClient();
  try {
    console.log('Migrating Customer Feature Tables...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'GENERAL_ENQUIRY',
        subject VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'MEDIUM',
        status VARCHAR(20) DEFAULT 'OPEN',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_saved_hubs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
        label VARCHAR(80) DEFAULT 'Preferred Hub',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, hub_id)
      );
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"sms": true, "whatsapp": true, "email": true}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"shareLocation": true, "allowAnalytics": true}'::jsonb;
    `);

    // Seed Tariq Bello saved hub and address if not exists
    const userRes = await client.query("SELECT id FROM users WHERE phone = '+2348012345678' LIMIT 1");
    if (userRes.rows.length > 0) {
      const tariqId = userRes.rows[0].id;
      const hubRes = await client.query("SELECT id FROM hubs LIMIT 1");
      if (hubRes.rows.length > 0) {
        await client.query(`
          INSERT INTO user_saved_hubs (user_id, hub_id, label)
          VALUES ($1, $2, 'Nearest Home Hub')
          ON CONFLICT (user_id, hub_id) DO NOTHING
        `, [tariqId, hubRes.rows[0].id]);
      }

      await client.query(`
        INSERT INTO addresses (user_id, address_type, postcode, state, lga, street_address, area_neighbourhood, lat, lng, is_default, is_verified)
        VALUES ($1, 'residential', 'FC-01-A03-FK-01', 'Abuja (FCT)', 'Abuja Municipal', 'Flat 4, Block B, Emeka Anyaoku Street', 'Wuse 2', 9.0772, 7.4990, TRUE, TRUE)
        ON CONFLICT DO NOTHING
      `, [tariqId]);
    }

    await client.query('COMMIT');
    console.log('Customer tables migrated successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
