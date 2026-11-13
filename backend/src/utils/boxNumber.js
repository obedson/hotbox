const BOX_PREFIX = 'HBX';
const LEGACY_PREFIX = 'HBX-PBOX';

function getBoxSuffix(userId) {
  return String(userId || '').slice(-4).toUpperCase();
}

function formatBoxNumber(userId) {
  return `${BOX_PREFIX}-${getBoxSuffix(userId)}`;
}

function formatLegacyBoxNumber(userId, postcode) {
  const postcodeClean = (postcode || '900001').replace(/[^A-Z0-9]/gi, '').slice(0, 8);
  return `${LEGACY_PREFIX}-${postcodeClean}-${getBoxSuffix(userId)}`;
}

function parseBoxNumber(input) {
  const match = /^HBX-(?:PBOX-[A-Z0-9]+-)?([A-Z0-9]{4})$/i.exec(String(input || '').trim());
  return match ? match[1].toUpperCase() : null;
}

module.exports = { getBoxSuffix, formatBoxNumber, formatLegacyBoxNumber, parseBoxNumber };
