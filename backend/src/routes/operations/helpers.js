const db = require('../../config/db');

// GET /api/v1/operations/postcode-occupants (Postcode Occupancy Directory & Relocation Forwarding Search)
async function handlePostcodeOccupants(req, res) {
  const queryPostcode = (req.query.postcode || '').trim();
  if (!queryPostcode) {
    return res.status(400).json({ error: 'postcode query parameter is required.' });
  }

  try {
    const pcRes = await db.query(
      `SELECT * FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 OR legacy_code = $1 LIMIT 1`,
      [queryPostcode]
    );

    // Active residents with this postcode
    const activeRes = await db.query(
      `SELECT u.id, u.name, u.phone, u.email, u.postcode, u.created_at,
              b.box_number, b.is_ground_truth_verified
       FROM users u
       LEFT JOIN digital_boxes b ON b.user_id = u.id
       WHERE u.postcode = $1 OR u.postcode = replace($1, '-', '')
       ORDER BY u.created_at DESC`,
      [queryPostcode]
    );

    // Residents who moved away from this postcode and where they went
    const relocatedRes = await db.query(
      `SELECT r.old_postcode, r.old_address, r.new_postcode, r.new_address, r.changed_at,
              u.id AS user_id, u.name, u.phone, b.box_number
       FROM relocations r
       JOIN digital_boxes b ON b.id = r.box_id
       JOIN users u ON u.id = b.user_id
       WHERE r.old_postcode = $1 OR replace(r.old_postcode, '-', '') = replace($1, '-', '')`,
      [queryPostcode]
    );

    res.json({
      postcode: queryPostcode,
      details: pcRes.rows[0] || null,
      activeResidents: activeRes.rows.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        status: 'ACTIVE_RESIDENT',
        proofOfAddress: u.is_ground_truth_verified ? 'Ground-Truth Verified' : 'Registry Verified',
        digitalBox: u.box_number
      })),
      relocatedResidents: relocatedRes.rows.map((r) => ({
        userId: r.user_id,
        name: r.name,
        phone: r.phone,
        digitalBox: r.box_number,
        oldPostcode: r.old_postcode,
        oldAddress: r.old_address,
        newPostcode: r.new_postcode,
        newAddress: r.new_address,
        changedAt: r.changed_at,
        forwardingRule: 'ACTIVE_AUTO_FORWARD'
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handlePostcodeOccupants };