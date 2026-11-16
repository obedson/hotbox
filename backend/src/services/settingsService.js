// Platform settings live in the system_settings table so administrators can
// tune them without a deploy. Services read through here and fall back to the
// shipped defaults when a key is missing or the database is unavailable.
const db = require('../config/db');

const DIGITAL_BOX_FEES_KEY = 'digital_box_fees';

const DEFAULT_DIGITAL_BOX_FEES = {
  doorway_inspection_fee_ngn: 2500,
  poa_revalidation_fee_ngn: 2500
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

module.exports = {
  DIGITAL_BOX_FEES_KEY,
  DEFAULT_DIGITAL_BOX_FEES,
  getSettingValue,
  getDigitalBoxFees
};