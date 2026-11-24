const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const digitalBoxService = require('../services/digitalBoxService');
const settingsService = require('../services/settingsService');
const { missingRiderClearance } = require('../utils/riderClearance');
const { parseDocumentDataUrl } = require('../utils/documentUpload');
const documentStorage = require('../services/documentStorage');

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

  const rawDocumentUrl = typeof documentUrl === 'string' ? documentUrl.trim() : '';
  if (rawDocumentUrl.length > 2000) {
    return res.status(400).json({ error: 'Document link must be 2,000 characters or fewer.' });
  }

  let storedDocumentUrl = rawDocumentUrl || null;
  if (rawDocumentUrl.startsWith('data:')) {
    let parsed;
    try {
      parsed = parseDocumentDataUrl(rawDocumentUrl);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    try {
      const stored = await documentStorage.storeDocument({
        userId: req.user.id,
        kind: 'verification',
        mimeType: parsed.mimeType,
        bytes: parsed.bytes,
        hash: parsed.hash
      });
      storedDocumentUrl = stored ? stored.key : parsed.dataUrl;
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  } else if (rawDocumentUrl && !/^https?:\/\//i.test(rawDocumentUrl)) {
    return res.status(400).json({ error: 'Attach an uploaded document or provide a secure http(s) link.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO verification_records (
         entity_type, entity_id, track, document_type, document_number, document_url, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       RETURNING *`,
      [entityType, entityId, track, documentType, documentNumber || null, storedDocumentUrl]
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

// ---------------------------------------------------------------------------
// Field verifier work. A NIPOST field verifier works the postcode ground-truth
// queue: they attend the doorway, capture the evidence and submit the
// inspection report. They can never approve a certificate, so nobody approves
// their own fieldwork.
// ---------------------------------------------------------------------------
const requireFieldWork = requireRoles('nipost_verifier', 'compliance_officer', 'super_admin');

function serializeFieldRecord(row) {
  return {
    id: row.id,
    track: row.track,
    documentType: row.document_type,
    documentNumber: row.document_number,
    documentUrl: row.document_url,
    status: row.status,
    applicantName: row.applicant_name,
    applicantPhone: row.applicant_phone,
    applicantEmail: row.applicant_email,
    postcode: row.applicant_postcode,
    postcodeDescription: row.postcode_description,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    accuracyM: row.accuracy_m != null ? Number(row.accuracy_m) : null,
    capturedAt: row.captured_at ? new Date(row.captured_at).toISOString() : null,
    photoUrl: row.photo_url || null,
    fieldReportNotes: row.field_report_notes || null,
    fieldReportedAt: row.field_reported_at ? new Date(row.field_reported_at).toISOString() : null,
    fieldReportedBy: row.field_reported_by_name || null,
    submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null
  };
}

const FIELD_QUEUE_SELECT = `
  SELECT v.id, v.track, v.document_type, v.document_number, v.document_url, v.status,
         v.lat, v.lng, v.accuracy_m, v.captured_at, v.photo_url,
         v.field_report_notes, v.field_reported_at, v.submitted_at, v.reviewed_at,
         u.name AS applicant_name, u.phone AS applicant_phone, u.email AS applicant_email,
         u.postcode AS applicant_postcode,
         (SELECT description FROM postcode_cache
           WHERE postcode = u.postcode OR ndaps_code = u.postcode OR legacy_code = u.postcode
           LIMIT 1) AS postcode_description,
         fv.name AS field_reported_by_name
  FROM verification_records v
  JOIN users u ON u.id = v.entity_id
  LEFT JOIN users fv ON fv.id = v.field_reported_by
  WHERE v.track = 'TRACK_A_ADDRESS' AND v.entity_type = 'user'
`;

// GET /api/v1/verification/field-queue
router.get('/field-queue', authenticate, requireFieldWork, async (req, res) => {
  const status = req.query.status && req.query.status !== 'ALL' ? String(req.query.status) : null;
  const search = String(req.query.search || '').trim();

  try {
    const params = [];
    const clauses = [];
    if (status) {
      params.push(status);
      clauses.push(`v.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      clauses.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.postcode ILIKE $${idx})`);
    }

    const whereSql = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
    const rows = await db.query(
      `${FIELD_QUEUE_SELECT}${whereSql}
       ORDER BY (v.field_reported_at IS NOT NULL), v.submitted_at DESC
       LIMIT 200`,
      params
    );

    const counts = await db.query(`
      SELECT
        count(*) FILTER (WHERE field_reported_at IS NULL) AS awaiting_fieldwork,
        count(*) FILTER (WHERE field_reported_at IS NOT NULL AND status = 'PENDING') AS reported,
        count(*) FILTER (WHERE status = 'APPROVED') AS approved
      FROM verification_records
      WHERE track = 'TRACK_A_ADDRESS' AND entity_type = 'user'
    `);

    const records = await Promise.all(rows.rows.map(async (row) => ({
      ...serializeFieldRecord(row),
      documentUrl: await documentStorage.resolveDocumentUrl(row.document_url),
      photoUrl: await documentStorage.resolveDocumentUrl(row.photo_url)
    })));

    res.json({ records, counts: counts.rows[0] });
  } catch (err) {
    console.error('Field queue error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/verification/field-report/:id
router.post('/field-report/:id', authenticate, requireFieldWork, async (req, res) => {
  const body = req.body || {};
  const notes = String(body.notes || '').trim();
  const photoUrl = String(body.photoUrl || '').trim();
  const inspectionReference = String(body.inspectionReference || '').trim();
  const capturedAt = body.capturedAt ? String(body.capturedAt) : '';
  const toNumber = (value) => (value === undefined || value === null || value === '' ? null : Number(value));
  const lat = toNumber(body.lat);
  const lng = toNumber(body.lng);
  const accuracyM = toNumber(body.accuracyM);

  const problems = [];
  if (!notes && !photoUrl) problems.push('Enter the inspection report or attach the doorway photo.');
  if (notes.length > 2000) problems.push('Inspection report must be 2,000 characters or fewer.');
  if (photoUrl.length > 500) problems.push('Photo link must be 500 characters or fewer.');
  if (inspectionReference.length > 80) problems.push('Inspection reference must be 80 characters or fewer.');
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) problems.push('Latitude must be between -90 and 90.');
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) problems.push('Longitude must be between -180 and 180.');
  if ((lat === null) !== (lng === null)) problems.push('Capture latitude and longitude together, or leave both empty.');
  if (accuracyM !== null && (!Number.isFinite(accuracyM) || accuracyM < 0)) problems.push('Accuracy must be a positive number of metres.');
  if (capturedAt && Number.isNaN(Date.parse(capturedAt))) problems.push('Captured time is not a valid date.');
  if (problems.length) return res.status(400).json({ error: problems.join(' ') });

  try {
    const existing = await db.query(
      'SELECT track, entity_type, status FROM verification_records WHERE id = $1',
      [req.params.id]
    );
    const record = existing.rows[0];
    if (!record) return res.status(404).json({ error: 'Ground-truth record not found.' });
    if (record.track !== 'TRACK_A_ADDRESS' || record.entity_type !== 'user') {
      return res.status(409).json({ error: 'Field reports only apply to postcode ground-truth inspections.' });
    }
    if (record.status !== 'PENDING') {
      return res.status(409).json({ error: 'The compliance desk has already decided this inspection.' });
    }

    await db.query(
      `UPDATE verification_records
         SET photo_url = COALESCE($1, photo_url),
             document_number = COALESCE($2, document_number),
             lat = COALESCE($3, lat),
             lng = COALESCE($4, lng),
             accuracy_m = COALESCE($5, accuracy_m),
             captured_at = COALESCE($6, captured_at),
             field_report_notes = $7,
             field_reported_by = $8,
             field_reported_at = NOW()
       WHERE id = $9`,
      [
        photoUrl || null,
        inspectionReference || null,
        lat,
        lng,
        accuracyM,
        capturedAt ? new Date(capturedAt) : null,
        notes || null,
        req.user.id,
        req.params.id
      ]
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'FIELD_REPORT_SUBMITTED', 'verification_record', $2, $3)`,
      [req.user.id, req.params.id, JSON.stringify({ lat, lng, hasPhoto: Boolean(photoUrl) })]
    );

    res.json({ message: 'Field inspection report submitted for compliance review.' });
  } catch (err) {
    console.error('Field report error:', err);
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

    const serializedRecords = await Promise.all(records.map(async (row) => ({
      ...row,
      document_url: await documentStorage.resolveDocumentUrl(row.document_url),
      photo_url: await documentStorage.resolveDocumentUrl(row.photo_url)
    })));

    res.json({
      records: serializedRecords,
      total: serializedRecords.length,
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
      let riderClearance = null;

      // If approved, update entity operational status
      if (status === 'APPROVED') {
        if (record.entity_type === 'hub') {
          await client.query("UPDATE hubs SET status = 'accredited' WHERE id = $1", [record.entity_id]);
        } else if (record.entity_type === 'rider') {
          // Clearance is only granted once the rider has evidenced identity
          // (NIN), driving privilege (licence), a service postcode and any
          // administrator-set registration fee. Approving one document must not
          // open the dispatch console while another requirement is still missing.
          const riderRes = await client.query(
            'SELECT r.*, u.postcode AS user_postcode, u.phone AS user_phone FROM riders r JOIN users u ON u.id = r.user_id WHERE r.id = $1',
            [record.entity_id]
          );
          const rider = riderRes.rows[0];
          const { registrationFeeNgn } = await settingsService.getRiderRegistrationFees();
          const riderDocumentsRes = await client.query(
            `SELECT document_type, status FROM verification_records
             WHERE entity_type = 'rider' AND entity_id = $1`,
            [record.entity_id]
          );
          const missing = missingRiderClearance({
            rider,
            postcode: rider ? rider.user_postcode : null,
            phone: rider ? rider.user_phone : null,
            registrationFeeNgn,
            registrationFeePaid: rider ? Boolean(rider.registration_fee_paid_at) : false,
            documents: riderDocumentsRes.rows
          });
          riderClearance = { granted: missing.length === 0, missing };
          if (missing.length === 0) {
            await client.query("UPDATE riders SET status = 'verified' WHERE id = $1", [record.entity_id]);
          }
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
        const box = await digitalBoxService.getDigitalBoxByUserId(record.entity_id);
        const userRes = await db.query('SELECT * FROM users WHERE id = $1', [record.entity_id]);
        const owner = userRes.rows[0];
        const pcRes = await db.query(
          'SELECT * FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 OR legacy_code = $1 LIMIT 1',
          [owner ? owner.postcode : '']
        );
        const pc = pcRes.rows[0] || {};
        const hierarchy = { district: pc.neighbourhood, lga: pc.lga, state: pc.state };
        const fees = await settingsService.getDigitalBoxFees();
        await digitalBoxService.issueCertificate({
          box: box ? { id: box.id } : null,
          user: owner,
          verificationRecordId: record.id,
          postcode: owner ? owner.postcode : null,
          addressText: pc.description || [pc.neighbourhood, pc.lga, pc.state].filter(Boolean).join(', '),
          hierarchy,
          lat: record.lat != null ? Number(record.lat) : (pc.lat != null ? Number(pc.lat) : null),
          lng: record.lng != null ? Number(record.lng) : (pc.lng != null ? Number(pc.lng) : null),
          validityMonths: fees.revalidationMonths
        });
      }

      res.json({
        success: true,
        message: `Verification record successfully updated to ${status}.`,
        record,
        clearance: riderClearance
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

// ---------------------------------------------------------------------------
// Rider applications
// A rider's application is the whole package: the identity fields on their
// profile plus the Track B documents they uploaded. Compliance reviews the
// rider as one application, while the decision still lands on each underlying
// verification record so the document ledger stays complete.
// ---------------------------------------------------------------------------

// GET /api/v1/verification/rider-applications
router.get('/rider-applications', async (req, res) => {
  const { search, status = 'ALL' } = req.query;

  try {
    const params = [];
    const conditions = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(
        u.name ILIKE $${params.length} OR
        u.email ILIKE $${params.length} OR
        u.phone ILIKE $${params.length} OR
        r.plate_number ILIKE $${params.length} OR
        r.nin ILIKE $${params.length} OR
        r.drivers_license_no ILIKE $${params.length}
      )`);
    }

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const ridersRes = await db.query(
      `SELECT r.*, u.name, u.email, u.phone, u.postcode AS user_postcode
       FROM riders r
       JOIN users u ON u.id = r.user_id
       ${whereSql}
       ORDER BY (r.status = 'pending') DESC, r.created_at DESC`,
      params
    );

    const docsRes = await db.query(
      `SELECT id, entity_id, document_type, document_number, status, submitted_at, reviewed_at, reviewer_notes
       FROM verification_records
       WHERE entity_type = 'rider'
       ORDER BY submitted_at DESC`
    );

    const documentsByRider = {};
    for (const doc of docsRes.rows) {
      documentsByRider[doc.entity_id] = documentsByRider[doc.entity_id] || [];
      documentsByRider[doc.entity_id].push(doc);
    }

    const { registrationFeeNgn } = await settingsService.getRiderRegistrationFees();

    const riders = ridersRes.rows.map((rider) => {
      const documents = documentsByRider[rider.id] || [];
      const missing = missingRiderClearance({
        rider,
        postcode: rider.user_postcode,
        phone: rider.phone,
        registrationFeeNgn,
        registrationFeePaid: Boolean(rider.registration_fee_paid_at),
        documents
      });

      return {
        ...rider,
        documents,
        pendingDocuments: documents.filter((doc) => doc.status === 'PENDING').length,
        rejectedDocuments: documents.filter((doc) => doc.status === 'REJECTED').length,
        missingClearance: missing,
        readyForApproval: missing.length === 0
      };
    });

    res.json({
      riders,
      registrationFeeNgn,
      counts: {
        awaiting: riders.filter((r) => r.status === 'pending' && !(r.pendingDocuments === 0 && r.rejectedDocuments > 0)).length,
        rejected: riders.filter((r) => r.status === 'pending' && r.pendingDocuments === 0 && r.rejectedDocuments > 0).length,
        verified: riders.filter((r) => r.status === 'verified').length,
        suspended: riders.filter((r) => r.status === 'suspended').length,
        total: riders.length
      }
    });
  } catch (err) {
    console.error('Rider applications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/verification/riders/:id/review
router.post('/riders/:id/review', async (req, res) => {
  const { action, reason } = req.body || {};

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be either approve or reject.' });
  }
  if (action === 'reject' && (!reason || !String(reason).trim())) {
    return res.status(400).json({ error: 'A rejection reason is required.' });
  }

  const reviewerId = req.user.id;
  const notes = action === 'reject'
    ? `Reason: ${String(reason).trim()}`
    : 'Rider application approved by compliance review.';

  try {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const riderRes = await client.query(
        `SELECT r.*, u.postcode AS user_postcode, u.phone AS user_phone
         FROM riders r JOIN users u ON u.id = r.user_id
         WHERE r.id = $1`,
        [req.params.id]
      );
      const rider = riderRes.rows[0];
      if (!rider) {
        const notFound = new Error('Rider not found.');
        notFound.status = 404;
        throw notFound;
      }

      const { registrationFeeNgn } = await settingsService.getRiderRegistrationFees();
      const riderDocumentsRes = await client.query(
        `SELECT document_type, status FROM verification_records
         WHERE entity_type = 'rider' AND entity_id = $1`,
        [req.params.id]
      );
      const missing = missingRiderClearance({
        rider,
        postcode: rider.user_postcode,
        phone: rider.user_phone,
        registrationFeeNgn,
        registrationFeePaid: Boolean(rider.registration_fee_paid_at),
        documents: riderDocumentsRes.rows
      });

      if (action === 'approve' && missing.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'This rider has not completed every verification requirement and cannot be approved yet.',
          missing
        });
      }

      const reviewed = await client.query(
        `UPDATE verification_records
         SET status = $1, reviewed_by = $2, reviewer_notes = $3, reviewed_at = NOW()
         WHERE entity_type = 'rider' AND entity_id = $4 AND status = 'PENDING'
         RETURNING id`,
        [action === 'approve' ? 'APPROVED' : 'REJECTED', reviewerId, notes, req.params.id]
      );

      if (action === 'approve') {
        await client.query(
          `UPDATE riders SET status = 'verified', is_active = TRUE, is_available = TRUE, updated_at = NOW()
           WHERE id = $1`,
          [req.params.id]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, 'rider', $3, $4)`,
        [
          reviewerId,
          action === 'approve' ? 'RIDER_APPLICATION_APPROVED' : 'RIDER_APPLICATION_REJECTED',
          req.params.id,
          JSON.stringify({
            riderId: req.params.id,
            records: reviewed.rows.map((row) => row.id),
            reason: action === 'reject' ? String(reason).trim() : null
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: action === 'approve'
          ? 'Rider application approved. The rider now has dispatch clearance.'
          : 'Rider application rejected. The rider can resolve the issues and resubmit.',
        recordsReviewed: reviewed.rows.length
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Rider application review error:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
