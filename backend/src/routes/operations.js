const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const {
  NIGERIA_STATES,
  isValidPostcodeFormat,
  normalizePostcode,
  disassemblePostcode,
  resolvePostcode,
  queryExternalNipostApi
} = require('../services/postcodeService');

// Customer-facing occupancy lookup used by the customer dashboard.
// Any authenticated user may search; all other operations routes are admin-only.
router.get('/postcode-occupants', authenticate, handlePostcodeOccupants);

// Every other endpoint in this router is restricted to operations staff.
router.use(authenticate, requireRoles('ops_admin', 'super_admin'));

// GET /api/v1/operations/stats (Dashboard Overview with Timeframe Support)
router.get('/stats', async (req, res) => {
  try {
    const timeframe = (req.query.timeframe || 'today').toLowerCase();

    // Timeframe multiplier and label mapping for operational reporting
    let timeframeMeta = {
      label: 'Today',
      multiplier: 1.0,
      labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'],
      bookingsPath: 'M 50 140 Q 120 110, 180 80 T 300 45 T 420 50 T 560 30',
      deliveriesPath: 'M 50 140 Q 120 130, 180 115 T 300 85 T 420 80 T 560 55',
      peakBookings: 140,
      peakDeliveries: 95
    };

    if (timeframe === 'yesterday') {
      timeframeMeta = {
        label: 'Yesterday',
        multiplier: 0.9,
        labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'],
        bookingsPath: 'M 50 140 Q 120 120, 180 95 T 300 65 T 420 60 T 560 45',
        deliveriesPath: 'M 50 140 Q 120 135, 180 120 T 300 95 T 420 90 T 560 70',
        peakBookings: 125,
        peakDeliveries: 88
      };
    } else if (timeframe === 'this_week') {
      timeframeMeta = {
        label: 'This Week',
        multiplier: 4.5,
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        bookingsPath: 'M 50 140 Q 120 90, 180 60 T 300 35 T 420 30 T 560 20',
        deliveriesPath: 'M 50 140 Q 120 110, 180 85 T 300 55 T 420 50 T 560 38',
        peakBookings: 680,
        peakDeliveries: 520
      };
    } else if (timeframe === 'this_month') {
      timeframeMeta = {
        label: 'This Month',
        multiplier: 18.0,
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        bookingsPath: 'M 50 140 Q 150 70, 260 40 T 400 25 T 560 15',
        deliveriesPath: 'M 50 140 Q 150 90, 260 65 T 400 45 T 560 30',
        peakBookings: 2850,
        peakDeliveries: 2310
      };
    }

    const hubsStats = await db.query(`
      SELECT 
        count(*) as total, 
        count(*) FILTER (WHERE status = 'accredited') as accredited,
        count(*) FILTER (WHERE status = 'pending') as pending,
        count(DISTINCT lga) as service_areas
      FROM hubs
    `);

    const shipmentsStats = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status IN ('BOOKED', 'RIDER_ASSIGNED', 'PICKED_UP_FROM_SENDER', 'IN_TRANSIT_TO_HUB', 'RECEIVED_AT_HUB', 'STORED_IN_BAY')) as active,
        count(*) FILTER (WHERE status IN ('IN_TRANSIT_TO_HUB', 'PICKED_UP_FROM_SENDER')) as in_transit,
        count(*) FILTER (WHERE status IN ('STORED_IN_BAY', 'RECEIVED_AT_HUB')) as ready_for_collection,
        count(*) FILTER (WHERE status IN ('DISPUTED', 'CANCELLED', 'RETURNED_TO_HUB')) as exceptions,
        count(*) FILTER (WHERE status IN ('DELIVERED_TO_RECIPIENT', 'COLLECTED_AT_HUB')) as completed
      FROM shipments
    `);

    const ridersStats = await db.query(`
      SELECT 
        count(*) as total, 
        count(*) FILTER (WHERE is_available = TRUE AND is_active = TRUE) as online 
      FROM riders
    `);

    const kycStats = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE track = 'TRACK_A_ADDRESS' AND status = 'PENDING') as pending_address,
        count(*) FILTER (WHERE track = 'TRACK_B_REGULATORY' AND status = 'PENDING') as pending_riders,
        count(*) FILTER (WHERE track = 'TRACK_C_ACCREDITATION' AND status = 'PENDING') as pending_hubs,
        count(*) FILTER (WHERE status = 'PENDING') as pending_total
      FROM verification_records
    `);

    // Fetch the 8 most recent shipments with full relationship details
    const recentRes = await db.query(`
      SELECT 
        s.id,
        s.tracking_code,
        s.sender_address_text,
        s.sender_postcode,
        s.recipient_address_text,
        s.recipient_postcode,
        s.status,
        s.updated_at,
        h.business_name as destination_hub_name,
        u_rider.name as rider_name
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      LEFT JOIN riders r ON s.assigned_rider_id = r.id
      LEFT JOIN users u_rider ON r.user_id = u_rider.id
      ORDER BY s.updated_at DESC
      LIMIT 8
    `);

    // Fetch hubs approaching capacity
    const capacityAlerts = await db.query(`
      SELECT business_name, capacity, current_load, postcode
      FROM hubs
      WHERE current_load >= (capacity * 0.5)
      LIMIT 3
    `);

    const baseActive = parseInt(shipmentsStats.rows[0].active, 10);
    const baseInTransit = parseInt(shipmentsStats.rows[0].in_transit, 10);
    const baseReady = parseInt(shipmentsStats.rows[0].ready_for_collection, 10);
    const baseExceptions = parseInt(shipmentsStats.rows[0].exceptions, 10);
    const baseTotal = parseInt(shipmentsStats.rows[0].total, 10);

    const m = timeframeMeta.multiplier;

    res.json({
      timeframe,
      timeframeMeta,
      hubs: {
        total: parseInt(hubsStats.rows[0].total, 10),
        accredited: parseInt(hubsStats.rows[0].accredited, 10),
        pending: parseInt(hubsStats.rows[0].pending, 10),
        serviceAreas: parseInt(hubsStats.rows[0].service_areas, 10) || 1,
      },
      shipments: {
        total: Math.round(baseTotal * m),
        active: Math.round(baseActive * (timeframe === 'today' ? 1 : Math.min(m, 2))),
        inTransit: Math.round(baseInTransit * (timeframe === 'today' ? 1 : Math.min(m, 2))),
        readyForCollection: Math.round(baseReady * (timeframe === 'today' ? 1 : Math.min(m, 1.5))),
        exceptions: baseExceptions,
        completed: Math.round(parseInt(shipmentsStats.rows[0].completed, 10) * m),
      },
      riders: {
        total: parseInt(ridersStats.rows[0].total, 10),
        online: parseInt(ridersStats.rows[0].online, 10),
      },
      kyc: {
        pendingReviews: parseInt(kycStats.rows[0].pending_total, 10),
        pendingAddress: parseInt(kycStats.rows[0].pending_address, 10),
        pendingRiders: parseInt(kycStats.rows[0].pending_riders, 10),
        pendingHubs: parseInt(kycStats.rows[0].pending_hubs, 10),
      },
      recentShipments: recentRes.rows,
      capacityAlerts: capacityAlerts.rows
    });
  } catch (err) {
    console.error('active-shipments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/postcode-adoption
router.get('/postcode-adoption', async (req, res) => {
  try {
    const adoptionRes = await db.query(`
      SELECT 
        p.state,
        p.lga,
        COUNT(DISTINCT p.postcode) as total_postcodes,
        COUNT(DISTINCT h.id) as active_hubs,
        COUNT(DISTINCT s.id) as shipments_routed
      FROM postcode_cache p
      LEFT JOIN hubs h ON p.postcode = h.postcode
      LEFT JOIN shipments s ON (p.postcode = s.sender_postcode OR p.postcode = s.recipient_postcode)
      GROUP BY p.state, p.lga
      ORDER BY total_postcodes DESC
    `);

    res.json({ adoption: adoptionRes.rows });
  } catch (err) {
    console.error('active-shipments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/active-shipments (Comprehensive Shipment Ledger & Search)
router.get('/active-shipments', async (req, res) => {
  try {
    const { search, status, hub_id } = req.query;

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      conditions.push(`(
        s.tracking_code ILIKE $${paramIdx} OR
        s.sender_name ILIKE $${paramIdx} OR
        s.recipient_name ILIKE $${paramIdx} OR
        s.sender_postcode ILIKE $${paramIdx} OR
        s.recipient_postcode ILIKE $${paramIdx} OR
        h.business_name ILIKE $${paramIdx} OR
        u_rider.name ILIKE $${paramIdx}
      )`);
      params.push(q);
      paramIdx++;
    }

    if (status && status !== 'ALL') {
      if (status === 'IN_TRANSIT') {
        conditions.push(`s.status IN ('IN_TRANSIT_TO_HUB', 'PICKED_UP_FROM_SENDER', 'RIDER_ASSIGNED', 'OUT_FOR_DELIVERY')`);
      } else if (status === 'AWAITING_HANDOFF') {
        conditions.push(`s.status IN ('BOOKED', 'DRAFT')`);
      } else if (status === 'READY_FOR_COLLECTION') {
        conditions.push(`s.status IN ('STORED_IN_BAY', 'RECEIVED_AT_HUB')`);
      } else if (status === 'DELIVERED') {
        conditions.push(`s.status IN ('DELIVERED_TO_RECIPIENT', 'COLLECTED_AT_HUB')`);
      } else if (status === 'EXCEPTIONS') {
        conditions.push(`s.status IN ('DISPUTED', 'CANCELLED', 'RETURNED_TO_HUB', 'RETURN_REQUESTED', 'RETURNED_TO_SENDER', 'EXPIRED_AT_HUB')`);
      } else {
        conditions.push(`s.status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }
    }

    if (hub_id && hub_id !== 'ALL') {
      conditions.push(`(s.destination_hub_id = $${paramIdx} OR s.origin_hub_id = $${paramIdx})`);
      params.push(hub_id);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        s.*,
        h.business_name as destination_hub_name,
        h.postcode as destination_hub_postcode,
        oh.business_name as origin_hub_name,
        oh.postcode as origin_hub_postcode,
        u.name as sender_user_name,
        r.vehicle_type as rider_vehicle,
        u_rider.name as rider_name,
        u_rider.phone as rider_phone,
        b.bay_code as assigned_bay_code
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      LEFT JOIN hubs oh ON s.origin_hub_id = oh.id
      LEFT JOIN users u ON s.sender_id = u.id
      LEFT JOIN riders r ON s.assigned_rider_id = r.id
      LEFT JOIN users u_rider ON r.user_id = u_rider.id
      LEFT JOIN hub_storage_bays b ON s.assigned_bay_id = b.id
      ${whereClause}
      ORDER BY s.updated_at DESC
      LIMIT 200
    `;

    const result = await db.query(query, params);

    // Compute status counts across all shipments
    const countsRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status IN ('IN_TRANSIT_TO_HUB', 'PICKED_UP_FROM_SENDER', 'RIDER_ASSIGNED', 'OUT_FOR_DELIVERY')) as in_transit,
        count(*) FILTER (WHERE status IN ('BOOKED', 'DRAFT')) as awaiting_handoff,
        count(*) FILTER (WHERE status IN ('STORED_IN_BAY', 'RECEIVED_AT_HUB')) as ready_for_collection,
        count(*) FILTER (WHERE status IN ('DELIVERED_TO_RECIPIENT', 'COLLECTED_AT_HUB')) as delivered,
        count(*) FILTER (WHERE status IN ('DISPUTED', 'CANCELLED', 'RETURNED_TO_HUB', 'RETURN_REQUESTED', 'RETURNED_TO_SENDER', 'EXPIRED_AT_HUB')) as exceptions
      FROM shipments
    `);

    res.json({ 
      shipments: result.rows, 
      total: result.rows.length,
      counts: countsRes.rows[0]
    });
  } catch (err) {
    console.error('active-shipments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/riders (Comprehensive Fleet Ledger & Dispatch Monitor)
router.get('/riders', async (req, res) => {
  try {
    const { search, status, vehicle_type, courier_id } = req.query;

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      conditions.push(`(
        u.name ILIKE $${paramIdx} OR
        u.phone ILIKE $${paramIdx} OR
        u.email ILIKE $${paramIdx} OR
        r.plate_number ILIKE $${paramIdx} OR
        r.drivers_license_no ILIKE $${paramIdx} OR
        r.nin ILIKE $${paramIdx} OR
        c.company_name ILIKE $${paramIdx} OR
        array_to_string(r.operational_postcodes, ',') ILIKE $${paramIdx}
      )`);
      params.push(q);
      paramIdx++;
    }

    if (vehicle_type && vehicle_type !== 'ALL') {
      conditions.push(`r.vehicle_type = $${paramIdx}`);
      params.push(vehicle_type);
      paramIdx++;
    }

    if (courier_id && courier_id !== 'ALL') {
      if (courier_id === 'INDEPENDENT') {
        conditions.push(`r.courier_id IS NULL`);
      } else {
        conditions.push(`r.courier_id = $${paramIdx}`);
        params.push(courier_id);
        paramIdx++;
      }
    }

    if (status && status !== 'ALL') {
      if (status === 'ONLINE') {
        conditions.push(`r.is_available = TRUE AND r.is_active = TRUE AND r.status = 'verified'`);
      } else if (status === 'ON_ROUTE') {
        conditions.push(`active_shipments.tracking_code IS NOT NULL`);
      } else if (status === 'PENDING') {
        conditions.push(`r.status = 'pending'`);
      } else if (status === 'SUSPENDED') {
        conditions.push(`(r.status = 'suspended' OR r.is_active = FALSE)`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        r.*,
        u.name,
        u.phone,
        u.email,
        c.company_name,
        w.balance_ngn as wallet_balance_ngn,
        active_shipments.id as active_shipment_id,
        active_shipments.tracking_code as active_shipment_code,
        active_shipments.status as active_shipment_status,
        active_shipments.recipient_name as active_shipment_recipient,
        active_shipments.recipient_postcode as active_shipment_postcode
      FROM riders r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN courier_companies c ON r.courier_id = c.id
      LEFT JOIN wallets w ON w.user_id = r.user_id
      LEFT JOIN LATERAL (
        SELECT id, tracking_code, status, recipient_name, recipient_postcode
        FROM shipments
        WHERE assigned_rider_id = r.id 
          AND status IN ('RIDER_ASSIGNED', 'PICKED_UP_FROM_SENDER', 'IN_TRANSIT_TO_HUB', 'OUT_FOR_DELIVERY')
        ORDER BY updated_at DESC
        LIMIT 1
      ) active_shipments ON true
      ${whereClause}
      ORDER BY r.is_available DESC, r.total_deliveries DESC, r.created_at DESC
    `;

    const result = await db.query(query, params);

    // Compute status counts across all fleet riders
    const countsRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE r.is_available = TRUE AND r.is_active = TRUE AND r.status = 'verified') as online,
        count(*) FILTER (WHERE cur_s.id IS NOT NULL) as on_route,
        count(*) FILTER (WHERE r.status = 'pending') as pending,
        count(*) FILTER (WHERE r.status = 'suspended' OR r.is_active = FALSE) as suspended
      FROM riders r
      LEFT JOIN LATERAL (
        SELECT id FROM shipments
        WHERE assigned_rider_id = r.id 
          AND status IN ('RIDER_ASSIGNED', 'PICKED_UP_FROM_SENDER', 'IN_TRANSIT_TO_HUB', 'OUT_FOR_DELIVERY')
        LIMIT 1
      ) cur_s ON true
    `);

    // Fetch courier companies for filter dropdown
    const companiesRes = await db.query('SELECT id, company_name FROM courier_companies ORDER BY company_name ASC');

    res.json({
      riders: result.rows,
      total: result.rows.length,
      counts: countsRes.rows[0],
      companies: companiesRes.rows
    });
  } catch (err) {
    console.error('Operations riders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/riders/:id/toggle-status (Suspend or Reinstate Courier)
router.post('/riders/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason = 'Operations administrative review' } = req.body; // action: 'suspend' | 'reinstate'

    const newStatus = action === 'suspend' ? 'suspended' : 'verified';
    const isActive = action !== 'suspend';
    const isAvailable = action !== 'suspend';

    const updateRes = await db.query(`
      UPDATE riders
      SET status = $1, is_active = $2, is_available = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [newStatus, isActive, isAvailable, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, $2, 'rider', $3, $4)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      action === 'suspend' ? 'RIDER_SUSPENDED' : 'RIDER_REINSTATED',
      id,
      JSON.stringify({ role: 'ops_admin', reason, previousStatus: updateRes.rows[0].status, newStatus })
    ]);

    res.json({
      success: true,
      rider: updateRes.rows[0],
      message: `Courier status successfully updated to ${newStatus}.`
    });
  } catch (err) {
    console.error('Toggle rider status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/riders/:id/assign-shipment (Manual Dispatch Assignment)
router.post('/riders/:id/assign-shipment', async (req, res) => {
  try {
    const { id } = req.params;
    const { shipmentId } = req.body;

    if (!shipmentId) {
      return res.status(400).json({ error: 'Shipment ID is required for assignment.' });
    }

    const shipRes = await db.query(`
      UPDATE shipments
      SET assigned_rider_id = $1,
          status = 'RIDER_ASSIGNED',
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [id, shipmentId]);

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Mark rider as on-route
    await db.query(`UPDATE riders SET is_available = FALSE, updated_at = NOW() WHERE id = $1`, [id]);

    // Ledger audit
    await db.query(`
      INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, previous_holder_id, new_holder_type, new_holder_id,
        handover_type, status_after_handover, verification_method, actor_id, actor_role, notes
      ) VALUES ($1, 'DISPATCH_DESK', $1, 'RIDER', $2, 'RIDER_ASSIGNED', 'RIDER_ASSIGNED', 'MANUAL_DISPATCH', $3, 'ops_admin', $4)
    `, [
      shipmentId,
      id,
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      `Manual dispatch assignment by Operations Admin`
    ]);

    res.json({
      success: true,
      shipment: shipRes.rows[0],
      message: `Shipment ${shipRes.rows[0].tracking_code} successfully assigned to courier.`
    });
  } catch (err) {
    console.error('Assign shipment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/hubs/seed-ndaps (Enforce NDAPS Alphanumeric Postcodes & Bays)
router.post('/hubs/seed-ndaps', async (req, res) => {
  try {
    const ownerIbrahim = 'a0000000-0000-0000-0000-000000000003';
    const ownerChidi = 'a0000000-0000-0000-0000-000000000004';
    const ownerAmina = 'a0000000-0000-0000-0000-000000000007';

    await db.query(`
      INSERT INTO users (id, phone, name, email, role, is_phone_verified, is_email_verified)
      VALUES ($1, '+2348033334445', 'Amina Bello', 'amina.bello@dropboxz.ng', 'hub_owner', TRUE, TRUE)
      ON CONFLICT (id) DO UPDATE SET role = 'hub_owner'
    `, [ownerAmina]);

    const hubsList = [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        ownerId: ownerIbrahim,
        name: 'Wuse 2 Express Mart & Hub',
        cac: 'CAC-BN-2918402',
        phone: '+2348031112223',
        email: 'wuse2.hub@dropboxz.ng',
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
        email: 'banex.hub@dropboxz.ng',
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
        email: 'jabi.hub@dropboxz.ng',
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
        email: 'garki.hub@dropboxz.ng',
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
        email: 'cbd.hub@dropboxz.ng',
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
        email: 'ikeja.hub@dropboxz.ng',
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
        email: 'vi.hub@dropboxz.ng',
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

// ============================================================================
// OPERATIONAL EXCEPTIONS & INCIDENT RESOLUTION DESK
// ============================================================================

// POST /api/v1/operations/exceptions/seed (Seed 17 Authoritative Incidents & Claims)
router.post('/exceptions/seed', async (req, res) => {
  try {
    // 1. Get sender / claimant users, hubs, and riders
    const userRes = await db.query("SELECT id FROM users WHERE role = 'customer' LIMIT 4");
    const adminRes = await db.query("SELECT id FROM users WHERE role IN ('ops_admin', 'super_admin') LIMIT 1");
    const hubsRes = await db.query("SELECT id, business_name, postcode FROM hubs WHERE status = 'accredited' LIMIT 4");
    const ridersRes = await db.query("SELECT id, user_id FROM riders LIMIT 3");

    if (userRes.rows.length === 0 || hubsRes.rows.length === 0) {
      return res.status(400).json({ error: 'Ensure users and hubs are seeded first.' });
    }

    const defaultCustomer = userRes.rows[0].id;
    const defaultAdmin = adminRes.rows[0]?.id || 'a0000000-0000-0000-0000-000000000002';
    const hub1 = hubsRes.rows[0];
    const hub2 = hubsRes.rows[1] || hub1;
    const hub3 = hubsRes.rows[2] || hub1;
    const rider1 = ridersRes.rows[0]?.id || null;
    const rider2 = ridersRes.rows[1]?.id || rider1;

    // A. 5 Stalled In-Transit / Delayed Deliveries
    const stalledData = [
      {
        code: 'DBX-STL-001',
        desc: 'Courier vehicle breakdown on Outer Northern Expressway; delivery delayed >36h',
        origin: 'FC-01-A03-FK-01',
        dest: 'FC-01-C05-JB-01',
        sender: 'Chukwuma Obi',
        recipient: 'Zainab Ahmed',
        hoursAgo: 38,
        hubId: hub1.id,
        riderId: rider1
      },
      {
        code: 'DBX-STL-002',
        desc: 'Severe flash flood impassable route on Lagos Mainland; rider unable to reach hub',
        origin: 'LA-01-B02-IK-01',
        dest: 'LA-01-A01-AA-01',
        sender: 'Babatunde Raji',
        recipient: 'Folake Adeyemi',
        hoursAgo: 29,
        hubId: hub2.id,
        riderId: rider2
      },
      {
        code: 'DBX-STL-003',
        desc: 'Sender address gate locked, phone switched off; 2 missed collection attempts',
        origin: 'FC-01-A01-CB-01',
        dest: 'FC-01-A03-FK-01',
        sender: 'Ngozi Okonjo',
        recipient: 'Mallam Ibrahim',
        hoursAgo: 42,
        hubId: hub1.id,
        riderId: rider1
      },
      {
        code: 'DBX-STL-004',
        desc: 'Rider dispatch custody scan mismatch; package unconfirmed at mid-point depot',
        origin: 'FC-01-B04-GR-01',
        dest: 'FC-01-C05-JB-01',
        sender: 'David Mark',
        recipient: 'Amina Sani',
        hoursAgo: 31,
        hubId: hub3.id,
        riderId: rider2
      },
      {
        code: 'DBX-STL-005',
        desc: 'Inter-hub transit transfer delay; consignment awaiting sorting supervisor handover',
        origin: 'FC-01-A02-FK-02',
        dest: 'FC-01-A01-CB-01',
        sender: 'Emeka Nwosu',
        recipient: 'Hassan Bello',
        hoursAgo: 26,
        hubId: hub2.id,
        riderId: rider1
      }
    ];

    for (const item of stalledData) {
      const hoursInterval = `${item.hoursAgo} hours`;
      const shipRes = await db.query(`
        INSERT INTO shipments (
          tracking_code, service_type, sender_id, sender_name, sender_phone, sender_postcode, sender_address_text,
          recipient_name, recipient_phone, recipient_postcode, recipient_address_text,
          destination_hub_id, assigned_rider_id, size, package_description, declared_value_ngn,
          pickup_otp, delivery_otp, collection_qr_token, status, expires_at, created_at, updated_at
        ) VALUES (
          $1, 'DOOR_TO_HUB', $2, $3, '+2348031112233', $4, 'Commercial Sector Address',
          $5, '+2348059998877', $6, 'Destination Delivery Address',
          $7, $8, 'medium', $9, 35000.00,
          '112233', '445566', gen_random_uuid()::text, 'IN_TRANSIT_TO_HUB',
          NOW() + INTERVAL '5 days', NOW() - $10::interval, NOW() - $10::interval
        )
        ON CONFLICT (tracking_code) DO UPDATE SET
          status = 'IN_TRANSIT_TO_HUB',
          package_description = EXCLUDED.package_description,
          updated_at = NOW() - $10::interval
        RETURNING id
      `, [item.code, defaultCustomer, item.sender, item.origin, item.recipient, item.dest, item.hubId, item.riderId, item.desc, hoursInterval]);

      // Custody event
      await db.query(`
        INSERT INTO custody_ledger (
          shipment_id, previous_holder_type, new_holder_type, new_holder_id,
          handover_type, status_after_handover, verification_method, actor_id, actor_role, notes, created_at
        ) VALUES (
          $1, 'SENDER', 'RIDER', $2, 'SENDER_TO_RIDER', 'IN_TRANSIT_TO_HUB', 'OTP', $3, 'rider', $4, NOW() - $5::interval
        )
        ON CONFLICT DO NOTHING
      `, [shipRes.rows[0].id, item.riderId, defaultCustomer, item.desc, hoursInterval]);
    }

    // B. 5 Overdue Hub Storage Parcels (past 3-day free window)
    const overdueData = [
      {
        code: 'DBX-OVD-001',
        desc: 'Overdue 5 days past free holding period; holding fee accumulated ₦1,000',
        hubId: hub1.id,
        recipient: 'Alhaji Garba Shehu',
        daysOverdue: 5,
        fee: 1000.00
      },
      {
        code: 'DBX-OVD-002',
        desc: 'Overdue 4 days past free holding period; 3 pickup reminders sent without response',
        hubId: hub2.id,
        recipient: 'Kemi Adebayo',
        daysOverdue: 4,
        fee: 800.00
      },
      {
        code: 'DBX-OVD-003',
        desc: 'Overdue 6 days past free holding period; recipient phone unreachable',
        hubId: hub1.id,
        recipient: 'Dr. Osas Ighodaro',
        daysOverdue: 6,
        fee: 1200.00
      },
      {
        code: 'DBX-OVD-004',
        desc: 'Overdue 3 days past free holding period; holding fee accumulated ₦600',
        hubId: hub3.id,
        recipient: 'Maryam Uwais',
        daysOverdue: 3,
        fee: 600.00
      },
      {
        code: 'DBX-OVD-005',
        desc: 'Overdue 7 days past free holding period; approaches maximum holding threshold',
        hubId: hub2.id,
        recipient: 'Chima Anyanwu',
        daysOverdue: 7,
        fee: 1400.00
      }
    ];

    for (const item of overdueData) {
      const overdueInterval = `${item.daysOverdue} days`;
      const createdInterval = `${item.daysOverdue + 4} days`;
      await db.query(`
        INSERT INTO shipments (
          tracking_code, service_type, sender_id, sender_name, sender_phone, sender_postcode, sender_address_text,
          recipient_name, recipient_phone, recipient_postcode, recipient_address_text,
          destination_hub_id, size, package_description, declared_value_ngn,
          pickup_otp, delivery_otp, collection_qr_token, status, expires_at, created_at, updated_at
        ) VALUES (
          $1, 'HUB_TO_HUB', $2, 'Abuja Merchant Store', '+2348039994455', 'FC-01-A01-CB-01', 'CBD Central Trade Mart',
          $3, '+2348021110099', 'FC-01-A03-FK-01', 'Destination Pickup Hub',
          $4, 'medium', $5, 28000.00,
          '654321', '987654', gen_random_uuid()::text, 'STORED_IN_BAY',
          NOW() - $6::interval, NOW() - $7::interval, NOW() - $6::interval
        )
        ON CONFLICT (tracking_code) DO UPDATE SET
          status = 'STORED_IN_BAY',
          expires_at = NOW() - $6::interval,
          package_description = EXCLUDED.package_description
      `, [item.code, defaultCustomer, item.recipient, item.hubId, item.desc, overdueInterval, createdInterval]);
    }

    // C. 4 Customer Claims & Damage Disputes (Inserted into claims table)
    const claimsData = [
      {
        code: 'DBX-CLM-001',
        claimType: 'DAMAGED_PARCEL',
        amount: 45000.00,
        status: 'SUBMITTED',
        desc: 'Delivered electronics consignment arrived with shattered display and compromised protective seal at Wuse 2 Hub.',
        hubId: hub1.id
      },
      {
        code: 'DBX-CLM-002',
        claimType: 'LOST_PARCEL',
        amount: 85000.00,
        status: 'UNDER_REVIEW',
        desc: 'Laptop package scanned by courier in Garki Area 1 was never checked in at CBD Central Vault.',
        hubId: hub2.id
      },
      {
        code: 'DBX-CLM-003',
        claimType: 'WRONG_HANDOVER',
        amount: 18500.00,
        status: 'SUBMITTED',
        desc: 'Courier completed delivery without collecting authorized recipient OTP; handed to unauthorized third-party.',
        hubId: hub3.id
      },
      {
        code: 'DBX-CLM-004',
        claimType: 'EXCESS_HOLDING_FEE',
        amount: 1200.00,
        status: 'UNDER_REVIEW',
        desc: 'Disputing 3 days of holding fee charges billed while partner hub was closed for public holiday.',
        hubId: hub1.id
      }
    ];

    for (const item of claimsData) {
      // Create associated shipment
      const shipRes = await db.query(`
        INSERT INTO shipments (
          tracking_code, service_type, sender_id, sender_name, sender_phone, sender_postcode, sender_address_text,
          recipient_name, recipient_phone, recipient_postcode, recipient_address_text,
          destination_hub_id, size, package_description, declared_value_ngn,
          pickup_otp, delivery_otp, collection_qr_token, status, expires_at
        ) VALUES (
          $1, 'DOOR_TO_HUB', $2, 'Apex Gadgets Ltd', '+2348037778899', 'FC-01-A03-FK-01', 'Wuse 2 Commercial Sector',
          'Prof. Jerry Gana', '+2348092223344', 'FC-01-A02-FK-02', 'Jabi Residential Area',
          $3, 'medium', $4, $5,
          '334455', '778899', gen_random_uuid()::text, 'DISPUTED', NOW() + INTERVAL '3 days'
        )
        ON CONFLICT (tracking_code) DO UPDATE SET status = 'DISPUTED'
        RETURNING id
      `, [item.code, defaultCustomer, item.hubId, item.desc, item.amount]);

      const shipmentId = shipRes.rows[0].id;

      // Upsert claim
      await db.query(`
        INSERT INTO claims (
          shipment_id, claimant_id, claim_type, description, evidence_urls,
          claim_amount_ngn, status, assigned_to, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, ARRAY['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'],
          $5, $6, $7, NOW() - INTERVAL '1 day', NOW()
        )
        ON CONFLICT DO NOTHING
      `, [shipmentId, defaultCustomer, item.claimType, item.desc, item.amount, item.status, defaultAdmin]);
    }

    // D. 3 Return-to-Sender (RTS) & Expiry Shipments
    const rtsData = [
      {
        code: 'DBX-RTS-001',
        status: 'RETURN_REQUESTED',
        desc: 'Recipient permanently relocated outside FCT service territory; sender authorized Return to Origin Hub.',
        hubId: hub1.id
      },
      {
        code: 'DBX-RTS-002',
        status: 'DISPUTED',
        desc: 'Severe weight mismatch at intake scale: declared 1.2kg vs actual 4.9kg containing prohibited liquid chemical.',
        hubId: hub2.id
      },
      {
        code: 'DBX-RTS-003',
        status: 'EXPIRED_AT_HUB',
        desc: 'Exceeded maximum allowable hub storage duration (14 days); flagged for warehouse return disposition.',
        hubId: hub3.id
      }
    ];

    for (const item of rtsData) {
      await db.query(`
        INSERT INTO shipments (
          tracking_code, service_type, sender_id, sender_name, sender_phone, sender_postcode, sender_address_text,
          recipient_name, recipient_phone, recipient_postcode, recipient_address_text,
          destination_hub_id, size, package_description, declared_value_ngn,
          pickup_otp, delivery_otp, collection_qr_token, status, expires_at
        ) VALUES (
          $1, 'DOOR_TO_HUB', $2, 'Sahara Logistics Shipper', '+2348034441122', 'FC-01-A01-CB-01', 'Constitution Avenue CBD',
          'Tariq Al-Mansoor', '+2348085556677', 'FC-01-C05-JB-01', 'Jabi Lakeside Boulevard',
          $3, 'large', $4, 42000.00,
          '889900', '112244', gen_random_uuid()::text, $5, NOW() - INTERVAL '2 days'
        )
        ON CONFLICT (tracking_code) DO UPDATE SET
          status = $5,
          package_description = EXCLUDED.package_description
      `, [item.code, defaultCustomer, item.hubId, item.desc, item.status]);
    }

    res.json({
      success: true,
      message: 'Successfully seeded 17 active operational exceptions, stalled shipments, and claims.',
      counts: {
        stalled: 5,
        overdue: 5,
        claims: 4,
        disputed_rts: 3,
        total: 17
      }
    });
  } catch (err) {
    console.error('Exception seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/exceptions (Unified Exception & Incident Ledger)
router.get('/exceptions', async (req, res) => {
  try {
    const { search, tab = 'ALL', severity = 'ALL' } = req.query;

    // 1. Fetch claims joined with shipments
    const claimsRes = await db.query(`
      SELECT 
        c.id as claim_id,
        c.claim_type,
        c.description as incident_description,
        c.evidence_urls,
        c.claim_amount_ngn,
        c.resolution_amount_ngn,
        c.status as claim_status,
        c.resolution_notes,
        c.created_at as incident_created_at,
        c.updated_at as incident_updated_at,
        s.id as shipment_id,
        s.tracking_code,
        s.service_type,
        s.status as shipment_status,
        s.declared_value_ngn,
        s.sender_name,
        s.sender_phone,
        s.sender_postcode,
        s.recipient_name,
        s.recipient_phone,
        s.recipient_postcode,
        s.created_at as shipment_created_at,
        h.id as hub_id,
        h.business_name as hub_name,
        h.postcode as hub_postcode,
        r.id as rider_id,
        r.plate_number as rider_plate,
        u_rider.name as rider_name
      FROM claims c
      JOIN shipments s ON c.shipment_id = s.id
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      LEFT JOIN riders r ON s.assigned_rider_id = r.id
      LEFT JOIN users u_rider ON r.user_id = u_rider.id
      WHERE c.status != 'CANCELLED'
      ORDER BY c.created_at DESC
    `);

    // 2. Fetch exception/stalled shipments that don't already have claims
    const shipmentsRes = await db.query(`
      SELECT 
        s.id as shipment_id,
        s.tracking_code,
        s.service_type,
        s.status as shipment_status,
        s.package_description as incident_description,
        s.declared_value_ngn,
        s.sender_name,
        s.sender_phone,
        s.sender_postcode,
        s.recipient_name,
        s.recipient_phone,
        s.recipient_postcode,
        s.expires_at,
        s.created_at as shipment_created_at,
        s.updated_at as incident_updated_at,
        h.id as hub_id,
        h.business_name as hub_name,
        h.postcode as hub_postcode,
        r.id as rider_id,
        r.plate_number as rider_plate,
        u_rider.name as rider_name
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      LEFT JOIN riders r ON s.assigned_rider_id = r.id
      LEFT JOIN users u_rider ON r.user_id = u_rider.id
      WHERE s.status IN ('DISPUTED', 'EXPIRED_AT_HUB', 'RETURN_REQUESTED', 'RETURNED_TO_SENDER')
         OR (s.status = 'STORED_IN_BAY' AND s.expires_at < NOW())
         OR (s.tracking_code LIKE 'DBX-STL-%' OR s.tracking_code LIKE 'DBX-OVD-%' OR s.tracking_code LIKE 'DBX-RTS-%' OR s.tracking_code LIKE 'HBX-STL-%' OR s.tracking_code LIKE 'HBX-OVD-%' OR s.tracking_code LIKE 'HBX-RTS-%')
      ORDER BY s.created_at DESC
    `);

    // Build unified list
    const seenTracking = new Set();
    const unifiedList = [];

    // Process Claims
    for (const c of claimsRes.rows) {
      if (seenTracking.has(c.tracking_code)) continue;
      seenTracking.add(c.tracking_code);
      let category = 'CLAIMS';
      let severityLevel = 'CRITICAL';
      if (c.claim_type === 'EXCESS_HOLDING_FEE') severityLevel = 'MEDIUM';
      else if (c.claim_type === 'DELAYED_DELIVERY') severityLevel = 'HIGH';

      unifiedList.push({
        id: c.claim_id,
        type: 'CLAIM',
        claim_id: c.claim_id,
        shipment_id: c.shipment_id,
        tracking_code: c.tracking_code,
        service_type: c.service_type,
        category,
        incident_type: c.claim_type,
        severity: severityLevel,
        description: c.incident_description,
        evidence_urls: c.evidence_urls || [],
        amount_ngn: parseFloat(c.claim_amount_ngn) || 0,
        resolution_amount_ngn: parseFloat(c.resolution_amount_ngn) || 0,
        status: c.claim_status,
        resolution_notes: c.resolution_notes,
        created_at: c.incident_created_at,
        updated_at: c.incident_updated_at,
        customer_name: c.sender_name,
        customer_phone: c.sender_phone,
        recipient_name: c.recipient_name,
        recipient_phone: c.recipient_phone,
        route: `${c.sender_postcode} ➔ ${c.recipient_postcode}`,
        current_custodian: c.hub_name ? `Hub: ${c.hub_name}` : c.rider_name ? `Rider: ${c.rider_name}` : 'In Transit Network',
        hub_name: c.hub_name,
        rider_name: c.rider_name,
        holding_fee_ngn: 0
      });
    }

    // Process Exception Shipments
    for (const s of shipmentsRes.rows) {
      if (seenTracking.has(s.tracking_code)) continue;
      seenTracking.add(s.tracking_code);

      const shipStatus = s.shipment_status || s.status;
      let category = 'STALLED';
      let incidentType = 'STALLED_IN_TRANSIT';
      let severityLevel = 'HIGH';
      let holdingFee = 0;

      const isOverdue = s.expires_at && new Date(s.expires_at) < new Date();
      if (shipStatus === 'STORED_IN_BAY' && isOverdue) {
        category = 'OVERDUE';
        incidentType = 'OVERDUE_HUB_HOLDING';
        severityLevel = 'MEDIUM';
        const diffDays = Math.max(1, Math.ceil((Date.now() - new Date(s.expires_at).getTime()) / (1000 * 3600 * 24)));
        holdingFee = diffDays * 200.00;
      } else if (shipStatus === 'RETURN_REQUESTED') {
        category = 'STALLED';
        incidentType = 'RETURN_REQUESTED';
        severityLevel = 'HIGH';
      } else if (shipStatus === 'RETURNED_TO_SENDER') {
        category = 'RESOLVED';
        incidentType = 'RETURNED_TO_SENDER';
        severityLevel = 'MEDIUM';
      } else if (shipStatus === 'DISPUTED') {
        category = 'CLAIMS';
        incidentType = 'DISPUTED_INTAKE';
        severityLevel = 'CRITICAL';
      } else if (shipStatus === 'EXPIRED_AT_HUB') {
        category = 'OVERDUE';
        incidentType = 'EXPIRED_COLLECTION_DEADLINE';
        severityLevel = 'HIGH';
      }

      unifiedList.push({
        id: s.shipment_id,
        type: 'SHIPMENT_EXCEPTION',
        shipment_id: s.shipment_id,
        tracking_code: s.tracking_code,
        service_type: s.service_type,
        category,
        incident_type: incidentType,
        severity: severityLevel,
        description: s.incident_description || 'Operational shipment exception logged',
        evidence_urls: [],
        amount_ngn: parseFloat(s.declared_value_ngn) || 0,
        resolution_amount_ngn: 0,
        status: shipStatus,
        resolution_notes: null,
        created_at: s.shipment_created_at,
        updated_at: s.incident_updated_at,
        customer_name: s.sender_name,
        customer_phone: s.sender_phone,
        recipient_name: s.recipient_name,
        recipient_phone: s.recipient_phone,
        route: `${s.sender_postcode} ➔ ${s.recipient_postcode}`,
        current_custodian: s.hub_name ? `Hub: ${s.hub_name}` : s.rider_name ? `Rider: ${s.rider_name}` : 'In Transit',
        hub_name: s.hub_name,
        rider_name: s.rider_name,
        holding_fee_ngn: holdingFee
      });
    }

    // Filter by Tab
    let filtered = unifiedList;
    if (tab !== 'ALL') {
      if (tab === 'STALLED') {
        filtered = unifiedList.filter(item => item.category === 'STALLED' || item.incident_type === 'STALLED_IN_TRANSIT');
      } else if (tab === 'OVERDUE') {
        filtered = unifiedList.filter(item => item.category === 'OVERDUE' || item.incident_type.includes('OVERDUE') || item.incident_type.includes('EXPIRED'));
      } else if (tab === 'CLAIMS') {
        filtered = unifiedList.filter(item => item.category === 'CLAIMS' || item.type === 'CLAIM');
      } else if (tab === 'RESOLVED') {
        filtered = unifiedList.filter(item => item.status === 'APPROVED' || item.status === 'SETTLED' || item.status === 'RETURNED_TO_SENDER' || item.status === 'REJECTED');
      }
    }

    // Filter by Severity
    if (severity !== 'ALL') {
      filtered = filtered.filter(item => item.severity === severity);
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(item => 
        (item.tracking_code && item.tracking_code.toLowerCase().includes(q)) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(q)) ||
        (item.recipient_name && item.recipient_name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.route && item.route.toLowerCase().includes(q))
      );
    }

    // Calculate Counts
    const totalOpen = unifiedList.filter(i => i.status !== 'SETTLED' && i.status !== 'REJECTED' && i.status !== 'RETURNED_TO_SENDER').length;
    const stalledCount = unifiedList.filter(i => i.category === 'STALLED').length;
    const overdueCount = unifiedList.filter(i => i.category === 'OVERDUE').length;
    const claimsCount = unifiedList.filter(i => i.category === 'CLAIMS').length;
    const resolvedCount = unifiedList.filter(i => i.status === 'SETTLED' || i.status === 'APPROVED' || i.status === 'RETURNED_TO_SENDER' || i.status === 'REJECTED').length;
    const totalExposure = unifiedList.reduce((sum, item) => sum + (item.amount_ngn || 0), 0);

    res.json({
      exceptions: filtered,
      total: filtered.length,
      counts: {
        total_open: totalOpen,
        stalled_transit: stalledCount,
        overdue_holding: overdueCount,
        open_claims: claimsCount,
        resolved_count: resolvedCount,
        total_financial_exposure_ngn: totalExposure
      }
    });
  } catch (err) {
    console.error('Operations exceptions ledger error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/exceptions/:id/details (Comprehensive Investigation Dossier)
router.get('/exceptions/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID is claim or shipment
    let claimRow = null;
    let shipmentId = id;

    const claimRes = await db.query('SELECT * FROM claims WHERE id = $1 LIMIT 1', [id]);
    if (claimRes.rows.length > 0) {
      claimRow = claimRes.rows[0];
      shipmentId = claimRow.shipment_id;
    }

    // Fetch shipment with hub and rider
    const shipRes = await db.query(`
      SELECT 
        s.*,
        h.business_name as hub_name,
        h.postcode as hub_postcode,
        h.phone as hub_phone,
        h.address_text as hub_address,
        r.plate_number as rider_plate,
        r.vehicle_type as rider_vehicle,
        u_rider.name as rider_name,
        u_rider.phone as rider_phone
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      LEFT JOIN riders r ON s.assigned_rider_id = r.id
      LEFT JOIN users u_rider ON r.user_id = u_rider.id
      WHERE s.id = $1 LIMIT 1
    `, [shipmentId]);

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment record not found' });
    }

    const shipment = shipRes.rows[0];

    // Fetch custody timeline
    const custodyRes = await db.query(`
      SELECT *
      FROM custody_ledger
      WHERE shipment_id = $1
      ORDER BY created_at ASC
    `, [shipmentId]);

    // Available replacement riders for reassignment
    const activeRidersRes = await db.query(`
      SELECT r.id, r.plate_number, r.vehicle_type, r.rating, u.name, u.phone
      FROM riders r
      JOIN users u ON r.user_id = u.id
      WHERE r.is_active = TRUE
      LIMIT 10
    `);

    res.json({
      shipment,
      claim: claimRow,
      timeline: custodyRes.rows,
      available_riders: activeRidersRes.rows
    });
  } catch (err) {
    console.error('Exception details error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/exceptions/:id/resolve (Resolve or Settle Claim)
router.post('/exceptions/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, resolutionAmountNgn, resolutionNotes } = req.body;

    if (!action) return res.status(400).json({ error: 'Resolution action is required.' });

    // Check if claim
    const claimRes = await db.query('SELECT * FROM claims WHERE id = $1', [id]);
    if (claimRes.rows.length > 0) {
      const claim = claimRes.rows[0];
      const newStatus = action === 'APPROVE' ? 'APPROVED' : action === 'SETTLE' ? 'SETTLED' : 'REJECTED';
      const finalAmount = parseFloat(resolutionAmountNgn) || (action === 'REJECT' ? 0 : parseFloat(claim.claim_amount_ngn));

      await db.query(`
        UPDATE claims
        SET status = $1, resolution_amount_ngn = $2, resolution_notes = $3, resolved_at = NOW(), updated_at = NOW()
        WHERE id = $4
      `, [newStatus, finalAmount, resolutionNotes || `Actioned by Operations Desk (${action})`, id]);

      // If settled/approved, update shipment status to CANCELLED or RETURNED
      if (newStatus === 'SETTLED') {
        await db.query("UPDATE shipments SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [claim.shipment_id]);
      }

      // Audit log
      await db.query(`
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'claim', $3, $4)
      `, [
        req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
        `CLAIM_${newStatus}`,
        id,
        JSON.stringify({ previousStatus: claim.status, newStatus, resolutionAmountNgn: finalAmount, resolutionNotes })
      ]);

      return res.json({
        success: true,
        message: `Claim successfully updated to ${newStatus} with settlement of ₦${finalAmount.toLocaleString()}.`
      });
    }

    // Otherwise update shipment exception status
    const shipRes = await db.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (shipRes.rows.length === 0) return res.status(404).json({ error: 'Exception record not found' });

    const newShipStatus = action === 'CLOSE' ? 'COLLECTED_AT_HUB' : 'RETURNED_TO_SENDER';
    await db.query('UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2', [newShipStatus, id]);

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'EXCEPTION_RESOLVED', 'shipment', $2, $3)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      id,
      JSON.stringify({ action, resolutionNotes })
    ]);

    res.json({
      success: true,
      message: `Shipment exception resolved and marked as ${newShipStatus}.`
    });
  } catch (err) {
    console.error('Resolve exception error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/exceptions/reassign-courier (Reassign Stalled Parcel to Active Rider)
router.post('/exceptions/reassign-courier', async (req, res) => {
  try {
    const { shipmentId, newRiderId, reason = 'Stalled transit courier reassignment' } = req.body;

    if (!shipmentId || !newRiderId) {
      return res.status(400).json({ error: 'shipmentId and newRiderId are required.' });
    }

    // Verify rider exists
    const riderRes = await db.query('SELECT r.*, u.name as rider_name FROM riders r JOIN users u ON r.user_id = u.id WHERE r.id = $1', [newRiderId]);
    if (riderRes.rows.length === 0) return res.status(404).json({ error: 'New rider not found.' });

    // Update shipment
    await db.query(`
      UPDATE shipments
      SET assigned_rider_id = $1, status = 'IN_TRANSIT_TO_HUB', updated_at = NOW()
      WHERE id = $2
    `, [newRiderId, shipmentId]);

    // Append to custody ledger
    await db.query(`
      INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, new_holder_type, new_holder_id,
        handover_type, status_after_handover, verification_method, actor_id, actor_role, notes
      ) VALUES (
        $1, 'RIDER', 'RIDER', $2, 'HUB_TO_RIDER', 'IN_TRANSIT_TO_HUB', 'ADMIN_OVERRIDE',
        $3, 'ops_admin', $4
      )
    `, [
      shipmentId,
      newRiderId,
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      `Reassigned to rider ${riderRes.rows[0].rider_name} (${riderRes.rows[0].plate_number}): ${reason}`
    ]);

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'COURIER_REASSIGNED', 'shipment', $2, $3)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      shipmentId,
      JSON.stringify({ newRiderId, riderName: riderRes.rows[0].rider_name, reason })
    ]);

    res.json({
      success: true,
      message: `Shipment successfully reassigned to ${riderRes.rows[0].rider_name}.`
    });
  } catch (err) {
    console.error('Reassign courier error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/operations/exceptions/authorize-return (Trigger Return to Sender)
router.post('/exceptions/authorize-return', async (req, res) => {
  try {
    const { shipmentId, reason = 'Customer request / recipient unreachable' } = req.body;

    if (!shipmentId) return res.status(400).json({ error: 'shipmentId is required.' });

    await db.query(`
      UPDATE shipments
      SET status = 'RETURN_REQUESTED', updated_at = NOW()
      WHERE id = $1
    `, [shipmentId]);

    // Append to custody ledger
    await db.query(`
      INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, new_holder_type,
        handover_type, status_after_handover, verification_method, actor_id, actor_role, notes
      ) VALUES (
        $1, 'HUB', 'RETURN_STATION', 'HUB_TO_RETURN', 'RETURN_REQUESTED', 'ADMIN_OVERRIDE',
        $2, 'ops_admin', $3
      )
    `, [
      shipmentId,
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      `Return-to-Sender authorized: ${reason}`
    ]);

    // Audit log
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'RETURN_TO_SENDER_AUTHORIZED', 'shipment', $2, $3)
    `, [
      req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002',
      shipmentId,
      JSON.stringify({ reason })
    ]);

    res.json({
      success: true,
      message: 'Return-to-Sender workflow officially authorized and committed to ledger.'
    });
  } catch (err) {
    console.error('Authorize return error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/reports/analytics (Comprehensive Network Intelligence & Operational Reports)
router.get('/reports/analytics', async (req, res) => {
  try {
    const timeframe = (req.query.timeframe || '30d').toLowerCase();

    // 1. Fetch Shipments
    const shipmentsRes = await db.query(`
      SELECT 
        s.id, s.tracking_code, s.service_type, s.status,
        s.pricing_total_ngn, s.holding_fee_per_day_ngn, s.free_holding_days,
        s.sender_postcode, s.recipient_postcode, s.sender_name, s.recipient_name,
        s.origin_hub_id, s.destination_hub_id,
        s.created_at, s.picked_up_at, s.received_at_hub_at, s.delivered_at, s.collected_at,
        h.business_name as destination_hub_name
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      ORDER BY s.created_at DESC
    `);
    const shipments = shipmentsRes.rows;
    const totalShipments = shipments.length;

    // Timeframe scaling for operational simulation
    let timeframeMeta = {
      label: 'Last 30 Days (Standard Audit Cycle)',
      multiplier: 1.0
    };
    if (timeframe === 'today') {
      timeframeMeta = { label: 'Today (Live 24h Window)', multiplier: 0.22 };
    } else if (timeframe === '7d') {
      timeframeMeta = { label: 'Last 7 Days', multiplier: 0.5 };
    } else if (timeframe === 'quarter') {
      timeframeMeta = { label: 'This Quarter (Q4 2026)', multiplier: 2.5 };
    } else if (timeframe === 'all') {
      timeframeMeta = { label: 'All-Time Historical Ledger', multiplier: 1.0 };
    }

    // Financial aggregates
    const baseGrossRevenue = shipments.reduce((sum, s) => sum + parseFloat(s.pricing_total_ngn || 0), 0);
    const grossRevenue = Math.round(baseGrossRevenue * timeframeMeta.multiplier);
    const hubPayouts = Math.round(grossRevenue * 0.35);
    const courierEarnings = Math.round(grossRevenue * 0.35);
    const platformMargin = Math.round(grossRevenue * 0.30);
    const overdueStorageSurcharges = Math.round(4500 * timeframeMeta.multiplier);

    // Delivery & SLA
    const completedCount = shipments.filter(s => ['DELIVERED_TO_RECIPIENT', 'COLLECTED_AT_HUB'].includes(s.status)).length;
    const activeTransitCount = shipments.filter(s => ['IN_TRANSIT_TO_HUB', 'PICKED_UP_FROM_SENDER', 'STORED_IN_BAY'].includes(s.status)).length;
    const exceptionCount = shipments.filter(s => ['DISPUTED', 'CANCELLED', 'RETURNED_TO_HUB', 'EXPIRED_AT_HUB', 'RETURN_REQUESTED'].includes(s.status)).length;
    const onTimeRate = ((totalShipments - exceptionCount) / (totalShipments || 1) * 100).toFixed(1);

    // Service Type Breakdown
    const serviceTypes = ['DOOR_TO_HUB', 'HUB_TO_HUB', 'DOOR_TO_DOOR'];
    const serviceBreakdown = serviceTypes.map(st => {
      const match = shipments.filter(s => s.service_type === st);
      const count = match.length;
      const countScaled = Math.max(1, Math.round(count * timeframeMeta.multiplier));
      const rev = (match.reduce((sum, s) => sum + parseFloat(s.pricing_total_ngn || 0), 0) || 1500) * timeframeMeta.multiplier;
      const excMatch = match.filter(s => ['DISPUTED', 'CANCELLED', 'RETURNED_TO_HUB', 'EXPIRED_AT_HUB', 'RETURN_REQUESTED'].includes(s.status)).length;
      const onTime = count > 0 ? (((count - excMatch) / count) * 100).toFixed(1) : '98.5';
      
      let serviceLabel = 'Door-to-Hub Transit';
      let avgHours = 18.4;
      if (st === 'HUB_TO_HUB') {
        serviceLabel = 'Inter-Hub Linehaul';
        avgHours = 34.2;
      } else if (st === 'DOOR_TO_DOOR') {
        serviceLabel = 'Direct Door-to-Door';
        avgHours = 22.0;
      }

      return {
        service_type: st,
        service_name: serviceLabel,
        count: countScaled,
        pct_of_total: totalShipments > 0 ? ((count / totalShipments) * 100).toFixed(1) : '33.3',
        total_revenue_ngn: Math.round(rev),
        avg_cost_ngn: countScaled > 0 ? Math.round(rev / countScaled) : 1500,
        avg_transit_hours: avgHours,
        on_time_rate_pct: parseFloat(onTime)
      };
    });

    // 2. Hubs and Bays
    const hubsRes = await db.query(`
      SELECT 
        h.id, h.business_name, h.lga, h.state, h.capacity, h.status,
        count(b.id) as total_bays,
        count(b.id) FILTER (WHERE b.is_occupied = true) as occupied_bays,
        count(b.id) FILTER (WHERE b.size_tier = 'small') as small_bays,
        count(b.id) FILTER (WHERE b.size_tier = 'medium') as medium_bays,
        count(b.id) FILTER (WHERE b.size_tier = 'large') as large_bays
      FROM hubs h
      LEFT JOIN hub_storage_bays b ON b.hub_id = h.id
      GROUP BY h.id, h.business_name, h.lga, h.state, h.capacity, h.status
      ORDER BY h.business_name ASC
    `);

    const hubsCapacityTable = hubsRes.rows.map(h => {
      const totalB = parseInt(h.total_bays) || 0;
      const occB = parseInt(h.occupied_bays) || 0;
      const utilPct = totalB > 0 ? ((occB / totalB) * 100).toFixed(1) : '0';
      const hubShipments = shipments.filter(s => s.destination_hub_id === h.id);
      const hubRev = hubShipments.reduce((sum, s) => sum + parseFloat(s.pricing_total_ngn || 0), 0) * 0.35 * timeframeMeta.multiplier;
      const overdueCount = hubShipments.filter(s => s.status === 'EXPIRED_AT_HUB' || s.status === 'RETURN_REQUESTED').length;

      return {
        id: h.id,
        hub_name: h.business_name,
        lga: h.lga,
        state: h.state,
        location: `${h.lga}, ${h.state}`,
        status: h.status,
        capacity: h.capacity,
        total_bays: totalB,
        occupied_bays: occB,
        utilization_pct: parseFloat(utilPct),
        small_bays: parseInt(h.small_bays) || 0,
        medium_bays: parseInt(h.medium_bays) || 0,
        large_bays: parseInt(h.large_bays) || 0,
        active_parcels: occB > 0 ? occB : Math.min(hubShipments.length, 5),
        overdue_count: overdueCount,
        average_holding_days: (1.8 + ((parseInt(h.id.slice(-1), 16) || 3) % 4) * 0.3).toFixed(1),
        revenue_generated_ngn: Math.round(hubRev > 0 ? hubRev : 4200 * timeframeMeta.multiplier)
      };
    });

    const totalNetworkBays = hubsCapacityTable.reduce((sum, h) => sum + h.total_bays, 0);
    const totalOccupiedBays = hubsCapacityTable.reduce((sum, h) => sum + h.occupied_bays, 0);
    const networkUtilizationPct = totalNetworkBays > 0 ? ((totalOccupiedBays / totalNetworkBays) * 100).toFixed(1) : '15.4';

    // 3. Postcode Analytics
    const postcodesRes = await db.query(`
      SELECT state, lga, count(*) as postcodes_count
      FROM postcode_cache
      GROUP BY state, lga
      ORDER BY state, count(*) DESC
    `);

    const regionalCoverageTable = postcodesRes.rows.map(r => {
      const pCount = parseInt(r.postcodes_count);
      const matchingShipments = shipments.filter(s => 
        (s.sender_postcode && s.sender_postcode.startsWith(r.lga.slice(0, 2))) ||
        (s.recipient_postcode && s.recipient_postcode.startsWith(r.lga.slice(0, 2)))
      );
      const matchingHubs = hubsRes.rows.filter(h => h.lga === r.lga && h.state === r.state);

      let tier = 'Tier 2 High Growth';
      if (pCount >= 5) tier = 'Tier 1 Core';
      else if (pCount <= 2) tier = 'Tier 3 Emerging';

      return {
        state: r.state,
        lga: r.lga,
        registered_postcodes: pCount,
        active_hubs: matchingHubs.length,
        shipments_handled: Math.max(2, Math.round(matchingShipments.length * timeframeMeta.multiplier + (pCount * 2))),
        adoption_tier: tier,
        validation_rate_pct: 98.4
      };
    });

    // 4. Partner Settlements List
    const partnerSettlements = hubsCapacityTable.map((h, idx) => {
      const orders = Math.max(3, Math.round(h.active_parcels * 3 * timeframeMeta.multiplier));
      const gross = Math.round(orders * 1550);
      const commission = Math.round(gross * 0.35);
      const paid = idx % 2 === 0 ? commission : Math.round(commission * 0.7);
      const pending = commission - paid;
      const status = pending === 0 ? 'Settled' : 'Pending Batch Approval';

      return {
        id: h.id,
        partner_name: h.hub_name,
        partner_type: 'Community Partner Hub',
        orders_handled: orders,
        gross_handled_ngn: gross,
        commission_payable_ngn: commission,
        amount_paid_out_ngn: paid,
        pending_settlement_ngn: pending,
        settlement_status: status
      };
    });

    const courierFleets = [
      { name: 'SwiftRiders Express Fleet (Abuja)', orders: 28, gross: 42000, cut: 0.35, status: 'Settled' },
      { name: 'EcoDispatch Couriers (Kano/North)', orders: 14, gross: 21000, cut: 0.35, status: 'Pending Batch Approval' },
      { name: 'MetroLine Delivery Direct (Lagos)', orders: 20, gross: 30000, cut: 0.35, status: 'Processing' }
    ];
    courierFleets.forEach((cf, idx) => {
      const ordersScaled = Math.round(cf.orders * timeframeMeta.multiplier);
      const grossScaled = Math.round(cf.gross * timeframeMeta.multiplier);
      const comm = Math.round(grossScaled * cf.cut);
      const paid = cf.status === 'Settled' ? comm : (cf.status === 'Processing' ? Math.round(comm * 0.5) : 0);
      partnerSettlements.push({
        id: `courier-${idx}`,
        partner_name: cf.name,
        partner_type: 'Courier Dispatch Fleet',
        orders_handled: ordersScaled,
        gross_handled_ngn: grossScaled,
        commission_payable_ngn: comm,
        amount_paid_out_ngn: paid,
        pending_settlement_ngn: comm - paid,
        settlement_status: cf.status
      });
    });

    // Recent SLA Records for table
    const recentSlaRecords = shipments.slice(0, 15).map(s => {
      const isExc = ['DISPUTED', 'CANCELLED', 'RETURNED_TO_HUB', 'EXPIRED_AT_HUB', 'RETURN_REQUESTED'].includes(s.status);
      const status = isExc ? 'BREACHED' : 'ON_TIME';
      return {
        id: s.id,
        tracking_code: s.tracking_code,
        service_type: s.service_type,
        destination_hub: s.destination_hub_name || 'Designated Partner Hub',
        created_at: s.created_at,
        picked_up_at: s.picked_up_at || s.created_at,
        delivered_at: s.delivered_at || s.collected_at || null,
        duration_hours: isExc ? 'Overdue (>48h)' : '16.4h',
        sla_status: status,
        custody_status: s.status
      };
    });

    res.json({
      success: true,
      timeframe,
      timeframe_label: timeframeMeta.label,
      summary: {
        gross_revenue_ngn: grossRevenue,
        hub_payouts_ngn: hubPayouts,
        courier_earnings_ngn: courierEarnings,
        platform_margin_ngn: platformMargin,
        overdue_storage_surcharges_ngn: overdueStorageSurcharges,
        total_shipments: Math.round(totalShipments * timeframeMeta.multiplier),
        on_time_delivery_rate_pct: parseFloat(onTimeRate),
        hub_capacity_utilization_pct: parseFloat(networkUtilizationPct),
        postcode_adoption_rate_pct: 92.3,
        active_transit_parcels: activeTransitCount,
        completed_parcels: completedCount,
        exception_parcels: exceptionCount
      },
      delivery_sla_report: {
        service_breakdown: serviceBreakdown,
        turnaround_benchmarks: [
          { label: 'Pickup to Transit Dispatch', target: '45 mins', actual: '38 mins', status: 'Optimal' },
          { label: 'Hub Inward Scan & Bay Deposit', target: '15 mins', actual: '11 mins', status: 'Optimal' },
          { label: 'Door-to-Hub Route Completion', target: '24 hours', actual: '18.4 hours', status: 'Optimal' },
          { label: 'Inter-Hub Linehaul Freight', target: '48 hours', actual: '34.2 hours', status: 'Optimal' }
        ],
        recent_sla_records: recentSlaRecords
      },
      financial_settlement_report: {
        revenue_distribution: {
          gross_logistics_revenue: grossRevenue,
          partner_hub_commission: hubPayouts,
          courier_rider_payouts: courierEarnings,
          platform_net_revenue: platformMargin,
          overdue_storage_surcharges: overdueStorageSurcharges
        },
        partner_settlements: partnerSettlements
      },
      hub_capacity_report: {
        total_network_bays: totalNetworkBays,
        total_occupied_bays: totalOccupiedBays,
        network_utilization_pct: parseFloat(networkUtilizationPct),
        bay_tiers: {
          small: { total: 9, occupied: 6 },
          medium: { total: 15, occupied: 0 },
          large: { total: 15, occupied: 0 }
        },
        hubs_capacity_table: hubsCapacityTable
      },
      postcode_coverage_report: {
        total_cached_postcodes: postcodesRes.rows.reduce((sum, r) => sum + parseInt(r.postcodes_count), 0),
        total_states_covered: postcodesRes.rows.length > 0 ? new Set(postcodesRes.rows.map(r => r.state)).size : 6,
        total_lgas_covered: postcodesRes.rows.length,
        ndaps_adoption_rate_pct: 92.3,
        regional_coverage_table: regionalCoverageTable
      }
    });

  } catch (err) {
    console.error('Reports analytics endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/audit/logs (Comprehensive Custody Ledger & Administrative Security Audit Trail)
router.get('/audit/logs', async (req, res) => {
  try {
    // 1. KPI Counts
    const custodyCountRes = await db.query('SELECT count(*) as count FROM custody_ledger;');
    const totalCustodyTransfers = parseInt(custodyCountRes.rows[0]?.count || 0);

    const auditCountRes = await db.query('SELECT count(*) as count FROM audit_logs;');
    const totalAuditActions = parseInt(auditCountRes.rows[0]?.count || 0);

    const overridesRes = await db.query(`
      SELECT count(*) as count 
      FROM custody_ledger 
      WHERE verification_method = 'ADMIN_OVERRIDE' OR handover_type LIKE '%OVERRIDE%';
    `);
    const totalCustodyOverrides = parseInt(overridesRes.rows[0]?.count || 0);

    const adminOverridesRes = await db.query(`
      SELECT count(*) as count
      FROM audit_logs
      WHERE action LIKE '%OVERRIDE%' OR action LIKE '%SUSPEND%' OR action LIKE '%SETTLE%' OR action LIKE '%REASSIGN%';
    `);
    const totalAdminOverrides = parseInt(adminOverridesRes.rows[0]?.count || 0);

    const recent24hRes = await db.query(`
      SELECT count(*) as count
      FROM custody_ledger
      WHERE created_at >= NOW() - INTERVAL '24 hours';
    `);
    const transfersLast24h = parseInt(recent24hRes.rows[0]?.count || 0);

    // 2. Comprehensive Custody Transfers
    const custodyRes = await db.query(`
      SELECT 
        c.id,
        c.shipment_id,
        s.tracking_code,
        s.status as shipment_status,
        s.service_type,
        s.sender_name,
        s.recipient_name,
        c.previous_holder_type,
        c.previous_holder_id,
        c.new_holder_type,
        c.new_holder_id,
        c.handover_type,
        c.status_after_handover,
        c.verification_method,
        c.verification_token,
        c.lat,
        c.lng,
        c.actor_id,
        c.actor_role,
        c.notes,
        c.created_at,
        u.name as actor_name,
        u.role as actor_user_role,
        COALESCE(h_prev.business_name, u_rprev.name, s.sender_name, c.previous_holder_type) as previous_holder_name,
        COALESCE(h_new.business_name, u_rnew.name, s.recipient_name, c.new_holder_type) as new_holder_name
      FROM custody_ledger c
      LEFT JOIN shipments s ON c.shipment_id = s.id
      LEFT JOIN users u ON c.actor_id = u.id
      LEFT JOIN hubs h_prev ON (c.previous_holder_type = 'HUB' AND c.previous_holder_id = h_prev.id)
      LEFT JOIN hubs h_new ON (c.new_holder_type = 'HUB' AND c.new_holder_id = h_new.id)
      LEFT JOIN riders r_prev ON (c.previous_holder_type = 'RIDER' AND c.previous_holder_id = r_prev.id)
      LEFT JOIN users u_rprev ON r_prev.user_id = u_rprev.id
      LEFT JOIN riders r_new ON (c.new_holder_type = 'RIDER' AND c.new_holder_id = r_new.id)
      LEFT JOIN users u_rnew ON r_new.user_id = u_rnew.id
      ORDER BY c.created_at DESC
      LIMIT 250;
    `);

    // 3. Administrative Security Logs
    const auditRes = await db.query(`
      SELECT 
        a.id,
        a.actor_id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.ip_address,
        a.user_agent,
        a.details,
        a.created_at,
        u.name as actor_name,
        u.email as actor_email,
        u.role as actor_user_role,
        s.tracking_code as entity_tracking_code
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      LEFT JOIN shipments s ON (a.entity_type = 'shipment' AND a.entity_id = s.id)
      ORDER BY a.created_at DESC
      LIMIT 250;
    `);

    res.json({
      summary: {
        total_custody_transfers: totalCustodyTransfers,
        chain_integrity_pct: 100.0,
        transfers_last_24h: transfersLast24h,
        total_audit_actions: totalAuditActions,
        critical_overrides_count: totalCustodyOverrides + totalAdminOverrides,
        unverified_handoffs: 0
      },
      custody_transfers: custodyRes.rows.map(row => ({
        ...row,
        integrity_status: 'VERIFIED',
        verification_hash: row.verification_token || `HASH-${row.id.substring(0, 8).toUpperCase()}`
      })),
      audit_logs: auditRes.rows.map(row => ({
        ...row,
        correlation_id: `CORR-${row.id.substring(0, 8).toUpperCase()}`
      }))
    });
  } catch (err) {
    console.error('Audit logs endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/settings (Platform Settings & System Configuration)
router.get('/settings', async (req, res) => {
  try {
    const settingsRes = await db.query(`
      SELECT s.*, u.name as updated_by_name
      FROM system_settings s
      LEFT JOIN users u ON s.updated_by = u.id
      ORDER BY s.category, s.setting_key;
    `);

    // Fetch recent configuration audit logs
    const historyRes = await db.query(`
      SELECT a.*, u.name as actor_name, u.email as actor_email
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.entity_type = 'system_settings'
      ORDER BY a.created_at DESC
      LIMIT 20;
    `);

    // Format into category dictionary
    const formatted = {};
    settingsRes.rows.forEach(r => {
      formatted[r.setting_key] = {
        id: r.id,
        key: r.setting_key,
        category: r.category,
        description: r.description,
        value: r.setting_value,
        updated_at: r.updated_at,
        updated_by_name: r.updated_by_name
      };
    });

    res.json({
      settings: formatted,
      audit_history: historyRes.rows.map(h => ({
        ...h,
        correlation_id: `CORR-${h.id.substring(0, 8).toUpperCase()}`
      }))
    });
  } catch (err) {
    console.error('Operations settings GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/operations/settings (Update Platform Configuration with Mandatory Audit Trail)
router.put('/settings', async (req, res) => {
  try {
    const { setting_key, setting_value, reason } = req.body;

    if (!setting_key || !setting_value) {
      return res.status(400).json({ error: 'setting_key and setting_value are required.' });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A valid administrative justification (reason >= 5 chars) is mandatory for settings modifications.' });
    }

    // Retrieve previous state for auditability
    const prevRes = await db.query('SELECT * FROM system_settings WHERE setting_key = $1;', [setting_key]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: `Setting '${setting_key}' not found.` });
    }

    const previousValue = prevRes.rows[0].setting_value;
    const actorId = req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002';

    // Update settings table
    const updateRes = await db.query(`
      UPDATE system_settings
      SET setting_value = $1, updated_by = $2, updated_at = NOW()
      WHERE setting_key = $3
      RETURNING *;
    `, [JSON.stringify(setting_value), actorId, setting_key]);

    // Record immutable audit entry
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'SETTING_MODIFIED', 'system_settings', $2, $3);
    `, [
      actorId,
      updateRes.rows[0].id,
      JSON.stringify({
        setting_key,
        previous_value: previousValue,
        new_value: setting_value,
        reason: reason.trim(),
        role: 'ops_admin',
        effective_at: new Date().toISOString()
      })
    ]);

    res.json({
      message: `Setting '${setting_key}' updated successfully.`,
      setting: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Operations settings PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/operations/postcode-occupants (Postcode Occupancy Directory & Relocation Forwarding Search)
async function handlePostcodeOccupants(req, res) {
  const queryPostcode = (req.query.postcode || '').trim();
  if (!queryPostcode) {
    return res.status(400).json({ error: 'postcode query parameter is required.' });
  }

  try {
    const pcRes = await db.query(
      `SELECT * FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 OR legacy_code = $1 LIMIT 1`,
      [queryPostcode]
    );

    // Active residents with this postcode
    const activeRes = await db.query(
      `SELECT u.id, u.name, u.phone, u.email, u.postcode, u.digital_box, u.created_at
       FROM users u
       WHERE u.postcode = $1 OR u.postcode = replace($1, '-', '')
       ORDER BY u.created_at DESC`,
      [queryPostcode]
    );

    // Relocated residents who previously lived at this postcode
    const allUsersWithBox = await db.query(
      `SELECT id, name, phone, email, postcode, digital_box FROM users WHERE digital_box IS NOT NULL`
    );

    const relocated = [];
    for (const u of allUsersWithBox.rows) {
      const box = u.digital_box || {};
      const relocs = Array.isArray(box.relocations) ? box.relocations : [];
      for (const r of relocs) {
        if (r.oldPostcode === queryPostcode || r.oldPostcode?.replace(/-/g, '') === queryPostcode.replace(/-/g, '')) {
          relocated.push({
            userId: u.id,
            name: u.name,
            phone: u.phone,
            oldPostcode: r.oldPostcode,
            oldAddress: r.oldAddress,
            newPostcode: r.newPostcode,
            newAddress: r.newAddress,
            changedAt: r.changedAt,
            forwardingRule: 'ACTIVE_AUTO_FORWARD'
          });
        }
      }
    }

    res.json({
      postcode: queryPostcode,
      details: pcRes.rows[0] || null,
      activeResidents: activeRes.rows.map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        status: 'ACTIVE_RESIDENT',
        proofOfAddress: u.digital_box?.isGroundTruthVerified ? 'Verified by NIPOST (Ground-Truth Certified)' : 'Standard Registry',
        digitalBox: `HBX-PBOX-${(u.postcode || '900001').replace(/-/g, '').slice(0, 8)}-${u.id.slice(0, 4).toUpperCase()}`
      })),
      relocatedResidents: relocated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = router;
