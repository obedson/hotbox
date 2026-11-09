const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const {
  NIGERIA_STATES,
  isValidPostcodeFormat,
  normalizePostcode,
  disassemblePostcode,
  resolvePostcode,
  queryExternalNipostApi
} = require('../../services/postcodeService');
// ============================================================================
// POSTCODES & SERVICE AREAS DIRECTORY & CATCHMENT
// ============================================================================

// GET /api/v1/operations/postcodes/directory
router.get('/postcodes/directory', async (req, res) => {
  try {
    const { search, state, status } = req.query;

    // 1. Fetch postcodes from postcode_cache
    let query = `
      SELECT 
        p.postcode,
        p.ndaps_code,
        p.legacy_code,
        p.state,
        p.lga,
        p.district,
        p.neighbourhood,
        p.description,
        p.zone,
        p.lat,
        p.lng,
        p.source
      FROM postcode_cache p
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (
        p.postcode ILIKE $${params.length} OR 
        p.ndaps_code ILIKE $${params.length} OR 
        p.legacy_code ILIKE $${params.length} OR 
        p.neighbourhood ILIKE $${params.length} OR 
        p.lga ILIKE $${params.length} OR 
        p.state ILIKE $${params.length} OR
        p.district ILIKE $${params.length}
      )`;
    }

    if (state && state !== 'ALL') {
      params.push(state.trim());
      query += ` AND p.state = $${params.length}`;
    }

    query += ` ORDER BY p.state ASC, p.lga ASC, p.postcode ASC`;

    const postcodeRes = await db.query(query, params);

    // 2. Fetch all accredited hubs to match with postcodes
    const hubsRes = await db.query(`
      SELECT id, business_name, postcode, state, lga, lat, lng, capacity, current_load, status, is_accepting_parcels
      FROM hubs
    `);
    const allHubs = hubsRes.rows;

    // 3. Fetch all active riders with operational_postcodes
    const ridersRes = await db.query(`
      SELECT r.id, r.plate_number, r.vehicle_type, r.operational_postcodes, r.is_active, r.is_available, u.name as rider_name
      FROM riders r
      JOIN users u ON r.user_id = u.id
    `);
    const allRiders = ridersRes.rows;

    // 4. Fetch shipment volume mapped to postcodes
    const shipmentsRes = await db.query(`
      SELECT sender_postcode, recipient_postcode, count(*) as count
      FROM shipments
      GROUP BY sender_postcode, recipient_postcode
    `);
    
    // Map shipment counts
    const shipmentCountMap = {};
    for (const row of shipmentsRes.rows) {
      if (row.sender_postcode) {
        shipmentCountMap[row.sender_postcode] = (shipmentCountMap[row.sender_postcode] || 0) + parseInt(row.count, 10);
      }
      if (row.recipient_postcode && row.recipient_postcode !== row.sender_postcode) {
        shipmentCountMap[row.recipient_postcode] = (shipmentCountMap[row.recipient_postcode] || 0) + parseInt(row.count, 10);
      }
    }

    // Helper distance calculation (Haversine in km)
    function getDistanceKm(lat1, lon1, lat2, lon2) {
      if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // Deduplicate postcodes by canonical NDAPS code or formatted postcode
    const seenPostcodes = new Set();
    const enrichedList = [];

    for (const p of postcodeRes.rows) {
      const canonicalCode = p.ndaps_code || p.postcode;
      // Skip compact duplicate if already processed
      const cleanKey = (canonicalCode || '').replace(/[\s\-]/g, '');
      if (seenPostcodes.has(cleanKey)) continue;
      seenPostcodes.add(cleanKey);

      const pLat = parseFloat(p.lat);
      const pLng = parseFloat(p.lng);

      // Match hubs directly by postcode or proximity within 5.0 km
      const matchingHubs = allHubs.filter(h => {
        if (h.postcode === canonicalCode || h.postcode === p.postcode || h.postcode === p.legacy_code) return true;
        const dist = getDistanceKm(pLat, pLng, parseFloat(h.lat), parseFloat(h.lng));
        return dist <= 5.0;
      }).map(h => ({
        id: h.id,
        business_name: h.business_name,
        postcode: h.postcode,
        status: h.status,
        capacity: h.capacity,
        current_load: h.current_load,
        is_accepting_parcels: h.is_accepting_parcels,
        distance_km: Math.round(getDistanceKm(pLat, pLng, parseFloat(h.lat), parseFloat(h.lng)) * 10) / 10
      }));

      // Match riders covering this postcode
      const matchingRiders = allRiders.filter(r => {
        const ops = r.operational_postcodes || [];
        return ops.includes(canonicalCode) || ops.includes(p.postcode) || ops.includes(p.legacy_code);
      }).map(r => ({
        id: r.id,
        name: r.rider_name,
        plate_number: r.plate_number,
        vehicle_type: r.vehicle_type,
        is_available: r.is_available
      }));

      // Shipment count for this postcode
      const routedCount = (shipmentCountMap[canonicalCode] || 0) + 
                          (p.legacy_code && p.legacy_code !== canonicalCode ? (shipmentCountMap[p.legacy_code] || 0) : 0);

      // Determine service status
      let serviceStatus = 'EXPANSION_ZONE';
      if (matchingHubs.length > 0 && matchingRiders.length > 0) {
        serviceStatus = 'ACTIVE_SERVICED';
      } else if (matchingHubs.length > 0) {
        serviceStatus = 'HUB_CATCHMENT';
      } else if (matchingRiders.length > 0) {
        serviceStatus = 'RIDER_COVERED';
      }

      // Delivery SLA Tier
      let tier = 'TIER_1_CORE';
      if (serviceStatus === 'EXPANSION_ZONE') tier = 'EXPANSION_NEXT_DAY';
      else if (matchingHubs.length > 0) tier = 'SAME_DAY_COMMUNITY';

      enrichedList.push({
        ...p,
        canonical_postcode: canonicalCode,
        hub_count: matchingHubs.length,
        rider_count: matchingRiders.length,
        hubs: matchingHubs,
        riders: matchingRiders,
        shipments_routed: routedCount,
        service_status: serviceStatus,
        tier
      });
    }

    // Filter by status if requested
    let filteredList = enrichedList;
    if (status && status !== 'ALL') {
      if (status === 'SERVICED') {
        filteredList = enrichedList.filter(item => item.service_status === 'ACTIVE_SERVICED' || item.service_status === 'RIDER_COVERED');
      } else if (status === 'HUB_CATCHMENT') {
        filteredList = enrichedList.filter(item => item.hub_count > 0);
      } else if (status === 'EXPANSION') {
        filteredList = enrichedList.filter(item => item.service_status === 'EXPANSION_ZONE');
      }
    }

    // Compute network summary counts
    const totalPostcodes = enrichedList.length;
    const servicedCount = enrichedList.filter(item => item.service_status !== 'EXPANSION_ZONE').length;
    const hubCatchmentCount = enrichedList.filter(item => item.hub_count > 0).length;
    const expansionCount = enrichedList.filter(item => item.service_status === 'EXPANSION_ZONE').length;
    const totalShipments = enrichedList.reduce((acc, cur) => acc + cur.shipments_routed, 0);

    // Compute digital adoption rate (shipments referencing alphanumeric postcodes vs total)
    const totalAllShipmentsRes = await db.query("SELECT count(*) as total, count(*) FILTER (WHERE sender_postcode ~* '^[A-Z]{2}-') as digital_sender FROM shipments");
    const totalAll = parseInt(totalAllShipmentsRes.rows[0].total, 10) || 1;
    const digitalCount = parseInt(totalAllShipmentsRes.rows[0].digital_sender, 10) || 0;
    const adoptionRatePct = ((digitalCount / totalAll) * 100).toFixed(1);

    // Distinct states
    const statesRes = await db.query('SELECT DISTINCT state FROM postcode_cache WHERE state IS NOT NULL ORDER BY state ASC');

    res.json({
      postcodes: filteredList,
      total: filteredList.length,
      counts: {
        total_registered: totalPostcodes,
        serviced_postcodes: servicedCount,
        hub_catchments: hubCatchmentCount,
        expansion_zones: expansionCount,
        total_shipments_routed: totalShipments,
        adoption_rate_pct: adoptionRatePct,
        active_hubs_count: allHubs.filter(h => h.status === 'accredited').length,
        active_riders_count: allRiders.filter(r => r.is_active).length
      },
      states: statesRes.rows.map(r => r.state)
    });
  } catch (err) {
    console.error('Operations postcodes directory error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/postcodes/:code/catchment
router.get('/postcodes/:code/catchment', async (req, res) => {
  try {
    const { code } = req.params;
    const normalized = normalizePostcode(code);

    if (!normalized) {
      return res.status(400).json({
        error: `Invalid Nigerian postcode format '${code}'. Must be an 11-12 character digital NDAPS postcode (e.g. FC-01-A05-FK-05) or a 6-digit code.`
      });
    }

    const stateCode = normalized.segments?.state;
    const stateInfo = stateCode ? NIGERIA_STATES[stateCode] : null;
    if (normalized.isNdaps && !stateInfo) {
      return res.status(400).json({
        error: `Invalid Nigerian state prefix '${stateCode}'. Not a recognized Nigerian State or FCT.`
      });
    }

    // Fetch matching row in postcode_cache
    let postRow = null;
    const exactRes = await db.query('SELECT * FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 LIMIT 1', [code]);
    if (exactRes.rows.length > 0) {
      postRow = exactRes.rows[0];
    } else if (normalized) {
      const normRes = await db.query('SELECT * FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 LIMIT 1', [normalized.formatted]);
      if (normRes.rows.length > 0) postRow = normRes.rows[0];
    }

    // Disassembly segments
    let segments = null;
    try {
      segments = disassemblePostcode(code);
    } catch (e) {
      if (normalized && normalized.segments) segments = normalized.segments;
    }

    // If not in local cache, check official external NIPOST API (if configured)
    if (!postRow) {
      try {
        const externalData = await queryExternalNipostApi(normalized.formatted || normalized.compact, 1);
        if (externalData && externalData.valid) {
          postRow = {
            postcode: externalData.postcode || normalized.formatted,
            ndaps_code: externalData.postcode || normalized.formatted,
            state: externalData.administrative_address?.state_name || stateInfo?.name || 'NIGERIA',
            lga: externalData.administrative_address?.lga_name || `LGA ${normalized.segments?.lga}`,
            district: externalData.administrative_address?.locality_name || `District ${normalized.segments?.district}`,
            neighbourhood: externalData.recent_house_address?.recent || `Area ${normalized.segments?.area}`,
            description: externalData.recent_house_address?.recent || `${normalized.formatted}`,
            zone: externalData.administrative_address?.zone || stateInfo?.zone || 'NATIONAL',
            lat: externalData.coordinates?.lat || stateInfo?.lat || 9.0765,
            lng: externalData.coordinates?.lng || stateInfo?.lng || 7.4985,
            source: 'NIPOST_OFFICIAL_API'
          };
        }
      } catch (e) {
        // Fall back gracefully
      }
    }

    // Dynamic resolution if code conforms to NDAPS standard but not pre-cached
    if (!postRow) {
      const stateName = stateInfo ? stateInfo.name : 'NIGERIA';
      const lat = stateInfo ? stateInfo.lat : 9.0765;
      const lng = stateInfo ? stateInfo.lng : 7.4985;
      postRow = {
        postcode: normalized.formatted,
        ndaps_code: normalized.formatted,
        state: stateName,
        lga: `LGA ${normalized.segments.lga}`,
        district: `District ${normalized.segments.district}`,
        neighbourhood: `Area ${normalized.segments.area}`,
        description: `${normalized.formatted}, ${stateName}`,
        zone: stateInfo ? stateInfo.zone : 'NATIONAL',
        lat,
        lng,
        source: 'NDAPS_VERIFIED'
      };
    }

    const lat = parseFloat(postRow.lat) || 9.0765;
    const lng = parseFloat(postRow.lng) || 7.4985;

    // Proximity Hubs (up to 20km)
    const hubsRes = await db.query(`
      SELECT 
        id, business_name, postcode, address_text, neighbourhood, lga, state,
        capacity, current_load, rating, is_accepting_parcels, status, lat, lng,
        ( 6371 * acos( LEAST(1.0, GREATEST(-1.0, cos( radians($1) ) * cos( radians( lat ) ) * cos( radians( lng ) - radians($2) ) + sin( radians($1) ) * sin( radians( lat ) ) )) ) ) AS distance_km
      FROM hubs
      WHERE status = 'accredited'
      ORDER BY distance_km ASC
      LIMIT 6
    `, [lat, lng]);

    // Assigned Riders
    const canonicalCode = postRow ? (postRow.ndaps_code || postRow.postcode) : code;
    const ridersRes = await db.query(`
      SELECT r.id, r.plate_number, r.vehicle_type, r.is_available, r.rating, r.total_deliveries, u.name, u.phone, c.company_name
      FROM riders r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN courier_companies c ON r.courier_id = c.id
      WHERE r.operational_postcodes @> ARRAY[$1]::text[] OR r.operational_postcodes @> ARRAY[$2]::text[]
    `, [code, canonicalCode]);

    // Recent shipments in this zone
    const shipmentsRes = await db.query(`
      SELECT id, tracking_code, service_type, status, sender_name, recipient_name, created_at
      FROM shipments
      WHERE sender_postcode = $1 OR recipient_postcode = $1 OR sender_postcode = $2 OR recipient_postcode = $2
      ORDER BY created_at DESC
      LIMIT 5
    `, [code, canonicalCode]);

    res.json({
      postcode: postRow,
      segments,
      nearby_hubs: hubsRes.rows.map(h => ({
        ...h,
        distance_km: Math.round(parseFloat(h.distance_km || 0) * 10) / 10
      })),
      assigned_riders: ridersRes.rows,
      recent_shipments: shipmentsRes.rows
    });
  } catch (err) {
    console.error('Postcode catchment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/postcodes/register (Add or Sync NDAPS Postcode)
router.post('/postcodes/register', async (req, res) => {
  try {
    const { postcode, state, lga, district, neighbourhood, description, lat, lng, legacy_code } = req.body;

    if (!postcode || !state || !lga) {
      return res.status(400).json({ error: 'Postcode, State, and LGA are required fields.' });
    }

    if (!isValidPostcodeFormat(postcode)) {
      return res.status(400).json({
        error: `Invalid Nigerian postcode format: '${postcode}'. Must be official 5-segment NDAPS code (e.g. FC-01-A03-FK-01) or 6-digit numeric.`
      });
    }

    const normalized = normalizePostcode(postcode);
    const canonicalCode = normalized ? normalized.formatted : postcode.trim().toUpperCase();
    const finalLat = parseFloat(lat) || 9.0765;
    const finalLng = parseFloat(lng) || 7.4985;
    const finalDesc = description || `${neighbourhood || district || lga}, ${lga}, ${state}`;

    const upsertRes = await db.query(`
      INSERT INTO postcode_cache (
        postcode, ndaps_code, legacy_code, state, lga, district, neighbourhood,
        description, lat, lng, source, fetched_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OPS_ADMIN_REGISTERED', NOW())
      ON CONFLICT (postcode) DO UPDATE SET
        ndaps_code = EXCLUDED.ndaps_code,
        legacy_code = COALESCE(EXCLUDED.legacy_code, postcode_cache.legacy_code),
        state = EXCLUDED.state,
        lga = EXCLUDED.lga,
        district = EXCLUDED.district,
        neighbourhood = EXCLUDED.neighbourhood,
        description = EXCLUDED.description,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        fetched_at = NOW()
      RETURNING *
    `, [
      canonicalCode,
      canonicalCode,
      legacy_code || null,
      state,
      lga,
      district || lga,
      neighbourhood || district || lga,
      finalDesc,
      finalLat,
      finalLng
    ]);

    // Record audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'POSTCODE_REGISTERED', 'postcode', gen_random_uuid(), $2)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      JSON.stringify({
        postcode: canonicalCode,
        state,
        lga,
        registeredBy: 'ops_admin'
      })
    ]);

    res.json({
      success: true,
      postcode: upsertRes.rows[0],
      message: `NDAPS digital postcode ${canonicalCode} successfully registered to national directory.`
    });
  } catch (err) {
    console.error('Register postcode error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
