// Platform settings live in the system_settings table so administrators can
// tune them without a deploy. Services read through here and fall back to the
// shipped defaults when a key is missing or the database is unavailable.
const db = require('../config/db');

const DIGITAL_BOX_FEES_KEY = 'digital_box_fees';
const LEGACY_BOX_LINK_FEES_KEY = 'legacy_box_link_fees';
const NIPOST_REVIEW_EMAIL_KEY = 'nipost_review_email';

const DEFAULT_DIGITAL_BOX_FEES = {
  doorway_inspection_fee_ngn: 2500,
  poa_revalidation_fee_ngn: 2500
};

// Legacy link fees default to zero so the feature is inert until an
// administrator consciously sets the NIPOST verification and Hotbox platform
// amounts. They are charged on approval, never on submission.
const DEFAULT_LEGACY_BOX_LINK_FEES = {
  nipost_verification_fee_ngn: 0,
  hotbox_platform_fee_ngn: 0
};

async function getSettingValue(key, fallback = null) {
  try {
    const res = await db.query('SELECT setting_value FROM system_settings WHERE setting_key = $1', [key]);
    if (res.rows.length === 0) return fallback;
    return res.rows[0].setting_value;
  } catch (err) {
    console.error(`Settings read failed for '${key}':`, err.message);
    return fallback;
  }
}

async function getDigitalBoxFees() {
  const stored = await getSettingValue(DIGITAL_BOX_FEES_KEY, null);
  const fees = stored && typeof stored === 'object' ? stored : {};
  return {
    doorwayInspectionFeeNgn: Number(fees.doorway_inspection_fee_ngn) || DEFAULT_DIGITAL_BOX_FEES.doorway_inspection_fee_ngn,
    revalidationFeeNgn: Number(fees.poa_revalidation_fee_ngn) || DEFAULT_DIGITAL_BOX_FEES.poa_revalidation_fee_ngn
  };
}

async function getLegacyBoxLinkFees() {
  const stored = await getSettingValue(LEGACY_BOX_LINK_FEES_KEY, null);
  const fees = stored && typeof stored === 'object' ? stored : {};
  const nipostVerificationFeeNgn = Number(fees.nipost_verification_fee_ngn) || DEFAULT_LEGACY_BOX_LINK_FEES.nipost_verification_fee_ngn;
  const hotboxPlatformFeeNgn = Number(fees.hotbox_platform_fee_ngn) || DEFAULT_LEGACY_BOX_LINK_FEES.hotbox_platform_fee_ngn;
  return {
    nipostVerificationFeeNgn,
    hotboxPlatformFeeNgn,
    totalNgn: nipostVerificationFeeNgn + hotboxPlatformFeeNgn
  };
}

// Where the email fallback approval links are sent. Configured through system
// settings so it can change without a deploy; the environment variable is a
// fallback for environments that cannot edit settings.
async function getNipostReviewEmail() {
  const stored = await getSettingValue(NIPOST_REVIEW_EMAIL_KEY, null);
  const configured = stored && typeof stored === 'string' ? stored.trim() : '';
  return configured || (process.env.NIPOST_REVIEW_EMAIL || null);
}

module.exports = {
  DIGITAL_BOX_FEES_KEY,
  LEGACY_BOX_LINK_FEES_KEY,
  NIPOST_REVIEW_EMAIL_KEY,
  DEFAULT_DIGITAL_BOX_FEES,
  DEFAULT_LEGACY_BOX_LINK_FEES,
  getSettingValue,
  getDigitalBoxFees,
  getLegacyBoxLinkFees,
  getNipostReviewEmail
};