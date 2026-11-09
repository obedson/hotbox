const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const { normalizePostcode, resolvePostcode } = require('../../services/postcodeService');
// GET /api/v1/customer/addresses
router.get('/addresses', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json({ addresses: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/addresses
router.post('/addresses', authenticate, async (req, res) => {
  const {
    addressType = 'residential',
    postcode,
    state,
    lga,
    streetAddress,
    areaNeighbourhood,
    landmark,
    lat,
    lng,
    isDefault = false
  } = req.body;

  if (!postcode || !streetAddress) {
    return res.status(400).json({ error: 'Postcode and street address are required.' });
  }

  try {
    let resolvedState = state;
    let resolvedLga = lga;
    let resolvedNeighbourhood = areaNeighbourhood;
    let resolvedLat = lat;
    let resolvedLng = lng;

    // If neighbourhood, state, or coordinates are not provided, auto-resolve from NIPOST NDAPS
    if (!resolvedNeighbourhood || !resolvedState || !resolvedLat) {
      try {
        const pcInfo = await resolvePostcode(postcode);
        if (pcInfo) {
          resolvedState = resolvedState || pcInfo.state;
          resolvedLga = resolvedLga || pcInfo.lga;
          resolvedNeighbourhood = resolvedNeighbourhood || pcInfo.neighbourhood || pcInfo.lga || pcInfo.state;
          resolvedLat = resolvedLat || pcInfo.lat || 9.0772;
          resolvedLng = resolvedLng || pcInfo.lng || 7.4990;
        } else {
          const norm = normalizePostcode(postcode);
          if (norm?.stateInfo) {
            resolvedState = resolvedState || norm.stateInfo.name;
          }
        }
      } catch (e) {}
    }

    if (isDefault) {
      await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    }

    const result = await db.query(`
      INSERT INTO addresses (
        user_id, address_type, postcode, state, lga, street_address,
        area_neighbourhood, landmark, lat, lng, is_default, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
      RETURNING *
    `, [
      req.user.id,
      addressType,
      postcode,
      resolvedState || 'Nigeria',
      resolvedLga || '',
      streetAddress,
      resolvedNeighbourhood || '',
      landmark || null,
      resolvedLat || 9.0772,
      resolvedLng || 7.4990,
      isDefault
    ]);

    res.status(201).json({ message: 'Address saved successfully', address: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/customer/addresses/:id
router.delete('/addresses/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Address removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/customer/saved-hubs
router.get('/saved-hubs', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT h.*, sh.label as saved_label, sh.created_at as saved_at
      FROM user_saved_hubs sh
      JOIN hubs h ON sh.hub_id = h.id
      WHERE sh.user_id = $1
    `, [req.user.id]);
    res.json({ savedHubs: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/saved-hubs/:hubId
router.post('/saved-hubs/:hubId', authenticate, async (req, res) => {
  const { hubId } = req.params;
  const { label = 'Preferred Hub' } = req.body;
  try {
    // Check if already saved; toggle
    const check = await db.query('SELECT id FROM user_saved_hubs WHERE user_id = $1 AND hub_id = $2', [req.user.id, hubId]);
    if (check.rows.length > 0) {
      await db.query('DELETE FROM user_saved_hubs WHERE user_id = $1 AND hub_id = $2', [req.user.id, hubId]);
      return res.json({ message: 'Hub removed from saved hubs', saved: false });
    }

    await db.query(
      'INSERT INTO user_saved_hubs (user_id, hub_id, label) VALUES ($1, $2, $3)',
      [req.user.id, hubId, label]
    );
    res.json({ message: 'Hub added to preferred hubs', saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
