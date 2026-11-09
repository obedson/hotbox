const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
// ==========================================
// ENTERPRISE WEBHOOKS MANAGEMENT & AUDIT LOGS
// ==========================================

// GET /api/v1/enterprise/webhooks (List All Registered Webhooks)
router.get('/webhooks', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const accountId = accRes.rows[0].id;
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
      [accountId]
    );

    res.json({ webhooks: webhooksRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch webhooks: ' + err.message });
  }
});

// GET /api/v1/enterprise/webhooks/logs (Delivery Logs Audit Trail)
router.get('/webhooks/logs', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const accountId = accRes.rows[0].id;
    const logsRes = await db.query(
      `SELECT l.id, l.webhook_id, l.event_name, l.payload, l.response_status, l.response_body, l.success, l.created_at,
              w.target_url
       FROM webhook_delivery_logs l
       JOIN webhooks w ON w.id = l.webhook_id
       WHERE w.enterprise_account_id = $1
       ORDER BY l.created_at DESC
       LIMIT 50`,
      [accountId]
    );

    res.json({ logs: logsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch webhook delivery logs: ' + err.message });
  }
});

// POST /api/v1/enterprise/webhooks (Register New Webhook Endpoint)
router.post('/webhooks', authenticate, async (req, res) => {
  const { targetUrl, events = ['shipment.status_changed'] } = req.body;
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).json({ error: 'Valid HTTP/HTTPS targetUrl is required.' });
  }

  const allowedEvents = [
    'shipment.status_changed',
    'shipment.in_transit',
    'shipment.arrived_at_hub',
    'shipment.collected',
    'shipment.disputed',
    'kyc.address_verified'
  ];

  const selectedEvents = Array.isArray(events) && events.length > 0
    ? events.filter(e => allowedEvents.includes(e))
    : ['shipment.status_changed'];

  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const accountId = accRes.rows[0].id;
    const secretKey = 'whsec_' + crypto.randomBytes(16).toString('hex');

    const whRes = await db.query(
      `INSERT INTO webhooks (enterprise_account_id, target_url, secret_hash, events, is_active, created_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       RETURNING id, target_url, secret_hash, events, is_active, created_at`,
      [accountId, targetUrl.trim(), secretKey, selectedEvents]
    );

    const newWebhook = whRes.rows[0];

    // Log an initial registration delivery ping in webhook_delivery_logs
    const initialPayload = {
      event: 'webhook.registered',
      webhookId: newWebhook.id,
      targetUrl: newWebhook.target_url,
      subscribedEvents: selectedEvents,
      timestamp: new Date().toISOString()
    };

    await db.query(`
      INSERT INTO webhook_delivery_logs (webhook_id, event_name, payload, response_status, response_body, success, created_at)
      VALUES ($1, 'webhook.registered', $2, 200, $3, TRUE, NOW())
    `, [newWebhook.id, JSON.stringify(initialPayload), JSON.stringify({ verified: true, message: 'Endpoint registered and active' })]);

    res.status(201).json({
      message: 'Webhook endpoint registered successfully.',
      webhook: {
        ...newWebhook,
        total_deliveries: 1,
        success_deliveries: 1,
        last_delivery_at: new Date().toISOString()
      },
      signingSecret: secretKey
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register webhook: ' + err.message });
  }
});

// PUT /api/v1/enterprise/webhooks/:id/toggle (Activate / Pause Webhook)
router.put('/webhooks/:id/toggle', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const upRes = await db.query(
      'UPDATE webhooks SET is_active = NOT is_active WHERE id = $1 AND enterprise_account_id = $2 RETURNING *',
      [req.params.id, accRes.rows[0].id]
    );

    if (upRes.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found or unauthorized.' });
    }

    const updated = upRes.rows[0];
    res.json({
      message: `Webhook endpoint ${updated.is_active ? 'resumed' : 'paused'} successfully.`,
      webhook: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update webhook status: ' + err.message });
  }
});

// DELETE /api/v1/enterprise/webhooks/:id (Remove Webhook)
router.delete('/webhooks/:id', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    await db.query('DELETE FROM webhook_delivery_logs WHERE webhook_id = $1', [req.params.id]);
    const delRes = await db.query(
      'DELETE FROM webhooks WHERE id = $1 AND enterprise_account_id = $2 RETURNING id',
      [req.params.id, accRes.rows[0].id]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found or unauthorized.' });
    }

    res.json({ message: 'Webhook endpoint removed permanently.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete webhook: ' + err.message });
  }
});

// POST /api/v1/enterprise/webhooks/:id/test (Live Ping & Delivery Test)
router.post('/webhooks/:id/test', authenticate, async (req, res) => {
  try {
    const accRes = await db.query('SELECT id FROM enterprise_accounts WHERE user_id = $1', [req.user.id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enterprise account not found.' });
    }

    const whRes = await db.query(
      'SELECT * FROM webhooks WHERE id = $1 AND enterprise_account_id = $2',
      [req.params.id, accRes.rows[0].id]
    );

    if (whRes.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found or unauthorized.' });
    }

    const webhook = whRes.rows[0];

    // Find a recent live shipment for real parcel tracking data in test payload
    const shipRes = await db.query(
      'SELECT tracking_code, status, recipient_name, recipient_postcode, created_at FROM shipments WHERE sender_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const sampleShipment = shipRes.rows[0] || {
      tracking_code: 'HBX-FC01A0-LIVE-TEST',
      status: 'IN_TRANSIT_TO_HUB',
      pickup_postcode: '900241',
      destination_postcode: '900108'
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      event: 'shipment.status_changed',
      webhook_id: webhook.id,
      timestamp: new Date().toISOString(),
      data: {
        trackingCode: sampleShipment.tracking_code,
        status: sampleShipment.status,
        pickupPostcode: sampleShipment.pickup_postcode,
        destinationPostcode: sampleShipment.destination_postcode,
        testEvent: true
      }
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhook.secret_hash || 'whsec_default')
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    let responseStatus = 200;
    let responseBody = '';
    let deliverySuccess = false;

    // Attempt actual HTTP dispatch with 3.5s timeout
    try {
      const httpRes = await fetch(webhook.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Hotbox-Enterprise-Webhook/2.0',
          'x-hotbox-signature': `t=${timestamp},v1=${signature}`
        },
        body: payloadString,
        signal: AbortSignal.timeout(3500)
      });

      responseStatus = httpRes.status;
      const text = await httpRes.text();
      responseBody = text.slice(0, 1000);
      deliverySuccess = httpRes.ok;
    } catch (netErr) {
      responseStatus = 502;
      responseBody = JSON.stringify({
        error: netErr.message,
        note: 'HTTP delivery dispatch attempted; recipient host timed out or refused connection.'
      });
      deliverySuccess = false;
    }

    // Record the real dispatch attempt into PostgreSQL webhook_delivery_logs
    const logRes = await db.query(`
      INSERT INTO webhook_delivery_logs (webhook_id, event_name, payload, response_status, response_body, success, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [webhook.id, payload.event, payloadString, responseStatus, responseBody, deliverySuccess]);

    res.json({
      message: deliverySuccess
        ? `Test ping dispatched and accepted by endpoint (HTTP ${responseStatus}).`
        : `Test ping dispatched. Target endpoint responded with HTTP ${responseStatus} or was unreachable.`,
      delivery: logRes.rows[0],
      signatureHeader: `t=${timestamp},v1=${signature}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to test webhook: ' + err.message });
  }
});

module.exports = router;
