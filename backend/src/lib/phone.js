// Phone numbers are stored in one canonical shape (+2348108525262) so a
// person can never hold two accounts for the same number, while still being
// able to sign in with whatever format they naturally type.
const DEFAULT_DIAL_CODE = '234';

const digitsOf = (value) => String(value || '').replace(/\D/g, '');

// Turns any common input (0810..., 810..., 234810..., +234810...) into the
// canonical international form for the chosen country dial code.
function toCanonicalPhone(value, dialCode = DEFAULT_DIAL_CODE) {
  const dial = digitsOf(dialCode) || DEFAULT_DIAL_CODE;
  let digits = digitsOf(value);
  if (!digits) return '';

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith(dial)) return `+${digits}`;

  return `+${dial}${digits}`;
}

const normalizePhone = (phone) => toCanonicalPhone(phone, DEFAULT_DIAL_CODE);

// Every stored shape a sign-in identifier could match, so logging in with
// 08108525262, 8108525262 or +2348108525262 all resolve to the same account.
function buildPhoneCandidates(identifier) {
  const raw = String(identifier || '').trim();
  const digits = digitsOf(raw);
  if (!digits) return [];

  const candidates = new Set([`+${digits}`, normalizePhone(raw)]);
  if (digits.startsWith('00')) candidates.add(`+${digits.slice(2)}`);
  return [...candidates];
}

module.exports = { DEFAULT_DIAL_CODE, digitsOf, toCanonicalPhone, normalizePhone, buildPhoneCandidates };
