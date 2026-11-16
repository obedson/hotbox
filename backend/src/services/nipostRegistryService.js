// NIPOST legacy box registry adapter.
//
// There is no public NIPOST registry today. This module is the single seam
// where a digitized NIPOST source of truth plugs in. It stays inert unless
// NIPOST_REGISTRY_URL is configured, so production behaviour is unchanged until
// NIPOST provides an endpoint. Auto-verification only approves on a positive
// ownership match from that source; a missing or ambiguous answer is left to a
// human reviewer and is audited.
const { canonicalLegacyKey } = require('../utils/legacyBoxNumber');

const DEFAULT_TIMEOUT_MS = 8000;

let fetchImpl = typeof global.fetch === 'function' ? global.fetch : null;

function setFetchImpl(fn) {
  fetchImpl = fn || (typeof global.fetch === 'function' ? global.fetch : null);
}

function resetFetchImpl() {
  setFetchImpl(null);
}

function endpoint() {
  return String(process.env.NIPOST_REGISTRY_URL || '').trim().replace(/\/$/, '');
}

function apiKey() {
  return String(process.env.NIPOST_REGISTRY_API_KEY || '').trim();
}

function isConfigured() {
  return Boolean(endpoint());
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizePhone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/^00234/, '')
    .replace(/^234/, '');
}

function recordsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload && payload.records)) return payload.records;
  if (Array.isArray(payload && payload.data)) return payload.data;
  if (payload && payload.record && typeof payload.record === 'object') return [payload.record];
  if (payload && payload.match && typeof payload === 'object') return [payload];
  return [];
}

function isLiveRecord(record) {
  const status = String(record.status || 'ACTIVE').toUpperCase();
  return status === 'ACTIVE' || status === 'VALID' || status === 'APPROVED';
}

function matchRecord(record, { ownerName, phone, matchPolicy = 'name_or_phone' }) {
  const claimName = normalizeName(ownerName);
  const claimPhone = normalizePhone(phone);
  const recordName = normalizeName(record.owner_name || record.name || record.holder_name);
  const recordPhone = normalizePhone(record.phone || record.registered_phone || record.phone_number);
  const nameMatch = Boolean(claimName) && claimName === recordName;
  const phoneMatch = Boolean(claimPhone) && claimPhone.length >= 9 && claimPhone === recordPhone;

  let matched = false;
  if (matchPolicy === 'name_only') matched = nameMatch;
  else if (matchPolicy === 'phone_only') matched = phoneMatch;
  else matched = nameMatch || phoneMatch;

  return { nameMatch, phoneMatch, matched };
}

async function verifyOwnership({ legacyBoxNumber, ownerName = null, phone = null, matchPolicy = 'name_or_phone' } = {}) {
  if (!isConfigured()) {
    return {
      match: false, configured: false, source: null, reference: null,
      reason: 'NIPOST registry is not configured.'
    };
  }

  const key = canonicalLegacyKey(legacyBoxNumber);
  if (!key) {
    return {
      match: false, configured: true, source: null, reference: null,
      reason: 'Unrecognized legacy P.O. Box number.'
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey() ? { Authorization: `Bearer ${apiKey()}` } : {})
      },
      body: JSON.stringify({
        legacy_box_number: legacyBoxNumber,
        legacy_box_number_norm: key,
        owner_name: ownerName,
        phone
      }),
      signal: controller.signal
    });
  } catch (err) {
    return {
      match: false, configured: true, source: null, reference: null,
      reason: `NIPOST registry request failed: ${err.message}`
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return {
      match: false, configured: true, source: null, reference: null,
      reason: `NIPOST registry responded ${response.status}.`
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    return {
      match: false, configured: true, source: null, reference: null,
      reason: 'NIPOST registry returned an unreadable response.'
    };
  }

  const records = recordsFromPayload(payload).filter(isLiveRecord);
  for (const record of records) {
    const result = matchRecord(record, { ownerName, phone, matchPolicy });
    if (result.matched) {
      return {
        match: true,
        configured: true,
        source: 'NIPOST_REGISTRY',
        reference: record.reference || record.box_reference || null,
        reason: result.nameMatch
          ? 'Owner name matched the NIPOST registry.'
          : result.phoneMatch
            ? 'Registered phone matched the NIPOST registry.'
            : 'The NIPOST registry matched this claim.'
      };
    }
  }

  return {
    match: false, configured: true, source: null, reference: null,
    reason: 'No NIPOST registry record matched this claim.'
  };
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  isConfigured,
  verifyOwnership,
  setFetchImpl,
  resetFetchImpl,
  endpoint,
  apiKey
};