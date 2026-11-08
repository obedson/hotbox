const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = require('pg');

// Supabase's pooler uses a private certificate authority. Trust the public
// Supabase root CA (or a CA supplied via DATABASE_CA_CERT) instead of
// disabling certificate verification.
const caCertPath = process.env.DATABASE_CA_CERT || path.resolve(__dirname, '../../supabase-root-ca.pem');
const ca = process.env.DATABASE_URL && fs.existsSync(caCertPath)
  ? fs.readFileSync(caCertPath, 'utf8')
  : null;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
    : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 120000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  max: 10
});

pool.on('error', (err) => {
  console.error('Unexpected database client error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
