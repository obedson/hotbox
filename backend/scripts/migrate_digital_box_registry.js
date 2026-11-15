// One-off migration: move the Digital P.O. Box from a JSON blob on users into a
// proper registry (digital_boxes, relocations, certificates) and add
// geocoordinates to verification records. Safe to run repeatedly.
const db = require('../src/config/db');

const DDL = `
  CREATE SEQUENCE IF NOT EXISTS digital_box_number_seq START WITH 1;

  CREATE TABLE IF NOT EXISTS digital_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    box_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    plan VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    legacy_box_number VARCHAR(60) UNIQUE,
    legacy_linked_at TIMESTAMP WITH TIME ZONE,
    is_ground_truth_verified BOOLEAN NOT NULL DEFAULT FALSE,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS relocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id UUID NOT NULL REFERENCES digital_boxes(id) ON DELETE CASCADE,
    old_postcode VARCHAR(40),
    old_address TEXT,
    new_postcode VARCHAR(40),
    new_address TEXT,
    phone VARCHAR(30),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS proof_of_address_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_serial VARCHAR(40) NOT NULL UNIQUE,
    box_id UUID NOT NULL REFERENCES digital_boxes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_record_id UUID REFERENCES verification_records(id) ON DELETE SET NULL,
    postcode VARCHAR(40),
    address_text TEXT,
    district VARCHAR(120),
    lga VARCHAR(120),
    state VARCHAR(120),
    lat NUMERIC,
    lng NUMERIC,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );

  ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS lat NUMERIC;
  ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS lng NUMERIC;
  ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS accuracy_m NUMERIC;
  ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP WITH TIME ZONE;
  ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(120);
  ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS photo_url TEXT;
`;

async function main() {
  await db.query(DDL);
  console.log('Registry tables and verification geocoordinates are in place.');

  const users = await db.query(
    'SELECT id, postcode, digital_box FROM users WHERE digital_box IS NOT NULL ORDER BY created_at'
  );

  let allocated = 0;
  for (const user of users.rows) {
    const box = user.digital_box || {};
    const expiresAt = box.expiresAt
      ? new Date(box.expiresAt)
      : new Date(Date.now() + 365 * 24 * 3600 * 1000);

    const inserted = await db.query(
      `INSERT INTO digital_boxes
         (box_number, user_id, status, legacy_box_number, legacy_linked_at, is_ground_truth_verified, expires_at)
       SELECT 'HBX-' || lpad(nextval('digital_box_number_seq')::text, 4, '0'), $1, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (SELECT 1 FROM digital_boxes WHERE user_id = $1)
       RETURNING id, box_number`,
      [
        user.id,
        box.status || 'ACTIVE',
        box.legacyBoxNumber || null,
        box.legacyLinkedAt ? new Date(box.legacyLinkedAt) : null,
        Boolean(box.isGroundTruthVerified),
        expiresAt
      ]
    );

    const boxRow = inserted.rows[0]
      || (await db.query('SELECT id, box_number FROM digital_boxes WHERE user_id = $1', [user.id])).rows[0];

    if (inserted.rows[0]) allocated += 1;

    const relocations = Array.isArray(box.relocations) ? box.relocations : [];
    for (const relocation of relocations) {
      await db.query(
        `INSERT INTO relocations (box_id, old_postcode, old_address, new_postcode, new_address, phone, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          boxRow.id,
          relocation.oldPostcode || null,
          relocation.oldAddress || null,
          relocation.newPostcode || null,
          relocation.newAddress || null,
          relocation.phone || null,
          relocation.changedAt ? new Date(relocation.changedAt) : new Date()
        ]
      );
    }
  }

  const maxRes = await db.query(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(box_number, '[^0-9]', '', 'g'), '')::int), 0) AS max FROM digital_boxes`
  );
  const max = maxRes.rows[0].max;
  if (max > 0) {
    await db.query(`SELECT setval('digital_box_number_seq', $1, true)`, [max]);
  }

  const count = await db.query('SELECT count(*)::int AS n FROM digital_boxes');
  console.log(`Migrated ${allocated} new digital box(es). Total boxes: ${count.rows[0].n}. Next number: HBX-${String(max + 1).padStart(4, '0')}.`);
}

main()
  .then(() => db.pool.end())
  .catch((err) => {
    console.error('Digital box registry migration failed:', err.message);
    return db.pool.end().then(() => process.exit(1));
  });