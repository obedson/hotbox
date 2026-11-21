const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validate, bookingSchema } = require('../middleware/validate');
const { generateOtp, otpExpiryFromNow, OTP_EXPIRY_MINUTES } = require('../utils/otp');
const notificationService = require('../services/notificationService');

function generateTrackingCode(postcode) {
  const cleanPostcode = (postcode || '900001').replace(/[^A-Z0-9]/gi, '').slice(0, 6);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `HBX-${cleanPostcode}-${randomNum}`;
}

// Deliver a pickup OTP to the sender through every channel we have. Returns a
// per-channel receipt so the booking screen can tell the sender where to look.
async function deliverPickupOtp({ phone, email, otp, trackingCode, expiryMinutes }) {
  const message = `Hotbox pickup OTP for ${trackingCode} is ${otp}. Valid for ${expiryMinutes} minutes. Hand it to the rider at pickup.`;
  const receipt = { sms: null, email: null };

  if (phone) {
    try {
      receipt.sms = await notificationService.sendSmsNotification({ phone, message });
    } catch (err) {
      console.warn('[shipments] Pickup OTP SMS failed:', err.message);
      receipt.sms = { success: false, delivered: false };
    }
  }

  if (email) {
    try {
      receipt.email = await notificationService.sendEmailNotification({
        to: email,
        subject: `Hotbox Pickup OTP for ${trackingCode}`,
        text: message,
        html: `<p style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;">${message}</p>`
      });
    } catch (err) {
      console.warn('[shipments] Pickup OTP email failed:', err.message);
      receipt.email = { success: false, delivered: false };
    }
  }

  return receipt;
}

// Dispatch fee per parcel size. Shared by the booking endpoint and the quote
// endpoint so the wallet check before checkout never drifts from the charge.
const SIZE_PRICES_NGN = { small: 1200.00, medium: 1600.00, large: 2400.00 };

// GET /api/v1/shipments/quote - dispatch fee estimate for a parcel size
router.get('/quote', authenticate, (req, res) => {
  const size = String(req.query.size || 'medium').toLowerCase();
  const priceNgn = SIZE_PRICES_NGN[size] || SIZE_PRICES_NGN.medium;
  res.json({ size, priceNgn });
});

// POST /api/v1/shipments/book
router.post('/book', authenticate, validate(bookingSchema), async (req, res) => {
  const {
    serviceType = 'DOOR_TO_HUB',
    senderName,
    senderPhone,
    senderPostcode,
    senderAddressText,
    recipientName,
    recipientPhone,
    recipientEmail,
    recipientPostcode,
    recipientAddressText,
    destinationHubId,
    size = 'medium',
    weightKg = 1.0,
    packageDescription,
    declaredValueNgn = 0.00
  } = req.body;

  if (!recipientName || !recipientPhone || !recipientPostcode || !senderPostcode) {
    return res.status(400).json({ error: 'Sender and Recipient details with valid postcodes are required.' });
  }

  try {
    const trackingCode = generateTrackingCode(destinationHubId ? recipientPostcode : senderPostcode);
    const pickupOtp = generateOtp();
    const pickupOtpExpiresAt = otpExpiryFromNow();
    const deliveryOtp = generateOtp();
    const collectionQrToken = `QR-PASS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Calculate base pricing
    const pricingTotal = SIZE_PRICES_NGN[size] || SIZE_PRICES_NGN.medium;

    const result = await db.query(
      `INSERT INTO shipments (
         tracking_code, service_type, sender_id, sender_name, sender_phone,
         sender_postcode, sender_address_text, recipient_name, recipient_phone,
         recipient_email, recipient_postcode, recipient_address_text,
         destination_hub_id, size, weight_kg, package_description,
         declared_value_ngn, pickup_otp, pickup_otp_expires_at, delivery_otp, collection_qr_token,
         status, pricing_total_ngn, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'BOOKED', $22, NOW() + INTERVAL '3 days')
       RETURNING *`,
      [
        trackingCode,
        serviceType,
        req.user.id,
        senderName || req.user.name,
        senderPhone || req.user.phone,
        senderPostcode,
        senderAddressText || 'Sender Address',
        recipientName,
        recipientPhone,
        recipientEmail || null,
        recipientPostcode,
        recipientAddressText || 'Recipient Destination',
        destinationHubId || null,
        size,
        weightKg,
        packageDescription || 'Parcel',
        declaredValueNgn,
        pickupOtp,
        pickupOtpExpiresAt,
        deliveryOtp,
        collectionQrToken,
        pricingTotal
      ]
    );

    const newShipment = result.rows[0];

    // Audit debit against customer wallet if user has sufficient prepaid balance
    try {
      const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
      if (walletRes.rows.length > 0) {
        const wallet = walletRes.rows[0];
        const curBal = parseFloat(wallet.balance_ngn);
        if (curBal >= pricingTotal) {
          const newBal = curBal - pricingTotal;
          await db.query(
            'UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2',
            [newBal, wallet.id]
          );
          const bookingRef = `BOOKING-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          await db.query(`
            INSERT INTO transactions (
              wallet_id, shipment_id, transaction_type, amount_ngn, fee_ngn, net_amount_ngn,
              balance_before_ngn, balance_after_ngn, reference, payment_gateway, gateway_reference, status, metadata
            ) VALUES ($1, $2, 'BOOKING_PAYMENT', $3, 0.00, $3, $4, $5, $6, 'WALLET', $6, 'COMPLETED', $7)
          `, [
            wallet.id,
            newShipment.id,
            pricingTotal,
            curBal,
            newBal,
            bookingRef,
            JSON.stringify({ description: `Shipment Dispatch Booking (${trackingCode})` })
          ]);
        }
      }
    } catch (wErr) {
      console.warn('Wallet debit warning:', wErr.message);
    }

    // Deliver the pickup OTP to the sender now. It is time-boxed and
    // single-use, so the sender must receive it at booking rather than dig
    // for it later in a dossier.
    const pickupOtpDelivery = await deliverPickupOtp({
      phone: newShipment.sender_phone,
      email: req.user.email,
      otp: pickupOtp,
      trackingCode,
      expiryMinutes: OTP_EXPIRY_MINUTES
    });

    res.status(201).json({
      message: 'Shipment successfully booked.',
      shipment: newShipment,
      pickupOtp, // displayed to sender to give rider
      pickupOtpExpiresAt,
      pickupOtpDelivery,
      collectionQrToken,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to book shipment: ' + err.message });
  }
});

// GET /api/v1/shipments/track/:trackingCode (Public & Authenticated Tracking Dossier)
router.get('/track/:trackingCode', async (req, res) => {
  const code = req.params.trackingCode.trim();
  try {
    const shipRes = await db.query(
      `SELECT 
         s.*,
         h.business_name as destination_hub_name,
         h.address_text as destination_hub_address,
         h.phone as destination_hub_phone,
         h.opening_hours as destination_hub_hours,
         b.bay_code,
         b.size_tier as bay_size_tier,
         u_rider.name as rider_name,
         u_rider.phone as rider_phone,
         r.vehicle_type as rider_vehicle,
         r.id as rider_badge_id
       FROM shipments s
       LEFT JOIN hubs h ON s.destination_hub_id = h.id
       LEFT JOIN hub_storage_bays b ON s.assigned_bay_id = b.id
       LEFT JOIN riders r ON s.assigned_rider_id = r.id
       LEFT JOIN users u_rider ON r.user_id = u_rider.id
       WHERE UPPER(s.tracking_code) = UPPER($1) OR s.id::text = $1`,
      [code]
    );

    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: `Shipment '${code}' not found in Dropzone ledger.` });
    }

    const shipment = shipRes.rows[0];

    // Get comprehensive custody transfer audit trail with actor details
    const custodyRes = await db.query(
      `SELECT 
         c.*,
         u.name as actor_name,
         u.phone as actor_phone,
         u.role as actor_user_role
       FROM custody_ledger c
       LEFT JOIN users u ON c.actor_id = u.id
       WHERE c.shipment_id = $1
       ORDER BY c.created_at ASC`,
      [shipment.id]
    );

    // Get available bays at destination hub (for admin re-assignment if needed)
    let availableBays = [];
    if (shipment.destination_hub_id) {
      const baysRes = await db.query(
        `SELECT id, bay_code, size_tier, is_occupied
         FROM hub_storage_bays
         WHERE hub_id = $1
         ORDER BY bay_code ASC`,
        [shipment.destination_hub_id]
      );
      availableBays = baysRes.rows;
    }

    // OTPs and the collection QR pass are custody credentials. They must never
    // leave through this endpoint, which is intentionally unauthenticated.
    // Senders receive them by SMS/email instead.
    const {
      pickup_otp: _pickupOtp,
      delivery_otp: _deliveryOtp,
      collection_qr_token: _qrToken,
      ...safeShipment
    } = shipment;

    const safeTimeline = custodyRes.rows.map((entry) => {
      const { verification_token: _token, ...rest } = entry;
      return rest;
    });

    res.json({
      shipment: safeShipment,
      timeline: safeTimeline,
      availableBays
    });
  } catch (err) {
    res.status(500).json({ error: 'Tracking lookup failed: ' + err.message });
  }
});

// POST /api/v1/shipments/:id/resend-otp (Admin Action: Re-dispatch collection OTP)
router.post('/:id/resend-otp', authenticate, requireRoles('ops_admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const shipRes = await db.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (shipRes.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    const s = shipRes.rows[0];

    if (!s.delivery_otp) {
      return res.status(400).json({ error: 'No active delivery OTP assigned to this parcel.' });
    }

    const dest = s.recipient_phone || s.sender_phone;
    await notificationService.sendSmsOtp(dest, s.delivery_otp);

    // Log admin intervention in custody ledger
    await db.query(
      `INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, previous_holder_id, new_holder_type, new_holder_id,
        handover_type, status_after_handover, verification_method, verification_token,
        actor_id, actor_role, notes
      ) VALUES ($1, 'SYSTEM', $1, 'RECIPIENT', $1, 'OTP_RESENT', $2, 'SMS_REDISPATCH', $3, $4, 'admin', $5)`,
      [s.id, s.status, s.delivery_otp, req.user.id, `Ops Admin resent delivery OTP to ${dest}`]
    );

    res.json({ success: true, message: `Delivery OTP (${s.delivery_otp}) successfully resent to ${dest}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/shipments/:id/resend-pickup-otp
// Reissues and redelivers the sender's pickup OTP. Restricted to the sender or
// operations staff because it mints a new custody credential.
router.post('/:id/resend-pickup-otp', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const shipRes = await db.query('SELECT * FROM shipments WHERE id = $1', [id]);
    if (shipRes.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    const s = shipRes.rows[0];

    const isSender = s.sender_id === req.user.id;
    const isStaff = ['ops_admin', 'super_admin'].includes(req.user.role);
    if (!isSender && !isStaff) {
      return res.status(403).json({ error: 'Only the sender or operations staff may reissue the pickup OTP.' });
    }
    if (!['BOOKED', 'RIDER_ASSIGNED'].includes(s.status)) {
      return res.status(409).json({ error: 'Pickup OTP can only be reissued before the parcel is picked up.' });
    }

    const pickupOtp = generateOtp();
    const pickupOtpExpiresAt = otpExpiryFromNow();
    await db.query(
      `UPDATE shipments
       SET pickup_otp = $1,
           pickup_otp_expires_at = $2,
           pickup_otp_attempts = 0,
           pickup_otp_consumed_at = NULL,
           updated_at = NOW()
       WHERE id = $3`,
      [pickupOtp, pickupOtpExpiresAt, s.id]
    );

    const pickupOtpDelivery = await deliverPickupOtp({
      phone: s.sender_phone,
      email: req.user.email,
      otp: pickupOtp,
      trackingCode: s.tracking_code,
      expiryMinutes: OTP_EXPIRY_MINUTES
    });

    res.json({
      success: true,
      message: `Pickup OTP reissued and sent to ${s.sender_phone}.`,
      pickupOtp,
      pickupOtpExpiresAt,
      pickupOtpDelivery
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/shipments/:id/flag-exception (Admin Action: Flag dispute or security hold)
router.post('/:id/flag-exception', authenticate, requireRoles('ops_admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Operations security hold / address inquiry' } = req.body;

    const shipRes = await db.query(
      `UPDATE shipments 
       SET status = 'DISPUTED', updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    if (shipRes.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });

    await db.query(
      `INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, previous_holder_id, new_holder_type, new_holder_id,
        handover_type, status_after_handover, verification_method,
        actor_id, actor_role, notes
      ) VALUES ($1, 'HUB', $1, 'ADMIN_HOLD', $1, 'DISPUTED', 'DISPUTED', 'MANUAL_OVERRIDE', $2, 'admin', $3)`,
      [id, req.user.id, `Exception flagged by Ops Admin: ${reason}`]
    );

    res.json({ success: true, shipment: shipRes.rows[0], message: 'Shipment flagged as operational exception.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/shipments/:id/reassign-bay (Admin Action: Reassign storage bay)
router.post('/:id/reassign-bay', authenticate, requireRoles('hub_staff', 'ops_admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { bayId, bayCode } = req.body;

    const shipRes = await db.query(
      `UPDATE shipments 
       SET assigned_bay_id = $1, status = 'STORED_IN_BAY', updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [bayId, id]
    );
    if (shipRes.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });

    // Mark bay as occupied
    if (bayId) {
      await db.query('UPDATE hub_storage_bays SET is_occupied = TRUE, current_shipment_id = $1 WHERE id = $2', [id, bayId]);
    }

    await db.query(
      `INSERT INTO custody_ledger (
        shipment_id, previous_holder_type, previous_holder_id, new_holder_type, new_holder_id,
        handover_type, status_after_handover, verification_method,
        actor_id, actor_role, notes
      ) VALUES ($1, 'HUB', $1, 'BAY_ALLOCATION', $2, 'STORED_IN_BAY', 'STORED_IN_BAY', 'ADMIN_ALLOCATION', $3, 'admin', $4)`,
      [id, bayId, req.user.id, `Bay reassigned to ${bayCode || bayId} by Ops Admin`]
    );

    res.json({ success: true, shipment: shipRes.rows[0], message: `Storage Bay successfully updated to ${bayCode}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/shipments/my-shipments
router.get('/my-shipments', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, h.business_name as destination_hub_name
       FROM shipments s
       LEFT JOIN hubs h ON s.destination_hub_id = h.id
       WHERE s.sender_id = $1 OR s.recipient_phone = $2
       ORDER BY s.created_at DESC`,
      [req.user.id, req.user.phone]
    );

    res.json({ shipments: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/shipments/:id/reroute (Hub / Courier / Customer Reroute due to address change)
router.post('/:id/reroute', authenticate, async (req, res) => {
  const { newPostcode, newAddressText, reason = 'Recipient relocation forwarding' } = req.body;
  if (!newPostcode) {
    return res.status(400).json({ error: 'newPostcode is required to reroute shipment.' });
  }

  try {
    const shipRes = await db.query('SELECT * FROM shipments WHERE id = $1 OR tracking_code = $1', [req.params.id]);
    if (shipRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found.' });
    }
    const shipment = shipRes.rows[0];
    const oldPostcode = shipment.recipient_postcode;

    const updated = await db.query(`
      UPDATE shipments
      SET recipient_postcode = $1,
          recipient_address_text = COALESCE($2, recipient_address_text),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [newPostcode, newAddressText || null, shipment.id]);

    await db.query(`
      INSERT INTO custody_ledger (shipment_id, actor_id, handover_type, verification_method, notes)
      VALUES ($1, $2, 'RELOCATION_REROUTE', 'HOTBOX_P_O_BOX', $3)
    `, [
      shipment.id,
      req.user.id,
      `Shipment rerouted from ${oldPostcode} to ${newPostcode}. Reason: ${reason}`
    ]);

    const alertResult = await notificationService.dispatchDualPartyRerouteAlert({
      shipment: updated.rows[0],
      oldPostcode,
      newPostcode,
      reason,
      reroutedBy: req.user.name || 'Hotbox Courier / Hub'
    });

    res.json({
      message: 'Shipment rerouted successfully and dual-party notifications dispatched.',
      shipment: updated.rows[0],
      alertResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
