const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const { paginate } = require('../../utils/pagination');

// Credentials that must never travel inside a list payload. The pickup OTP is
// delivered out-of-band at booking and on an explicit resend, so a stolen
// session token cannot harvest a live code from this list.
const LIST_SECRET_COLUMNS = [
  'pickup_otp',
  'pickup_otp_expires_at',
  'pickup_otp_attempts',
  'pickup_otp_consumed_at'
];

// Collection credentials belong to the recipient. A sender who booked the
// parcel must never be able to read the code that releases it.
const RECIPIENT_ONLY_COLUMNS = [
  'delivery_otp',
  'collection_qr_token'
];

function scopeShipmentForList(shipment, user) {
  const isSender = shipment.sender_id === user.id;
  const isRecipient = shipment.recipient_phone === user.phone;
  const scoped = { ...shipment, is_sender: isSender, is_recipient: isRecipient };

  for (const column of LIST_SECRET_COLUMNS) delete scoped[column];
  if (!isRecipient) {
    for (const column of RECIPIENT_ONLY_COLUMNS) delete scoped[column];
  }
  return scoped;
}
// GET /api/v1/customer/shipments
router.get('/shipments', authenticate, async (req, res) => {
  try {
    const baseSql = `
      SELECT s.*, h.business_name as destination_hub_name, h.address_text as destination_hub_address
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      WHERE s.sender_id = $1 OR s.recipient_phone = $2
      ORDER BY s.created_at DESC
    `;
    const result = await paginate(
      db,
      'SELECT COUNT(*) FROM shipments WHERE sender_id = $1 OR recipient_phone = $2',
      baseSql,
      [req.user.id, req.user.phone],
      req
    );

    res.json({
      shipments: result.items.map((shipment) => scopeShipmentForList(shipment, req.user)),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/shipments/:id/cancel
router.post('/shipments/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;
  const { reason = 'Cancelled by sender' } = req.body;
  try {
    const shipRes = await db.query('SELECT * FROM shipments WHERE id = $1 AND sender_id = $2', [id, req.user.id]);
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found or unauthorized.' });
    }

    const shipment = shipRes.rows[0];
    if (shipment.status !== 'BOOKED') {
      return res.status(400).json({ error: `Cannot cancel shipment in status '${shipment.status}'. Only BOOKED shipments can be cancelled.` });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE shipments SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [id]);

      // Record in immutable custody ledger
      await client.query(`
        INSERT INTO custody_ledger (
          shipment_id, actor_id, actor_role, handover_type,
          status_before_handover, status_after_handover, notes
        ) VALUES ($1, $2, 'customer', 'HUB_TO_RETURN', 'BOOKED', 'CANCELLED', $3)
      `, [id, req.user.id, reason]);

      // Refund to wallet with atomic ledger audit
      let walletRes = await client.query('SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE', [req.user.id]);
      if (walletRes.rows.length > 0) {
        const wallet = walletRes.rows[0];
        const refundAmt = parseFloat(shipment.pricing_total_ngn);
        const balBefore = parseFloat(wallet.balance_ngn);
        const balAfter = balBefore + refundAmt;
        await client.query(
          'UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2',
          [balAfter, wallet.id]
        );
        const refundRef = `REFUND-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        await client.query(`
          INSERT INTO transactions (
            wallet_id, shipment_id, transaction_type, amount_ngn, fee_ngn, net_amount_ngn,
            balance_before_ngn, balance_after_ngn, reference, payment_gateway, gateway_reference, status, metadata
          ) VALUES ($1, $2, 'DISPUTE_REFUND', $3, 0.00, $3, $4, $5, $6, 'WALLET', $6, 'COMPLETED', $7)
        `, [
          wallet.id,
          id,
          refundAmt,
          balBefore,
          balAfter,
          refundRef,
          JSON.stringify({ description: `Dispute Resolution / Cancellation Refund for ${shipment.tracking_code}` })
        ]);
      }

      await client.query('COMMIT');
      res.json({ message: 'Shipment cancelled and fee refunded to wallet.', status: 'CANCELLED' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/shipments/:id/return
router.post('/shipments/:id/return', authenticate, async (req, res) => {
  const { id } = req.params;
  const { reason = 'Recipient rejected or return requested' } = req.body;
  try {
    const shipRes = await db.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    await db.query("UPDATE shipments SET status = 'RETURNED_TO_HUB', updated_at = NOW() WHERE id = $1", [id]);

    await db.query(`
      INSERT INTO custody_ledger (
        shipment_id, actor_id, actor_role, handover_type,
        status_before_handover, status_after_handover, notes
      ) VALUES ($1, $2, 'customer', 'HUB_TO_RETURN', $3, 'RETURNED_TO_HUB', $4)
    `, [id, req.user.id, shipRes.rows[0].status, reason]);

    res.json({ message: 'Return initiated for shipment.', status: 'RETURNED_TO_HUB' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
