const express = require('express');
const router = express.Router();
const db = require('../../config/db');
// GET /api/v1/operations/settings (Platform Settings & System Configuration)
router.get('/settings', async (req, res) => {
  try {
    const settingsRes = await db.query(`
      SELECT s.*, u.name as updated_by_name
      FROM system_settings s
      LEFT JOIN users u ON s.updated_by = u.id
      ORDER BY s.category, s.setting_key;
    `);

    // Fetch recent configuration audit logs
    const historyRes = await db.query(`
      SELECT a.*, u.name as actor_name, u.email as actor_email
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.entity_type = 'system_settings'
      ORDER BY a.created_at DESC
      LIMIT 20;
    `);

    // Format into category dictionary
    const formatted = {};
    settingsRes.rows.forEach(r => {
      formatted[r.setting_key] = {
        id: r.id,
        key: r.setting_key,
        category: r.category,
        description: r.description,
        value: r.setting_value,
        updated_at: r.updated_at,
        updated_by_name: r.updated_by_name
      };
    });

    res.json({
      settings: formatted,
      audit_history: historyRes.rows.map(h => ({
        ...h,
        correlation_id: `CORR-${h.id.substring(0, 8).toUpperCase()}`
      }))
    });
  } catch (err) {
    console.error('Operations settings GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/operations/settings (Update Platform Configuration with Mandatory Audit Trail)
router.put('/settings', async (req, res) => {
  try {
    const { setting_key, setting_value, reason } = req.body;

    if (!setting_key || !setting_value) {
      return res.status(400).json({ error: 'setting_key and setting_value are required.' });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A valid administrative justification (reason >= 5 chars) is mandatory for settings modifications.' });
    }

    // Retrieve previous state for auditability
    const prevRes = await db.query('SELECT * FROM system_settings WHERE setting_key = $1;', [setting_key]);
    if (prevRes.rows.length === 0) {
      return res.status(404).json({ error: `Setting '${setting_key}' not found.` });
    }

    const previousValue = prevRes.rows[0].setting_value;
    const actorId = req.headers['x-user-id'] || 'a0000000-0000-0000-0000-000000000002';

    // Update settings table
    const updateRes = await db.query(`
      UPDATE system_settings
      SET setting_value = $1, updated_by = $2, updated_at = NOW()
      WHERE setting_key = $3
      RETURNING *;
    `, [JSON.stringify(setting_value), actorId, setting_key]);

    // Record immutable audit entry
    await db.query(`
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
      VALUES ($1, 'SETTING_MODIFIED', 'system_settings', $2, $3);
    `, [
      actorId,
      updateRes.rows[0].id,
      JSON.stringify({
        setting_key,
        previous_value: previousValue,
        new_value: setting_value,
        reason: reason.trim(),
        role: 'ops_admin',
        effective_at: new Date().toISOString()
      })
    ]);

    res.json({
      message: `Setting '${setting_key}' updated successfully.`,
      setting: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Operations settings PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
