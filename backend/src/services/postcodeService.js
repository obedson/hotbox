const db = require('../config/db');

// Official 36 Nigerian States + FCT State Codes (NDAPS Standard from docs.postcode.gov.ng)
const NIGERIA_STATES = {
  'AB': { name: 'ABIA', zone: 'SOUTH EAST', lat: 5.4527, lng: 7.5248 },
  'AD': { name: 'ADAMAWA', zone: 'NORTH EAST', lat: 9.3265, lng: 12.3984 },
  'AK': { name: 'AKWA IBOM', zone: 'SOUTH SOUTH', lat: 5.0377, lng: 7.9128 },
  'AN': { name: 'ANAMBRA', zone: 'SOUTH EAST', lat: 6.2209, lng: 7.0722 },
  'BA': { name: 'BAUCHI', zone: 'NORTH EAST', lat: 10.3158, lng: 9.8442 },
  'BY': { name: 'BAYELSA', zone: 'SOUTH SOUTH', lat: 4.7719, lng: 6.0699 },
  'BE': { name: 'BENUE', zone: 'NORTH CENTRAL', lat: 7.7304, lng: 8.5214 },
  'BO': { name: 'BORNO', zone: 'NORTH EAST', lat: 11.8333, lng: 13.1500 },
  'CR': { name: 'CROSS RIVER', zone: 'SOUTH SOUTH', lat: 5.9631, lng: 8.3300 },
  'DE': { name: 'DELTA', zone: 'SOUTH SOUTH', lat: 5.8904, lng: 5.6806 },
  'EB': { name: 'EBONYI', zone: 'SOUTH EAST', lat: 6.2649, lng: 8.0137 },
  'ED': { name: 'EDO', zone: 'SOUTH SOUTH', lat: 6.5244, lng: 5.8987 },
  'EK': { name: 'EKITI', zone: 'SOUTH WEST', lat: 7.6211, lng: 5.2214 },
  'EN': { name: 'ENUGU', zone: 'SOUTH EAST', lat: 6.4584, lng: 7.5464 },
  'FC': { name: 'FEDERAL CAPITAL TERRITORY', zone: 'NORTH CENTRAL', lat: 9.0765, lng: 7.4985 },
  'GO': { name: 'GOMBE', zone: 'NORTH EAST', lat: 10.2897, lng: 11.1673 },
  'IM': { name: 'IMO', zone: 'SOUTH EAST', lat: 5.4833, lng: 7.0333 },
  'JI': { name: 'JIGAWA', zone: 'NORTH WEST', lat: 12.2280, lng: 9.5616 },
  'KD': { name: 'KADUNA', zone: 'NORTH WEST', lat: 10.5105, lng: 7.4165 },
  'KN': { name: 'KANO', zone: 'NORTH WEST', lat: 12.0022, lng: 8.5920 },
  'KT': { name: 'KATSINA', zone: 'NORTH WEST', lat: 12.9908, lng: 7.6018 },
  'KB': { name: 'KEBBI', zone: 'NORTH WEST', lat: 12.4504, lng: 4.1999 },
  'KO': { name: 'KOGI', zone: 'NORTH CENTRAL', lat: 7.7969, lng: 6.7405 },
  'KW': { name: 'KWARA', zone: 'NORTH CENTRAL', lat: 8.4799, lng: 4.5418 },
  'LA': { name: 'LAGOS', zone: 'SOUTH WEST', lat: 6.5244, lng: 3.3792 },
  'NA': { name: 'NASARAWA', zone: 'NORTH CENTRAL', lat: 8.5475, lng: 8.5234 },
  'NI': { name: 'NIGER', zone: 'NORTH CENTRAL', lat: 9.9309, lng: 6.5569 },
  'OG': { name: 'OGUN', zone: 'SOUTH WEST', lat: 7.1557, lng: 3.3458 },
  'ON': { name: 'ONDO', zone: 'SOUTH WEST', lat: 7.2571, lng: 5.2058 },
  'OS': { name: 'OSUN', zone: 'SOUTH WEST', lat: 7.7827, lng: 4.5418 },
  'OY': { name: 'OYO', zone: 'SOUTH WEST', lat: 7.3775, lng: 3.9470 },
  'PL': { name: 'PLATEAU', zone: 'NORTH CENTRAL', lat: 9.8965, lng: 8.8583 },
  'RI': { name: 'RIVERS', zone: 'SOUTH SOUTH', lat: 4.8156, lng: 7.0498 },
  'RV': { name: 'RIVERS', zone: 'SOUTH SOUTH', lat: 4.8156, lng: 7.0498 },
  'SO': { name: 'SOKOTO', zone: 'NORTH WEST', lat: 13.0609, lng: 5.2476 },
  'TA': { name: 'TARABA', zone: 'NORTH EAST', lat: 7.8704, lng: 9.7800 },
  'YO': { name: 'YOBE', zone: 'NORTH EAST', lat: 12.0000, lng: 11.5000 },
  'ZA': { name: 'ZAMFARA', zone: 'NORTH WEST', lat: 12.1628, lng: 6.6613 },
};

/**
 * Validates whether a given string is a valid NDAPS (National Digital Alphanumeric Postcode)
 * or legacy 6-digit numeric Nigerian postcode.
 *
 * NDAPS format: AA-99-H77-BB-55 (formatted), AA 99 H77 BB 55 (display), or AA99H77BB55 (compact)
 * Example Digital Postcode: FC-01-A03-FK-01 (Wuse 2, Abuja)
 * Legacy format: 6-digit numeric (backward compatibility)
 */
function isValidPostcodeFormat(code) {
  if (!code || typeof code !== 'string') return false;
  const raw = code.trim().toUpperCase();

  // Legacy 6-digit numeric
  if (/^\d{6}$/.test(raw)) return true;

  // Clean compact representation (strip hyphens and whitespace)
  const clean = raw.replace(/[\s\-]/g, '');

  // NDAPS standard is exactly 11 characters: State(2), LGA(2), District(3), Area(2), Unit(2)
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(clean)) {
    const stateCode = clean.slice(0, 2);
    return Boolean(NIGERIA_STATES[stateCode]);
  }

  return false;
}

/**
 * Normalizes any valid postcode input into its canonical NDAPS representation
 * or returns normalized 6-digit legacy code.
 */
function normalizePostcode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') return null;
  const raw = rawCode.trim().toUpperCase();

  if (/^\d{6}$/.test(raw)) {
    return {
      isNdaps: false,
      isLegacy: true,
      raw: raw,
      formatted: raw,
      display: raw,
      compact: raw,
      code: raw
    };
  }

  const clean = raw.replace(/[\s\-]/g, '');
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(clean)) {
    const state = clean.slice(0, 2);
    const lga = clean.slice(2, 4);
    const district = clean.slice(4, 7);
    const area = clean.slice(7, 9);
    const unit = clean.slice(9, 11);

    const formatted = `${state}-${lga}-${district}-${area}-${unit}`;
    const display = `${state} ${lga} ${district} ${area} ${unit}`;

    return {
      isNdaps: true,
      isLegacy: false,
      raw: raw,
      formatted,
      display,
      compact: clean,
      code: formatted,
      segments: { state, lga, district, area, unit },
      stateInfo: NIGERIA_STATES[state] || null
    };
  }

  return null;
}

/**
 * Disassembles a digital alphanumeric postcode into its 5 structural segments.
 * Conforms to: GET https://api.postcode.gov.ng/v1/assembly/disassemble?code=...
 */
function disassemblePostcode(rawCode) {
  const normalized = normalizePostcode(rawCode);
  if (!normalized || !normalized.isNdaps) {
    throw new Error(`Invalid digital postcode for disassembly: '${rawCode}'. Format must be 11-12 characters: State(2)-LGA(2)-District(3)-Area(2)-Unit(2) (e.g. EK-01-A03-FK-01).`);
  }

  return {
    state: normalized.segments.state,
    lga: normalized.segments.lga,
    district: normalized.segments.district,
    area: normalized.segments.area,
    unit: normalized.segments.unit,
    postcode: normalized.formatted,
    display: normalized.display,
    compact: normalized.compact
  };
}

/**
 * Assembles a digital alphanumeric postcode from 5 individual administrative segments.
 * Conforms to: POST https://api.postcode.gov.ng/v1/assembly/assemble
 */
function assemblePostcode({ state, lga, district, area, unit }) {
  if (!state || !lga || !district || !area || !unit) {
    throw new Error('All 5 segments (state, lga, district, area, unit) are required for assembly.');
  }

  const s = state.toString().trim().toUpperCase();
  if (s.length !== 2 || !NIGERIA_STATES[s]) {
    throw new Error(`Invalid state code '${state}'. Must be a 2-letter Nigerian state/FCT code (e.g. FC, LA, EK, KN, RV).`);
  }

  const l = lga.toString().trim().padStart(2, '0').slice(-2);
  const d = district.toString().trim().toUpperCase().padStart(3, '0').slice(-3);
  const a = area.toString().trim().toUpperCase().slice(0, 2);
  const u = unit.toString().trim().padStart(2, '0').slice(-2);

  const compact = `${s}${l}${d}${a}${u}`;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{3}[A-Z]{2}\d{2}$/.test(compact)) {
    throw new Error('Assembled postcode segments do not conform to NDAPS specification.');
  }

  return {
    data: {
      postcode: `${s}-${l}-${d}-${a}-${u}`,
      display: `${s} ${l} ${d} ${a} ${u}`,
      compact: compact
    }
  };
}

/**
 * Queries the official external NIPOST Postcode API (docs.postcode.gov.ng).
 */
async function queryExternalNipostApi(code, level = 1) {
  const apiKey = process.env.POSTCODE_API_KEY || process.env.NIPOST_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const url = `https://api.postcode.gov.ng/v1/lookup?code=${encodeURIComponent(code)}&level=${level}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const resData = json.data || json;
      if (resData && (resData.valid === true || resData.administrative_address)) {
        return resData;
      }
    }
  } catch (err) {
    // Graceful fallback to local authoritative registry on network/timeout
  }
  return null;
}

/**
 * Official Lookup Endpoint Implementation (docs.postcode.gov.ng)
 * Conforms to: GET https://api.postcode.gov.ng/v1/lookup?code=...&level=1
 */
async function lookupPostcode(rawCode, level = 1) {
  const normalized = normalizePostcode(rawCode);
  if (!normalized) {
    return {
      data: {
        postcode: rawCode,
        valid: false,
        error: 'Invalid Nigerian postcode format. Please enter an 11-12 character digital postcode (e.g. EK-01-A03-FK-01) or a 6-digit code.'
      }
    };
  }

  // 1. Authoritative Database Cache Resolution FIRST (<5ms)
  const cached = await resolvePostcode(rawCode);
  if (cached && (cached.description || cached.state)) {
    return {
      data: {
        postcode: cached.ndaps_code || cached.postcode,
        valid: true,
        display: cached.display || cached.postcode,
        compact: cached.compact || cached.postcode,
        segments: cached.segments || (normalized.isNdaps ? normalized.segments : null),
        administrative_address: {
          state_name: (cached.state || 'Abuja (FCT)').toUpperCase(),
          lga_name: (cached.lga || 'Abuja Municipal').toUpperCase(),
          locality_name: (cached.neighbourhood || cached.district || 'Central').toUpperCase(),
          zone: (cached.zone || 'NORTH CENTRAL').toUpperCase()
        },
        recent_house_address: {
          recent: cached.description || `${cached.neighbourhood || cached.district || ''}, ${cached.state}`
        },
        building_use_status: 'residential',
        legacy_postcode: cached.legacy_postcode || cached.legacy_code || cached.postcode,
        coordinates: {
          lat: cached.lat,
          lng: cached.lng
        }
      }
    };
  }

  // 2. Query official external NIPOST API if key is available
  const externalData = await queryExternalNipostApi(normalized.formatted || normalized.compact, level);
  if (externalData && (externalData.valid === true || externalData.administrative_address)) {
    return { data: externalData };
  }

  // 3. Synthetic hierarchy fallback for any valid NDAPS code
  if (normalized.isNdaps) {
    const stateInfo = NIGERIA_STATES[normalized.segments.state] || { name: 'FEDERAL CAPITAL TERRITORY', zone: 'NORTH CENTRAL', lat: 9.0765, lng: 7.4985 };
    return {
      data: {
        postcode: normalized.formatted,
        valid: true,
        display: normalized.display,
        compact: normalized.compact,
        segments: normalized.segments,
        administrative_address: {
          state_name: stateInfo.name,
          lga_name: `LGA ${normalized.segments.lga}`,
          locality_name: `DISTRICT ${normalized.segments.district}`,
          zone: stateInfo.zone
        },
        recent_house_address: {
          recent: `${normalized.display}, ${stateInfo.name}`
        },
        building_use_status: 'residential',
        coordinates: {
          lat: stateInfo.lat,
          lng: stateInfo.lng
        }
      }
    };
  }

  return {
    data: {
      postcode: rawCode,
      valid: false,
      error: `Postcode '${rawCode}' not found in the national registry or cache.`
    }
  };
}

/**
 * Autocomplete Search Implementation (docs.postcode.gov.ng)
 * Conforms to: GET https://api.postcode.gov.ng/v1/search/autocomplete?q=...
 */
async function autocompletePostcodes(query) {
  if (!query || typeof query !== 'string') return { suggestions: [] };
  const q = query.trim().toUpperCase();

  // Try external NIPOST if configured
  const apiKey = process.env.POSTCODE_API_KEY || process.env.NIPOST_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`https://api.postcode.gov.ng/v1/search/autocomplete?q=${encodeURIComponent(q)}`, {
        headers: { 'Accept': 'application/json', 'X-API-Key': apiKey }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
          return data;
        }
      }
    } catch (e) {}
  }

  // Fallback to local authoritative PostGIS cache
  const cleanQ = q.replace(/[\s\-]/g, '');
  const res = await db.query(`
    SELECT postcode, state, lga, district, neighbourhood, description, ndaps_code, legacy_code, lat, lng
    FROM postcode_cache
    WHERE postcode ILIKE $1 
       OR ndaps_code ILIKE $1 
       OR legacy_code ILIKE $1 
       OR description ILIKE $2
       OR neighbourhood ILIKE $2
    ORDER BY postcode ASC
    LIMIT 10;
  `, [`%${cleanQ}%`, `%${q}%`]);

  const suggestions = res.rows.map(r => ({
    postcode: r.ndaps_code || r.postcode,
    legacy_postcode: r.legacy_code || r.postcode,
    description: r.description,
    state: r.state,
    lga: r.lga,
    neighbourhood: r.neighbourhood,
    lat: r.lat ? parseFloat(r.lat) : null,
    lng: r.lng ? parseFloat(r.lng) : null
  }));

  return { suggestions };
}

/**
 * Authoritative Internal Postcode Resolver used by Dropboxz platform:
 * Resolves both NDAPS Alphanumeric and 6-digit numeric postcodes.
 */
async function resolvePostcode(rawCode) {
  if (!rawCode) return null;
  const raw = rawCode.trim();
  const normalized = normalizePostcode(raw);
  if (!normalized) return null;

  const searchCodes = [
    raw.toUpperCase(),
    normalized.compact,
    normalized.formatted
  ].filter(Boolean);

  // 1. Search in PostgreSQL postcode_cache
  const cached = await db.query(`
    SELECT postcode, state, lga, district, neighbourhood, description, lat, lng, source, ndaps_code, legacy_code, zone
    FROM postcode_cache 
    WHERE postcode = ANY($1::varchar[])
       OR ndaps_code = ANY($1::varchar[])
       OR legacy_code = ANY($1::varchar[])
    LIMIT 1;
  `, [searchCodes]);

  if (cached.rows.length > 0) {
    const row = cached.rows[0];
    const ndapsCode = row.ndaps_code || (normalized.isNdaps ? normalized.formatted : null);
    const compactCode = normalized.isNdaps ? normalized.compact : (row.ndaps_code ? row.ndaps_code.replace(/[\s\-]/g, '') : null);

    const returnedPostcode = normalized.isNdaps ? (ndapsCode || row.postcode) : (normalized.raw || row.legacy_code || row.postcode);
    return {
      postcode: returnedPostcode,
      ndaps_code: ndapsCode,
      legacy_postcode: row.legacy_code || (normalized.isLegacy ? normalized.raw : null),
      display: normalized.isNdaps ? normalized.display : (ndapsCode ? ndapsCode.replace(/-/g, ' ') : row.postcode),
      compact: compactCode,
      segments: normalized.isNdaps ? normalized.segments : null,
      state: row.state || 'Abuja (FCT)',
      lga: row.lga || 'Abuja Municipal',
      district: row.district || '',
      neighbourhood: row.neighbourhood || '',
      description: row.description,
      zone: row.zone || 'NORTH CENTRAL',
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      source: row.source || 'LOCAL_CACHE'
    };
  }

  // 2. Query external official NIPOST API
  const externalResult = await queryExternalNipostApi(normalized.formatted || normalized.compact, 1);
  if (externalResult && externalResult.administrative_address) {
    const addr = externalResult.administrative_address;
    const resultObj = {
      postcode: externalResult.postcode || normalized.formatted,
      display: normalized.display,
      compact: normalized.compact,
      state: addr.state_name || 'Nigeria',
      lga: addr.lga_name || 'General LGA',
      district: addr.locality_name || '',
      neighbourhood: addr.locality_name || '',
      description: externalResult.recent_house_address?.recent || `${addr.locality_name}, ${addr.state_name}`,
      lat: externalResult.coordinates?.lat || 9.0765,
      lng: externalResult.coordinates?.lng || 7.4985,
      source: 'NIPOST_DIGITAL_POSTCODE'
    };

    try {
      await db.query(`
        INSERT INTO postcode_cache (postcode, state, lga, district, neighbourhood, description, lat, lng, source, ndaps_code, fetched_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $1, NOW())
        ON CONFLICT (postcode) DO UPDATE SET
          state = EXCLUDED.state,
          lga = EXCLUDED.lga,
          description = EXCLUDED.description;
      `, [
        resultObj.postcode,
        resultObj.state,
        resultObj.lga,
        resultObj.district,
        resultObj.neighbourhood,
        resultObj.description,
        resultObj.lat,
        resultObj.lng,
        resultObj.source
      ]);
    } catch (e) {
      console.warn('Error saving to postcode cache:', e.message);
    }

    return resultObj;
  }

  // 3. Fallback for valid NDAPS code when not in database & external unreachable
  if (normalized.isNdaps) {
    const stateInfo = NIGERIA_STATES[normalized.segments.state] || { name: 'FEDERAL CAPITAL TERRITORY', zone: 'NORTH CENTRAL', lat: 9.0765, lng: 7.4985 };
    const syntheticObj = {
      postcode: normalized.formatted,
      ndaps_code: normalized.formatted,
      legacy_postcode: null,
      display: normalized.display,
      compact: normalized.compact,
      segments: normalized.segments,
      state: stateInfo.name,
      lga: `LGA ${normalized.segments.lga}`,
      district: `District ${normalized.segments.district}`,
      neighbourhood: `Area ${normalized.segments.area}`,
      description: `${normalized.display}, ${stateInfo.name}`,
      zone: stateInfo.zone,
      lat: stateInfo.lat,
      lng: stateInfo.lng,
      source: 'NDAPS_SYNTHETIC'
    };

    // Cache asynchronously for subsequent lookups
    db.query(`
      INSERT INTO postcode_cache (postcode, state, lga, district, neighbourhood, description, lat, lng, source, ndaps_code, fetched_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $1, NOW())
      ON CONFLICT (postcode) DO NOTHING;
    `, [
      syntheticObj.postcode,
      syntheticObj.state,
      syntheticObj.lga,
      syntheticObj.district,
      syntheticObj.neighbourhood,
      syntheticObj.description,
      syntheticObj.lat,
      syntheticObj.lng,
      syntheticObj.source
    ]).catch(err => console.warn('Cache write notice:', err.message));

    return syntheticObj;
  }

  return null;
}

/**
 * Smart Unified Location & Postcode Resolver
 * Accepts either an official NIPOST Digital Postcode (e.g. FC-01-A03-FK-01)
 * OR a street address / neighbourhood / landmark (e.g. "Plot 112 Aminu Kano Crescent", "Jabi Lake Mall", "Victoria Island")
 */
async function resolveLocation(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim();
  if (q.length === 0) return null;

  // 1. If format matches a postcode, attempt standard authoritative resolution
  if (isValidPostcodeFormat(q)) {
    const pc = await resolvePostcode(q);
    if (pc) {
      let fullAddress = pc.description || '';
      if (!fullAddress || fullAddress === pc.state) {
        const parts = [
          pc.neighbourhood,
          pc.district,
          pc.lga,
          pc.state
        ].filter(Boolean);
        const uniqueParts = [...new Set(parts)];
        fullAddress = uniqueParts.length > 0 ? uniqueParts.join(', ') : (pc.state || 'Nigeria');
      }

      return {
        matched: true,
        type: 'POSTCODE',
        hasVerifiedPostcode: true,
        postcode: pc.postcode,
        ndaps_code: pc.ndaps_code || pc.postcode,
        legacy_postcode: pc.legacy_postcode || null,
        display: pc.display || pc.postcode,
        address: fullAddress,
        full_address: fullAddress,
        neighbourhood: pc.neighbourhood || '',
        lga: pc.lga || '',
        state: pc.state || '',
        lat: pc.lat ? parseFloat(pc.lat) : null,
        lng: pc.lng ? parseFloat(pc.lng) : null,
        autoPopulateAddress: true,
        source: pc.source || 'NIPOST_NDAPS'
      };
    }
  }

  // 2. Search local postcode_cache by description, neighbourhood, LGA, state, or partial postcode
  const cleanQ = q.replace(/[\s\-]/g, '');
  const dbMatch = await db.query(`
    SELECT postcode, state, lga, district, neighbourhood, description, lat, lng, source, ndaps_code, legacy_code, zone
    FROM postcode_cache
    WHERE description ILIKE $1
       OR neighbourhood ILIKE $1
       OR lga ILIKE $1
       OR postcode ILIKE $2
       OR ndaps_code ILIKE $2
       OR legacy_code ILIKE $2
    ORDER BY 
      CASE 
        WHEN description ILIKE $1 THEN 1
        WHEN neighbourhood ILIKE $1 THEN 2
        ELSE 3
      END ASC
    LIMIT 1;
  `, [`%${q}%`, `%${cleanQ}%`]);

  if (dbMatch.rows.length > 0) {
    const row = dbMatch.rows[0];
    const fullAddress = row.description || `${row.neighbourhood ? row.neighbourhood + ', ' : ''}${row.lga ? row.lga + ', ' : ''}${row.state}`;
    return {
      matched: true,
      type: 'ADDRESS_MATCH',
      hasVerifiedPostcode: true,
      postcode: row.ndaps_code || row.postcode,
      ndaps_code: row.ndaps_code || row.postcode,
      legacy_postcode: row.legacy_code || row.postcode,
      display: row.ndaps_code || row.postcode,
      address: fullAddress,
      full_address: fullAddress,
      neighbourhood: row.neighbourhood || '',
      lga: row.lga || '',
      state: row.state || '',
      lat: row.lat ? parseFloat(row.lat) : null,
      lng: row.lng ? parseFloat(row.lng) : null,
      autoPopulateAddress: false,
      source: 'LOCAL_REGISTRY'
    };
  }

  // 3. Fallback: An address was entered, but NO verified postcode attached to this address is in the database!
  // Attempt OpenStreetMap Nominatim for fallback coordinates if possible
  let osmResult = null;
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Nigeria')}&countrycodes=ng&format=json&limit=1`;
    const osmRes = await fetch(osmUrl, {
      headers: { 'User-Agent': 'Hotbox-Logistics/1.0 (support@hotboxng.com)' }
    });
    if (osmRes.ok) {
      const results = await osmRes.json();
      if (Array.isArray(results) && results.length > 0) {
        osmResult = results[0];
      }
    }
  } catch (err) {
    // Non-fatal if external network is unavailable
  }

  return {
    matched: Boolean(osmResult),
    type: 'NO_POSTCODE_FOUND',
    hasVerifiedPostcode: false,
    postcode: null,
    ndaps_code: null,
    legacy_postcode: null,
    display: null,
    address: osmResult?.display_name || q,
    full_address: osmResult?.display_name || q,
    neighbourhood: osmResult?.name || q,
    lga: '',
    state: 'Nigeria',
    lat: osmResult ? parseFloat(osmResult.lat) : null,
    lng: osmResult ? parseFloat(osmResult.lon) : null,
    autoPopulateAddress: false,
    source: osmResult ? 'OSM_GEOCODER' : 'USER_INPUT',
    message: 'No verified postcode found for this address, please request for postcode from NIPOST.',
    nipostUrl: 'https://postcode.gov.ng/find'
  };
}

module.exports = {
  NIGERIA_STATES,
  isValidPostcodeFormat,
  normalizePostcode,
  disassemblePostcode,
  assemblePostcode,
  lookupPostcode,
  autocompletePostcodes,
  resolvePostcode,
  resolveLocation,
  queryExternalNipostApi
};
