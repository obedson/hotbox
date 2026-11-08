const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { validate, registerSchema } = require('../middleware/validate');

// POST /api/v1/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const {
    name,
    phone,
    email,
    password,
    role = 'customer',
    businessName,
    postcode,
    addressText,
    neighbourhood,
    capacity,
    vehicleType,
    plateNumber,
    cacNumber
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }

  try {
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const userPostcode = postcode ? postcode.toString().trim() : 'FC-01-A03-FK-01';
      const userRes = await client.query(
        `INSERT INTO users (name, phone, email, password_hash, role, status, postcode)
         VALUES ($1, $2, $3, $4, $5, 'active', $6)
         RETURNING id, name, phone, email, role, status, postcode, created_at`,
        [name, phone, email || null, passwordHash, role, userPostcode]
      );

      const newUser = userRes.rows[0];

      // Automatically initialize wallet
      await client.query(
        'INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0.00, 0.00)',
        [newUser.id]
      );

      // Role-specific records
      if (role === 'hub_owner') {
        const hubName = businessName || `${name}'s Community Hub`;
        const hubPostcode = postcode || 'FC-01-A03-FK-01';
        const hubNeighbourhood = neighbourhood || 'Wuse 2';
        const hubAddress = addressText || `${hubNeighbourhood}, Abuja`;
        const hubCapacity = capacity ? parseInt(capacity) : 50;

        await client.query(
          `INSERT INTO hubs (owner_id, business_name, cac_number, phone, email, postcode, address_text, neighbourhood, lga, state, lat, lng, capacity, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Abuja Municipal', 'Abuja (FCT)', 9.0772, 7.4990, $9, 'accredited')`,
          [newUser.id, hubName, cacNumber || null, phone, email || null, hubPostcode, hubAddress, hubNeighbourhood, hubCapacity]
        );
      } else if (role === 'rider') {
        const vType = vehicleType && ['bicycle', 'motorcycle', 'van', 'truck'].includes(vehicleType) ? vehicleType : 'motorcycle';
        await client.query(
          `INSERT INTO riders (user_id, vehicle_type, plate_number, drivers_license_no, operational_postcodes, is_active, is_available)
           VALUES ($1, $2, $3, $4, ARRAY['FC-01-A03-FK-01', 'FC-01-A02-FK-02'], TRUE, TRUE)`,
          [newUser.id, vType, plateNumber || 'ABJ-000-XX', 'DL-PENDING']
        );
      } else if (role === 'enterprise_shipper') {
        const company = businessName || `${name} Logistics`;
        await client.query(
          `INSERT INTO enterprise_accounts (user_id, company_name, billing_tier)
           VALUES ($1, $2, 'PREPAID')`,
          [newUser.id, company]
        );
      }

      await client.query('COMMIT');

      const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ user: newUser, token });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with this phone number or email already exists.' });
    }
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // phone or email

  if (!identifier) {
    return res.status(400).json({ error: 'Phone or email identifier is required.' });
  }

  try {
    const userRes = await db.query(
      'SELECT id, name, phone, email, password_hash, role, status, postcode FROM users WHERE phone = $1 OR email = $1',
      [identifier.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or user not registered.' });
    }

    const user = userRes.rows[0];

    // If password provided and hash exists, verify
    if (password && user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password.' });
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const walletRes = await db.query('SELECT balance_ngn, ledger_balance_ngn FROM wallets WHERE user_id = $1', [req.user.id]);
    const wallet = walletRes.rows[0] || { balance_ngn: '0.00', ledger_balance_ngn: '0.00' };

    res.json({
      user: req.user,
      wallet: {
        balance: parseFloat(wallet.balance_ngn),
        ledgerBalance: parseFloat(wallet.ledger_balance_ngn),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
