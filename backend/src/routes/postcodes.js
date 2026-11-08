const express = require('express');
const router = express.Router();
const db = require('../config/db');
const {
  isValidPostcodeFormat,
  normalizePostcode,
  disassemblePostcode,
  assemblePostcode,
  lookupPostcode,
  autocompletePostcodes,
  resolvePostcode,
  resolveLocation
} = require('../services/postcodeService');

/**
 * 1. OFFICIAL NIPOST LOOKUP ENDPOINT (docs.postcode.gov.ng)
 * GET /api/v1/postcodes/lookup?code=EK-01-A03-FK-01&level=1
 */
router.get('/lookup', async (req, res) => {
  const { code, level = 1 } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Query parameter "code" is required (e.g. ?code=EK-01-A03-FK-01&level=1).' });
  }

  try {
    const result = await lookupPostcode(code, parseInt(level) || 1);
    if (!result.data || !result.data.valid) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Lookup failed: ' + err.message });
  }
});

/**
 * 2. OFFICIAL NIPOST DISASSEMBLY ENDPOINT (docs.postcode.gov.ng)
 * GET /api/v1/postcodes/assembly/disassemble?code=EK01A03FK01
 */
router.get('/assembly/disassemble', (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Query parameter "code" is required.' });
  }

  try {
    const disassembled = disassemblePostcode(code);
    res.json({ data: disassembled });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * 3. OFFICIAL NIPOST ASSEMBLY ENDPOINT (docs.postcode.gov.ng)
 * POST /api/v1/postcodes/assembly/assemble
 * Body: { state: "ek", lga: "1", district: "a03", area: "fk", unit: "1" }
 */
router.post('/assembly/assemble', (req, res) => {
  const { state, lga, district, area, unit } = req.body;
  try {
    const assembled = assemblePostcode({ state, lga, district, area, unit });
    res.json(assembled);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * 4. OFFICIAL NIPOST AUTOCOMPLETE SEARCH ENDPOINT (docs.postcode.gov.ng)
 * GET /api/v1/postcodes/search/autocomplete?q=EK01
 */
router.get('/search/autocomplete', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json({ suggestions: [] });
  }

  try {
    const results = await autocompletePostcodes(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Autocomplete failed: ' + err.message });
  }
});

/**
 * UNIFIED ADDRESS & DIGITAL POSTCODE RESOLVER
 * GET /api/v1/postcodes/resolve-location?q=...
 * Supports:
 * - Digital Postcodes (e.g. FC-01-A03-FK-01) -> auto-populates address
 * - Street addresses, neighbourhoods, landmarks -> resolves lat/lng & matching postcode
 */
router.get('/resolve-location', async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query parameter "q" (address or digital postcode) is required.' });
  }

  try {
    const result = await resolveLocation(q.trim());
    if (!result) {
      return res.json({
        matched: false,
        hasVerifiedPostcode: false,
        postcode: null,
        address: q.trim(),
        full_address: q.trim(),
        message: 'No verified postcode found for this address, please request for postcode from NIPOST.',
        nipostUrl: 'https://postcode.gov.ng/find'
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve location: ' + err.message });
  }
});

/**
 * 5. LIST SEEDED POSTCODES
 * GET /api/v1/postcodes?search=...&state=...
 */
router.get('/', async (req, res) => {
  const { search, state } = req.query;
  try {
    let query = 'SELECT postcode, ndaps_code, legacy_code, state, lga, district, neighbourhood, description, zone, lat, lng, source FROM postcode_cache';
    const params = [];
    if (search) {
      params.push(`%${search.trim()}%`);
      query += ' WHERE postcode ILIKE $1 OR ndaps_code ILIKE $1 OR description ILIKE $1 OR lga ILIKE $1 OR neighbourhood ILIKE $1';
    } else if (state) {
      params.push(`%${state.trim()}%`);
      query += ' WHERE state ILIKE $1';
    }
    query += ' ORDER BY state, lga, postcode ASC LIMIT 50';

    const result = await db.query(query, params);
    res.json({ postcodes: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. TRACK A ADDRESS VERIFICATION
 * POST /api/v1/postcodes/verify-address
 */
router.post('/verify-address', async (req, res) => {
  const { postcode, streetAddress, buildingNumber, landmark, state, lga } = req.body;
  if (!postcode || !streetAddress) {
    return res.status(400).json({ error: 'Postcode and street address are required.' });
  }

  try {
    const resolved = await resolvePostcode(postcode);
    const isValid = !!resolved;

    res.json({
      verified: isValid,
      track: 'TRACK_A_ADDRESS',
      evidence: {
        postcode: resolved?.postcode || postcode,
        ndaps_code: resolved?.ndaps_code || null,
        legacy_postcode: resolved?.legacy_postcode || null,
        formattedAddress: `${buildingNumber ? buildingNumber + ', ' : ''}${streetAddress}, ${lga || resolved?.lga || ''}, ${state || resolved?.state || ''}`,
        coordinates: resolved ? { lat: resolved.lat, lng: resolved.lng } : null,
        provider: resolved ? resolved.source : 'MANUAL_REVIEW_REQUIRED',
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. SINGLE POSTCODE RESOLUTION (Legacy & NDAPS path)
 * GET /api/v1/postcodes/:code
 */
router.get('/:code', async (req, res) => {
  const rawCode = req.params.code;
  if (!isValidPostcodeFormat(rawCode)) {
    return res.status(400).json({
      error: 'Invalid Nigerian postcode format. Please enter an 11-12 character digital postcode (e.g. EK-01-A03-FK-01) or a 6-digit numeric code.'
    });
  }

  try {
    const data = await resolvePostcode(rawCode);
    if (!data) {
      return res.status(404).json({
        error: `Postcode '${rawCode}' not found in the national registry or cache.`,
        recoveryPath: 'https://postcode.gov.ng/'
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Postcode resolution failed: ' + err.message });
  }
});

module.exports = router;
