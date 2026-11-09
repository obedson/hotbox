// Restores a compressed PostgreSQL custom-format backup using pg_restore.
// Usage: node scripts/restore.js <backup-file>
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { spawn } = require('child_process');

const databaseUrl = process.env.DATABASE_URL;
const file = process.argv[2];

if (!databaseUrl || !file) {
  console.error('Usage: node scripts/restore.js <backup-file>  (DATABASE_URL must be set)');
  process.exit(1);
}

const fileAbs = require('path').resolve(process.cwd(), file);
console.log(`Restoring ${fileAbs} into the configured database.`);
console.log('Warning: --clean will drop existing objects before restoring.');

const child = spawn(
  'pg_restore',
  ['--clean', '--if-exists', '--no-owner', '--dbname', databaseUrl, fileAbs],
  { stdio: 'inherit' }
);
child.on('exit', (code) => {
  if (code === 0) console.log('Restore completed successfully.');
  process.exit(code === null ? 1 : code);
});
