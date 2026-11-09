const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
// ==========================================
// ENTERPRISE COMPANY SETTINGS ENDPOINTS (TAB 8)
// ==========================================

// GET /api/v1/enterprise/settings (Fetch company profile, rate cards, warehouses, staff seats)
router.get('/settings', authenticate, async (req, res) => {
  try {
    const accRes = await db.query(
      `SELECT * FROM enterprise_accounts WHERE user_id = $1`,
      [req.user.id]
    );

    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account profile not found.' });
    }

    const account = accRes.rows[0];

    // Get fulfillment warehouses / distribution nodes from addresses table
    const warehouseRes = await db.query(
      `SELECT id, contact_name, contact_phone, contact_email, address_type, postcode, state, lga, area_neighbourhood, street_address, is_default, is_verified, created_at
       FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );

    // Get user details
    const userRes = await db.query(
      `SELECT name, email, phone, postcode, notification_preferences FROM users WHERE id = $1`,
      [req.user.id]
    );

    res.json({
      settings: {
        ...account,
        user_contact: userRes.rows[0] || null
      },
      warehouses: warehouseRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enterprise settings: ' + err.message });
  }
});

// PUT /api/v1/enterprise/settings (Update company profile, contact details, headquarters)
router.put('/settings', authenticate, async (req, res) => {
  try {
    const {
      company_name,
      cac_rc_number,
      tax_id,
      billing_email,
      support_phone,
      headquarters_address,
      headquarters_postcode
    } = req.body;

    const accRes = await db.query(
      `UPDATE enterprise_accounts
       SET company_name = COALESCE($1, company_name),
           cac_rc_number = COALESCE($2, cac_rc_number),
           tax_id = COALESCE($3, tax_id),
           billing_email = COALESCE($4, billing_email),
           support_phone = COALESCE($5, support_phone),
           headquarters_address = COALESCE($6, headquarters_address),
           headquarters_postcode = COALESCE($7, headquarters_postcode),
           updated_at = NOW()
       WHERE user_id = $8
       RETURNING *`,
      [
        company_name,
        cac_rc_number,
        tax_id,
        billing_email,
        support_phone,
        headquarters_address,
        headquarters_postcode,
        req.user.id
      ]
    );

    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account profile not found.' });
    }

    // Sync company name to users table if provided
    if (company_name) {
      await db.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [company_name, req.user.id]);
    }

    res.json({
      message: 'Enterprise merchant profile updated successfully in PostgreSQL database.',
      settings: accRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update enterprise settings: ' + err.message });
  }
});

// POST /api/v1/enterprise/settings/staff (Invite / Add authorized staff seat)
router.post('/settings/staff', authenticate, async (req, res) => {
  try {
    const { name, email, phone, role, access_level } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Missing required staff fields: name, email, role.' });
    }

    const accRes = await db.query('SELECT staff_seats FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const currentSeats = accRes.rows[0].staff_seats || [];
    const newSeat = {
      id: `seat-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '+234 800 000 0000',
      role: role.trim(),
      access_level: access_level || 'OPERATIONS',
      status: 'ACTIVE',
      last_active: new Date().toISOString()
    };

    const updatedSeats = [...currentSeats, newSeat];
    await db.query(
      'UPDATE enterprise_accounts SET staff_seats = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(updatedSeats), req.user.id]
    );

    res.status(201).json({
      message: `Staff seat added for ${name} (${role}).`,
      seat: newSeat,
      staff_seats: updatedSeats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add staff seat: ' + err.message });
  }
});

// DELETE /api/v1/enterprise/settings/staff/:id (Revoke / Remove staff seat)
router.delete('/settings/staff/:id', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT staff_seats FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const currentSeats = accRes.rows[0].staff_seats || [];
    const updatedSeats = currentSeats.filter(s => s.id !== req.params.id);

    await db.query(
      'UPDATE enterprise_accounts SET staff_seats = $1, updated_at = NOW() WHERE user_id = $2',
      [JSON.stringify(updatedSeats), req.user.id]
    );

    res.json({
      message: 'Staff seat access revoked successfully.',
      staff_seats: updatedSeats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke staff seat: ' + err.message });
  }
});

module.exports = router;
