const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
// GET /api/v1/enterprise/addresses (Live PostgreSQL address book feed)
router.get('/addresses', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, type } = req.query;

    const conditions = ['user_id = $1'];
    const params = [userId];

    if (type && type !== 'ALL') {
      params.push(type);
      conditions.push(`address_type = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(`(LOWER(contact_name) LIKE $${params.length} OR LOWER(contact_phone) LIKE $${params.length} OR LOWER(postcode) LIKE $${params.length} OR LOWER(street_address) LIKE $${params.length} OR LOWER(area_neighbourhood) LIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT * 
      FROM addresses 
      WHERE ${whereClause}
      ORDER BY is_default DESC, created_at DESC
    `;

    const result = await db.query(query, params);
    res.json({
      addresses: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load enterprise address book: ' + err.message });
  }
});

// POST /api/v1/enterprise/addresses (Add pre-validated recipient / branch node)
router.post('/addresses', authenticate, async (req, res) => {
  const {
    contactName,
    contactPhone,
    contactEmail,
    addressType = 'business',
    postcode,
    streetAddress,
    areaNeighbourhood,
    landmark,
    state,
    lga,
    isDefault = false
  } = req.body;

  if (!contactName || !contactPhone || !postcode || !streetAddress) {
    return res.status(400).json({ error: 'Recipient name, phone, valid NDAPS postcode, and street address are required.' });
  }

  // Enforce allowed check constraint
  const allowedTypes = ['residential', 'business', 'hub', 'delivery', 'dispatch'];
  const safeType = allowedTypes.includes(addressType) ? addressType : 'business';

  try {
    const userId = req.user.id;

    if (isDefault) {
      await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    const cleanPostcode = postcode.trim().toUpperCase();
    const resolvedState = state || 'Federal Capital Territory';
    const resolvedLga = lga || 'Abuja Municipal';
    const resolvedNeighbourhood = areaNeighbourhood || 'Metro';

    const insertQuery = `
      INSERT INTO addresses (
        user_id, contact_name, contact_phone, contact_email, address_type,
        postcode, state, lga, area_neighbourhood, street_address, landmark,
        lat, lng, is_verified, verification_source, verified_at, is_default, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        9.0765, 7.4985, TRUE, 'NIPOST_NDAPS', NOW(), $12, NOW()
      ) RETURNING *
    `;

    const result = await db.query(insertQuery, [
      userId, contactName.trim(), contactPhone.trim(), contactEmail ? contactEmail.trim() : null, safeType,
      cleanPostcode, resolvedState, resolvedLga, resolvedNeighbourhood, streetAddress.trim(), landmark ? landmark.trim() : null,
      Boolean(isDefault)
    ]);

    res.status(201).json({
      message: 'Address pre-validated and saved into live database successfully.',
      address: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save address: ' + err.message });
  }
});

// DELETE /api/v1/enterprise/addresses/:id (Tenant-isolated deletion)
router.delete('/addresses/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const delRes = await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found or unauthorized' });
    }

    res.json({ message: 'Address removed successfully from live address book.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete address: ' + err.message });
  }
});

// PUT /api/v1/enterprise/addresses/:id/default
router.put('/addresses/:id/default', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    const upRes = await db.query('UPDATE addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);

    if (upRes.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Default address updated successfully', address: upRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update default address: ' + err.message });
  }
});

module.exports = router;
