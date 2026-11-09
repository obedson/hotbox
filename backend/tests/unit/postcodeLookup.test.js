const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const {
  lookupPostcode,
  autocompletePostcodes,
  resolvePostcode,
  resolveLocation
} = require('../../src/services/postcodeService');

const originalQuery = db.query;
const originalFetch = global.fetch;
const originalPostcodeKey = process.env.POSTCODE_API_KEY;
const originalNipostKey = process.env.NIPOST_API_KEY;

after(() => {
  db.query = originalQuery;
  global.fetch = originalFetch;
  if (originalPostcodeKey === undefined) delete process.env.POSTCODE_API_KEY;
  else process.env.POSTCODE_API_KEY = originalPostcodeKey;
  if (originalNipostKey === undefined) delete process.env.NIPOST_API_KEY;
  else process.env.NIPOST_API_KEY = originalNipostKey;
});

function disableExternalApi() {
  delete process.env.POSTCODE_API_KEY;
  delete process.env.NIPOST_API_KEY;
}

function cachedRow(overrides = {}) {
  return {
    postcode: 'FC-01-A03-FK-01',
    ndaps_code: 'FC-01-A03-FK-01',
    legacy_code: '900211',
    state: 'FEDERAL CAPITAL TERRITORY',
    lga: 'ABUJA MUNICIPAL',
    district: 'A03',
    neighbourhood: 'WUSE',
    description: 'WUSE 2, ABUJA',
    zone: 'NORTH CENTRAL',
    lat: '9.0765',
    lng: '7.4985',
    source: 'LOCAL_CACHE',
    ...overrides
  };
}

test('lookupPostcode rejects an invalid format without querying the database', async () => {
  disableExternalApi();
  let queried = false;
  db.query = async () => {
    queried = true;
    return { rows: [] };
  };

  const result = await lookupPostcode('12345');

  assert.equal(result.data.valid, false);
  assert.equal(queried, false);
});

test('lookupPostcode returns a cached resolution', async () => {
  disableExternalApi();
  db.query = async () => ({ rows: [cachedRow()] });

  const result = await lookupPostcode('FC-01-A03-FK-01');

  assert.equal(result.data.valid, true);
  assert.equal(result.data.postcode, 'FC-01-A03-FK-01');
  assert.equal(result.data.administrative_address.state_name, 'FEDERAL CAPITAL TERRITORY');
});

test('lookupPostcode synthesizes a valid NDAPS result when the cache misses', async () => {
  disableExternalApi();
  db.query = async () => ({ rows: [] });

  const result = await lookupPostcode('FC-01-A03-FK-01');

  assert.equal(result.data.valid, true);
  assert.equal(result.data.postcode, 'FC-01-A03-FK-01');
  assert.equal(result.data.administrative_address.zone, 'NORTH CENTRAL');
});

test('autocompletePostcodes returns an empty list for a blank query', async () => {
  disableExternalApi();
  let queried = false;
  db.query = async () => {
    queried = true;
    return { rows: [] };
  };

  assert.deepEqual(await autocompletePostcodes(''), { suggestions: [] });
  assert.deepEqual(await autocompletePostcodes(null), { suggestions: [] });
  assert.equal(queried, false);
});

test('autocompletePostcodes falls back to the local cache', async () => {
  disableExternalApi();
  db.query = async (sql, params) => {
    assert.match(sql, /FROM postcode_cache/);
    assert.equal(params[0], '%WUSE%');
    return { rows: [cachedRow()] };
  };

  const result = await autocompletePostcodes('wuse');

  assert.equal(result.suggestions.length, 1);
  assert.equal(result.suggestions[0].postcode, 'FC-01-A03-FK-01');
  assert.equal(result.suggestions[0].lat, 9.0765);
});

test('resolvePostcode returns null for empty or invalid input', async () => {
  disableExternalApi();
  let queried = false;
  db.query = async () => {
    queried = true;
    return { rows: [] };
  };

  assert.equal(await resolvePostcode(''), null);
  assert.equal(await resolvePostcode('12345'), null);
  assert.equal(queried, false);
});

test('resolvePostcode returns a cached row', async () => {
  disableExternalApi();
  db.query = async (sql) => {
    assert.match(sql, /FROM postcode_cache/);
    return { rows: [cachedRow()] };
  };

  const result = await resolvePostcode('FC-01-A03-FK-01');

  assert.equal(result.ndaps_code, 'FC-01-A03-FK-01');
  assert.equal(result.state, 'FEDERAL CAPITAL TERRITORY');
  assert.equal(result.lat, 9.0765);
  assert.equal(result.source, 'LOCAL_CACHE');
});

test('resolvePostcode uses the external NIPOST API and caches the result', async () => {
  process.env.POSTCODE_API_KEY = 'test-key';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        valid: true,
        postcode: 'FC-01-A03-FK-01',
        administrative_address: {
          state_name: 'FEDERAL CAPITAL TERRITORY',
          lga_name: 'ABUJA MUNICIPAL',
          locality_name: 'WUSE'
        },
        coordinates: { lat: 9.0765, lng: 7.4985 }
      }
    })
  });

  let insertSql = null;
  db.query = async (sql) => {
    if (sql.includes('INSERT INTO postcode_cache')) {
      insertSql = sql;
      return { rows: [] };
    }
    return { rows: [] };
  };

  const result = await resolvePostcode('FC-01-A03-FK-01');

  assert.equal(result.source, 'NIPOST_DIGITAL_POSTCODE');
  assert.equal(result.state, 'FEDERAL CAPITAL TERRITORY');
  assert.ok(insertSql, 'expected the external result to be cached');
});

test('resolvePostcode synthesizes an NDAPS result when unresolved', async () => {
  disableExternalApi();
  let insertSql = null;
  db.query = async (sql) => {
    if (sql.includes('INSERT INTO postcode_cache')) {
      insertSql = sql;
      return { rows: [] };
    }
    return { rows: [] };
  };

  const result = await resolvePostcode('FC-01-A03-FK-01');

  assert.equal(result.source, 'NDAPS_SYNTHETIC');
  assert.equal(result.postcode, 'FC-01-A03-FK-01');
  assert.ok(insertSql, 'expected the synthetic result to be cached');
});

test('resolveLocation resolves a postcode', async () => {
  disableExternalApi();
  db.query = async () => ({ rows: [cachedRow()] });

  const result = await resolveLocation('FC-01-A03-FK-01');

  assert.equal(result.type, 'POSTCODE');
  assert.equal(result.postcode, 'FC-01-A03-FK-01');
  assert.equal(result.hasVerifiedPostcode, true);
});

test('resolveLocation matches an address from the local registry', async () => {
  disableExternalApi();
  db.query = async (sql) => {
    assert.match(sql, /FROM postcode_cache/);
    return { rows: [cachedRow()] };
  };

  const result = await resolveLocation('WUSE 2');

  assert.equal(result.type, 'ADDRESS_MATCH');
  assert.equal(result.address, 'WUSE 2, ABUJA');
  assert.equal(result.source, 'LOCAL_REGISTRY');
});

test('resolveLocation reports no postcode when nothing matches', async () => {
  disableExternalApi();
  db.query = async () => ({ rows: [] });
  global.fetch = async () => ({ ok: true, json: async () => [] });

  const result = await resolveLocation('Unknown Place Nowhere');

  assert.equal(result.matched, false);
  assert.equal(result.type, 'NO_POSTCODE_FOUND');
  assert.equal(result.hasVerifiedPostcode, false);
});
