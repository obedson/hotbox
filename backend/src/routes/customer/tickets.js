const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const { paginate } = require('../../utils/pagination');
// POST /api/v1/customer/tickets
router.post('/tickets', authenticate, async (req, res) => {
  const { category = 'GENERAL_ENQUIRY', subject, message, priority = 'MEDIUM', shipmentId = null } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  try {
    const result = await db.query(`
      INSERT INTO support_tickets (user_id, shipment_id, category, subject, message, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'OPEN')
      RETURNING *
    `, [req.user.id, shipmentId, category, subject, message, priority]);

    res.status(201).json({ message: 'Support ticket opened.', ticket: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/customer/tickets
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const result = await paginate(
      db,
      'SELECT COUNT(*) FROM support_tickets WHERE user_id = $1',
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id],
      req
    );
    res.json({
      tickets: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
