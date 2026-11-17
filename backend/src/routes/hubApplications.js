const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');

// A hub owner can hold exactly one open application. Anything already submitted
// is read-only until compliance sends it back for more information.
const OPEN_STATUSES = ['DRAFT', 'ADDITIONAL_INFORMATION_REQUIRED'];
const REVIEWABLE_STATUSES = ['SUBMITTED', 'INSPECTION_SCHEDULED', 'INSPECTED', 'ADDITIONAL_INFORMATION_REQUIRED'];

// Whitelist of application form fields. Everything the applicant supplies is
// kept in form_data so the form can evolve without another migration.
const FORM_FIELDS = [
  'businessName', 'cacNumber', 'category', 'yearRegistered',
  'postcode', 'addressText', 'neighbourhood', 'lga', 'state', 'lat', 'lng',
  'premisesType', 'floorAreaSqm',
  'capacity', 'openingHours', 'operatingDays', 'storageTiers', 'staffCount', 'loadingAccess',
  'securityFeatures', 'managerName', 'managerPhone', 'managerEmail',
  'emergencyPhone', 'alternatePhone',
  'taxId', 'insurancePolicy', 'securityDepositPaid', 'priorExperience',
  'authorizedRepName', 'authorizedRepIdType', 'authorizedRepIdNumber', 'authorizedRepRelationship',
  'notes'
];

const REQUIRED_ON_SUBMIT = ['businessName', 'postcode', 'addressText'];

const BASE_SELECT = `
  SELECT a.*,
         u.name AS applicant_name,
         u.email AS applicant_email,
         u.phone AS applicant_phone,
         r.name AS reviewed_by_name
  FROM hub_applications a
  JOIN users u ON u.id = a.applicant_id
  LEFT JOIN users r ON r.id = a.reviewed_by
`;

function buildFormData(body = {}) {
  const form = {};
  for (const key of FORM_FIELDS) {
    const value = body[key];
    if (value === undefined || value === null || value === '') continue;
    form[key] = value;
  }
  return form;
}

function withApplicant(row, user) {
  return {
    ...row,
    applicant_name: user ? user.name : row.applicant_name,
    applicant_email: user ? user.email : row.applicant_email,
    applicant_phone: user ? user.phone : row.applicant_phone
  };
}

function shapeApplication(row) {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    businessName: row.business_name,
    postcode: row.postcode,
    formData: row.form_data || {},
    applicant: row.applicant_id
      ? {
          id: row.applicant_id,
          name: row.applicant_name,
          email: row.applicant_email,
          phone: row.applicant_phone
        }
      : null,
    hubId: row.hub_id,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name || null,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateForSubmit(form) {
  const missing = REQUIRED_ON_SUBMIT.filter((key) => !String(form[key] || '').trim());
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}.`;
  }
  if (form.capacity !== undefined) {
    const capacity = parseInt(form.capacity, 10);
    if (!Number.isInteger(capacity) || capacity < 1) {
      return 'Capacity must be a positive whole number.';
    }
  }
  if (form.lat !== undefined && form.lat !== '' && Number.isNaN(parseFloat(form.lat))) {
    return 'Latitude must be a number.';
  }
  if (form.lng !== undefined && form.lng !== '' && Number.isNaN(parseFloat(form.lng))) {
    return 'Longitude must be a number.';
  }
  return null;
}

function provisionBays(client, hubId, capacity) {
  const bayCount = Math.min(40, Math.max(5, Math.ceil((capacity || 50) / 20)));
  const tiers = ['small', 'medium', 'large'];
  return Promise.all(
    Array.from({ length: bayCount }, (_, index) =>
      client.query(
        `INSERT INTO hub_storage_bays (hub_id, bay_code, size_tier)
         VALUES ($1, $2, $3)
         ON CONFLICT (hub_id, bay_code) DO NOTHING`,
        [hubId, `BAY-${String(index + 1).padStart(2, '0')}`, tiers[index % tiers.length]]
      )
    )
  );
}

async function logAudit(client, actorId, action, entityId, details) {
  await client.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'hub_application', $3, $4)`,
    [actorId, action, entityId, JSON.stringify(details)]
  );
}

// ---------------------------------------------------------------------------
// HUB OWNER
// ---------------------------------------------------------------------------

// GET /api/v1/hub-applications/mine
router.get('/mine', authenticate, requireRoles('hub_owner'), async (req, res) => {
  try {
    const appRes = await db.query(
      `${BASE_SELECT} WHERE a.applicant_id = $1 ORDER BY a.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const application = appRes.rows[0] ? shapeApplication(appRes.rows[0]) : null;

    let hub = null;
    if (application && application.hubId) {
      const hubRes = await db.query(
        `SELECT id, business_name, postcode, address_text, status, capacity, current_load,
                is_accepting_parcels, created_at
         FROM hubs WHERE id = $1`,
        [application.hubId]
      );
      hub = hubRes.rows[0] || null;
    }

    let inspections = [];
    if (application) {
      const insRes = await db.query(
        `SELECT i.*, u.name AS inspector_name
         FROM hub_inspections i
         LEFT JOIN users u ON u.id = i.inspector_id
         WHERE i.application_id = $1
         ORDER BY i.scheduled_at ASC`,
        [application.id]
      );
      inspections = insRes.rows;
    }

    res.json({ application, hub, inspections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hub-applications (create a draft)
router.post('/', authenticate, requireRoles('hub_owner'), async (req, res) => {
  const form = buildFormData(req.body);
  const businessName = String(form.businessName || '').trim();
  const postcode = String(form.postcode || '').trim();

  if (!businessName || !postcode) {
    return res.status(400).json({ error: 'Business name and postcode are required.' });
  }

  try {
    const existing = await db.query(
      `SELECT id FROM hub_applications
       WHERE applicant_id = $1 AND status = ANY($2)
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, OPEN_STATUSES]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'You already have an accreditation application in progress.',
        applicationId: existing.rows[0].id
      });
    }

    const result = await db.query(
      `INSERT INTO hub_applications (applicant_id, business_name, postcode, form_data)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, businessName, postcode, JSON.stringify(form)]
    );

    res.status(201).json({ application: shapeApplication(withApplicant(result.rows[0], req.user)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/hub-applications/:id (edit a draft)
router.patch('/:id', authenticate, requireRoles('hub_owner'), async (req, res) => {
  const form = buildFormData(req.body);

  try {
    const existing = await db.query(
      'SELECT * FROM hub_applications WHERE id = $1 AND applicant_id = $2',
      [req.params.id, req.user.id]
    );
    const application = existing.rows[0];
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (!OPEN_STATUSES.includes(application.status)) {
      return res.status(409).json({ error: 'Only a draft or information-requested application can be edited.' });
    }

    const businessName = String(form.businessName || application.business_name).trim();
    const postcode = String(form.postcode || application.postcode).trim();
    if (!businessName || !postcode) {
      return res.status(400).json({ error: 'Business name and postcode are required.' });
    }

    const updated = await db.query(
      `UPDATE hub_applications
       SET form_data = $1, business_name = $2, postcode = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [JSON.stringify(form), businessName, postcode, application.id]
    );

    res.json({ application: shapeApplication(withApplicant(updated.rows[0], req.user)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hub-applications/:id/submit
router.post('/:id/submit', authenticate, requireRoles('hub_owner'), async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT * FROM hub_applications WHERE id = $1 AND applicant_id = $2',
      [req.params.id, req.user.id]
    );
    const application = existing.rows[0];
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (!OPEN_STATUSES.includes(application.status)) {
      return res.status(409).json({ error: 'This application has already been submitted.' });
    }

    const form = application.form_data || {};
    const invalid = validateForSubmit(form);
    if (invalid) return res.status(400).json({ error: invalid });

    const capacity = form.capacity !== undefined ? parseInt(form.capacity, 10) : 50;
    const lat = form.lat !== undefined && form.lat !== '' ? parseFloat(form.lat) : 9.0765;
    const lng = form.lng !== undefined && form.lng !== '' ? parseFloat(form.lng) : 7.4985;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      let hubId = application.hub_id;
      if (!hubId) {
        const hubRes = await client.query(
          `INSERT INTO hubs (
             owner_id, business_name, cac_number, phone, email, postcode,
             address_text, neighbourhood, lga, state, lat, lng, capacity,
             status, is_accepting_parcels
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', FALSE)
           RETURNING id`,
          [
            req.user.id,
            application.business_name,
            form.cacNumber || null,
            form.managerPhone || req.user.phone,
            form.managerEmail || req.user.email || null,
            application.postcode,
            form.addressText,
            form.neighbourhood || 'Neighborhood',
            form.lga || 'Abuja Municipal',
            form.state || 'Abuja (FCT)',
            lat,
            lng,
            capacity
          ]
        );
        hubId = hubRes.rows[0].id;
      } else {
        await client.query(
          `UPDATE hubs
           SET business_name = $2, cac_number = $3, phone = $4, email = $5, postcode = $6,
               address_text = $7, neighbourhood = $8, lga = $9, state = $10, lat = $11,
               lng = $12, capacity = $13, status = 'pending', is_accepting_parcels = FALSE,
               updated_at = NOW()
           WHERE id = $1`,
          [
            hubId,
            application.business_name,
            form.cacNumber || null,
            form.managerPhone || req.user.phone,
            form.managerEmail || req.user.email || null,
            application.postcode,
            form.addressText,
            form.neighbourhood || 'Neighborhood',
            form.lga || 'Abuja Municipal',
            form.state || 'Abuja (FCT)',
            lat,
            lng,
            capacity
          ]
        );
      }

      const updated = await client.query(
        `UPDATE hub_applications
         SET status = 'SUBMITTED', hub_id = $2, submitted_at = NOW(),
             reviewed_by = NULL, reviewed_at = NULL, review_note = NULL, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [application.id, hubId]
      );

      await logAudit(client, req.user.id, 'HUB_APPLICATION_SUBMITTED', application.id, {
        reference: application.reference,
        hubId,
        postcode: application.postcode
      });

      await client.query('COMMIT');
      res.json({
        application: shapeApplication(withApplicant(updated.rows[0], req.user)),
        hubId
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// OPERATIONS / COMPLIANCE
// ---------------------------------------------------------------------------

// GET /api/v1/hub-applications
router.get('/', authenticate, requireRoles('ops_admin', 'compliance_officer', 'super_admin'), async (req, res) => {
  try {
    const { status, q } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'ALL') {
      params.push(String(status));
      conditions.push(`a.status = $${params.length}`);
    }
    if (q) {
      params.push(`%${String(q).trim()}%`);
      conditions.push(
        `(a.business_name ILIKE $${params.length} OR a.postcode ILIKE $${params.length}
          OR a.reference ILIKE $${params.length} OR u.name ILIKE $${params.length})`
      );
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(`${BASE_SELECT}${where} ORDER BY a.created_at DESC`, params);

    const countsRes = await db.query(`
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE status = 'DRAFT') AS draft,
        count(*) FILTER (WHERE status = 'SUBMITTED') AS submitted,
        count(*) FILTER (WHERE status = 'INSPECTION_SCHEDULED') AS inspection_scheduled,
        count(*) FILTER (WHERE status = 'INSPECTED') AS inspected,
        count(*) FILTER (WHERE status = 'APPROVED') AS approved,
        count(*) FILTER (WHERE status = 'REJECTED') AS rejected,
        count(*) FILTER (WHERE status = 'ADDITIONAL_INFORMATION_REQUIRED') AS info_required
      FROM hub_applications
    `);

    res.json({
      applications: result.rows.map(shapeApplication),
      total: result.rows.length,
      counts: countsRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/hub-applications/:id
router.get('/:id', authenticate, requireRoles('ops_admin', 'compliance_officer', 'super_admin'), async (req, res) => {
  try {
    const appRes = await db.query(`${BASE_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (appRes.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });

    const insRes = await db.query(
      `SELECT i.*, u.name AS inspector_name
       FROM hub_inspections i
       LEFT JOIN users u ON u.id = i.inspector_id
       WHERE i.application_id = $1
       ORDER BY i.scheduled_at ASC`,
      [req.params.id]
    );

    let hub = null;
    if (appRes.rows[0].hub_id) {
      const hubRes = await db.query('SELECT * FROM hubs WHERE id = $1', [appRes.rows[0].hub_id]);
      hub = hubRes.rows[0] || null;
    }

    res.json({
      application: shapeApplication(appRes.rows[0]),
      inspections: insRes.rows,
      hub
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hub-applications/:id/schedule-inspection
router.post('/:id/schedule-inspection', authenticate, requireRoles('ops_admin', 'compliance_officer', 'super_admin'), async (req, res) => {
  const { scheduledAt, inspectorId } = req.body || {};
  if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required.' });

  const scheduled = new Date(scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    return res.status(400).json({ error: 'scheduledAt must be a valid date.' });
  }

  try {
    const appRes = await db.query('SELECT * FROM hub_applications WHERE id = $1', [req.params.id]);
    const application = appRes.rows[0];
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (!['SUBMITTED', 'INSPECTION_SCHEDULED'].includes(application.status)) {
      return res.status(409).json({ error: 'Only a submitted application can be scheduled for inspection.' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const insRes = await client.query(
        `INSERT INTO hub_inspections (application_id, hub_id, scheduled_at, inspector_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [application.id, application.hub_id, scheduled, inspectorId || null]
      );

      await client.query(
        `UPDATE hub_applications SET status = 'INSPECTION_SCHEDULED', updated_at = NOW() WHERE id = $1`,
        [application.id]
      );

      await logAudit(client, req.user.id, 'HUB_INSPECTION_SCHEDULED', application.id, {
        reference: application.reference,
        inspectionId: insRes.rows[0].id,
        scheduledAt: scheduled.toISOString()
      });

      await client.query('COMMIT');
      res.status(201).json({ inspection: insRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hub-applications/:id/record-inspection
router.post('/:id/record-inspection', authenticate, requireRoles('ops_admin', 'compliance_officer', 'super_admin'), async (req, res) => {
  const {
    inspectionId, result, findings = '', photoUrl, lat, lng, conductedAt
  } = req.body || {};

  if (!['ELIGIBLE', 'NOT_ELIGIBLE'].includes(result)) {
    return res.status(400).json({ error: 'result must be ELIGIBLE or NOT_ELIGIBLE.' });
  }

  try {
    const appRes = await db.query('SELECT * FROM hub_applications WHERE id = $1', [req.params.id]);
    const application = appRes.rows[0];
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    const insRes = inspectionId
      ? await db.query(
        'SELECT * FROM hub_inspections WHERE id = $1 AND application_id = $2',
        [inspectionId, application.id]
      )
      : await db.query(
        'SELECT * FROM hub_inspections WHERE application_id = $1 ORDER BY scheduled_at DESC LIMIT 1',
        [application.id]
      );
    const inspection = insRes.rows[0];
    if (!inspection) return res.status(404).json({ error: 'No inspection is scheduled for this application.' });

    const nextStatus = result === 'ELIGIBLE' ? 'INSPECTED' : 'REJECTED';
    const reviewNote = findings || (result === 'ELIGIBLE'
      ? 'Inspection found the premises eligible for accreditation.'
      : 'Inspection found the premises not eligible for accreditation.');

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const updatedIns = await client.query(
        `UPDATE hub_inspections
         SET conducted_at = $2, result = $3, findings = $4, photo_url = $5,
             lat = $6, lng = $7, inspector_id = COALESCE($8, inspector_id), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          inspection.id,
          conductedAt ? new Date(conductedAt) : new Date(),
          result,
          reviewNote,
          photoUrl || null,
          lat !== undefined && lat !== '' ? parseFloat(lat) : null,
          lng !== undefined && lng !== '' ? parseFloat(lng) : null,
          req.user.id
        ]
      );

      const updatedApp = await client.query(
        `UPDATE hub_applications
         SET status = $2, reviewed_by = $3, reviewed_at = NOW(), review_note = $4, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [application.id, nextStatus, req.user.id, reviewNote]
      );

      if (result === 'NOT_ELIGIBLE' && application.hub_id) {
        await client.query(
          `UPDATE hubs SET status = 'inactive', is_accepting_parcels = FALSE, updated_at = NOW() WHERE id = $1`,
          [application.hub_id]
        );
      }

      await logAudit(client, req.user.id, 'HUB_INSPECTION_RECORDED', application.id, {
        reference: application.reference,
        inspectionId: inspection.id,
        result
      });

      await client.query('COMMIT');
      res.json({
        inspection: updatedIns.rows[0],
        application: shapeApplication(withApplicant(updatedApp.rows[0], req.user))
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/hub-applications/:id/review (final compliance decision)
router.post('/:id/review', authenticate, requireRoles('compliance_officer', 'super_admin'), async (req, res) => {
  const { decision, note = '' } = req.body || {};
  if (!['APPROVED', 'REJECTED', 'ADDITIONAL_INFORMATION_REQUIRED'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be APPROVED, REJECTED or ADDITIONAL_INFORMATION_REQUIRED.' });
  }

  try {
    const appRes = await db.query('SELECT * FROM hub_applications WHERE id = $1', [req.params.id]);
    const application = appRes.rows[0];
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (!REVIEWABLE_STATUSES.includes(application.status)) {
      return res.status(409).json({ error: `An application in status ${application.status} cannot be reviewed.` });
    }
    if (decision === 'APPROVED' && application.status !== 'INSPECTED') {
      return res.status(409).json({ error: 'An inspection must be recorded as ELIGIBLE before approval.' });
    }
    if (decision !== 'APPROVED' && !String(note || '').trim()) {
      return res.status(400).json({ error: 'A note is required when rejecting or requesting more information.' });
    }

    const form = application.form_data || {};
    const capacity = form.capacity !== undefined ? parseInt(form.capacity, 10) : 50;
    const reviewNote = String(note || '').trim()
      || (decision === 'APPROVED' ? 'Accreditation approved.' : 'Application decided.');

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      if (decision === 'APPROVED') {
        if (application.hub_id) {
          await client.query(
            `UPDATE hubs
             SET status = 'accredited', is_accepting_parcels = TRUE, capacity = $2, updated_at = NOW()
             WHERE id = $1`,
            [application.hub_id, capacity]
          );
          await provisionBays(client, application.hub_id, capacity);
        }

        // Mirror the decision into the compliance verification queue so Track C
        // remains the audit trail for hub accreditation.
        await client.query(
          `INSERT INTO verification_records (
             entity_type, entity_id, track, document_type, document_number,
             status, reviewed_by, reviewer_notes, submitted_at, reviewed_at
           ) VALUES ('hub', $1, 'TRACK_C_ACCREDITATION', 'PHYSICAL_INSPECTION_REPORT', $2,
                     'APPROVED', $3, $4, NOW(), NOW())`,
          [application.hub_id, application.reference, req.user.id, reviewNote]
        );
      } else if (decision === 'REJECTED' && application.hub_id) {
        await client.query(
          `UPDATE hubs SET status = 'inactive', is_accepting_parcels = FALSE, updated_at = NOW() WHERE id = $1`,
          [application.hub_id]
        );
      }

      const updatedApp = await client.query(
        `UPDATE hub_applications
         SET status = $2, reviewed_by = $3, reviewed_at = NOW(), review_note = $4, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [application.id, decision, req.user.id, reviewNote]
      );

      await logAudit(client, req.user.id, `HUB_APPLICATION_${decision}`, application.id, {
        reference: application.reference,
        hubId: application.hub_id,
        note: reviewNote
      });

      await client.query('COMMIT');
      res.json({
        application: shapeApplication(withApplicant(updatedApp.rows[0], req.user)),
        hubId: application.hub_id
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.buildFormData = buildFormData;
module.exports.validateForSubmit = validateForSubmit;
module.exports.provisionBays = provisionBays;