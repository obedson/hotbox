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
      `SELECT u.id, u.name, u.phone, u.email, u.postcode, u.digital_box, u.created_at
       FROM users u
       WHERE u.postcode = $1 OR u.postcode = replace($1, '-', '')
       ORDER BY u.created_at DESC`,
      [queryPostcode]
    );

    // Relocated residents who previously lived at this postcode
    const allUsersWithBox = await db.query(
      `SELECT id, name, phone, email, postcode, digital_box FROM users WHERE digital_box IS NOT NULL`
    );

    const relocated = [];
    for (const u of allUsersWithBox.rows) {
      const box = u.digital_box || {};
      const relocs = Array.isArray(box.relocations) ? box.relocations : [];
      for (const r of relocs) {
        if (r.oldPostcode === queryPostcode || r.oldPostcode?.replace(/-/g, '') === queryPostcode.replace(/-/g, '')) {
          relocated.push({
            userId: u.id,
            name: u.name,
            phone: u.phone,
            oldPostcode: r.oldPostcode,
            oldAddress: r.oldAddress,
            newPostcode: r.newPostcode,
            newAddress: r.newAddress,
            changedAt: r.changedAt,
            forwardingRule: 'ACTIVE_AUTO_FORWARD'
          });
        }
      }
    }

    res.json({
      postcode: queryPostcode,
      details: pcRes.rows[0] || null,
      activeResidents: activeRes.rows.map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        status: 'ACTIVE_RESIDENT',
        proofOfAddress: u.digital_box?.isGroundTruthVerified ? 'Verified by NIPOST (Ground-Truth Certified)' : 'Standard Registry',
        digitalBox: `HBX-PBOX-${(u.postcode || '900001').replace(/-/g, '').slice(0, 8)}-${u.id.slice(0, 4).toUpperCase()}`
      })),
      relocatedResidents: relocated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handlePostcodeOccupants };
