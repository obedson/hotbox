const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const registry = require('../../src/services/nipostRegistryService');

const originalUrl = process.env.NIPOST_REGISTRY_URL;
const originalKey = process.env.NIPOST_REGISTRY_API_KEY;

after(() => {
  registry.resetFetchImpl();
  if (originalUrl === undefined) delete process.env.NIPOST_REGISTRY_URL;
  else process.env.NIPOST_REGISTRY_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NIPOST_REGISTRY_API_KEY;
  else process.env.NIPOST_REGISTRY_API_KEY = originalKey;
});

function stubResponse({ ok = true, status = 200, payload = {} } = {}) {
  return { ok, status, json: async () => payload };
}

test('verifyOwnership is inert when the registry is not configured', async () => {
  delete process.env.NIPOST_REGISTRY_URL;
  const result = await registry.verifyOwnership({ legacyBoxNumber: 'P.O. Box 1234', ownerName: 'Obed Uchenna' });
  assert.equal(result.configured, false);
  assert.equal(result.match, false);
  assert.match(result.reason, /not configured/i);
});

test('verifyOwnership approves on an owner name match', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  let captured;
  registry.setFetchImpl(async (url, options) => {
    captured = { url, options };
    return stubResponse({ payload: { records: [
      { owner_name: 'Obed Uchenna', status: 'ACTIVE', reference: 'NIPOST-REF-1' }
    ] } });
  });

  const result = await registry.verifyOwnership({
    legacyBoxNumber: 'P.O. Box 1234',
    ownerName: 'Obed Uchenna',
    phone: '08108525262'
  });

  assert.equal(result.match, true);
  assert.equal(result.source, 'NIPOST_REGISTRY');
  assert.equal(result.reference, 'NIPOST-REF-1');
  assert.match(result.reason, /name matched/i);
  assert.equal(captured.url, 'https://registry.nipost.gov.ng/api/lookup');
  assert.match(captured.options.body, /"legacy_box_number_norm":"1234"/);
});

test('verifyOwnership approves on a registered phone match', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  registry.setFetchImpl(async () => stubResponse({ payload: { records: [
    { owner_name: 'Somebody Else', phone: '08108525262', status: 'ACTIVE' }
  ] } }));

  const result = await registry.verifyOwnership({
    legacyBoxNumber: '1234',
    ownerName: 'Obed Uchenna',
    phone: '08108525262'
  });

  assert.equal(result.match, true);
  assert.match(result.reason, /phone matched/i);
});

test('verifyOwnership does not approve on a non-match', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  registry.setFetchImpl(async () => stubResponse({ payload: { records: [
    { owner_name: 'Somebody Else', phone: '09011112222', status: 'ACTIVE' }
  ] } }));

  const result = await registry.verifyOwnership({
    legacyBoxNumber: 'P.O. Box 1234',
    ownerName: 'Obed Uchenna',
    phone: '08108525262'
  });

  assert.equal(result.match, false);
  assert.match(result.reason, /no NIPOST registry record matched/i);
});

test('verifyOwnership reports an upstream failure without approving', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  registry.setFetchImpl(async () => stubResponse({ ok: false, status: 503 }));

  const result = await registry.verifyOwnership({ legacyBoxNumber: 'P.O. Box 1234', ownerName: 'Obed Uchenna' });
  assert.equal(result.match, false);
  assert.match(result.reason, /responded 503/);
});

test('verifyOwnership reports a transport failure without approving', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  registry.setFetchImpl(async () => { throw new Error('socket hangup'); });

  const result = await registry.verifyOwnership({ legacyBoxNumber: 'P.O. Box 1234', ownerName: 'Obed Uchenna' });
  assert.equal(result.match, false);
  assert.match(result.reason, /failed: socket hangup/);
});

test('verifyOwnership sends the configured API key', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  process.env.NIPOST_REGISTRY_API_KEY = 'secret-key';
  let headers;
  registry.setFetchImpl(async (url, options) => {
    headers = options.headers;
    return stubResponse({ payload: { records: [] } });
  });

  await registry.verifyOwnership({ legacyBoxNumber: 'P.O. Box 1234', ownerName: 'Obed Uchenna' });
  assert.equal(headers.Authorization, 'Bearer secret-key');
});

test('verifyOwnership ignores records that are not active', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  registry.setFetchImpl(async () => stubResponse({ payload: { records: [
    { owner_name: 'Obed Uchenna', status: 'SUSPENDED' }
  ] } }));

  const result = await registry.verifyOwnership({ legacyBoxNumber: 'P.O. Box 1234', ownerName: 'Obed Uchenna' });
  assert.equal(result.match, false);
});

test('verifyOwnership name_only ignores a phone-only match', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  registry.setFetchImpl(async () => stubResponse({ payload: { records: [
    { owner_name: 'Somebody Else', phone: '08108525262', status: 'ACTIVE' }
  ] } }));

  const result = await registry.verifyOwnership({
    legacyBoxNumber: 'P.O. Box 1234',
    ownerName: 'Obed Uchenna',
    phone: '08108525262',
    matchPolicy: 'name_only'
  });
  assert.equal(result.match, false);
});

test('verifyOwnership phone_only ignores a name-only match', async () => {
  process.env.NIPOST_REGISTRY_URL = 'https://registry.nipost.gov.ng/api/lookup';
  registry.setFetchImpl(async () => stubResponse({ payload: { records: [
    { owner_name: 'Obed Uchenna', phone: '09011112222', status: 'ACTIVE' }
  ] } }));

  const result = await registry.verifyOwnership({
    legacyBoxNumber: 'P.O. Box 1234',
    ownerName: 'Obed Uchenna',
    phone: '08108525262',
    matchPolicy: 'phone_only'
  });
  assert.equal(result.match, false);
});