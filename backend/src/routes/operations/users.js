const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { validate, createStaffSchema } = require('../../middleware/validate');
const logger = require('../../lib/logger');
const { normalizePhone } = require('../../lib/phone');

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
        await client.query(
          `INSERT INTO hubs (owner_id, business_name, cac_number, phone, email, postcode, address_text, neighbourhood, lga, state, lat, lng, capacity, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Abuja Municipal', 'Abuja (FCT)', 9.0772, 7.4990, $9, 'accredited')`,
          [newUser.id, businessName || `${name}'s Community Hub`, cacNumber || null, normalizedPhone, normalizedEmail,
           postcode || 'FC-01-A03-FK-01', neighbourhood ? `${neighbourhood}, Abuja` : 'Wuse 2, Abuja', neighbourhood || 'Wuse 2',
           capacity ? parseInt(capacity, 10) : 50]
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

      await client.query('COMMIT');
      res.status(201).json({ user: toSafeUser(newUser) });
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

module.exports = router;
