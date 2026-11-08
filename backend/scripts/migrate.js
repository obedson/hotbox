require('dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaPath = path.resolve(__dirname, '../../supabase/schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('--- DROPBOXZ SCHEMA MIGRATION START ---');
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Executing schema migration from:', schemaPath);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration successfully applied and committed!');

    // Run verification queries
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Available tables in public schema:');
    console.log(tablesRes.rows.map(r => r.table_name));

    const usersCount = await client.query('SELECT count(*) FROM users;');
    const hubsCount = await client.query('SELECT count(*) FROM hubs;');
    const shipmentsCount = await client.query('SELECT count(*) FROM shipments;');
    const custodyCount = await client.query('SELECT count(*) FROM custody_ledger;');
    const verificationCount = await client.query('SELECT count(*) FROM verification_records;');

    console.log('\nSeed Verification:');
    console.log('- Users:', usersCount.rows[0].count);
    console.log('- Hubs:', hubsCount.rows[0].count);
    console.log('- Shipments:', shipmentsCount.rows[0].count);
    console.log('- Custody transfers:', custodyCount.rows[0].count);
    console.log('- Verification records (3 tracks):', verificationCount.rows[0].count);
    console.log('--- DROPBOXZ SCHEMA MIGRATION COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed with error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
