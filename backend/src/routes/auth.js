const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../middleware/validate');
const { sendEmailNotification } = require('../services/notificationService');
const { SELF_SIGNUP_ROLES, portalForRole } = require('../config/roles');

const TOKEN_TTL = '7d';
const RESET_TOKEN_TTL_MINUTES = 30;
const APP_BASE_URL = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

const hashPassword = (password) => bcrypt.hash(password, 10);

const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });

const toSafeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

// Store local formats (0803...) and international formats (+234803...) in one
// canonical shape so a customer can sign in either way.
function normalizePhone(phone) {
  const raw = String(phone || '').trim().replace(/[\s-]/g, '');
  if (/^0\d{10}$/.test(raw)) return `+234${raw.slice(1)}`;
  return raw;
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const publicUser = (user) => ({
  ...toSafeUser(user),
  portal: portalForRole(user.role)
});

// POST /api/v1/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const {
    name,
    phone,
    email,
    password,
    role,
    businessName,
    postcode,
    addressText,
    neighbourhood,
    capacity,
    vehicleType,
    plateNumber,
    cacNumber
  } = req.validatedBody;

  // Defence in depth: the schema already restricts the enum, this guard keeps
  // privilege escalation impossible even if a future change loosens the schema.
  if (!SELF_SIGNUP_ROLES.includes(role)) {
    return res.status(403).json({ error: 'That account type requires administrator approval.' });
  }

  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  try {
    const passwordHash = await hashPassword(password);
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const userPostcode = postcode ? postcode.toString().trim() : 'FC-01-A03-FK-01';
      const userRes = await client.query(
        `INSERT INTO users (name, phone, email, password_hash, role, status, postcode)
         VALUES ($1, $2, $3, $4, $5, 'active', $6)
         RETURNING id, name, phone, email, role, status, postcode, created_at`,
        [name, normalizedPhone, normalizedEmail, passwordHash, role, userPostcode]
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

      const token = signToken(newUser);
      res.status(201).json({ user: publicUser(newUser), token });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err.code === '23505') {
      const field = String(err.detail || '').toLowerCase().includes('email') ? 'email address' : 'phone number';
      return res.status(409).json({ error: `An account with this ${field} already exists. Try signing in instead.` });
    }
    res.status(500).json({ error: 'We could not create your account. Please try again.' });
  }
});

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { identifier, password } = req.validatedBody;
  const normalizedIdentifier = normalizePhone(identifier);

  try {
    const userRes = await db.query(
      `SELECT id, name, phone, email, password_hash, role, status, postcode
       FROM users
       WHERE phone = $1 OR lower(email) = lower($2)`,
      [normalizedIdentifier, normalizedIdentifier]
    );

    const user = userRes.rows[0];

    // One generic message for every failure path so accounts cannot be enumerated.
    const invalid = () => res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });

    if (!user || !user.password_hash) return invalid();

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return invalid();

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ error: 'This account is not active. Please contact Hotbox support.' });
    }

    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (err) {
    res.status(500).json({ error: 'We could not sign you in. Please try again.' });
  }
});

// POST /api/v1/auth/forgot-password
// Always responds the same way so the endpoint cannot be used to probe for
// registered email addresses.
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.validatedBody;
  const normalizedEmail = normalizeEmail(email);
  const generic = {
    message: 'If an account exists for that email, a password reset link is on its way.'
  };

  try {
    const userRes = await db.query('SELECT id, name, email FROM users WHERE lower(email) = $1', [normalizedEmail]);
    const user = userRes.rows[0];
    if (!user) return res.json(generic);

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await db.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${APP_BASE_URL}/?reset=${token}`;
    await sendEmailNotification({
      to: user.email,
      subject: 'Reset your Hotbox password',
      text: `Hi ${user.name}, use this link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="margin: 0 0 8px; color: #0f172a;">Reset your Hotbox password</h2>
          <p style="color: #475569; line-height: 1.5;">Hi ${user.name}, we received a request to reset the password for your Hotbox account.</p>
          <a href="${resetUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold;">Choose a new password</a>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes. If you did not request it, you can safely ignore this email.</p>
        </div>
      `
    });

    return res.json(generic);
  } catch (err) {
    return res.status(500).json({ error: 'We could not process that request. Please try again.' });
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.validatedBody;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const resetRes = await db.query(
      `SELECT id, user_id FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    const reset = resetRes.rows[0];
    if (!reset) {
      return res.status(400).json({ error: 'That recovery link is invalid or has expired. Please request a new one.' });
    }

    const passwordHash = await hashPassword(password);
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, reset.user_id]);
      await client.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [reset.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ message: 'Your password has been updated. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: 'We could not update your password. Please try again.' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const walletRes = await db.query('SELECT balance_ngn, ledger_balance_ngn FROM wallets WHERE user_id = $1', [req.user.id]);
    const wallet = walletRes.rows[0] || { balance_ngn: '0.00', ledger_balance_ngn: '0.00' };

    res.json({
      user: publicUser(req.user),
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
