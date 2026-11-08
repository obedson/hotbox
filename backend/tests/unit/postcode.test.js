const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidPostcodeFormat,
  normalizePostcode,
  disassemblePostcode,
  assemblePostcode
} = require('../../src/services/postcodeService');

test('isValidPostcodeFormat accepts NDAPS formatted, compact, and legacy codes', () => {
  assert.equal(isValidPostcodeFormat('FC-01-A03-FK-01'), true);
  assert.equal(isValidPostcodeFormat('FC01A03FK01'), true);
  assert.equal(isValidPostcodeFormat('fc 01 a03 fk 01'), true);
  assert.equal(isValidPostcodeFormat('900211'), true);
});

test('isValidPostcodeFormat rejects malformed or unknown codes', () => {
  assert.equal(isValidPostcodeFormat(''), false);
  assert.equal(isValidPostcodeFormat(null), false);
  assert.equal(isValidPostcodeFormat('XX-01-A03-FK-01'), false);
  assert.equal(isValidPostcodeFormat('FC-01-A03-FK'), false);
  assert.equal(isValidPostcodeFormat('12345'), false);
});

test('normalizePostcode returns canonical segments', () => {
  const normalized = normalizePostcode('fc-01-a03-fk-01');
  assert.equal(normalized.isNdaps, true);
  assert.equal(normalized.formatted, 'FC-01-A03-FK-01');
  assert.equal(normalized.compact, 'FC01A03FK01');
  assert.deepEqual(normalized.segments, { state: 'FC', lga: '01', district: 'A03', area: 'FK', unit: '01' });
});

test('disassemblePostcode returns the five segments', () => {
  const parts = disassemblePostcode('FC-01-A03-FK-01');
  assert.equal(parts.state, 'FC');
  assert.equal(parts.lga, '01');
  assert.equal(parts.district, 'A03');
  assert.equal(parts.area, 'FK');
  assert.equal(parts.unit, '01');
});

test('disassemblePostcode throws for invalid input', () => {
  assert.throws(() => disassemblePostcode('900211'), /Invalid digital postcode/);
});

test('assemblePostcode builds a formatted code from segments', () => {
  const result = assemblePostcode({ state: 'fc', lga: '1', district: 'a03', area: 'fk', unit: '1' });
  assert.equal(result.data.postcode, 'FC-01-A03-FK-01');
  assert.equal(result.data.compact, 'FC01A03FK01');
});

test('assemblePostcode rejects an unknown state', () => {
  assert.throws(
    () => assemblePostcode({ state: 'xx', lga: '1', district: 'a03', area: 'fk', unit: '1' }),
    /Invalid state code/
  );
});
