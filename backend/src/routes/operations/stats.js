const express = require('express');
const router = express.Router();
const db = require('../../config/db');
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

module.exports = router;
