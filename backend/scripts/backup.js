// Creates a compressed PostgreSQL custom-format backup using pg_dump.
// Usage: node scripts/backup.js [output-file]
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const url = new URL(databaseUrl);
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: url.pathname.replace(/^\//, '')
};

const outFile = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, `../backups/hotbox-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);

fs.mkdirSync(path.dirname(outFile), { recursive: true });

console.log(`Backing up ${url.hostname}/${url.pathname.replace(/^\//, '')} to ${outFile}`);
const child = spawn('pg_dump', ['-Fc', '-f', outFile], { env, stdio: 'inherit' });
child.on('exit', (code) => {
  if (code === 0) console.log('Backup completed successfully.');
  process.exit(code === null ? 1 : code);
});
