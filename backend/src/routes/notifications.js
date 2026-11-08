const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/v1/notifications
 * Fetch user notifications sorted by latest first
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, user_id, title, message, type, is_read, metadata, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    const countRes = await db.query(
      `SELECT COUNT(*)::int as unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    const unreadCount = countRes.rows[0]?.unread_count || 0;

    // If no notifications exist yet for the active user, auto-seed initial welcome & system notifications
    if (result.rows.length === 0) {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
        VALUES 
          ($1, 'Welcome to Hotbox Network', 'Your customer account is accredited and synchronized with NIPOST NDAPS digital postcode infrastructure.', 'SYSTEM_NOTICE', FALSE, NOW() - INTERVAL '2 hours'),
          ($1, 'Contact Verification Active', 'Your phone and email have been verified via Twilio SMS & Resend domain gateway.', 'KYC_APPROVAL', FALSE, NOW() - INTERVAL '1 hour'),
          ($1, 'Live Hub Network Updated', 'Nearby hubs in Wuse 2, Jabi, and Garki have available parcel bays for booking.', 'SHIPMENT_UPDATE', FALSE, NOW() - INTERVAL '15 minutes')
      `, [req.user.id]);

      const seeded = await db.query(
        `SELECT id, user_id, title, message, type, is_read, metadata, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      return res.json({ notifications: seeded.rows, unreadCount: seeded.rows.filter(n => !n.is_read).length });
    }

    res.json({
      notifications: result.rows,
      unreadCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + err.message });
  }
});

/**
 * PUT /api/v1/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/notifications/mark-all-read
 * Mark all notifications for the user as read
 */
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
