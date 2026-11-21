const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const { getEnterpriseStats } = require('./helpers');
const { parseBoxNumber } = require('../../utils/boxNumber');
const digitalBoxService = require('../../services/digitalBoxService');
const { generateOtp, otpExpiryFromNow } = require('../../utils/otp');
// POST /api/v1/enterprise/verify-address (B2B KYC Address Verification API)
router.post('/verify-address', authenticate, async (req, res) => {
  const { postcode, phone, name } = req.body;
  if (!postcode && !phone) {
    return res.status(400).json({ error: 'postcode, digital P.O. Box number, or phone number is required for address verification.' });
  }

  try {
    const cleanPostcode = postcode ? postcode.trim().toUpperCase() : null;
    const cleanPhone = phone ? phone.trim() : null;
    const boxNumberInput = cleanPostcode ? parseBoxNumber(cleanPostcode) : null;

    const userColumns = `
      u.id, u.name, u.phone, u.postcode,
      b.id AS box_id, b.box_number, b.is_ground_truth_verified,
      pc.neighbourhood, pc.lga, pc.state`;

    let userRes;
    if (cleanPhone) {
      userRes = await db.query(`
        SELECT ${userColumns}
        FROM users u
        LEFT JOIN digital_boxes b ON b.user_id = u.id
        LEFT JOIN postcode_cache pc ON (pc.postcode = u.postcode OR pc.ndaps_code = u.postcode)
        WHERE u.phone = $1 OR u.phone = $2
        LIMIT 1
      `, [cleanPhone, cleanPhone.replace('+234', '0')]);
    } else if (boxNumberInput) {
      userRes = await db.query(`
        SELECT ${userColumns}
        FROM digital_boxes b
        JOIN users u ON u.id = b.user_id
        LEFT JOIN postcode_cache pc ON (pc.postcode = u.postcode OR pc.ndaps_code = u.postcode)
        WHERE b.box_number = $1
        LIMIT 1
      `, [boxNumberInput]);
    } else {
      userRes = await db.query(`
        SELECT ${userColumns}
        FROM users u
        LEFT JOIN digital_boxes b ON b.user_id = u.id
        LEFT JOIN postcode_cache pc ON (pc.postcode = u.postcode OR pc.ndaps_code = u.postcode)
        WHERE u.postcode = $1
        LIMIT 1
      `, [cleanPostcode]);
    }

    const microChargeNgn = 150.00;
    const user = userRes.rows[0];

    if (!user) {
      const pcRes = await db.query('SELECT * FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 LIMIT 1', [cleanPostcode]);
      const pc = pcRes.rows[0];

      return res.json({
        verified: false,
        reason: 'No registered resident found matching these credentials',
        postcodeValid: Boolean(pc),
        hierarchy: pc ? { district: pc.neighbourhood, lga: pc.lga, state: pc.state } : null,
        feeChargedNgn: microChargeNgn
      });
    }

    const isGroundTruthVerified = Boolean(user.is_ground_truth_verified);
    const boxNumber = user.box_number;

    let relocationStatus = 'ACTIVE_RESIDENT';
    let forwardingPostcode = null;
    if (cleanPostcode && cleanPostcode !== user.postcode && user.box_id) {
      const relocations = await digitalBoxService.listRelocations(user.box_id);
      const pastReloc = relocations.find(
        (rel) => rel.old_postcode === cleanPostcode
          || String(rel.old_postcode || '').replace(/-/g, '') === cleanPostcode.replace(/-/g, '')
      );
      if (pastReloc) {
        relocationStatus = 'RELOCATED';
        forwardingPostcode = user.postcode;
      }
    }

    res.json({
      verified: true,
      citizenName: user.name,
      digitalBoxNumber: boxNumber,
      activePostcode: user.postcode,
      physicalAddress: user.neighbourhood ? `${user.neighbourhood}, ${user.lga}, ${user.state}` : 'Abuja, Nigeria',
      hierarchy: {
        district: user.neighbourhood || 'Wuse 2',
        lga: user.lga || 'Abuja Municipal',
        state: user.state || 'Federal Capital Territory'
      },
      proofOfAddressStatus: isGroundTruthVerified ? 'Ground-Truth Verified' : 'Registry Verified',
      isGroundTruthVerified,
      relocationStatus,
      forwardingPostcode,
      feeChargedNgn: microChargeNgn,
      verifiedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET /api/v1/enterprise/manifests
router.get('/manifests', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(`
      SELECT 
        m.*,
        COUNT(s.id)::int as actual_parcels
      FROM manifests m
      LEFT JOIN shipments s ON s.manifest_id = m.id
      WHERE m.sender_id = $1
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `, [userId]);
    res.json({ manifests: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch manifests: ' + err.message });
  }
});

// GET /api/v1/enterprise/manifests/:id/export
router.get('/manifests/:id/export', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const mRes = await db.query('SELECT * FROM manifests WHERE id = $1 AND sender_id = $2', [id, userId]);
    if (mRes.rows.length === 0) return res.status(404).json({ error: 'Manifest not found' });
    const manifest = mRes.rows[0];

    const shipRes = await db.query(`
      SELECT s.tracking_code, s.recipient_name, s.recipient_phone, s.recipient_postcode, s.recipient_address_text,
             h.business_name as hub_name, s.status, s.pricing_total_ngn, s.created_at
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      WHERE s.manifest_id = $1
      ORDER BY s.created_at DESC
    `, [id]);

    let csv = 'Tracking Code,Recipient Name,Recipient Phone,Recipient Postcode,Destination Hub,Status,Price NGN,Created At\n';
    for (const row of shipRes.rows) {
      csv += `"${row.tracking_code}","${row.recipient_name}","${row.recipient_phone}","${row.recipient_postcode}","${row.hub_name || 'N/A'}","${row.status}",${row.pricing_total_ngn},"${new Date(row.created_at).toISOString()}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${manifest.manifest_code}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export manifest: ' + err.message });
  }
});

// GET /api/v1/enterprise/shipments
router.get('/shipments', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;
    const { search, status, manifestId } = req.query;

    const conditions = ['s.sender_id = $1'];
    const params = [userId];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }

    if (manifestId && manifestId !== 'ALL') {
      params.push(manifestId);
      conditions.push(`s.manifest_id = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(s.tracking_code) LIKE $${params.length} OR LOWER(s.recipient_name) LIKE $${params.length} OR LOWER(s.recipient_postcode) LIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    // Counts across categories
    const countsRes = await db.query(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status IN ('IN_TRANSIT_TO_HUB', 'BOOKED', 'RIDER_ASSIGNED', 'PICKED_UP_FROM_SENDER', 'RECEIVED_AT_HUB') THEN 1 END)::int as active_count,
        COUNT(CASE WHEN status IN ('COLLECTED_AT_HUB', 'DELIVERED_TO_RECIPIENT') THEN 1 END)::int as delivered_count,
        COUNT(CASE WHEN status IN ('DISPUTED', 'CANCELLED', 'EXPIRED_AT_HUB') THEN 1 END)::int as disputed_count
      FROM shipments s
      WHERE s.sender_id = $1
    `, [userId]);
    const counts = countsRes.rows[0];

    // Filtered total count
    const filteredCountRes = await db.query(`SELECT COUNT(*)::int as count FROM shipments s WHERE ${whereClause}`, params);
    const filteredTotal = filteredCountRes.rows[0].count;

    // Paginated rows
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const query = `
      SELECT 
        s.id,
        s.tracking_code,
        s.service_type,
        s.recipient_name,
        s.recipient_phone,
        s.recipient_email,
        s.recipient_postcode,
        s.recipient_address_text,
        s.status,
        s.pricing_total_ngn,
        s.size,
        s.weight_kg,
        s.package_description,
        s.declared_value_ngn,
        s.created_at,
        s.manifest_id,
        m.manifest_code,
        h.business_name as destination_hub_name,
        h.postcode as destination_hub_postcode,
        h.neighbourhood as destination_hub_neighbourhood
      FROM shipments s
      LEFT JOIN manifests m ON s.manifest_id = m.id
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await db.query(query, params);

    res.json({
      shipments: result.rows,
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit),
      counts: {
        all: counts.total,
        inTransit: counts.active_count,
        delivered: counts.delivered_count,
        disputed: counts.disputed_count
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enterprise shipments: ' + err.message });
  }
});

// POST /api/v1/enterprise/shipments/bulk (Live batch insertion with real Manifest creation)
router.post('/shipments/bulk', authenticate, async (req, res) => {
  const { count = 5, customParcels = null } = req.body;
  const numParcels = customParcels && Array.isArray(customParcels) && customParcels.length > 0 
    ? customParcels.length 
    : Math.min(Math.max(1, parseInt(count, 10) || 5), 100);
  const userId = req.user.id;

  try {
    const accRes = await db.query('SELECT company_name FROM enterprise_accounts WHERE user_id = $1', [userId]);
    const companyName = accRes.rows[0]?.company_name || 'Konga Logistics Ltd Corp';

    const hubRes = await db.query("SELECT id, postcode, address_text, business_name FROM hubs WHERE status IN ('accredited', 'verified') LIMIT 6");
    const availableHubs = hubRes.rows;
    if (availableHubs.length === 0) {
      return res.status(400).json({ error: 'No operational hubs available for destination dispatch.' });
    }

    const inserted = [];
    let createdManifest = null;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const manifestCode = `MNF-${datePart}-${randomSuffix}`;
      
      const hubNames = Array.from(new Set(availableHubs.slice(0, 3).map(h => h.business_name))).join(', ');
      
      // 1. Create Manifest record
      const mRes = await client.query(`
        INSERT INTO manifests (manifest_code, sender_id, title, status, parcel_count, destination_hubs_summary, created_at)
        VALUES ($1, $2, $3, 'IN_TRANSIT', $4, $5, NOW())
        RETURNING *
      `, [
        manifestCode,
        userId,
        `Enterprise Scheduled Batch (${numParcels} Items)`,
        numParcels,
        hubNames
      ]);
      createdManifest = mRes.rows[0];

      // 2. Insert shipments linked to manifest
      for (let i = 0; i < numParcels; i++) {
        const destHub = availableHubs[i % availableHubs.length];
        const custom = customParcels && customParcels[i] ? customParcels[i] : null;

        const trackingCode = `HBX-FC01A0-${Math.floor(10000 + Math.random() * 90000)}`;
        const pickupOtp = generateOtp();
        const pickupOtpExpiresAt = otpExpiryFromNow();
        const deliveryOtp = generateOtp();
        const qrToken = `QR-TOKEN-${trackingCode}-${Math.random().toString(36).substring(2, 7)}`;

        const recipientName = custom?.recipientName || `Recipient ${i + 1} (${['Abuja', 'Lagos', 'Kano', 'Ibadan'][i % 4]})`;
        const recipientPhone = custom?.recipientPhone || `+23480${Math.floor(10000000 + Math.random() * 90000000)}`;
        const recipientEmail = custom?.recipientEmail || `order.${i + 1}@fulfillment-network.ng`;
        const recipientPostcode = custom?.recipientPostcode || destHub.postcode;
        const recipientAddress = custom?.recipientAddress || destHub.address_text;
        const desc = custom?.description || 'Konga Verified Merchant Fulfillment Order';
        const declaredVal = custom?.declaredValue ? parseFloat(custom.declaredValue) : 15000.00;

        const q = `
          INSERT INTO shipments (
            tracking_code, service_type, sender_id, sender_name, sender_phone,
            sender_postcode, sender_address_text, recipient_name, recipient_phone,
            recipient_email, recipient_postcode, recipient_address_text,
            destination_hub_id, size, weight_kg, package_description, declared_value_ngn,
            pickup_otp, pickup_otp_expires_at, delivery_otp, collection_qr_token, status, pricing_total_ngn, created_at, expires_at, manifest_id
          ) VALUES (
            $1, 'DOOR_TO_HUB', $2, $3, '+2348090001122',
            'FC-01-A03-FK-01', 'Plot 14 Idu Industrial Layout, Abuja FCT',
            $4, $5, $6, $7, $8,
            $9, 'medium', 1.5, $10, $11,
            $12, $13, $14, $15, 'IN_TRANSIT_TO_HUB', 1300.00, NOW(), NOW() + interval '5 days', $16
          ) RETURNING id, tracking_code, status, pricing_total_ngn
        `;
        const r = await client.query(q, [
          trackingCode, userId, companyName,
          recipientName, recipientPhone, recipientEmail,
          recipientPostcode, recipientAddress,
          destHub.id, desc, declaredVal,
          pickupOtp, pickupOtpExpiresAt, deliveryOtp, qrToken, createdManifest.id
        ]);
        inserted.push(r.rows[0]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const updatedStats = await getEnterpriseStats(userId);

    res.status(201).json({
      message: `Successfully ingested ${inserted.length} parcels into PostgreSQL with Manifest ${createdManifest.manifest_code}.`,
      batchId: createdManifest.manifest_code,
      manifest: createdManifest,
      totalProcessed: inserted.length,
      sampleTracking: inserted[0]?.tracking_code,
      shipments: inserted,
      stats: updatedStats
    });
  } catch (err) {
    res.status(500).json({ error: 'Bulk ingestion failed: ' + err.message });
  }
});

module.exports = router;
