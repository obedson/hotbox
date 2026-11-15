const test = require('node:test');
const assert = require('node:assert');
const { BOX_PREFIX, padNumber, formatBoxNumber, parseBoxNumber } = require('../../src/utils/boxNumber');

test('the box prefix is HBX and nothing else', () => {
  assert.equal(BOX_PREFIX, 'HBX');
});

test('formatBoxNumber renders a short memorable sequential number', () => {
  assert.equal(formatBoxNumber(5), 'HBX-0005');
  assert.equal(formatBoxNumber('5'), 'HBX-0005');
  assert.equal(formatBoxNumber(123), 'HBX-0123');
});

test('formatBoxNumber tolerates a missing value', () => {
  assert.equal(formatBoxNumber(undefined), '');
  assert.equal(formatBoxNumber(''), '');
});

test('padNumber zero pads to four digits', () => {
  assert.equal(padNumber(1), '0001');
  assert.equal(padNumber('0005'), '0005');
  assert.equal(padNumber('abc'), '');
});

test('parseBoxNumber reads the HBX format case insensitively', () => {
  assert.equal(parseBoxNumber('HBX-0005'), 'HBX-0005');
  assert.equal(parseBoxNumber('hbx-5'), 'HBX-0005');
  assert.equal(parseBoxNumber(' HBX-0123 '), 'HBX-0123');
});

test('parseBoxNumber rejects the discarded legacy long format', () => {
  assert.equal(parseBoxNumber('HBX-PBOX-FC01A03F-A000'), null);
  assert.equal(parseBoxNumber('HBX-PBOX-FC01A03-0005'), null);
});

test('parseBoxNumber rejects anything that is not a box number', () => {
  assert.equal(parseBoxNumber('FC-01-A03-FK-01'), null);
  assert.equal(parseBoxNumber(''), null);
  assert.equal(parseBoxNumber(null), null);
  assert.equal(parseBoxNumber('HBX-12AB'), null);
});