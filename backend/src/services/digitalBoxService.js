// Digital P.O. Box registry: the anchor record, its linked legacy number and
// its forwarding history. Routes read and write through here so the box is one
// relational entity rather than a JSON blob on the user row.
//
// A box is issued explicitly, never implicitly. Reading the registry never
// creates a row, so a customer who has not activated the service simply has no
// box instead of receiving a number they did not ask for.
const db = require('../config/db');
const { parseBoxNumber } = require('../utils/boxNumber');
const { canonicalLegacyKey } = require('../utils/legacyBoxNumber');

const ANNUAL_FEE_NGN = 3500;
const GROUND_TRUTH_FEE_NGN = 2500;
const REVALIDATION_FEE_NGN = 2500;
const BOX_TTL_DAYS = 365;
const CERTIFICATE_TTL_DAYS = 365;
const DEFAULT_GRACE_DAYS = 30;

function getDigitalBoxByUserId(userId) {
  return db.query('SELECT * FROM digital_boxes WHERE user_id = $1', [userId])
    .then((res) => res.rows[0] || null);
}

// Activation is the only path that mints a number. It records what authorised
// the issuance, what was paid and how long the service runs for.
async function issueDigitalBox({
  userId,
  poaCertificateId = null,
  issuedBy = 'USER',
  source = 'CUSTOMER_ACTIVATION',
  pricePaidNgn = null,
  plan = 'ANNUAL',
  lengthDays = BOX_TTL_DAYS
}) {
  const inserted = await db.query(
    `INSERT INTO digital_boxes
       (box_number, user_id, status, plan, expires_at, subscription_started_at,
        last_renewed_at, price_paid_ngn, poa_certificate_id, issued_by, source)
     SELECT 'HBX-' || lpad(nextval('digital_box_number_seq')::text, 4, '0'), $1, 'ACTIVE', $2,
            NOW() + ($3 || ' days')::INTERVAL, NOW(), NOW(), $4, $5, $6, $7
     WHERE NOT EXISTS (SELECT 1 FROM digital_boxes WHERE user_id = $1)
     RETURNING *`,
    [userId, plan, String(lengthDays), pricePaidNgn, poaCertificateId, issuedBy, source]
  );
  if (inserted.rows[0]) return inserted.rows[0];
  return getDigitalBoxByUserId(userId);
}

// Mail must never silently dead-end. A box past expiry degrades through an
// explicit grace window into LAPSED rather than resolving forever, and a lapsed
// box is never reassigned to another holder.
function effectiveBoxState(box, { gracePeriodDays = DEFAULT_GRACE_DAYS, now = new Date() } = {}) {
  if (!box) return 'NONE';
  if (box.status === 'CANCELLED' || box.status === 'LAPSED') return box.status;
  const expiresAt = box.expires_at ? new Date(box.expires_at) : null;
  if (!expiresAt) return 'ACTIVE';
  if (expiresAt.getTime() > now.getTime()) return 'ACTIVE';
  const graceMs = Math.max(0, Number(gracePeriodDays) || 0) * 24 * 3600 * 1000;
  if (expiresAt.getTime() + graceMs > now.getTime()) return 'GRACE';
  return 'LAPSED';
}

// Called lazily from reads so expiry is enforced without a separate scheduler.
async function sweepBoxExpiries({ gracePeriodDays = DEFAULT_GRACE_DAYS, now = new Date() } = {}) {
  const graceMs = Math.max(0, Number(gracePeriodDays) || 0) * 24 * 3600 * 1000;
  const expiredBefore = new Date(now.getTime() - graceMs);

  const lapsed = await db.query(
    `UPDATE digital_boxes
        SET status = 'LAPSED', updated_at = NOW()
      WHERE status IN ('ACTIVE', 'GRACE') AND expires_at < $1
      RETURNING id, user_id, box_number`,
    [expiredBefore]
  );

  await db.query(
    `UPDATE digital_boxes
        SET status = 'GRACE', updated_at = NOW()
      WHERE status = 'ACTIVE' AND expires_at >= $1 AND expires_at < $2`,
    [expiredBefore, now]
  );

  return lapsed.rows;
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

function renewBox(boxId, { lengthDays = BOX_TTL_DAYS, pricePaidNgn = null } = {}) {
  return db.query(
    `UPDATE digital_boxes
        SET expires_at = NOW() + ($2 || ' days')::INTERVAL,
            status = 'ACTIVE',
            last_renewed_at = NOW(),
            subscription_started_at = COALESCE(subscription_started_at, NOW()),
            price_paid_ngn = COALESCE($3, price_paid_ngn),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [boxId, String(lengthDays), pricePaidNgn]
  ).then((res) => res.rows[0]);
}

function cancelBox(boxId) {
  return db.query(
    `UPDATE digital_boxes SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
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

// A Digital P.O. Box may only be issued against a currently valid certificate,
// so activation gates on this rather than on a stale flag.
function getActiveCertificateForUser(userId) {
  return db.query(
    `SELECT * FROM proof_of_address_certificates
      WHERE user_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()
      ORDER BY issued_at DESC LIMIT 1`,
    [userId]
  ).then((res) => res.rows[0] || null);
}

// Relocation changes where mail goes immediately but leaves the credential
// standing until its cycle ends, so a certificate never silently misstates an
// address and never vanishes without a defined remedy.
async function markCertificatesMoved(userId, reason = 'RELOCATION') {
  const res = await db.query(
    `UPDATE proof_of_address_certificates
        SET status = 'MOVED',
            moved_at = COALESCE(moved_at, NOW()),
            supersede_reason = $2
      WHERE user_id = $1 AND status = 'ACTIVE'`,
    [userId, reason]
  );
  return res.rowCount || 0;
}

async function issueCertificate({
  box, user, verificationRecordId, postcode, addressText, hierarchy, lat, lng,
  validityMonths = 12
}) {
  // A revalidation replaces the standing credential rather than stacking a
  // second live one, so exactly one certificate is ever authoritative.
  await db.query(
    `UPDATE proof_of_address_certificates
        SET status = 'SUPERSEDED', superseded_at = NOW(), supersede_reason = 'REVALIDATION'
      WHERE user_id = $1 AND status IN ('ACTIVE', 'MOVED')`,
    [user.id]
  );

  const countRes = await db.query('SELECT count(*)::int AS n FROM proof_of_address_certificates');
  const serial = `HBX-CERT-${String(countRes.rows[0].n + 1).padStart(4, '0')}`;

  const res = await db.query(
    `INSERT INTO proof_of_address_certificates
       (certificate_serial, box_id, user_id, verification_record_id, postcode, address_text,
        district, lga, state, lat, lng, issued_at, expires_at, last_validated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW() + ($12 || ' months')::INTERVAL, NOW())
     RETURNING *`,
    [
      serial,
      box ? box.id : null,
      user.id,
      verificationRecordId || null,
      postcode || user.postcode || null,
      addressText || null,
      hierarchy ? hierarchy.district : null,
      hierarchy ? hierarchy.lga : null,
      hierarchy ? hierarchy.state : null,
      lat || null,
      lng || null,
      String(Math.max(1, Number(validityMonths) || 12))
    ]
  );
  return res.rows[0];
}

// Reminders are deduplicated per box per day so lazy sweeps cannot spam the
// holder on every read.
async function sendDueBoxReminders({ gracePeriodDays = DEFAULT_GRACE_DAYS } = {}) {
  const due = await db.query(
    `SELECT id, user_id, box_number,
            ceil(extract(epoch FROM (expires_at - NOW())) / 86400)::int AS days_left
       FROM digital_boxes
      WHERE status IN ('ACTIVE', 'GRACE')
        AND expires_at > NOW()
        AND ceil(extract(epoch FROM (expires_at - NOW())) / 86400)::int IN (30, 7, 1)`
  );

  for (const row of due.rows) {
    const title = `Renew your Digital P.O. Box in ${row.days_left} day${row.days_left === 1 ? '' : 's'}`;
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
       SELECT $1, $2, $3, 'SYSTEM_NOTICE', FALSE, NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM notifications
          WHERE user_id = $1 AND title = $2 AND created_at > NOW() - INTERVAL '20 hours'
       )`,
      [
        row.user_id,
        title,
        `Your Digital P.O. Box ${row.box_number} is due for renewal. Renew to keep mail delivery and rerouting uninterrupted.`
      ]
    );
  }

  return due.rows.length;
}

module.exports = {
  ANNUAL_FEE_NGN,
  GROUND_TRUTH_FEE_NGN,
  REVALIDATION_FEE_NGN,
  BOX_TTL_DAYS,
  CERTIFICATE_TTL_DAYS,
  DEFAULT_GRACE_DAYS,
  getDigitalBoxByUserId,
  issueDigitalBox,
  effectiveBoxState,
  sweepBoxExpiries,
  findBoxByNumber,
  findBoxByLegacyNumber,
  listRelocations,
  addRelocation,
  renewBox,
  cancelBox,
  setGroundTruthVerified,
  getCertificate,
  getActiveCertificateForUser,
  markCertificatesMoved,
  issueCertificate,
  sendDueBoxReminders
};
