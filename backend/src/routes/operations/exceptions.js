const express = require('express');
const router = express.Router();
const db = require('../../config/db');
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

module.exports = router;
