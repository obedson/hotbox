const assert = require('node:assert/strict');
const { test } = require('node:test');
const { toCanonicalPhone, normalizePhone, buildPhoneCandidates } = require('../../src/lib/phone');

test('toCanonicalPhone converts local and international formats to one shape', () => {
  assert.equal(toCanonicalPhone('08108525262'), '+2348108525262');
  assert.equal(toCanonicalPhone('8108525262'), '+2348108525262');
  assert.equal(toCanonicalPhone('+2348108525262'), '+2348108525262');
  assert.equal(toCanonicalPhone('2348108525262'), '+2348108525262');
  assert.equal(toCanonicalPhone('002348108525262'), '+2348108525262');
  assert.equal(toCanonicalPhone('0810-852-5262'), '+2348108525262');
});

test('toCanonicalPhone respects the selected country dial code', () => {
  assert.equal(toCanonicalPhone('07911 123 456', '44'), '+447911123456');
  assert.equal(toCanonicalPhone('415 555 2671', '1'), '+14155552671');
  assert.equal(toCanonicalPhone('+1 415 555 2671', '1'), '+14155552671');
  assert.equal(toCanonicalPhone('020 7946 0958', '44'), '+442079460958');
});

test('buildPhoneCandidates resolves every accepted format to the same account', () => {
  const variants = ['08108525262', '8108525262', '+2348108525262', '2348108525262', '002348108525262'];
  for (const variant of variants) {
    assert.ok(buildPhoneCandidates(variant).includes('+2348108525262'), variant);
  }
  assert.deepEqual(buildPhoneCandidates('   '), []);
});

test('normalizePhone keeps legacy stored values stable', () => {
  assert.equal(normalizePhone('+2349063085415'), '+2349063085415');
  assert.equal(normalizePhone('08031234567'), '+2348031234567');
});
