const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const digitalBoxService = require('../../src/services/digitalBoxService');

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

test('the registry only ever issues the short HBX prefix', () => {
  assert.equal(digitalBoxService.ANNUAL_FEE_NGN, 3500);
  assert.equal(digitalBoxService.GROUND_TRUTH_FEE_NGN, 2500);
  assert.equal(digitalBoxService.REVALIDATION_FEE_NGN, 2500);
});

test('issueDigitalBox allocates a sequential number once', async () => {
  calls = [];
  handler = async (sql) => {
    if (sql.startsWith('INSERT INTO digital_boxes')) return { rows: [{ id: 'box-1', box_number: 'HBX-0003' }] };
    return { rows: [{ id: 'box-1', box_number: 'HBX-0003' }] };
  };

  const created = await digitalBoxService.issueDigitalBox({ userId: 'user-1' });
  assert.equal(created.box_number, 'HBX-0003');
  assert.match(calls[0].sql, /INSERT INTO digital_boxes/);
  assert.match(calls[0].sql, /digital_box_number_seq/);
  assert.match(calls[0].sql, /WHERE NOT EXISTS/);
  assert.equal(calls[0].params[0], 'user-1');
});

test('issueDigitalBox falls back to the existing box when the insert lost the race', async () => {
  calls = [];
  handler = async (sql) => {
    if (sql.startsWith('INSERT INTO digital_boxes')) return { rows: [] };
    if (sql.includes('FROM digital_boxes WHERE user_id')) return { rows: [{ id: 'box-9', box_number: 'HBX-0009' }] };
    return { rows: [] };
  };

  const existing = await digitalBoxService.issueDigitalBox({ userId: 'user-9' });
  assert.equal(existing.box_number, 'HBX-0009');
});

test('reading the registry never mints a number', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-1', box_number: 'HBX-0001' }] });

  const box = await digitalBoxService.getDigitalBoxByUserId('user-1');
  assert.equal(box.box_number, 'HBX-0001');
  assert.match(calls[0].sql, /^SELECT \* FROM digital_boxes WHERE user_id/);
  assert.doesNotMatch(calls[0].sql, /INSERT/);
});

test('effectiveBoxState reports NONE without a box', () => {
  assert.equal(digitalBoxService.effectiveBoxState(null), 'NONE');
});

test('effectiveBoxState degrades ACTIVE to GRACE and then LAPSED', () => {
  const box = { status: 'ACTIVE', expires_at: new Date('2026-10-24T12:00:00Z') };
  const insideGrace = new Date('2026-11-10T12:00:00Z');
  const pastGrace = new Date('2026-11-26T12:00:00Z');

  assert.equal(digitalBoxService.effectiveBoxState(box, { gracePeriodDays: 30, now: insideGrace }), 'GRACE');
  assert.equal(digitalBoxService.effectiveBoxState(box, { gracePeriodDays: 30, now: pastGrace }), 'LAPSED');
});

test('effectiveBoxState never lapses a cancelled box early', () => {
  assert.equal(digitalBoxService.effectiveBoxState({ status: 'CANCELLED', expires_at: null }), 'CANCELLED');
});

test('sweepBoxExpiries lapses boxes past their grace window and returns them', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-7' }] });

  const lapsed = await digitalBoxService.sweepBoxExpiries({ gracePeriodDays: 30 });
  assert.deepEqual(lapsed, [{ id: 'box-7' }]);
  assert.match(calls[0].sql, /SET status = 'LAPSED'/);
  assert.match(calls[0].sql, /WHERE status IN \('ACTIVE', 'GRACE'\) AND expires_at < \$1/);
  assert.match(calls[1].sql, /SET status = 'GRACE'/);
});

test('findBoxByNumber canonicalises the input before querying', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-1', box_number: 'HBX-0005' }] });

  const box = await digitalBoxService.findBoxByNumber(' hbx-5 ');
  assert.equal(box.box_number, 'HBX-0005');
  assert.equal(calls[0].params[0], 'HBX-0005');
});

test('findBoxByNumber refuses the discarded HBX-PBOX format', async () => {
  calls = [];
  const box = await digitalBoxService.findBoxByNumber('HBX-PBOX-FC01A03-0005');
  assert.equal(box, null);
  assert.equal(calls.length, 0);
});

test('findBoxByLegacyNumber resolves an old box alias', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-2', box_number: 'HBX-0002', legacy_box_number: '0005' }] });

  const box = await digitalBoxService.findBoxByLegacyNumber(' 0005 ');
  assert.equal(box.box_number, 'HBX-0002');
  assert.equal(calls[0].params[0], '0005');
});

test('findBoxByLegacyNumber ignores an empty alias', async () => {
  calls = [];
  const box = await digitalBoxService.findBoxByLegacyNumber('   ');
  assert.equal(box, null);
  assert.equal(calls.length, 0);
});

test('listRelocations returns the forwarding history newest first', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'r1' }, { id: 'r2' }] });

  const rows = await digitalBoxService.listRelocations('box-1');
  assert.equal(rows.length, 2);
  assert.match(calls[0].sql, /FROM relocations WHERE box_id = \$1 ORDER BY changed_at DESC/);
});

test('addRelocation persists the old and new address', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'r1' }] });

  await digitalBoxService.addRelocation('box-1', {
    oldPostcode: 'FC-01-A03-FK-01',
    oldAddress: 'Wuse 2',
    newPostcode: 'LA-01-A01-AA-01',
    newAddress: 'Ikeja',
    phone: '+2348108525262'
  });

  assert.match(calls[0].sql, /INSERT INTO relocations/);
  assert.deepEqual(calls[0].params.slice(0, 6), [
    'box-1', 'FC-01-A03-FK-01', 'Wuse 2', 'LA-01-A01-AA-01', 'Ikeja', '+2348108525262'
  ]);
});

test('renewBox extends the box by the requested plan and reactivates it', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-1', status: 'ACTIVE' }] });

  const renewed = await digitalBoxService.renewBox('box-1');
  assert.equal(renewed.status, 'ACTIVE');
  assert.match(calls[0].sql, /expires_at = NOW\(\) \+ \(\$2 \|\| ' days'\)::INTERVAL/);
  assert.equal(calls[0].params[0], 'box-1');
  assert.equal(calls[0].params[1], '365');
});

test('renewBox records a custom plan length and price paid', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-1', status: 'ACTIVE' }] });

  await digitalBoxService.renewBox('box-1', { lengthDays: 180, pricePaidNgn: 1750 });
  assert.equal(calls[0].params[1], '180');
  assert.equal(calls[0].params[2], 1750);
  assert.match(calls[0].sql, /price_paid_ngn = COALESCE\(\$3, price_paid_ngn\)/);
});

test('cancelBox terminates the subscription permanently', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-1', status: 'CANCELLED' }] });

  const box = await digitalBoxService.cancelBox('box-1');
  assert.equal(box.status, 'CANCELLED');
  assert.match(calls[0].sql, /SET status = 'CANCELLED'/);
});

test('setGroundTruthVerified flips the verification flag', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 'box-1', is_ground_truth_verified: true }] });

  const box = await digitalBoxService.setGroundTruthVerified('box-1', true);
  assert.equal(box.is_ground_truth_verified, true);
  assert.equal(calls[0].params[0], true);
});

test('getCertificate returns the newest active certificate only', async () => {
  calls = [];
  handler = async () => ({ rows: [{ certificate_serial: 'HBX-CERT-0001' }] });

  const cert = await digitalBoxService.getCertificate('box-1');
  assert.equal(cert.certificate_serial, 'HBX-CERT-0001');
  assert.match(calls[0].sql, /status = 'ACTIVE'/);
  assert.match(calls[0].sql, /ORDER BY issued_at DESC LIMIT 1/);
});

test('getActiveCertificateForUser requires an unexpired active certificate', async () => {
  calls = [];
  handler = async () => ({ rows: [{ certificate_serial: 'HBX-CERT-0002' }] });

  const cert = await digitalBoxService.getActiveCertificateForUser('user-1');
  assert.equal(cert.certificate_serial, 'HBX-CERT-0002');
  assert.match(calls[0].sql, /status = 'ACTIVE' AND expires_at > NOW\(\)/);
  assert.equal(calls[0].params[0], 'user-1');
});

test('markCertificatesMoved moves every active certificate once and records why', async () => {
  calls = [];
  handler = async () => ({ rowCount: 2, rows: [] });

  const moved = await digitalBoxService.markCertificatesMoved('user-1', 'RELOCATION');
  assert.equal(moved, 2);
  assert.match(calls[0].sql, /SET status = 'MOVED'/);
  assert.match(calls[0].sql, /moved_at = COALESCE\(moved_at, NOW\(\)\)/);
  assert.match(calls[0].sql, /supersede_reason = \$2/);
  assert.equal(calls[0].params[0], 'user-1');
  assert.equal(calls[0].params[1], 'RELOCATION');
});

test('issueCertificate serialises and stores the certificate with coordinates', async () => {
  calls = [];
  handler = async (sql) => {
    if (sql.includes('count(*)')) return { rows: [{ n: 0 }] };
    return { rows: [{ certificate_serial: 'HBX-CERT-0001' }] };
  };

  const cert = await digitalBoxService.issueCertificate({
    box: { id: 'box-1' },
    user: { id: 'user-1', postcode: 'FC-01-A03-FK-01' },
    verificationRecordId: 'vr-1',
    postcode: 'FC-01-A03-FK-01',
    addressText: 'Wuse 2, Abuja',
    hierarchy: { district: 'Wuse 2', lga: 'Abuja Municipal', state: 'FCT' },
    lat: 9.0772,
    lng: 7.499
  });

  assert.equal(cert.certificate_serial, 'HBX-CERT-0001');
  assert.match(calls[0].sql, /SET status = 'SUPERSEDED'/);
  assert.equal(calls[0].params[0], 'user-1');
  assert.match(calls[2].sql, /INSERT INTO proof_of_address_certificates/);
  assert.equal(calls[2].params[0], 'HBX-CERT-0001');
  assert.equal(calls[2].params[1], 'box-1');
  assert.equal(calls[2].params[9], 9.0772);
  assert.equal(calls[2].params[10], 7.499);
  assert.equal(calls[2].params[11], '12');
  assert.match(calls[2].sql, /NOW\(\) \+ \(\$12 \|\| ' months'\)::INTERVAL/);
  assert.match(calls[2].sql, /last_validated_at/);
});

test('issueCertificate works standalone without a box', async () => {
  calls = [];
  handler = async (sql) => {
    if (sql.includes('count(*)')) return { rows: [{ n: 5 }] };
    return { rows: [{ certificate_serial: 'HBX-CERT-0006' }] };
  };

  const cert = await digitalBoxService.issueCertificate({
    box: null,
    user: { id: 'user-1', postcode: 'FC-01-A03-FK-01' },
    postcode: 'FC-01-A03-FK-01'
  });

  assert.equal(cert.certificate_serial, 'HBX-CERT-0006');
  assert.equal(calls[0].params[0], 'user-1');
  assert.equal(calls[2].params[0], 'HBX-CERT-0006');
  assert.equal(calls[2].params[1], null);
  assert.equal(calls[2].params[11], '12');
});

test('issueCertificate honours the configured revalidation interval', async () => {
  calls = [];
  handler = async (sql) => {
    if (sql.includes('count(*)')) return { rows: [{ n: 0 }] };
    return { rows: [{ certificate_serial: 'HBX-CERT-0007' }] };
  };

  await digitalBoxService.issueCertificate({
    box: null,
    user: { id: 'user-1', postcode: 'FC-01-A03-FK-01' },
    postcode: 'FC-01-A03-FK-01',
    validityMonths: 6
  });

  assert.equal(calls[2].params[11], '6');
  assert.match(calls[2].sql, /NOW\(\) \+ \(\$12 \|\| ' months'\)::INTERVAL/);
});
