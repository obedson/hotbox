const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDocumentDataUrl, ALLOWED_MIME_TYPES, MAX_BYTES } = require('../../src/utils/documentUpload');

const tinyPng = 'data:image/png;base64,' + Buffer.from('hotbox-evidence').toString('base64');

test('accepts an allowed image data URL and content-hashes it', () => {
  const result = parseDocumentDataUrl(tinyPng);
  assert.equal(result.mimeType, 'image/png');
  assert.match(result.hash, /^[a-f0-9]{64}$/);
  assert.equal(result.byteLength, Buffer.from('hotbox-evidence').length);
  assert.equal(result.dataUrl, tinyPng);
  assert.deepEqual(result.bytes, Buffer.from('hotbox-evidence'));
});

test('accepts every allowlisted mime type', () => {
  ALLOWED_MIME_TYPES.forEach((mimeType) => {
    const dataUrl = `data:${mimeType};base64,${Buffer.from('evidence').toString('base64')}`;
    assert.equal(parseDocumentDataUrl(dataUrl).mimeType, mimeType);
  });
});

test('rejects a value that is not a data URL', () => {
  assert.throws(() => parseDocumentDataUrl('https://example.com/doc.pdf'), /proof document/i);
});

test('rejects an unsupported mime type', () => {
  assert.throws(
    () => parseDocumentDataUrl('data:text/plain;base64,aGk='),
    /unsupported document type/i
  );
});

test('rejects an empty document', () => {
  assert.throws(() => parseDocumentDataUrl('data:image/png;base64,'), /empty/i);
});

test('rejects a document larger than the cap', () => {
  const payload = Buffer.alloc(MAX_BYTES + 1, 7).toString('base64');
  assert.throws(() => parseDocumentDataUrl(`data:application/pdf;base64,${payload}`), /larger than 2 MB/i);
});

test('rejects malformed base64 padding', () => {
  assert.throws(() => parseDocumentDataUrl('data:image/png;base64,abc'), /could not be read/i);
});
