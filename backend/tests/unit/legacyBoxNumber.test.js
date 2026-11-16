const { test } = require('node:test');
const assert = require('node:assert/strict');

const { normalizeLegacyBoxNumber, canonicalLegacyKey } = require('../../src/utils/legacyBoxNumber');

test('normalization strips P.O. Box, P.M.B and Box tokens', () => {
  assert.equal(normalizeLegacyBoxNumber('P.O. Box 1234'), '1234');
  assert.equal(normalizeLegacyBoxNumber('P.M.B 1234'), '1234');
  assert.equal(normalizeLegacyBoxNumber('BOX 1234'), '1234');
  assert.equal(normalizeLegacyBoxNumber('p.o.box 1234'), '1234');
});

test('normalization keeps the place name and collapses spacing', () => {
  assert.equal(normalizeLegacyBoxNumber('P.O. Box 1234, Lagos'), '1234 LAGOS');
});

test('canonical key removes every separator so formatting cannot split a claim', () => {
  assert.equal(canonicalLegacyKey('P.O. Box 1234'), '1234');
  assert.equal(canonicalLegacyKey('p.o.box  1234'), '1234');
  assert.equal(canonicalLegacyKey('1234'), '1234');
});

test('canonical key of a blank value is empty', () => {
  assert.equal(canonicalLegacyKey('   '), '');
  assert.equal(canonicalLegacyKey(null), '');
});

test('a number that merely contains the letters BOX is left intact', () => {
  assert.equal(canonicalLegacyKey('ABOX123'), 'ABOX123');
});