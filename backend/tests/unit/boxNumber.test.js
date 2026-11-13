const test = require('node:test');
const assert = require('node:assert');
const { formatBoxNumber, formatLegacyBoxNumber, parseBoxNumber } = require('../../src/utils/boxNumber');

const seededUserId = 'a0000000-0000-0000-0000-000000000005';
const uuidUserId = 'd7cdef07-2851-49fd-b863-e89f8f41b9e4';

test('formatBoxNumber uses the last four characters of the user id', () => {
  assert.equal(formatBoxNumber(seededUserId), 'HBX-0005');
  assert.equal(formatBoxNumber(uuidUserId), 'HBX-B9E4');
});

test('formatBoxNumber tolerates a missing user id', () => {
  assert.equal(formatBoxNumber(undefined), 'HBX-');
});

test('formatLegacyBoxNumber reproduces the previous long format', () => {
  assert.equal(
    formatLegacyBoxNumber(seededUserId, 'FC-01-A03-FK-01'),
    'HBX-PBOX-FC01A03F-0005'
  );
});

test('parseBoxNumber reads the short format', () => {
  assert.equal(parseBoxNumber('HBX-0005'), '0005');
  assert.equal(parseBoxNumber('hbx-b9e4'), 'B9E4');
});

test('parseBoxNumber reads the legacy long format', () => {
  assert.equal(parseBoxNumber('HBX-PBOX-FC01A03F-A000'), 'A000');
  assert.equal(parseBoxNumber('HBX-PBOX-FC01A03-0005'), '0005');
});

test('parseBoxNumber rejects anything that is not a box number', () => {
  assert.equal(parseBoxNumber('FC-01-A03-FK-01'), null);
  assert.equal(parseBoxNumber(''), null);
  assert.equal(parseBoxNumber(null), null);
  assert.equal(parseBoxNumber('HBX-123'), null);
});
