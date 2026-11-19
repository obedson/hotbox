const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { validate, createStaffSchema } = require('../../middleware/validate');
const logger = require('../../lib/logger');
const { normalizePhone } = require('../../lib/phone');
const { sendStaffOnboardingEmail } = require('../../services/staffOnboardingMailer');
const { canGrantRole } = require('../../config/roles');

// Admin-only user administration. Staff roles can only be granted here, never
// through public self-service registration.
const toSafeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

// GET /api/v1/operations/users
router.get('/users', async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.email ILIKE $${idx})`);
      idx += 1;
    }
    if (role && role !== 'ALL') {
      params.push(role);
      conditions.push(`u.role = $${idx}`);
      idx += 1;
    }
    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`u.status = $${idx}`);
      idx += 1;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.status, u.postcode, u.created_at
       FROM users u ${where} ORDER BY u.created_at DESC LIMIT 200`,
      params
    );

    res.json({ users: result.rows.map(toSafeUser), count: result.rows.length });
  } catch (err) {
    logger.error('failed to list users', { error: err.message });
    res.status(500).json({ error: 'Could not load users.' });
  }
});

// POST /api/v1/operations/users
router.post('/users', validate(createStaffSchema), async (req, res) => {
  const {
    name, email, phone, password, role,
    businessName, cacNumber, postcode, neighbourhood, capacity, vehicleType, plateNumber
  } = req.validatedBody;

  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = String(email).trim().toLowerCase();

  // Role granting is enforced server-side, not just hidden in the UI: an
  // `ops_admin` must never be able to mint a `super_admin` (or any role outside
  // the provisionable set) by calling the API directly.
  if (!canGrantRole(req.user.role, role)) {
    logger.warn('refused to grant role', { actorId: req.user.id, actorRole: req.user.role, targetRole: role });
    return res.status(403).json({ error: `You are not allowed to grant the '${role}' role.` });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const userRes = await client.query(
        `INSERT INTO users (name, phone, email, password_hash, role, status, postcode)
         VALUES ($1, $2, $3, $4, $5, 'active', $6)
         RETURNING id, name, phone, email, role, status, postcode, created_at`,
        [name, normalizedPhone, normalizedEmail, passwordHash, role, postcode || 'FC-01-A03-FK-01']
      );
      const newUser = userRes.rows[0];

      await client.query(
        'INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0.00, 0.00)',
        [newUser.id]
      );

      if (role === 'hub_owner') {
        // Staff-created hub owners also start from a draft application so no
        // hub can bypass accreditation.
        const hubName = businessName || `${name}'s Community Hub`;
        const hubPostcode = postcode || 'FC-01-A03-FK-01';
        const hubNeighbourhood = neighbourhood || 'Wuse 2';
        const hubAddress = neighbourhood ? `${neighbourhood}, Abuja` : 'Wuse 2, Abuja';
        const hubCapacity = capacity ? parseInt(capacity, 10) : 50;

        await client.query(
          `INSERT INTO hub_applications (applicant_id, business_name, postcode, form_data)
           VALUES ($1, $2, $3, $4)`,
          [newUser.id, hubName, hubPostcode, JSON.stringify({
            businessName: hubName,
            cacNumber: cacNumber || undefined,
            postcode: hubPostcode,
            addressText: hubAddress,
            neighbourhood: hubNeighbourhood,
            capacity: hubCapacity,
            managerName: name,
            managerPhone: normalizedPhone,
            managerEmail: normalizedEmail
          })]
        );
      } else if (role === 'rider') {
        await client.query(
          `INSERT INTO riders (user_id, vehicle_type, plate_number, drivers_license_no, operational_postcodes, is_active, is_available)
           VALUES ($1, $2, $3, $4, ARRAY['FC-01-A03-FK-01', 'FC-01-A02-FK-02'], TRUE, TRUE)`,
          [newUser.id, vehicleType || 'motorcycle', plateNumber || 'ABJ-000-XX', 'DL-PENDING']
        );
      } else if (role === 'enterprise_shipper') {
        await client.query(
          `INSERT INTO enterprise_accounts (user_id, company_name, billing_tier) VALUES ($1, $2, 'PREPAID')`,
          [newUser.id, businessName || `${name} Logistics`]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'STAFF_ACCOUNT_CREATED', 'user', $2, $3)`,
        [req.user.id, newUser.id, JSON.stringify({ role: newUser.role, name: newUser.name })]
      );

      await client.query('COMMIT');

      // Email the new teammate a single-use link so they can replace the
      // temporary password with one of their own. A mail failure must never
      // fail the account creation, so it is reported back instead of thrown.
      let emailOutcome = { sent: false, delivered: false, reason: 'not_attempted' };
      try {
        emailOutcome = await sendStaffOnboardingEmail({
          userId: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        });
      } catch (err) {
        logger.error('failed to send staff onboarding email', { error: err.message, userId: newUser.id });
        emailOutcome = { sent: false, delivered: false, reason: 'send_failed' };
      }

      if (!emailOutcome.sent) {
        try {
          await db.query(
            `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
             VALUES ($1, 'STAFF_ONBOARDING_EMAIL_FAILED', 'user', $2, $3)`,
            [req.user.id, newUser.id, JSON.stringify({ reason: emailOutcome.reason || 'unknown' })]
          );
        } catch (auditErr) {
          logger.error('failed to audit onboarding email failure', { error: auditErr.message });
        }
      }

      // Returned once so the administrator can hand it to the new team member.
      // It is never stored or sent again.
      res.status(201).json({
        user: toSafeUser(newUser),
        temporaryPassword: password,
        emailSent: Boolean(emailOutcome.sent)
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that phone number or email already exists.' });
    }
    logger.error('failed to create user', { error: err.message, actorId: req.user?.id });
    res.status(500).json({ error: 'Could not create the account.' });
  }
});

// PATCH /api/v1/operations/users/:id/status
router.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "suspended".' });
  }

  try {
    const result = await db.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, phone, email, role, status`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: toSafeUser(result.rows[0]) });
  } catch (err) {
    logger.error('failed to update user status', { error: err.message, actorId: req.user?.id });
    res.status(500).json({ error: 'Could not update the account.' });
  }
});

// POST /api/v1/operations/users/:id/password
// Issues a fresh temporary password for a team member who lost theirs.
router.post('/users/:id/password', async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 8 || String(password).length > 72) {
    return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
  }

  try {
    const target = await db.query('SELECT id, name, role FROM users WHERE id = $1', [req.params.id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      req.params.id
    ]);

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
       VALUES ($1, 'STAFF_PASSWORD_RESET', 'user', $2, $3)`,
      [req.user.id, req.params.id, JSON.stringify({ role: target.rows[0].role })]
    );

    res.json({ message: 'Password updated.', temporaryPassword: String(password) });
  } catch (err) {
    logger.error('failed to reset staff password', { error: err.message, actorId: req.user?.id });
    res.status(500).json({ error: 'Could not update the password.' });
  }
});

// POST /api/v1/operations/users/:id/onboarding-email
// Re-sends the set-your-password link, for when the first email bounced or the
// link expired before the new team member used it.
router.post('/users/:id/onboarding-email', async (req, res) => {
  try {
    const target = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.params.id]
    );
    const user = target.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const outcome = await sendStaffOnboardingEmail({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    if (outcome.sent) {
      await db.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
         VALUES ($1, 'STAFF_ONBOARDING_EMAIL_RESENT', 'user', $2, $3)`,
        [req.user.id, user.id, JSON.stringify({ role: user.role })]
      );
    }

    res.json({ emailSent: Boolean(outcome.sent), reason: outcome.reason });
  } catch (err) {
    logger.error('failed to resend staff onboarding email', { error: err.message, actorId: req.user?.id });
    res.status(500).json({ error: 'Could not resend the onboarding email.' });
  }
});

module.exports = router;
