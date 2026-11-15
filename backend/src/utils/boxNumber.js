// Digital P.O. Box numbers use a single prefix, HBX, with a short sequential
// suffix (HBX-0001). Legacy Nigerian P.O. Box numbers are stored as linked
// aliases on the box, never as the box number itself.
const BOX_PREFIX = 'HBX';

function padNumber(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  if (!digits) return '';
  return String(parseInt(digits, 10)).padStart(4, '0');
}

function formatBoxNumber(value) {
  const padded = padNumber(value);
  return padded ? `${BOX_PREFIX}-${padded}` : '';
}

// Accepts only the HBX prefix (HBX-0001, HBX-1, hbx-0001). Anything else is
// rejected so a legacy format can never be mistaken for a digital box number.
function parseBoxNumber(input) {
  const match = /^HBX-?(\d{1,6})$/i.exec(String(input || '').trim());
  return match ? formatBoxNumber(match[1]) : null;
}

module.exports = { BOX_PREFIX, padNumber, formatBoxNumber, parseBoxNumber };