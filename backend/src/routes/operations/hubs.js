const express = require('express');
const router = express.Router();
const db = require('../../config/db');
// POST /api/v1/operations/hubs/seed-ndaps (Enforce NDAPS Alphanumeric Postcodes & Bays)
router.post('/hubs/seed-ndaps', async (req, res) => {
  try {
    const ownerIbrahim = 'a0000000-0000-0000-0000-000000000003';
    const ownerChidi = 'a0000000-0000-0000-0000-000000000004';
    const ownerAmina = 'a0000000-0000-0000-0000-000000000007';

    await db.query(`
      INSERT INTO users (id, phone, name, email, role, is_phone_verified, is_email_verified)
      VALUES ($1, '+2348033334445', 'Amina Bello', 'amina.bello@hotbox.ng', 'hub_owner', TRUE, TRUE)
      ON CONFLICT (id) DO UPDATE SET role = 'hub_owner'
    `, [ownerAmina]);

    const hubsList = [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        ownerId: ownerIbrahim,
        name: 'Wuse 2 Express Mart & Hub',
        cac: 'CAC-BN-2918402',
        phone: '+2348031112223',
        email: 'wuse2.hub@hotbox.ng',
        postcode: 'FC-01-A03-FK-01',
        addressText: 'Plot 10 Emeka Anyaoku Street, Wuse 2, Abuja',
        neighbourhood: 'Wuse 2',
        lga: 'Abuja Municipal',
        state: 'Federal Capital Territory',
        lat: 9.0765,
        lng: 7.4985,
        hours: '08:00 - 20:00',
        capacity: 60,
        currentLoad: 12,
        status: 'accredited',
        rating: 4.85,
        security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage', 'burglar_proof']),
        accepting: true
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        ownerId: ownerChidi,
        name: 'Banex Plaza Gadgets & Hub',
        cac: 'CAC-BN-1849201',
        phone: '+2348034445566',
        email: 'banex.hub@hotbox.ng',
        postcode: 'FC-01-A02-FK-02',
        addressText: 'Suite B12, Banex Plaza, Aminu Kano Crescent, Wuse 2',
        neighbourhood: 'Wuse 2',
        lga: 'Abuja Municipal',
        state: 'Federal Capital Territory',
        lat: 9.0820,
        lng: 7.4790,
        hours: '09:00 - 19:30',
        capacity: 40,
        currentLoad: 8,
        status: 'accredited',
        rating: 4.90,
        security: JSON.stringify(['cctv', 'locked_storage', 'fire_extinguisher']),
        accepting: true
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        ownerId: ownerAmina,
        name: 'Jabi Lakeside Community Hub',
        cac: 'CAC-BN-3920184',
        phone: '+2348033334445',
        email: 'jabi.hub@hotbox.ng',
        postcode: 'FC-01-C05-JB-01',
        addressText: 'Plot 224 Jabi Lake Boulevard, Jabi District',
        neighbourhood: 'Jabi',
        lga: 'Abuja Municipal',
        state: 'Federal Capital Territory',
        lat: 9.0680,
        lng: 7.4250,
        hours: '08:00 - 21:00',
        capacity: 100,
        currentLoad: 35,
        status: 'accredited',
        rating: 4.70,
        security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage']),
        accepting: true
      },
      {
        id: 'b0000000-0000-0000-0000-000000000004',
        ownerId: ownerIbrahim,
        name: 'Garki Area 1 Pickup Kiosk',
        cac: 'CAC-BN-4910283',
        phone: '+2348031112223',
        email: 'garki.hub@hotbox.ng',
        postcode: 'FC-01-B04-GR-01',
        addressText: 'Block 4 Commercial Layout, Area 1, Garki',
        neighbourhood: 'Garki',
        lga: 'Abuja Municipal',
        state: 'Federal Capital Territory',
        lat: 9.0340,
        lng: 7.4890,
        hours: '08:30 - 18:30',
        capacity: 50,
        currentLoad: 20,
        status: 'accredited',
        rating: 4.60,
        security: JSON.stringify(['locked_storage', 'fire_extinguisher']),
        accepting: true
      },
      {
        id: 'b0000000-0000-0000-0000-000000000005',
        ownerId: ownerChidi,
        name: 'CBD Central Logistics Vault',
        cac: 'CAC-BN-5510294',
        phone: '+2348034445566',
        email: 'cbd.hub@hotbox.ng',
        postcode: 'FC-01-A01-CB-01',
        addressText: 'Ground Floor, Constitution Avenue, Central Business District',
        neighbourhood: 'Central District',
        lga: 'Abuja Municipal',
        state: 'Federal Capital Territory',
        lat: 9.0550,
        lng: 7.4950,
        hours: '07:30 - 20:30',
        capacity: 80,
        currentLoad: 42,
        status: 'accredited',
        rating: 4.95,
        security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage', 'biometric_access']),
        accepting: true
      },
      {
        id: 'b0000000-0000-0000-0000-000000000006',
        ownerId: ownerChidi,
        name: 'Ikeja City Express Logistics Hub',
        cac: 'CAC-BN-8829104',
        phone: '+2348029991122',
        email: 'ikeja.hub@hotbox.ng',
        postcode: 'LA-01-B02-IK-01',
        addressText: '14 Obafemi Awolowo Way, Alausa, Ikeja',
        neighbourhood: 'Alausa',
        lga: 'Ikeja',
        state: 'Lagos',
        lat: 6.6018,
        lng: 3.3515,
        hours: '08:00 - 21:00',
        capacity: 50,
        currentLoad: 43,
        status: 'accredited',
        rating: 4.88,
        security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage']),
        accepting: true
      },
      {
        id: 'b0000000-0000-0000-0000-000000000007',
        ownerId: ownerAmina,
        name: 'Victoria Island Tech Mart Hub',
        cac: 'CAC-BN-9920184',
        phone: '+2348033334445',
        email: 'vi.hub@hotbox.ng',
        postcode: 'LA-01-B03-VI-02',
        addressText: 'Plot 42 Ahmadu Bello Way, Victoria Island',
        neighbourhood: 'Victoria Island',
        lga: 'Eti-Osa',
        state: 'Lagos',
        lat: 6.4281,
        lng: 3.4219,
        hours: '09:00 - 19:00',
        capacity: 40,
        currentLoad: 0,
        status: 'pending',
        rating: 5.00,
        security: JSON.stringify(['cctv', 'locked_storage']),
        accepting: false
      }
    ];

    for (const h of hubsList) {
      await db.query(`
        INSERT INTO hubs (
          id, owner_id, business_name, cac_number, phone, email, postcode,
          address_text, neighbourhood, lga, state, lat, lng, opening_hours,
          capacity, current_load, status, rating, security_features, is_accepting_parcels
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO UPDATE SET
          business_name = EXCLUDED.business_name,
          cac_number = EXCLUDED.cac_number,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          postcode = EXCLUDED.postcode,
          address_text = EXCLUDED.address_text,
          neighbourhood = EXCLUDED.neighbourhood,
          lga = EXCLUDED.lga,
          state = EXCLUDED.state,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          opening_hours = EXCLUDED.opening_hours,
          capacity = EXCLUDED.capacity,
          current_load = EXCLUDED.current_load,
          status = EXCLUDED.status,
          rating = EXCLUDED.rating,
          security_features = EXCLUDED.security_features,
          is_accepting_parcels = EXCLUDED.is_accepting_parcels,
          updated_at = NOW()
      `, [
        h.id, h.ownerId, h.name, h.cac, h.phone, h.email, h.postcode,
        h.addressText, h.neighbourhood, h.lga, h.state, h.lat, h.lng, h.hours,
        h.capacity, h.currentLoad, h.status, h.rating, h.security, h.accepting
      ]);

      const bayTiers = ['small', 'medium', 'medium', 'large', 'large'];
      for (let b = 1; b <= 5; b++) {
        const bayCode = `BAY-A0${b}`;
        const isOccupied = (b === 1 && h.currentLoad > 0);
        await db.query(`
          INSERT INTO hub_storage_bays (hub_id, bay_code, size_tier, is_occupied)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (hub_id, bay_code) DO UPDATE SET
            size_tier = EXCLUDED.size_tier,
            is_occupied = EXCLUDED.is_occupied
        `, [h.id, bayCode, bayTiers[b - 1], isOccupied]);
      }

      const accStatus = h.status === 'accredited' ? 'APPROVED' : 'PENDING';
      await db.query(`
        INSERT INTO verification_records (
          entity_type, entity_id, track, status, document_type, document_number,
          reviewed_by, reviewed_at
        ) VALUES (
          'hub', $1, 'TRACK_C_ACCREDITATION', $2, 'PHYSICAL_INSPECTION_REPORT', $3,
          'a0000000-0000-0000-0000-000000000002', NOW()
        )
        ON CONFLICT DO NOTHING
      `, [h.id, accStatus, h.cac]);
    }

    res.json({ success: true, message: 'NDAPS Postcodes and Storage Bays successfully seeded.' });
  } catch (err) {
    console.error('Seed NDAPS hubs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/hubs (Comprehensive Partner Hub Ledger & Capacity Operations)
router.get('/hubs', async (req, res) => {
  try {
    const { search, status, state, capacity_tier } = req.query;

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      conditions.push(`(
        h.business_name ILIKE $${paramIdx} OR
        u.name ILIKE $${paramIdx} OR
        h.postcode ILIKE $${paramIdx} OR
        h.cac_number ILIKE $${paramIdx} OR
        h.address_text ILIKE $${paramIdx} OR
        h.neighbourhood ILIKE $${paramIdx} OR
        h.lga ILIKE $${paramIdx} OR
        h.state ILIKE $${paramIdx}
      )`);
      params.push(q);
      paramIdx++;
    }

    if (state && state !== 'ALL') {
      conditions.push(`h.state = $${paramIdx}`);
      params.push(state);
      paramIdx++;
    }

    if (status && status !== 'ALL') {
      if (status === 'ACCREDITED') {
        conditions.push(`h.status = 'accredited'`);
      } else if (status === 'NEAR_CAPACITY') {
        conditions.push(`h.current_load >= (h.capacity * 0.70)`);
      } else if (status === 'PENDING') {
        conditions.push(`h.status = 'pending'`);
      } else if (status === 'SUSPENDED') {
        conditions.push(`(h.status = 'suspended' OR h.status = 'inactive')`);
      }
    }

    if (capacity_tier && capacity_tier !== 'ALL') {
      if (capacity_tier === 'HIGH_AVAILABILITY') {
        conditions.push(`h.current_load <= (h.capacity * 0.50)`);
      } else if (capacity_tier === 'NEAR_CAPACITY') {
        conditions.push(`h.current_load >= (h.capacity * 0.70)`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        h.*,
        u.name as owner_name,
        u.phone as owner_phone,
        u.email as owner_email,
        ROUND((h.current_load::numeric / NULLIF(h.capacity, 0)::numeric) * 100, 1) as utilization_pct,
        (h.capacity - h.current_load) as available_slots,
        COALESCE(b.total_bays, 0) as total_bays,
        COALESCE(b.occupied_bays, 0) as occupied_bays,
        COALESCE(inv.active_inventory, 0) as active_inventory
      FROM hubs h
      JOIN users u ON h.owner_id = u.id
      LEFT JOIN LATERAL (
        SELECT 
          count(*) as total_bays,
          count(*) FILTER (WHERE is_occupied = TRUE) as occupied_bays
        FROM hub_storage_bays
        WHERE hub_id = h.id
      ) b ON true
      LEFT JOIN LATERAL (
        SELECT count(*) as active_inventory
        FROM shipments
        WHERE destination_hub_id = h.id 
          AND status IN ('STORED_IN_BAY', 'RECEIVED_AT_HUB')
      ) inv ON true
      ${whereClause}
      ORDER BY h.current_load DESC, h.rating DESC, h.created_at DESC
    `;

    const result = await db.query(query, params);

    // Compute network-wide metrics for KPI cards
    const countsRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'accredited') as accredited,
        count(*) FILTER (WHERE status = 'pending') as pending,
        count(*) FILTER (WHERE status = 'suspended' OR status = 'inactive') as suspended,
        count(*) FILTER (WHERE current_load >= (capacity * 0.70)) as near_capacity,
        ROUND(AVG((current_load::numeric / NULLIF(capacity, 0)::numeric) * 100), 1) as avg_utilization_pct,
        COALESCE(SUM(current_load), 0) as total_parcels_stored
      FROM hubs
    `);

    // Track C accreditation reviews pending
    const kycRes = await db.query(`
      SELECT count(*) as pending_reviews
      FROM verification_records
      WHERE track = 'TRACK_C_ACCREDITATION' AND status = 'PENDING'
    `);

    // Distinct states
    const statesRes = await db.query('SELECT DISTINCT state FROM hubs ORDER BY state ASC');

    const counts = countsRes.rows[0];
    counts.reviews_due = parseInt(kycRes.rows[0].pending_reviews, 10);

    res.json({
      hubs: result.rows,
      total: result.rows.length,
      counts,
      states: statesRes.rows.map(s => s.state)
    });
  } catch (err) {
    console.error('Operations hubs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/hubs/:id/details (Hub Dossier & Bay Inventory)
router.get('/hubs/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const hubRes = await db.query(`
      SELECT h.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email
      FROM hubs h
      JOIN users u ON h.owner_id = u.id
      WHERE h.id = $1
    `, [id]);

    if (hubRes.rows.length === 0) return res.status(404).json({ error: 'Hub not found' });

    const baysRes = await db.query(`
      SELECT b.*, s.tracking_code, s.recipient_name, s.recipient_postcode, s.status as shipment_status
      FROM hub_storage_bays b
      LEFT JOIN shipments s ON b.current_shipment_id = s.id
      WHERE b.hub_id = $1
      ORDER BY b.bay_code ASC
    `, [id]);

    const staffRes = await db.query(`
      SELECT hs.*, u.name as staff_name, u.phone as staff_phone, u.email as staff_email
      FROM hub_staff hs
      JOIN users u ON hs.user_id = u.id
      WHERE hs.hub_id = $1
    `, [id]);

    res.json({
      hub: hubRes.rows[0],
      bays: baysRes.rows,
      staff: staffRes.rows
    });
  } catch (err) {
    console.error('Hub details error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/hubs/:id/toggle-intake (Pause / Resume Parcel Intake)
router.post('/hubs/:id/toggle-intake', async (req, res) => {
  try {
    const { id } = req.params;
    const hubRes = await db.query('SELECT is_accepting_parcels, business_name FROM hubs WHERE id = $1', [id]);
    if (hubRes.rows.length === 0) return res.status(404).json({ error: 'Hub not found' });

    const newAccepting = !hubRes.rows[0].is_accepting_parcels;

    await db.query('UPDATE hubs SET is_accepting_parcels = $1, updated_at = NOW() WHERE id = $2', [newAccepting, id]);

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, 'hub', $3, $4)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      newAccepting ? 'HUB_INTAKE_RESUMED' : 'HUB_INTAKE_PAUSED',
      id,
      JSON.stringify({
        role: 'ops_admin',
        reason: newAccepting ? 'Capacity load restored' : 'Capacity limit / space constraint intervention',
        hubName: hubRes.rows[0].business_name,
        is_accepting_parcels: newAccepting
      })
    ]);

    res.json({
      success: true,
      is_accepting_parcels: newAccepting,
      message: `Hub parcel intake successfully ${newAccepting ? 'resumed' : 'paused'}.`
    });
  } catch (err) {
    console.error('Toggle hub intake error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/hubs/:id/toggle-status (Suspend / Reinstate Hub Accreditation)
router.post('/hubs/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason = 'Operations administrative accreditation review' } = req.body;

    const newStatus = action === 'suspend' ? 'suspended' : 'accredited';
    const accepting = action !== 'suspend';

    const updateRes = await db.query(`
      UPDATE hubs
      SET status = $1, is_accepting_parcels = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [newStatus, accepting, id]);

    if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Hub not found' });

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, 'hub', $3, $4)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      action === 'suspend' ? 'HUB_ACCREDITATION_SUSPENDED' : 'HUB_ACCREDITATION_REINSTATED',
      id,
      JSON.stringify({ role: 'ops_admin', reason, previousStatus: updateRes.rows[0].status, newStatus })
    ]);

    res.json({
      success: true,
      hub: updateRes.rows[0],
      message: `Hub accreditation status successfully updated to ${newStatus}.`
    });
  } catch (err) {
    console.error('Toggle hub status error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
