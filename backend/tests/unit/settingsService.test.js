const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const settingsService = require('../../src/services/settingsService');

const originalQuery = db.query;
let handler = async () => ({ rows: [] });
let calls = [];

db.query = (sql, params) => {
  calls.push({ sql, params });
  return handler(sql, params);
};

after(() => {
  db.query = originalQuery;
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