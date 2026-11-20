const { test } = require('node:test');
const assert = require('node:assert/strict');

// These tests exercise the unconfigured (inline fallback) path, so force the
// storage environment off before the module reads it.
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_ROLE_KEY = '';

const {
  KEY_PREFIX,
  isStoredKey,
  buildKey,
  storeDocument,
  createSignedUrl,
  resolveDocumentUrl
} = require('../../src/services/documentStorage');

const DATA_URL = 'data:image/png;base64,' + Buffer.from('evidence').toString('base64');

test('isStoredKey accepts only object keys', () => {
  assert.equal(isStoredKey(`${KEY_PREFIX}/legacy-box-link/user-1/x.png`), true);
  assert.equal(isStoredKey(DATA_URL), false);
  assert.equal(isStoredKey('https://example.com/doc.pdf'), false);
  assert.equal(isStoredKey(null), false);
});

test('buildKey scopes objects by kind and owner', () => {
  const key = buildKey({ userId: 'user-1', kind: 'rider-kyc', mimeType: 'image/jpeg' });
  assert.match(key, /^documents\/rider-kyc\/user-1\/[0-9a-f-]{36}\.jpg$/);
});

test('buildKey sanitises unsafe owner and kind segments', () => {
  const key = buildKey({ userId: '../etc/passwd', kind: 'a/b c', mimeType: 'application/pdf' });
  assert.match(key, /^documents\/a-b-c\/etc_passwd\/[0-9a-f-]{36}\.pdf$/);
  assert.equal(key.includes('..'), false);
  assert.equal(key.includes('//'), false);
});

test('storeDocument returns null when storage is not configured', async () => {
  const stored = await storeDocument({
    userId: 'user-1', kind: 'verification', mimeType: 'image/png',
    bytes: Buffer.from('evidence'), hash: 'hash'
  });
  assert.equal(stored, null);
});

test('createSignedUrl returns null when storage is not configured', async () => {
  assert.equal(await createSignedUrl(`${KEY_PREFIX}/verification/user-1/x.png`), null);
});

test('resolveDocumentUrl passes inline data URLs and external links through', async () => {
  assert.equal(await resolveDocumentUrl(DATA_URL), DATA_URL);
  assert.equal(await resolveDocumentUrl('https://example.com/doc.pdf'), 'https://example.com/doc.pdf');
  assert.equal(await resolveDocumentUrl(null), null);
});

test('resolveDocumentUrl cannot resolve a stored key without storage', async () => {
  assert.equal(await resolveDocumentUrl(`${KEY_PREFIX}/verification/user-1/x.png`), null);
});
