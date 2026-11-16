// Digital P.O. Box registry: the anchor record, its linked legacy number and
// its forwarding history. Routes read and write through here so the box is one
// relational entity rather than a JSON blob on the user row.
const db = require('../config/db');
const { parseBoxNumber } = require('../utils/boxNumber');
const { canonicalLegacyKey } = require('../utils/legacyBoxNumber');

const ANNUAL_FEE_NGN = 3500;
const GROUND_TRUTH_FEE_NGN = 2500;
const REVALIDATION_FEE_NGN = 2500;
const BOX_TTL_DAYS = 365;
const CERTIFICATE_TTL_DAYS = 365;

function getDigitalBoxByUserId(userId) {
  return db.query('SELECT * FROM digital_boxes WHERE user_id = $1', [userId])
    .then((res) => res.rows[0] || null);
}

// Every customer has a box. Creating it lazily keeps signup unchanged while
// guaranteeing the registry is the single source of truth.
async function ensureDigitalBox(userId) {
  const inserted = await db.query(
    `INSERT INTO digital_boxes (box_number, user_id, expires_at)
     SELECT 'HBX-' || lpad(nextval('digital_box_number_seq')::text, 4, '0'), $1, NOW() + INTERVAL '365 days'
     WHERE NOT EXISTS (SELECT 1 FROM digital_boxes WHERE user_id = $1)
     RETURNING *`,
    [userId]
  );
  if (inserted.rows[0]) return inserted.rows[0];
  return getDigitalBoxByUserId(userId);
}

function findBoxByNumber(input) {
  const canonical = parseBoxNumber(input);
  if (!canonical) return Promise.resolve(null);
  return db.query('SELECT * FROM digital_boxes WHERE box_number = $1', [canonical])
    .then((res) => res.rows[0] || null);
}

// Only an approved link may resolve to a delivery address. A pending or
// rejected request must never expose the box holder's address.
function findBoxByLegacyNumber(input) {
  const key = canonicalLegacyKey(input);
  if (!key) return Promise.resolve(null);
  return db.query(
    `SELECT * FROM digital_boxes
      WHERE legacy_box_number_norm = $1 AND legacy_box_status = 'APPROVED'
      LIMIT 1`,
    [key]
  ).then((res) => res.rows[0] || null);
}

function listRelocations(boxId) {
  return db.query(
    'SELECT * FROM relocations WHERE box_id = $1 ORDER BY changed_at DESC',
    [boxId]
  ).then((res) => res.rows);
}

function addRelocation(boxId, relocation) {
  return db.query(
    `INSERT INTO relocations (box_id, old_postcode, old_address, new_postcode, new_address, phone, changed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      boxId,
      relocation.oldPostcode || null,
      relocation.oldAddress || null,
      relocation.newPostcode || null,
      relocation.newAddress || null,
      relocation.phone || null,
      relocation.changedAt || new Date()
    ]
  ).then((res) => res.rows[0]);
}


function renewBox(boxId) {
  return db.query(
    `UPDATE digital_boxes
     SET expires_at = NOW() + INTERVAL '365 days', status = 'ACTIVE', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [boxId]
  ).then((res) => res.rows[0]);
}

function setGroundTruthVerified(boxId, verified) {
  return db.query(
    'UPDATE digital_boxes SET is_ground_truth_verified = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [Boolean(verified), boxId]
  ).then((res) => res.rows[0]);
}

function getCertificate(boxId) {
  return db.query(
    `SELECT * FROM proof_of_address_certificates
     WHERE box_id = $1 AND status = 'ACTIVE'
     ORDER BY issued_at DESC LIMIT 1`,
    [boxId]
  ).then((res) => res.rows[0] || null);
}

async function issueCertificate({ box, user, verificationRecordId, postcode, addressText, hierarchy, lat, lng }) {
  const countRes = await db.query('SELECT count(*)::int AS n FROM proof_of_address_certificates');
  const serial = `HBX-CERT-${String(countRes.rows[0].n + 1).padStart(4, '0')}`;

  const res = await db.query(
    `INSERT INTO proof_of_address_certificates
       (certificate_serial, box_id, user_id, verification_record_id, postcode, address_text,
        district, lga, state, lat, lng, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + INTERVAL '365 days')
     RETURNING *`,
    [
      serial,
      box.id,
      user.id,
      verificationRecordId || null,
      postcode || user.postcode || null,
      addressText || null,
      hierarchy ? hierarchy.district : null,
      hierarchy ? hierarchy.lga : null,
      hierarchy ? hierarchy.state : null,
      lat || null,
      lng || null
    ]
  );
  return res.rows[0];
}

module.exports = {
  ANNUAL_FEE_NGN,
  GROUND_TRUTH_FEE_NGN,
  REVALIDATION_FEE_NGN,
  BOX_TTL_DAYS,
  CERTIFICATE_TTL_DAYS,
  ensureDigitalBox,
  getDigitalBoxByUserId,
  findBoxByNumber,
  findBoxByLegacyNumber,
  listRelocations,
  addRelocation,
  renewBox,
  setGroundTruthVerified,
  getCertificate,
  issueCertificate
};