const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const digitalBoxService = require('../services/digitalBoxService');

// POST /api/v1/verification/submit
router.post('/submit', authenticate, async (req, res) => {
  const {
    entityType, // 'user', 'hub', 'rider', 'courier'
    entityId,
    track,      // 'TRACK_A_ADDRESS', 'TRACK_B_REGULATORY', 'TRACK_C_ACCREDITATION'
    documentType, // 'NIN', 'CAC_CERTIFICATE', 'DRIVERS_LICENSE', etc.
    documentNumber,
    documentUrl
  } = req.body;

  if (!entityType || !entityId || !track || !documentType) {
    return res.status(400).json({ error: 'entityType, entityId, track, and documentType are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO verification_records (
         entity_type, entity_id, track, document_type, document_number, document_url, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       RETURNING *`,
      [entityType, entityId, track, documentType, documentNumber || null, documentUrl || null]
    );

    res.status(201).json({
      message: 'Verification document submitted successfully.',
      record: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit document: ' + err.message });
  }
});

// GET /api/v1/verification/certificate/:serial
// Public verification endpoint. A bank or service provider scans the QR code on
// a Proof of Address certificate and lands here.
router.get('/certificate/:serial', async (req, res) => {
  try {
    const certRes = await db.query(
      'SELECT * FROM proof_of_address_certificates WHERE certificate_serial = $1 LIMIT 1',
      [String(req.params.serial || '').trim().toUpperCase()]
    );
    const certificate = certRes.rows[0];
    if (!certificate) {
      return res.status(404).json({ valid: false, reason: 'No certificate exists for that serial.' });
    }

    const boxRes = await db.query('SELECT * FROM digital_boxes WHERE id = $1', [certificate.box_id]);
    const box = boxRes.rows[0];
    const userRes = await db.query('SELECT id, name, postcode FROM users WHERE id = $1', [certificate.user_id]);
    const user = userRes.rows[0];

    const now = new Date();
    const expired = new Date(certificate.expires_at) < now;
    const valid = certificate.status === 'ACTIVE' && !expired && Boolean(box && box.is_ground_truth_verified);

    res.json({
      valid,
      reason: valid ? null : (expired ? 'This certificate has expired.' : 'This certificate is not active.'),
      certificate: {
        serial: certificate.certificate_serial,
        holderName: user ? user.name : null,
        digitalBoxNumber: box ? box.box_number : null,
        postcode: certificate.postcode,
        address: certificate.address_text,
        district: certificate.district,
        lga: certificate.lga,
        state: certificate.state,
        lat: certificate.lat != null ? Number(certificate.lat) : null,
        lng: certificate.lng != null ? Number(certificate.lng) : null,
        issuedAt: certificate.issued_at,
        expiresAt: certificate.expires_at,
        status: certificate.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compliance review endpoints are restricted to compliance officers and admins.
router.use(authenticate, requireRoles('compliance_officer', 'super_admin'));

// GET /api/v1/verification/stats (High-level queue KPI metrics)
router.get('/stats', async (req, res) => {
  try {
    const statsRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'PENDING') as pending,
        count(*) FILTER (WHERE status = 'PENDING' AND track = 'TRACK_A_ADDRESS') as pending_track_a,
        count(*) FILTER (WHERE status = 'PENDING' AND track = 'TRACK_B_REGULATORY') as pending_track_b,
        count(*) FILTER (WHERE status = 'PENDING' AND track = 'TRACK_C_ACCREDITATION') as pending_track_c,
        count(*) FILTER (WHERE status = 'APPROVED') as approved,
        count(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM verification_records
    `);
    res.json({ stats: statsRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/verification/seed (Seed 9 Authoritative Pending Verification Dossiers)
router.post('/seed', async (req, res) => {
  try {
    const hub7Id = 'b0000000-0000-0000-0000-000000000007';
    await db.query("UPDATE hubs SET status = 'pending' WHERE id = $1", [hub7Id]);

    const rider5Id = 'c0000000-0000-0000-0000-000000000005';
    await db.query("UPDATE riders SET status = 'pending' WHERE id = $1", [rider5Id]);

    // Clear existing pending records so we have exactly the clean 9 authoritative records
    await db.query("DELETE FROM verification_records WHERE status = 'PENDING'");

    const pendingRecords = [
      // Track A - Address & Location Proof (3)
      {
        id: 'd0000001-0000-0000-0000-000000000001',
        entity_type: 'hub',
        entity_id: hub7Id,
        track: 'TRACK_A_ADDRESS',
        document_type: 'PROOF_OF_ADDRESS',
        document_number: 'EK-UTIL-992014-VI',
        document_url: 'https://images.unsplash.com/photo-1554415707-9e49017aed81?w=800',
        status: 'PENDING',
        notes: 'Eko Electricity Distribution (EKEDC) Commercial Utility Bill for Plot 42 Adeola Odeku St, matching NDAPS LA-01-B03-VI-02.'
      },
      {
        id: 'd0000001-0000-0000-0000-000000000002',
        entity_type: 'rider',
        entity_id: rider5Id,
        track: 'TRACK_A_ADDRESS',
        document_type: 'PROOF_OF_ADDRESS',
        document_number: 'TEN-KNO-2026-88',
        document_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800',
        status: 'PENDING',
        notes: 'Residential Tenancy Agreement & Estate Certificate at NDAPS KN-01-A01-DR-01 (Dala, Kano).'
      },
      {
        id: 'd0000001-0000-0000-0000-000000000003',
        entity_type: 'hub',
        entity_id: 'b0000000-0000-0000-0000-000000000004', // Garki Area 1
        track: 'TRACK_A_ADDRESS',
        document_type: 'PROOF_OF_ADDRESS',
        document_number: 'FCT-WAT-881902-GK',
        document_url: 'https://images.unsplash.com/photo-1554415707-9e49017aed81?w=800',
        status: 'PENDING',
        notes: 'FCT Water Board Commercial Utility Statement and Property Boundary Proof at NDAPS FC-01-B04-GR-01.'
      },

      // Track B - Regulatory KYC & Government Credentials (3)
      {
        id: 'd0000001-0000-0000-0000-000000000004',
        entity_type: 'rider',
        entity_id: rider5Id,
        track: 'TRACK_B_REGULATORY',
        document_type: 'DRIVERS_LICENSE',
        document_number: 'DL-55291039-KN',
        document_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
        status: 'PENDING',
        notes: 'Federal Road Safety Corps (FRSC) Commercial Motorcycle Rider License. Expiry: 12/2028.'
      },
      {
        id: 'd0000001-0000-0000-0000-000000000005',
        entity_type: 'hub',
        entity_id: hub7Id,
        track: 'TRACK_B_REGULATORY',
        document_type: 'CAC_CERTIFICATE',
        document_number: 'RC-1928402',
        document_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
        status: 'PENDING',
        notes: 'Corporate Affairs Commission (CAC) Certificate of Incorporation for Victoria Island Tech Mart Ltd.'
      },
      {
        id: 'd0000001-0000-0000-0000-000000000006',
        entity_type: 'rider',
        entity_id: 'c0000000-0000-0000-0000-000000000001', // Musa Danladi (Revalidation)
        track: 'TRACK_B_REGULATORY',
        document_type: 'NIN',
        document_number: 'NIN-88291049281',
        document_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
        status: 'PENDING',
        notes: 'National Identity Management Commission (NIMC) National Identification Slip with biometric verification.'
      },

      // Track C - Hotbox Hub Physical Accreditation & Inspections (3)
      {
        id: 'd0000001-0000-0000-0000-000000000007',
        entity_type: 'hub',
        entity_id: hub7Id,
        track: 'TRACK_C_ACCREDITATION',
        document_type: 'PHYSICAL_INSPECTION_REPORT',
        document_number: 'CAC-BN-9920184',
        document_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
        status: 'PENDING',
        notes: 'Physical on-site inspection report: 45 compartment parcel lockers, CCTV camera coverage, barcode scanner.'
      },
      {
        id: 'd0000001-0000-0000-0000-000000000008',
        entity_type: 'hub',
        entity_id: 'b0000000-0000-0000-0000-000000000004', // Garki Area 1
        track: 'TRACK_C_ACCREDITATION',
        document_type: 'HUB_SPACE_PHOTOS',
        document_number: 'PHOTO-ABJ-0419',
        document_url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800',
        status: 'PENDING',
        notes: 'High-resolution photographs of parcel holding bays, fire safety extinguisher, and exterior Hotbox signage.'
      },
      {
        id: 'd0000001-0000-0000-0000-000000000009',
        entity_type: 'hub',
        entity_id: 'b0000000-0000-0000-0000-000000000002', // Banex Plaza (Tier Upgrade)
        track: 'TRACK_C_ACCREDITATION',
        document_type: 'SECURITY_DEPOSIT',
        document_number: 'BOND-FC-77102',
        document_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
        status: 'PENDING',
        notes: 'Partner Security Deposit Bond and Host Guarantor Attestation Letter for High-Value Consignment vault clearance.'
      }
    ];

    for (const r of pendingRecords) {
      await db.query(`
        INSERT INTO verification_records (
          id, entity_type, entity_id, track, document_type, document_number, document_url, status, reviewer_notes, submitted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '4 hours'
        )
        ON CONFLICT (id) DO UPDATE SET
          status = 'PENDING',
          reviewer_notes = EXCLUDED.reviewer_notes,
          submitted_at = EXCLUDED.submitted_at
      `, [r.id, r.entity_type, r.entity_id, r.track, r.document_type, r.document_number, r.document_url, r.status, r.notes]);
    }

    res.json({
      success: true,
      message: 'Successfully seeded 9 authoritative statutory verification dossiers across Track A, B, and C.',
      counts: {
        pending_total: 9,
        pending_track_a: 3,
        pending_track_b: 3,
        pending_track_c: 3
      }
    });
  } catch (err) {
    console.error('Seed verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/verification/queue (Compliance / Ops Officer review queue with full entity resolution)
router.get('/queue', async (req, res) => {
  const { track, status = 'PENDING', search } = req.query;
  try {
    let whereClauses = [];
    let params = [];

    if (status && status !== 'ALL') {
      params.push(status);
      whereClauses.push(`v.status = $${params.length}`);
    }

    if (track && track !== 'ALL') {
      params.push(track);
      whereClauses.push(`v.track = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        v.*,
        CASE 
          WHEN v.entity_type = 'hub' THEN h.business_name
          WHEN v.entity_type = 'rider' THEN u_rider.name
          WHEN v.entity_type = 'user' THEN u.name
          ELSE 'Applicant Entity'
        END as applicant_name,
        CASE 
          WHEN v.entity_type = 'hub' THEN u_hub.phone
          WHEN v.entity_type = 'rider' THEN u_rider.phone
          WHEN v.entity_type = 'user' THEN u.phone
          ELSE ''
        END as applicant_phone,
        CASE 
          WHEN v.entity_type = 'hub' THEN u_hub.email
          WHEN v.entity_type = 'rider' THEN u_rider.email
          WHEN v.entity_type = 'user' THEN u.email
          ELSE ''
        END as applicant_email,
        CASE 
          WHEN v.entity_type = 'hub' THEN h.postcode
          WHEN v.entity_type = 'rider' THEN r.plate_number
          ELSE ''
        END as entity_identifier,
        h.postcode as hub_postcode,
        h.address_text as hub_address,
        r.plate_number as rider_plate,
        u_rev.name as reviewer_name
      FROM verification_records v
      LEFT JOIN hubs h ON (v.entity_type = 'hub' AND v.entity_id = h.id)
      LEFT JOIN users u_hub ON (h.owner_id = u_hub.id)
      LEFT JOIN riders r ON (v.entity_type = 'rider' AND v.entity_id = r.id)
      LEFT JOIN users u_rider ON (r.user_id = u_rider.id)
      LEFT JOIN users u ON (v.entity_type = 'user' AND v.entity_id = u.id)
      LEFT JOIN users u_rev ON (v.reviewed_by = u_rev.id)
      ${whereSql}
      ORDER BY 
        CASE WHEN v.status = 'PENDING' THEN 1 ELSE 2 END,
        v.submitted_at DESC
    `;

    const result = await db.query(query, params);
    let records = result.rows;

    // Optional text search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter(r => 
        (r.applicant_name && r.applicant_name.toLowerCase().includes(q)) ||
        (r.document_number && r.document_number.toLowerCase().includes(q)) ||
        (r.document_type && r.document_type.toLowerCase().includes(q)) ||
        (r.entity_identifier && r.entity_identifier.toLowerCase().includes(q)) ||
        (r.applicant_phone && r.applicant_phone.includes(q)) ||
        (r.reviewer_notes && r.reviewer_notes.toLowerCase().includes(q))
      );
    }

    // Aggregate statistics
    const statsRes = await db.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'PENDING') as pending,
        count(*) FILTER (WHERE status = 'PENDING' AND track = 'TRACK_A_ADDRESS') as pending_track_a,
        count(*) FILTER (WHERE status = 'PENDING' AND track = 'TRACK_B_REGULATORY') as pending_track_b,
        count(*) FILTER (WHERE status = 'PENDING' AND track = 'TRACK_C_ACCREDITATION') as pending_track_c,
        count(*) FILTER (WHERE status = 'APPROVED') as approved,
        count(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM verification_records
    `);

    res.json({
      records,
      total: records.length,
      counts: statsRes.rows[0]
    });
  } catch (err) {
    console.error('Verification queue error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/verification/review/:id (Approve or Reject document with audit trail)
router.post('/review/:id', async (req, res) => {
  const { status, notes, rejectionReason } = req.body; // 'APPROVED' or 'REJECTED'
  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be APPROVED or REJECTED.' });
  }

  const reviewerId = req.user.id;
  const fullNotes = rejectionReason 
    ? `Reason: ${rejectionReason}${notes ? ` | Notes: ${notes}` : ''}`
    : notes || `Actioned by Compliance Desk (${status})`;

  try {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const reviewRes = await client.query(
        `UPDATE verification_records 
         SET status = $1, reviewed_by = $2, reviewer_notes = $3, reviewed_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [status, reviewerId, fullNotes, req.params.id]
      );

      if (reviewRes.rows.length === 0) {
        throw new Error('Verification record not found.');
      }

      const record = reviewRes.rows[0];
      let issuesCertificate = false;

      // If approved, update entity operational status
      if (status === 'APPROVED') {
        if (record.entity_type === 'hub') {
          await client.query("UPDATE hubs SET status = 'accredited' WHERE id = $1", [record.entity_id]);
        } else if (record.entity_type === 'rider') {
          await client.query("UPDATE riders SET status = 'verified' WHERE id = $1", [record.entity_id]);
        } else if (record.entity_type === 'user') {
          await client.query("UPDATE users SET status = 'active' WHERE id = $1", [record.entity_id]);
          if (record.document_type === 'PHYSICAL_INSPECTION_REPORT') {
            await client.query(
              'UPDATE digital_boxes SET is_ground_truth_verified = TRUE, updated_at = NOW() WHERE user_id = $1',
              [record.entity_id]
            );
            issuesCertificate = true;
          }
        }
      }

      // Log into audit_logs table
      await client.query(`
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'verification_record', $3, $4)
      `, [
        reviewerId,
        `VERIFICATION_${status}`,
        req.params.id,
        JSON.stringify({
          entity_type: record.entity_type,
          entity_id: record.entity_id,
          track: record.track,
          document_type: record.document_type,
          notes: fullNotes
        })
      ]);

      await client.query('COMMIT');

      if (issuesCertificate) {
        const box = await digitalBoxService.ensureDigitalBox(record.entity_id);
        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [record.entity_id]);
        const owner = userRes.rows[0];
        const pcRes = await db.query(
          'SELECT * FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 OR legacy_code = $1 LIMIT 1',
          [owner ? owner.postcode : '']
        );
        const pc = pcRes.rows[0] || {};
        const hierarchy = { district: pc.neighbourhood, lga: pc.lga, state: pc.state };
        await digitalBoxService.issueCertificate({
          box: { id: box.id },
          user: owner,
          verificationRecordId: record.id,
          postcode: owner ? owner.postcode : null,
          addressText: pc.description || [pc.neighbourhood, pc.lga, pc.state].filter(Boolean).join(', '),
          hierarchy,
          lat: record.lat != null ? Number(record.lat) : (pc.lat != null ? Number(pc.lat) : null),
          lng: record.lng != null ? Number(record.lng) : (pc.lng != null ? Number(pc.lng) : null)
        });
      }

      res.json({
        success: true,
        message: `Verification record successfully updated to ${status}.`,
        record
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Review action error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
