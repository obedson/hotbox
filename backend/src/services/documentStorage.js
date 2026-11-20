// Evidence document storage.
//
// Documents are written to a private Supabase Storage bucket and referenced by
// object key. The key (never the bytes) is what lands in document_url, so API
// responses stay small and access is decided by a short-lived signed URL.
// When storage is not configured the caller keeps the legacy inline behaviour.
const crypto = require('crypto');
const { BUCKET, getSupabaseClient } = require('../config/storage');

const KEY_PREFIX = 'documents';
const SIGNED_URL_TTL_SECONDS = 900;

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

function isStoredKey(value) {
  return typeof value === 'string' && value.startsWith(`${KEY_PREFIX}/`);
}

function buildKey({ userId, kind, mimeType }) {
  const safeKind = String(kind || 'documents').replace(/[^a-z0-9-]/gi, '-');
  const owner = String(userId || 'anonymous')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'anonymous';
  return `${KEY_PREFIX}/${safeKind}/${owner}/${crypto.randomUUID()}${EXTENSIONS[mimeType] || '.bin'}`;
}

async function storeDocument({ userId, kind, mimeType, bytes, hash }) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const key = buildKey({ userId, kind, mimeType });
  const { error } = await supabase.storage.from(BUCKET).upload(key, bytes, {
    contentType: mimeType,
    upsert: false
  });
  if (error) throw new Error(`Could not store the document: ${error.message}`);

  return { key, hash, mimeType, byteLength: bytes.length };
}

async function createSignedUrl(key, expiresIn = SIGNED_URL_TTL_SECONDS) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, expiresIn);
  if (error) return null;
  return data?.signedUrl || null;
}

async function resolveDocumentUrl(value) {
  if (!isStoredKey(value)) return value;
  return (await createSignedUrl(value)) || null;
}

module.exports = {
  KEY_PREFIX,
  SIGNED_URL_TTL_SECONDS,
  isStoredKey,
  buildKey,
  storeDocument,
  createSignedUrl,
  resolveDocumentUrl
};
