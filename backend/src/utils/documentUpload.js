// Evidence document intake.
// Documents are uploaded to private Supabase Storage and referenced by object
// key (see services/documentStorage.js). Only a small allowlist of image/PDF
// types is accepted and every upload is content-hashed so the approver sees the
// exact bytes that were declared and stored. The decoded bytes are returned so
// the storage layer can persist them without re-parsing the data URL.
const crypto = require('crypto');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function failure(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseDocumentDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.trim().startsWith('data:')) {
    throw failure('Please attach a proof document (JPEG, PNG, WebP or PDF).');
  }

  const match = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl.trim());
  if (!match) {
    throw failure('The proof document could not be read. Please choose a JPEG, PNG, WebP or PDF file.');
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw failure('Unsupported document type. Please attach a JPEG, PNG, WebP or PDF file.');
  }

  const payload = match[2].replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.length % 4 !== 0) {
    throw failure('The proof document could not be read. Please choose a valid file.');
  }

  const bytes = Buffer.from(payload, 'base64');
  if (bytes.length === 0) {
    throw failure('The proof document is empty.');
  }
  if (bytes.length > MAX_BYTES) {
    throw failure('The proof document is larger than 2 MB. Please attach a smaller file.');
  }

  return {
    dataUrl: `data:${mimeType};base64,${payload}`,
    bytes,
    hash: crypto.createHash('sha256').update(bytes).digest('hex'),
    mimeType,
    byteLength: bytes.length
  };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_BYTES,
  parseDocumentDataUrl
};
