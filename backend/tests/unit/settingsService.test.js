const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const settingsService = require('../../src/services/settingsService');

const originalQuery = db.query;
const originalReviewEmail = process.env.NIPOST_REVIEW_EMAIL;
let handler = async () => ({ rows: [] });
let calls = [];

db.query = (sql, params) => {
  calls.push({ sql, params });
  return handler(sql, params);
};

after(() => {
  db.query = originalQuery;
  if (originalReviewEmail === undefined) delete process.env.NIPOST_REVIEW_EMAIL;
  else process.env.NIPOST_REVIEW_EMAIL = originalReviewEmail;
});

test('digital box fees fall back to the shipped defaults', async () => {
  handler = async () => ({ rows: [] });
  const fees = await settingsService.getDigitalBoxFees();
  assert.equal(fees.doorwayInspectionFeeNgn, 2500);
  assert.equal(fees.revalidationFeeNgn, 2500);
});

test('digital box fees read the admin override from system_settings', async () => {
  calls = [];
  handler = async () => ({ rows: [{ setting_value: { doorway_inspection_fee_ngn: 3000, poa_revalidation_fee_ngn: 1800 } }] });
  const fees = await settingsService.getDigitalBoxFees();
  assert.equal(fees.doorwayInspectionFeeNgn, 3000);
  assert.equal(fees.revalidationFeeNgn, 1800);
  assert.match(calls[0].sql, /FROM system_settings WHERE setting_key = \$1/);
  assert.equal(calls[0].params[0], 'digital_box_fees');
});

test('digital box fees survive a settings read failure', async () => {
  handler = async () => { throw new Error('db down'); };
  const fees = await settingsService.getDigitalBoxFees();
  assert.equal(fees.doorwayInspectionFeeNgn, 2500);
  assert.equal(fees.revalidationFeeNgn, 2500);
});

test('legacy link fees default to zero so the feature is inert', async () => {
  handler = async () => ({ rows: [] });
  const fees = await settingsService.getLegacyBoxLinkFees();
  assert.equal(fees.nipostVerificationFeeNgn, 0);
  assert.equal(fees.hotboxPlatformFeeNgn, 0);
  assert.equal(fees.totalNgn, 0);
});

test('legacy link fees read the admin override and total', async () => {
  calls = [];
  handler = async () => ({ rows: [{ setting_value: { nipost_verification_fee_ngn: 2000, hotbox_platform_fee_ngn: 500 } }] });
  const fees = await settingsService.getLegacyBoxLinkFees();
  assert.equal(fees.nipostVerificationFeeNgn, 2000);
  assert.equal(fees.hotboxPlatformFeeNgn, 500);
  assert.equal(fees.totalNgn, 2500);
  assert.equal(calls[0].params[0], 'legacy_box_link_fees');
});

test('legacy link fees survive a settings read failure', async () => {
  handler = async () => { throw new Error('db down'); };
  const fees = await settingsService.getLegacyBoxLinkFees();
  assert.equal(fees.totalNgn, 0);
});

test('NIPOST review email prefers the configured setting', async () => {
  handler = async () => ({ rows: [{ setting_value: 'nipost@microcbt.com' }] });
  assert.equal(await settingsService.getNipostReviewEmail(), 'nipost@microcbt.com');
});

test('NIPOST review email falls back to the environment', async () => {
  process.env.NIPOST_REVIEW_EMAIL = 'env@microcbt.com';
  handler = async () => ({ rows: [] });
  assert.equal(await settingsService.getNipostReviewEmail(), 'env@microcbt.com');
});

test('nipost registry defaults to disabled with a permissive match policy', async () => {
  handler = async () => ({ rows: [] });
  const registry = await settingsService.getNipostRegistry();
  assert.equal(registry.enabled, false);
  assert.equal(registry.matchPolicy, 'name_or_phone');
});

test('nipost registry reads the admin override', async () => {
  calls = [];
  handler = async () => ({ rows: [{ setting_value: { enabled: true, match_policy: 'phone_only' } }] });
  const registry = await settingsService.getNipostRegistry();
  assert.equal(registry.enabled, true);
  assert.equal(registry.matchPolicy, 'phone_only');
  assert.equal(calls[0].params[0], 'nipost_registry');
});

test('nipost registry falls back for an unknown match policy', async () => {
  handler = async () => ({ rows: [{ setting_value: { enabled: true, match_policy: 'whatever' } }] });
  const registry = await settingsService.getNipostRegistry();
  assert.equal(registry.enabled, true);
  assert.equal(registry.matchPolicy, 'name_or_phone');
});

test('nipost registry survives a settings read failure', async () => {
  handler = async () => { throw new Error('db down'); };
  const registry = await settingsService.getNipostRegistry();
  assert.equal(registry.enabled, false);
});