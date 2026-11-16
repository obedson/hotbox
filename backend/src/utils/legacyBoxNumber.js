// Legacy NIPOST P.O. Box numbers arrive in many written forms: "P.O. Box 1234",
// "P.M.B 1234", "BOX 1234", "1234". Ownership decisions depend on comparing
// them reliably, so every comparison uses a canonical alphanumeric key.
const POSTAL_TOKENS = /\bP\.?\s*(?:O|M)\.?\s*B\.?(?:OX)?\b/g;
const BOX_TOKEN = /\bBOX\b/g;

function normalizeLegacyBoxNumber(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(POSTAL_TOKENS, ' ')
    .replace(BOX_TOKEN, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function canonicalLegacyKey(raw) {
  return normalizeLegacyBoxNumber(raw).replace(/\s+/g, '');
}

module.exports = { normalizeLegacyBoxNumber, canonicalLegacyKey };