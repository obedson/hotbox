// Platform settings live in the system_settings table so administrators can
// tune them without a deploy. Services read through here and fall back to the
// shipped defaults when a key is missing or the database is unavailable.
const db = require('../config/db');

const DIGITAL_BOX_FEES_KEY = 'digital_box_fees';
const LEGACY_BOX_LINK_FEES_KEY = 'legacy_box_link_fees';
const NIPOST_REVIEW_EMAIL_KEY = 'nipost_review_email';
const NIPOST_REGISTRY_KEY = 'nipost_registry';
const RIDER_REGISTRATION_FEES_KEY = 'rider_registration_fees';

const MATCH_POLICIES = ['name_or_phone', 'name_only', 'phone_only'];

// Numbers read from administrator settings. An explicit zero is meaningful
// (free trial off, no grace window) and must survive, so coercion only replaces
// missing or non-numeric values.
function numOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const DEFAULT_DIGITAL_BOX_FEES = {
  annual_subscription_fee_ngn: 3500,
  doorway_inspection_fee_ngn: 2500,
  poa_revalidation_fee_ngn: 2500,
  poa_revalidation_months: 12,
  grace_period_days: 30,
  free_trial_days: 0
};

// Legacy link fees default to zero so the feature is inert until an
// administrator consciously sets the NIPOST verification and Hotbox platform
// amounts. They are charged on approval, never on submission.
const DEFAULT_LEGACY_BOX_LINK_FEES = {
  nipost_verification_fee_ngn: 0,
  hotbox_platform_fee_ngn: 0
};

// Registry auto-verification is off until an administrator turns it on, even
// when the endpoint is configured. The endpoint and key stay in the environment.
const DEFAULT_NIPOST_REGISTRY = {
  enabled: false,
  match_policy: 'name_or_phone'
};

// Rider registration is free until a super administrator sets an amount.
const DEFAULT_RIDER_REGISTRATION_FEES = {
  registration_fee_ngn: 0
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
    annualSubscriptionFeeNgn: numOr(fees.annual_subscription_fee_ngn, DEFAULT_DIGITAL_BOX_FEES.annual_subscription_fee_ngn),
    doorwayInspectionFeeNgn: numOr(fees.doorway_inspection_fee_ngn, DEFAULT_DIGITAL_BOX_FEES.doorway_inspection_fee_ngn),
    revalidationFeeNgn: numOr(fees.poa_revalidation_fee_ngn, DEFAULT_DIGITAL_BOX_FEES.poa_revalidation_fee_ngn),
    revalidationMonths: numOr(fees.poa_revalidation_months, DEFAULT_DIGITAL_BOX_FEES.poa_revalidation_months),
    gracePeriodDays: numOr(fees.grace_period_days, DEFAULT_DIGITAL_BOX_FEES.grace_period_days),
    freeTrialDays: numOr(fees.free_trial_days, DEFAULT_DIGITAL_BOX_FEES.free_trial_days)
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
async function getNipostRegistry() {
  const stored = await getSettingValue(NIPOST_REGISTRY_KEY, null);
  const config = stored && typeof stored === 'object' ? stored : {};
  const matchPolicy = MATCH_POLICIES.includes(config.match_policy)
    ? config.match_policy
    : DEFAULT_NIPOST_REGISTRY.match_policy;
  return {
    enabled: Boolean(config.enabled),
    matchPolicy
  };
}

async function getRiderRegistrationFees() {
  const stored = await getSettingValue(RIDER_REGISTRATION_FEES_KEY, null);
  const fees = stored && typeof stored === 'object' ? stored : {};
  return {
    registrationFeeNgn: Number(fees.registration_fee_ngn) || DEFAULT_RIDER_REGISTRATION_FEES.registration_fee_ngn
  };
}

async function getNipostReviewEmail() {
  const stored = await getSettingValue(NIPOST_REVIEW_EMAIL_KEY, null);
  const configured = stored && typeof stored === 'string' ? stored.trim() : '';
  return configured || (process.env.NIPOST_REVIEW_EMAIL || null);
}

module.exports = {
  DIGITAL_BOX_FEES_KEY,
  LEGACY_BOX_LINK_FEES_KEY,
  NIPOST_REVIEW_EMAIL_KEY,
  NIPOST_REGISTRY_KEY,
  RIDER_REGISTRATION_FEES_KEY,
  MATCH_POLICIES,
  DEFAULT_DIGITAL_BOX_FEES,
  DEFAULT_LEGACY_BOX_LINK_FEES,
  DEFAULT_NIPOST_REGISTRY,
  DEFAULT_RIDER_REGISTRATION_FEES,
  getSettingValue,
  getDigitalBoxFees,
  getLegacyBoxLinkFees,
  getNipostRegistry,
  getRiderRegistrationFees,
  getNipostReviewEmail
};