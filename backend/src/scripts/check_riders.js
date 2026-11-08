const db = require('../config/db');

async function main() {
  const ridersRes = await db.query(`
    SELECT r.*, u.name, u.phone, u.email, c.company_name
    FROM riders r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN courier_companies c ON r.courier_id = c.id
  `);
  console.log('Riders found:', ridersRes.rows.length);
  console.log(JSON.stringify(ridersRes.rows, null, 2));

  const couriersRes = await db.query('SELECT * FROM courier_companies');
  console.log('Courier companies found:', couriersRes.rows.length);
  console.log(JSON.stringify(couriersRes.rows, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
