const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../config/db');

async function run() {
  try {
    console.log('Ensuring postcode column exists on users table...');
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS postcode VARCHAR(20) DEFAULT 'FC-01-A03-FK-01';
    `);
    
    // Set default FC-01-A03-FK-01 for any null postcode
    await db.query(`
      UPDATE users 
      SET postcode = 'FC-01-A03-FK-01' 
      WHERE postcode IS NULL OR postcode = '900211';
    `);

    const res = await db.query(`SELECT id, name, email, phone, postcode FROM users WHERE role = 'customer' LIMIT 5;`);
    console.log('Customer users with postcode:', res.rows);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
