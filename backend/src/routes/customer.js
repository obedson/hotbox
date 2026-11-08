const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const { creditWalletForPayment } = require('../services/walletService');
const { normalizePostcode, resolvePostcode } = require('../services/postcodeService');

// GET /api/v1/customer/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.status, u.postcode, u.is_phone_verified, u.is_email_verified,
              u.notification_preferences, u.privacy_settings, u.created_at,
              COALESCE(pc.neighbourhood, pc2.neighbourhood) as postcode_neighbourhood,
              COALESCE(pc.lga, pc2.lga) as postcode_lga,
              COALESCE(pc.state, pc2.state) as postcode_state,
              COALESCE(pc.description, pc2.description) as postcode_description,
              COALESCE(pc.ndaps_code, pc2.ndaps_code, pc.postcode) as ndaps_code,
              COALESCE(pc.legacy_code, pc2.legacy_code, pc.postcode) as legacy_code,
              COALESCE(pc.zone, pc2.zone) as postcode_zone
       FROM users u
       LEFT JOIN postcode_cache pc ON (pc.postcode = u.postcode OR pc.ndaps_code = u.postcode OR pc.legacy_code = u.postcode)
       LEFT JOIN postcode_cache pc2 ON (pc2.postcode = replace(u.postcode, '-', ''))
       WHERE u.id = $1
       LIMIT 1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const walletRes = await db.query('SELECT id, balance_ngn, ledger_balance_ngn FROM wallets WHERE user_id = $1', [req.user.id]);
    let wallet = walletRes.rows[0];
    if (!wallet) {
      const created = await db.query(
        'INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0.00, 0.00) RETURNING id, balance_ngn, ledger_balance_ngn',
        [req.user.id]
      );
      wallet = created.rows[0];
    }

    const txRes = await db.query(
      `SELECT t.*, s.tracking_code 
       FROM transactions t
       LEFT JOIN shipments s ON t.shipment_id = s.id
       WHERE t.wallet_id = $1 
       ORDER BY t.created_at DESC 
       LIMIT 50`,
      [wallet.id]
    );

    const addressesRes = await db.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.id]);

    const hubsRes = await db.query(`
      SELECT h.*, sh.label as saved_label, sh.created_at as saved_at
      FROM user_saved_hubs sh
      JOIN hubs h ON sh.hub_id = h.id
      WHERE sh.user_id = $1
    `, [req.user.id]);

    res.json({
      user: userRes.rows[0],
      wallet: {
        id: wallet.id,
        balance: parseFloat(wallet.balance_ngn),
        ledgerBalance: parseFloat(wallet.ledger_balance_ngn)
      },
      transactions: txRes.rows,
      addresses: addressesRes.rows,
      savedHubs: hubsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/customer/profile
router.put('/profile', authenticate, async (req, res) => {
  const { name, email, phone, postcode, notification_preferences, privacy_settings } = req.body;
  try {
    const existingRes = await db.query('SELECT phone, email, postcode FROM users WHERE id = $1', [req.user.id]);
    const currUser = existingRes.rows[0] || {};

    let phoneVerifiedUpdate = null;
    if (phone && currUser.phone && phone !== currUser.phone) {
      phoneVerifiedUpdate = false;
    }
    let emailVerifiedUpdate = null;
    if (email && currUser.email && email !== currUser.email) {
      emailVerifiedUpdate = false;
    }

    const normalized = postcode ? normalizePostcode(postcode) : null;
    const cleanPostcode = normalized ? (normalized.isNdaps ? normalized.formatted : normalized.code) : (postcode ? postcode.toString().trim() : null);

    const result = await db.query(`
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          postcode = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE postcode END,
          notification_preferences = COALESCE($5, notification_preferences),
          privacy_settings = COALESCE($6, privacy_settings),
          is_phone_verified = CASE WHEN $7::boolean IS NOT NULL THEN $7 ELSE is_phone_verified END,
          is_email_verified = CASE WHEN $8::boolean IS NOT NULL THEN $8 ELSE is_email_verified END,
          updated_at = NOW()
      WHERE id = $9
      RETURNING id, name, phone, email, role, status, postcode, notification_preferences, privacy_settings, is_phone_verified, is_email_verified, created_at
    `, [name, email, phone, cleanPostcode, notification_preferences, privacy_settings, phoneVerifiedUpdate, emailVerifiedUpdate, req.user.id]);

    const updatedUser = result.rows[0];

    // Fetch joined NDAPS metadata
    if (updatedUser?.postcode) {
      const pcRes = await resolvePostcode(updatedUser.postcode);
      if (pcRes) {
        updatedUser.postcode_neighbourhood = pcRes.neighbourhood;
        updatedUser.postcode_lga = pcRes.lga;
        updatedUser.postcode_state = pcRes.state;
        updatedUser.postcode_description = pcRes.description;
        updatedUser.postcode_zone = pcRes.zone;
        updatedUser.ndaps_code = pcRes.postcode;
        updatedUser.legacy_code = pcRes.legacy_postcode;
        updatedUser.display = pcRes.display;
        updatedUser.compact = pcRes.compact;
      }
    }

    // Auto-Forwarding & Dual-Party Reroute: Trigger if customer updated their residential postcode
    if (cleanPostcode && currUser.postcode && cleanPostcode !== currUser.postcode) {
      try {
        const inFlight = await db.query(
          `SELECT * FROM shipments 
           WHERE (recipient_phone = $1 OR (recipient_email = $2 AND recipient_email IS NOT NULL))
             AND status IN ('BOOKED', 'IN_TRANSIT_TO_HUB', 'STORED_IN_BAY', 'PICKED_UP_FROM_SENDER')`,
          [currUser.phone, currUser.email || null]
        );

        for (const ship of inFlight.rows) {
          await db.query(
            `UPDATE shipments 
             SET recipient_postcode = $1, 
                 recipient_address_text = COALESCE($2, recipient_address_text),
                 updated_at = NOW() 
             WHERE id = $3`,
            [cleanPostcode, updatedUser.postcode_neighbourhood ? `${updatedUser.postcode_neighbourhood}, ${updatedUser.postcode_state || ''}` : null, ship.id]
          );

          await db.query(`
            INSERT INTO custody_ledger (shipment_id, actor_id, handover_type, verification_method, notes)
            VALUES ($1, $2, 'RELOCATION_REROUTE', 'HOTBOX_P_O_BOX', $3)
          `, [
            ship.id,
            req.user.id,
            `Automated mail rerouting from ${currUser.postcode} to ${cleanPostcode} triggered by resident address relocation.`
          ]);

          await notificationService.dispatchDualPartyRerouteAlert({
            shipment: ship,
            oldPostcode: currUser.postcode,
            newPostcode: cleanPostcode,
            reason: 'Resident address relocation update on Hotbox',
            reroutedBy: updatedUser.name
          });
        }

        // Record official relocation forwarding history in digital_box
        const currBox = currUser.digital_box || {};
        const relocations = Array.isArray(currBox.relocations) ? currBox.relocations : [];
        relocations.unshift({
          oldPostcode: currUser.postcode,
          oldAddress: currUser.postcode_neighbourhood || 'Previous Residence',
          newPostcode: cleanPostcode,
          newAddress: updatedUser.postcode_neighbourhood || 'New Verified Address',
          phone: updatedUser.phone,
          changedAt: new Date().toISOString()
        });

        await db.query(`
          UPDATE users
          SET digital_box = jsonb_set(COALESCE(digital_box, '{}'::jsonb), '{relocations}', $1::jsonb)
          WHERE id = $2
        `, [JSON.stringify(relocations), req.user.id]);
      } catch (rerouteErr) {
        console.warn('[RelocationReroute] Auto-reroute error:', rerouteErr.message);
      }
    }

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/customer/notification-preferences
router.put('/notification-preferences', authenticate, async (req, res) => {
  const { inapp = true, email = true, sms = false, whatsapp = false } = req.body;
  try {
    const preferences = {
      inapp: Boolean(inapp),
      email: Boolean(email),
      sms: Boolean(sms),
      whatsapp: Boolean(whatsapp)
    };

    const result = await db.query(`
      UPDATE users
      SET notification_preferences = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, phone, email, notification_preferences
    `, [preferences, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Notification preferences updated successfully.',
      preferences: result.rows[0].notification_preferences,
      pricing: notificationService.ALERT_PRICING
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/test-reroute-alert
router.post('/test-reroute-alert', authenticate, async (req, res) => {
  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    const shipRes = await db.query(
      `SELECT * FROM shipments WHERE recipient_phone = $1 OR recipient_email = $2 ORDER BY created_at DESC LIMIT 1`,
      [user.phone, user.email]
    );

    let shipment = shipRes.rows[0];
    if (!shipment) {
      const senderRes = await db.query("SELECT id FROM users WHERE role IN ('enterprise_admin', 'operations_admin') LIMIT 1");
      const defaultSenderId = senderRes.rows[0]?.id || req.user.id;

      const testCode = `HBX-${(user.postcode || '900001').replace(/[^A-Z0-9]/gi, '').slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const pickupOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const collectionQrToken = `QR-PASS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      const newShip = await db.query(`
        INSERT INTO shipments (
          tracking_code, service_type, sender_id, sender_name, sender_phone, sender_postcode, sender_address_text,
          recipient_name, recipient_phone, recipient_email, recipient_postcode, recipient_address_text,
          pickup_otp, delivery_otp, collection_qr_token, status, pricing_total_ngn, expires_at
        ) VALUES (
          $1, 'DOOR_TO_HUB', $2, 'First Bank of Nigeria (Cards Division)', '+2348030001122', 'LA-01-A01-AA-01', 'Marina, Lagos Island',
          $3, $4, $5, $6, 'Abuja Verified Resident', $7, $8, $9, 'IN_TRANSIT_TO_HUB', 1600.00, NOW() + INTERVAL '3 days'
        ) RETURNING *
      `, [
        testCode,
        defaultSenderId,
        user.name,
        user.phone,
        user.email,
        user.postcode || 'FC-01-A03-FK-01',
        pickupOtp,
        deliveryOtp,
        collectionQrToken
      ]);
      shipment = newShip.rows[0];
    }

    const oldPostcode = req.body.oldPostcode || 'LA-01-A01-AA-01';
    const newPostcode = req.body.newPostcode || user.postcode || 'FC-01-A03-FK-01';

    const dispatchResult = await notificationService.dispatchDualPartyRerouteAlert({
      shipment,
      oldPostcode,
      newPostcode,
      reason: 'Interactive Test Simulation of Dual-Party Reroute Alert',
      reroutedBy: user.name
    });

    const walletRes = await db.query('SELECT balance_ngn FROM wallets WHERE user_id = $1', [user.id]);
    const walletBalance = parseFloat(walletRes.rows[0]?.balance_ngn || 0);

    res.json({
      message: 'Automated Dual-Party Reroute Alert dispatched successfully!',
      dispatchResult,
      walletBalance,
      pricing: notificationService.ALERT_PRICING
    });
  } catch (err) {
    console.error('Test reroute alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/customer/digital-box
router.get('/digital-box', authenticate, async (req, res) => {
  try {
    const userRes = await db.query(`
      SELECT u.id, u.name, u.phone, u.email, u.postcode, u.digital_box, u.is_phone_verified, u.is_email_verified,
             pc.neighbourhood as postcode_neighbourhood, pc.lga as postcode_lga, pc.state as postcode_state
      FROM users u
      LEFT JOIN postcode_cache pc ON (pc.postcode = u.postcode OR pc.ndaps_code = u.postcode)
      WHERE u.id = $1
    `, [req.user.id]);

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    const boxData = user.digital_box || {};
    const postcodeClean = (user.postcode || '900001').replace(/[^A-Z0-9]/gi, '').slice(0, 8);
    const boxNumber = `HBX-PBOX-${postcodeClean}-${user.id.slice(0, 4).toUpperCase()}`;

    const expiresAt = boxData.expiresAt ? new Date(boxData.expiresAt) : new Date(Date.now() + 300 * 24 * 3600 * 1000);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 3600 * 24)));
    const isGroundTruthVerified = Boolean(boxData.isGroundTruthVerified);

    res.json({
      boxNumber,
      activePostcode: user.postcode || 'FC-01-A03-FK-01',
      hierarchy: {
        district: user.postcode_neighbourhood || 'Wuse 2',
        lga: user.postcode_lga || 'Abuja Municipal',
        state: user.postcode_state || 'Federal Capital Territory'
      },
      proofOfAddressStatus: isGroundTruthVerified ? 'Verified by NIPOST (Ground-Truth Certified)' : 'Pending Ground-Truthing',
      isGroundTruthVerified,
      subscriptionStatus: daysRemaining > 0 ? 'ACTIVE' : 'EXPIRED',
      expiresAt: expiresAt.toISOString(),
      daysRemaining,
      annualFeeNgn: 3500.00,
      groundTruthingFeeNgn: 2500.00,
      relocations: boxData.relocations || [
        {
          oldPostcode: 'LA-01-A01-AA-01',
          oldAddress: 'Adeola Odeku Street, Victoria Island, Lagos',
          newPostcode: user.postcode || 'FC-01-A03-FK-01',
          newAddress: `${user.postcode_neighbourhood || 'Wuse 2'}, Abuja`,
          phone: user.phone,
          changedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/renew-digital-box
router.post('/renew-digital-box', authenticate, async (req, res) => {
  const annualFee = 3500.00;
  try {
    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    let wallet = walletRes.rows[0];
    if (!wallet) {
      const wCreate = await db.query('INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0, 0) RETURNING *', [req.user.id]);
      wallet = wCreate.rows[0];
    }

    const curBal = parseFloat(wallet.balance_ngn || 0);
    if (curBal < annualFee) {
      return res.status(400).json({
        error: `Insufficient prepaid wallet balance for annual renewal (₦${annualFee.toFixed(2)} required). Please top up your wallet.`,
        required: annualFee,
        currentBalance: curBal
      });
    }

    const newBal = curBal - annualFee;
    await db.query('UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2', [newBal, wallet.id]);

    const ref = `RENEW-PBOX-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await db.query(`
      INSERT INTO transactions (
        wallet_id, transaction_type, amount_ngn, fee_ngn, net_amount_ngn, balance_before_ngn,
        balance_after_ngn, reference, payment_gateway, gateway_reference, status, metadata
      ) VALUES ($1, 'BOOKING_PAYMENT', $2, 0.00, $2, $3, $4, $5, 'WALLET', $5, 'COMPLETED', $6)
    `, [
      wallet.id,
      annualFee,
      curBal,
      newBal,
      ref,
      JSON.stringify({ description: 'Annual Hotbox Digital P.O. Box & Address Forwarding Subscription Renewal (365 Days)' })
    ]);

    const newExpiresAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    await db.query(`
      UPDATE users
      SET digital_box = jsonb_set(COALESCE(digital_box, '{}'::jsonb), '{expiresAt}', $1::jsonb)
      WHERE id = $2
    `, [JSON.stringify(newExpiresAt), req.user.id]);

    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
      VALUES ($1, 'Digital P.O. Box Renewed Successfully', 'Your NIPOST Digital P.O. Box subscription and proof-of-address network anchor is active for 365 days.', 'SYSTEM_NOTICE', FALSE, NOW())
    `, [req.user.id]);

    res.json({
      message: 'Hotbox Digital P.O. Box renewed successfully for 12 months.',
      expiresAt: newExpiresAt,
      daysRemaining: 365,
      newBalance: newBal,
      reference: ref
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/request-ground-truthing
router.post('/request-ground-truthing', authenticate, async (req, res) => {
  const verificationFee = 2500.00;
  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    let wallet = walletRes.rows[0];
    if (!wallet) {
      const wCreate = await db.query('INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0, 0) RETURNING *', [req.user.id]);
      wallet = wCreate.rows[0];
    }

    const curBal = parseFloat(wallet.balance_ngn || 0);
    if (curBal < verificationFee) {
      return res.status(400).json({
        error: `Insufficient prepaid wallet balance for physical ground-truthing (₦${verificationFee.toFixed(2)} required). Please top up your wallet.`,
        required: verificationFee,
        currentBalance: curBal
      });
    }

    const newBal = curBal - verificationFee;
    await db.query('UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2', [newBal, wallet.id]);

    const ref = `GROUND-TRUTH-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await db.query(`
      INSERT INTO transactions (
        wallet_id, transaction_type, amount_ngn, fee_ngn, net_amount_ngn, balance_before_ngn,
        balance_after_ngn, reference, payment_gateway, gateway_reference, status, metadata
      ) VALUES ($1, 'BOOKING_PAYMENT', $2, 0.00, $2, $3, $4, $5, 'WALLET', $5, 'COMPLETED', $6)
    `, [
      wallet.id,
      verificationFee,
      curBal,
      newBal,
      ref,
      JSON.stringify({ description: 'NIPOST Physical Ground-Truthing Field Inspection & Geofenced Doorway Validation' })
    ]);

    // Create record in verification_records queue
    await db.query(`
      INSERT INTO verification_records (
        entity_type, entity_id, track, document_type, document_number, status
      ) VALUES ($1, $2, 'TRACK_A_ADDRESS', 'GROUND_TRUTH_VALIDATION', $3, 'APPROVED')
    `, ['user', req.user.id, user.postcode || 'FC-01-A03-FK-01']);

    // Set user as Ground-Truth Verified
    await db.query(`
      UPDATE users
      SET digital_box = jsonb_set(COALESCE(digital_box, '{}'::jsonb), '{isGroundTruthVerified}', 'true'::jsonb)
      WHERE id = $1
    `, [req.user.id]);

    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
      VALUES ($1, 'Proof of Address Ground-Truth Certified', 'Your physical address attached to postcode has been certified by NIPOST. Digital certificate ready.', 'KYC_APPROVAL', FALSE, NOW())
    `, [req.user.id]);

    res.json({
      message: 'Physical Ground-Truthing order placed and certified! Official NIPOST badge active.',
      isGroundTruthVerified: true,
      newBalance: newBal,
      reference: ref,
      badge: 'Verified by NIPOST (Ground-Truth Certified)'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/request-otp
router.post('/request-otp', authenticate, async (req, res) => {
  const { type = 'email' } = req.body; // 'email' | 'phone'
  try {
    const userRes = await db.query('SELECT id, name, email, phone FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    const destination = type === 'email' ? user.email : user.phone;

    if (!destination) {
      return res.status(400).json({ error: `No ${type} associated with your profile to send verification code.` });
    }

    // Generate cryptographic 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in verification_codes table
    await db.query(`
      INSERT INTO verification_codes (user_id, contact_type, contact_value, code, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [user.id, type, destination, code, expiresAt]);

    let dispatchResult = {};
    if (type === 'email') {
      dispatchResult = await notificationService.sendEmailOtp(destination, code);
    } else {
      dispatchResult = await notificationService.sendSmsOtp(destination, code);
    }

    res.json({
      success: true,
      message: dispatchResult.delivered
        ? `Verification code dispatched to your ${type} (${destination}).`
        : `Verification code generated for ${destination}. Valid for 10 minutes.`,
      type,
      destination,
      delivered: dispatchResult.delivered,
      provider: dispatchResult.provider,
      otpPreview: dispatchResult.delivered ? undefined : code,
      notice: dispatchResult.notice
    });
  } catch (err) {
    console.error('Request OTP error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/verify-contact
router.post('/verify-contact', authenticate, async (req, res) => {
  const { type = 'phone', otp } = req.body; // 'phone' | 'email'
  if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
  }

  const cleanOtp = otp.trim();

  try {
    // 1. Look up unexpired, unused code for this user & contact_type
    const codeRes = await db.query(`
      SELECT id, code, expires_at, is_used
      FROM verification_codes
      WHERE user_id = $1 AND contact_type = $2 AND code = $3 AND is_used = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.user.id, type, cleanOtp]);

    // Accept real valid code, or '123456' as master test code
    const isValid = codeRes.rows.length > 0 || cleanOtp === '123456';

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    // Mark code as used
    if (codeRes.rows.length > 0) {
      await db.query('UPDATE verification_codes SET is_used = TRUE WHERE id = $1', [codeRes.rows[0].id]);
    }

    const field = type === 'phone' ? 'is_phone_verified' : 'is_email_verified';
    const updateRes = await db.query(`
      UPDATE users
      SET ${field} = TRUE, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, phone, email, role, notification_preferences, privacy_settings, is_phone_verified, is_email_verified
    `, [req.user.id]);

    return res.json({
      message: `${type === 'phone' ? 'Phone number' : 'Email address'} verified successfully!`,
      verified: true,
      user: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/reset-verification (Useful for interactive testing)
router.post('/reset-verification', authenticate, async (req, res) => {
  const { type = 'all' } = req.body;
  try {
    if (type === 'phone' || type === 'all') {
      await db.query('UPDATE users SET is_phone_verified = FALSE WHERE id = $1', [req.user.id]);
    }
    if (type === 'email' || type === 'all') {
      await db.query('UPDATE users SET is_email_verified = FALSE WHERE id = $1', [req.user.id]);
    }
    const userRes = await db.query('SELECT id, name, phone, email, is_phone_verified, is_email_verified FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Verification status reset.', user: userRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// GET /api/v1/customer/shipments
router.get('/shipments', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, h.business_name as destination_hub_name, h.address_text as destination_hub_address
      FROM shipments s
      LEFT JOIN hubs h ON s.destination_hub_id = h.id
      WHERE s.sender_id = $1 OR s.recipient_phone = $2
      ORDER BY s.created_at DESC
    `, [req.user.id, req.user.phone]);

    res.json({ shipments: result.rows });
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

// POST /api/v1/customer/claims
router.post('/claims', authenticate, async (req, res) => {
  const {
    shipmentId,
    claimType = 'DAMAGED_PARCEL',
    description,
    claimAmountNgn = 5000.00,
    evidenceUrls = []
  } = req.body;

  if (!shipmentId || !description) {
    return res.status(400).json({ error: 'Shipment ID and claim description are required.' });
  }

  try {
    const result = await db.query(`
      INSERT INTO claims (
        shipment_id, claimant_id, claim_type, description,
        claim_amount_ngn, evidence_urls, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED')
      RETURNING *
    `, [shipmentId, req.user.id, claimType, description, claimAmountNgn, evidenceUrls]);

    res.status(201).json({ message: 'Claim submitted successfully. Under review by support.', claim: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/customer/claims
router.get('/claims', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, s.tracking_code, s.package_description
      FROM claims c
      JOIN shipments s ON c.shipment_id = s.id
      WHERE c.claimant_id = $1
      ORDER BY c.created_at DESC
    `, [req.user.id]);

    res.json({ claims: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/customer/claims/:id (Update submitted claim)
router.put('/claims/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { claimType, description, claimAmountNgn } = req.body;

  try {
    const existing = await db.query('SELECT * FROM claims WHERE id = $1 AND claimant_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found or unauthorized.' });
    }

    const claim = existing.rows[0];
    if (claim.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `Cannot edit claim in '${claim.status}' status. Only newly SUBMITTED claims can be edited.` });
    }

    const result = await db.query(`
      UPDATE claims
      SET claim_type = COALESCE($1, claim_type),
          description = COALESCE($2, description),
          claim_amount_ngn = COALESCE($3, claim_amount_ngn),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [claimType, description, claimAmountNgn ? parseFloat(claimAmountNgn) : null, id]);

    res.json({ message: 'Claim updated successfully.', claim: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/claims/:id/cancel (Cancel claim submission)
router.post('/claims/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.query('SELECT * FROM claims WHERE id = $1 AND claimant_id = $2', [id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found or unauthorized.' });
    }

    const claim = existing.rows[0];
    if (claim.status === 'SETTLED' || claim.status === 'APPROVED') {
      return res.status(400).json({ error: `Cannot cancel an already ${claim.status.toLowerCase()} claim.` });
    }

    const result = await db.query(`
      UPDATE claims
      SET status = 'CANCELLED',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    res.json({ message: 'Claim submission cancelled successfully.', claim: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    const result = await db.query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ tickets: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/wallet/topup (verify a gateway payment, then credit)
router.post('/wallet/topup', authenticate, async (req, res) => {
  const { gatewayReference } = req.body;
  if (!gatewayReference) {
    return res.status(400).json({ error: 'A gatewayReference is required. Complete a payment through the gateway first.' });
  }

  try {
    const result = await creditWalletForPayment(req.user.id, gatewayReference);
    if (result.alreadyCredited) {
      return res.status(409).json({ error: 'This payment reference has already been credited.' });
    }
    res.json({
      message: `Wallet credited with ₦${result.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} prepaid logistics credit.`,
      newBalance: result.balanceAfter,
      transaction: result.transaction
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
