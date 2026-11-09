const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const { getEnterpriseStats } = require('./helpers');
// GET /api/v1/enterprise/account
router.get('/account', authenticate, async (req, res) => {
  try {
    const accRes = await db.query(
      'SELECT * FROM enterprise_accounts WHERE user_id = $1',
      [req.user.id]
    );

    let account = accRes.rows[0];
    if (!account) {
      // Auto-create for enterprise role
      const created = await db.query(
        `INSERT INTO enterprise_accounts (user_id, company_name)
         VALUES ($1, $2)
         RETURNING *`,
        [req.user.id, `${req.user.name} Corp`]
      );
      account = created.rows[0];
    }

    const keysRes = await db.query(
      `SELECT id, name, key_prefix, permissions, environment, rate_limit_per_minute, is_revoked, last_used_at, created_at, revoked_at 
       FROM enterprise_api_keys 
       WHERE enterprise_account_id = $1 
       ORDER BY is_revoked ASC, created_at DESC`,
      [account.id]
    );

    const webhooksRes = await db.query(
      `SELECT w.id, w.target_url, w.secret_hash, w.events, w.is_active, w.created_at,
              COUNT(l.id)::int AS total_deliveries,
              COUNT(CASE WHEN l.success = TRUE THEN 1 END)::int AS success_deliveries,
              MAX(l.created_at) AS last_delivery_at
       FROM webhooks w
       LEFT JOIN webhook_delivery_logs l ON l.webhook_id = w.id
       WHERE w.enterprise_account_id = $1
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [account.id]
    );

    const stats = await getEnterpriseStats(req.user.id);

    res.json({
      account,
      apiKeys: keysRes.rows,
      webhooks: webhooksRes.rows,
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/enterprise/api-keys (Generate Enterprise API Key with Environment & Scopes)
router.post('/api-keys', authenticate, async (req, res) => {
  const {
    name = 'Production Backend Key',
    environment = 'production',
    permissions = ['shipments:read', 'shipments:write']
  } = req.body;

  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const accountId = accRes.rows[0].id;
    const isSandbox = (environment === 'sandbox');
    const keyEnv = isSandbox ? 'sandbox' : 'production';
    const rateLimit = isSandbox ? 100 : 1000;

    const rawSecret = crypto.randomBytes(24).toString('hex');
    const fullKey = isSandbox ? `hbx_test_${rawSecret}` : `hbx_live_${rawSecret}`;
    const prefix = fullKey.slice(0, 12);
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const validPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : ['shipments:read', 'shipments:write'];

    const keyRes = await db.query(
      `INSERT INTO enterprise_api_keys (
         enterprise_account_id, name, key_prefix, hashed_key, permissions,
         environment, rate_limit_per_minute, is_revoked, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())
       RETURNING id, name, key_prefix, permissions, environment, rate_limit_per_minute, is_revoked, created_at`,
      [accountId, name.trim(), prefix, hash, validPermissions, keyEnv, rateLimit]
    );

    res.status(201).json({
      message: 'Enterprise API key generated successfully. Copy this token now; it is hashed and will not be displayed again.',
      apiKey: fullKey,
      keyDetails: keyRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate API key: ' + err.message });
  }
});

// POST /api/v1/enterprise/api-keys/:id/revoke (Revoke Key per prompt.txt §16)
router.post('/api-keys/:id/revoke', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) return res.status(404).json({ error: 'Enterprise account not found.' });

    const keyRes = await db.query(
      `UPDATE enterprise_api_keys 
       SET is_revoked = TRUE, revoked_at = NOW() 
       WHERE id = $1 AND enterprise_account_id = $2
       RETURNING id, name, key_prefix, is_revoked, revoked_at`,
      [req.params.id, accRes.rows[0].id]
    );

    if (keyRes.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found or unauthorized.' });
    }

    res.json({ message: 'API key revoked successfully.', key: keyRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke API key: ' + err.message });
  }
});

// DELETE /api/v1/enterprise/api-keys/:id (Permanently delete key)
router.delete('/api-keys/:id', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) return res.status(404).json({ error: 'Enterprise account not found.' });

    const delRes = await db.query(
      'DELETE FROM enterprise_api_keys WHERE id = $1 AND enterprise_account_id = $2 RETURNING id',
      [req.params.id, accRes.rows[0].id]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found or unauthorized.' });
    }

    res.json({ message: 'API key deleted permanently.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete API key: ' + err.message });
  }
});

module.exports = router;
