const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../config/db');

async function run() {
  try {
    const res = await db.query('SELECT postcode, state, lga, district, neighbourhood, description, lat, lng FROM postcode_cache;');
    console.log('Seeded postcodes count:', res.rows.length);
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
