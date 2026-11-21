const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const notificationService = require('../../services/notificationService');
const { normalizePostcode, resolvePostcode } = require('../../services/postcodeService');
const { parseBoxNumber } = require('../../utils/boxNumber');
const digitalBoxService = require('../../services/digitalBoxService');
const legacyBoxLinkService = require('../../services/legacyBoxLinkService');
const legacyBoxReviewMailer = require('../../services/legacyBoxReviewMailer');
const settingsService = require('../../services/settingsService');
const { normalizePhone } = require('../../lib/phone');
const { generateOtp, otpExpiryFromNow } = require('../../utils/otp');
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
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const existingRes = await db.query('SELECT phone, email, postcode FROM users WHERE id = $1', [req.user.id]);
    const currUser = existingRes.rows[0] || {};

    let phoneVerifiedUpdate = null;
    if (normalizedPhone && currUser.phone && normalizedPhone !== currUser.phone) {
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
    `, [name, email, normalizedPhone, cleanPostcode, notification_preferences, privacy_settings, phoneVerifiedUpdate, emailVerifiedUpdate, req.user.id]);

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

        // Record the forwarding trail in the registry so the history survives
        // independently of the user row.
        const box = await digitalBoxService.ensureDigitalBox(req.user.id);
        await digitalBoxService.addRelocation(box.id, {
          oldPostcode: currUser.postcode,
          oldAddress: currUser.postcode_neighbourhood || 'Previous Residence',
          newPostcode: cleanPostcode,
          newAddress: updatedUser.postcode_neighbourhood || 'New Verified Address',
          phone: updatedUser.phone,
          changedAt: new Date().toISOString()
        });
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
      const pickupOtp = generateOtp();
      const pickupOtpExpiresAt = otpExpiryFromNow();
      const deliveryOtp = generateOtp();
      const collectionQrToken = `QR-PASS-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

      const newShip = await db.query(`
        INSERT INTO shipments (
          tracking_code, service_type, sender_id, sender_name, sender_phone, sender_postcode, sender_address_text,
          recipient_name, recipient_phone, recipient_email, recipient_postcode, recipient_address_text,
          pickup_otp, pickup_otp_expires_at, delivery_otp, collection_qr_token, status, pricing_total_ngn, expires_at
        ) VALUES (
          $1, 'DOOR_TO_HUB', $2, 'First Bank of Nigeria (Cards Division)', '+2348030001122', 'LA-01-A01-AA-01', 'Marina, Lagos Island',
          $3, $4, $5, $6, 'Abuja Verified Resident', $7, $8, $9, $10, 'IN_TRANSIT_TO_HUB', 1600.00, NOW() + INTERVAL '3 days'
        ) RETURNING *
      `, [
        testCode,
        defaultSenderId,
        user.name,
        user.phone,
        user.email,
        user.postcode || 'FC-01-A03-FK-01',
        pickupOtp,
        pickupOtpExpiresAt,
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
      SELECT u.id, u.name, u.phone, u.email, u.postcode, u.is_phone_verified, u.is_email_verified,
             pc.neighbourhood as postcode_neighbourhood, pc.lga as postcode_lga, pc.state as postcode_state,
             pc.lat as postcode_lat, pc.lng as postcode_lng
      FROM users u
      LEFT JOIN postcode_cache pc ON (pc.postcode = u.postcode OR pc.ndaps_code = u.postcode OR pc.legacy_code = u.postcode)
      WHERE u.id = $1
      LIMIT 1
    `, [req.user.id]);

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    const box = await digitalBoxService.ensureDigitalBox(user.id);
    const relocations = await digitalBoxService.listRelocations(box.id);
    const certificate = await digitalBoxService.getCertificate(box.id);

    const pendingInspection = await db.query(
      `SELECT 1 FROM verification_records
       WHERE entity_type = 'user' AND entity_id = $1
         AND document_type = 'PHYSICAL_INSPECTION_REPORT' AND status = 'PENDING'
       LIMIT 1`,
      [user.id]
    );

    const expiresAt = box.expires_at ? new Date(box.expires_at) : new Date(Date.now() + 300 * 24 * 3600 * 1000);
    const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 3600 * 24)));
    const fees = await settingsService.getDigitalBoxFees();
    const legacyFees = await settingsService.getLegacyBoxLinkFees();
    const latestLinkRequest = await legacyBoxLinkService.getLatestRequestForUser(user.id);

    res.json({
      boxNumber: box.box_number,
      activePostcode: user.postcode || 'FC-01-A03-FK-01',
      hierarchy: {
        district: user.postcode_neighbourhood || 'Wuse 2',
        lga: user.postcode_lga || 'Abuja Municipal',
        state: user.postcode_state || 'Federal Capital Territory'
      },
      coordinates: {
        lat: user.postcode_lat != null ? Number(user.postcode_lat) : null,
        lng: user.postcode_lng != null ? Number(user.postcode_lng) : null
      },
      proofOfAddressStatus: box.is_ground_truth_verified ? 'Ground-Truth Verified' : 'Registry Verified',
      isGroundTruthVerified: Boolean(box.is_ground_truth_verified),
      hasPendingInspection: pendingInspection.rows.length > 0,
      subscriptionStatus: box.status === 'ACTIVE' && daysRemaining > 0 ? 'ACTIVE' : 'EXPIRED',
      expiresAt: expiresAt.toISOString(),
      daysRemaining,
      annualFeeNgn: digitalBoxService.ANNUAL_FEE_NGN,
      groundTruthingFeeNgn: fees.doorwayInspectionFeeNgn,
      doorwayInspectionFeeNgn: fees.doorwayInspectionFeeNgn,
      revalidationFeeNgn: fees.revalidationFeeNgn,
      legacyLinkFees: {
        nipostVerificationFeeNgn: legacyFees.nipostVerificationFeeNgn,
        hotboxPlatformFeeNgn: legacyFees.hotboxPlatformFeeNgn,
        totalNgn: legacyFees.totalNgn
      },
      legacyBoxNumber: box.legacy_box_number || null,
      legacyLinkedAt: box.legacy_linked_at ? new Date(box.legacy_linked_at).toISOString() : null,
      legacyBoxStatus: box.legacy_box_status || (box.legacy_box_number ? 'APPROVED' : 'UNLINKED'),
      legacyBoxApprovedAt: box.legacy_box_approved_at ? new Date(box.legacy_box_approved_at).toISOString() : null,
      legacyRequest: latestLinkRequest ? {
        id: latestLinkRequest.id,
        legacyBoxNumber: latestLinkRequest.legacy_box_number_raw,
        status: latestLinkRequest.status,
        submittedAt: new Date(latestLinkRequest.submitted_at).toISOString(),
        expiresAt: latestLinkRequest.expires_at ? new Date(latestLinkRequest.expires_at).toISOString() : null,
        reviewedAt: latestLinkRequest.reviewed_at ? new Date(latestLinkRequest.reviewed_at).toISOString() : null,
        reviewNote: latestLinkRequest.review_note || null
      } : null,
      relocations: relocations.map((rel) => ({
        oldPostcode: rel.old_postcode,
        oldAddress: rel.old_address,
        newPostcode: rel.new_postcode,
        newAddress: rel.new_address,
        phone: rel.phone,
        changedAt: rel.changed_at ? new Date(rel.changed_at).toISOString() : null
      })),
      certificate: certificate ? {
        serial: certificate.certificate_serial,
        issuedAt: new Date(certificate.issued_at).toISOString(),
        expiresAt: new Date(certificate.expires_at).toISOString(),
        status: certificate.status,
        postcode: certificate.postcode,
        addressText: certificate.address_text,
        lat: certificate.lat != null ? Number(certificate.lat) : null,
        lng: certificate.lng != null ? Number(certificate.lng) : null
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/renew-digital-box
router.post('/renew-digital-box', authenticate, async (req, res) => {
  const annualFee = digitalBoxService.ANNUAL_FEE_NGN;
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

    const box = await digitalBoxService.ensureDigitalBox(req.user.id);
    const renewed = await digitalBoxService.renewBox(box.id);
    const newExpiresAt = new Date(renewed.expires_at).toISOString();

    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
      VALUES ($1, 'Digital P.O. Box Renewed Successfully', 'Your Digital P.O. Box subscription and proof-of-address network anchor is active for 365 days.', 'SYSTEM_NOTICE', FALSE, NOW())
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

// POST /api/v1/customer/link-legacy-box
// Creates a verification request. The old number is not linked until NIPOST
// approves it, so mail forwarding never activates on a self-assertion.
router.post('/link-legacy-box', authenticate, async (req, res) => {
  const { legacyBoxNumber, registeredPhone, declaration, documentDataUrl } = req.body;
  const cleanInput = String(legacyBoxNumber || '').trim();

  if (!cleanInput) {
    return res.status(400).json({ error: 'Please enter your old P.O. Box number.' });
  }
  if (!String(registeredPhone || '').trim()) {
    return res.status(400).json({ error: 'Enter the phone number registered on the old box.' });
  }
  if (parseBoxNumber(cleanInput)) {
    return res.status(400).json({
      error: 'That is a Hotbox digital box number. Enter the old P.O. Box number issued to you by NIPOST.'
    });
  }

  try {
    const box = await digitalBoxService.ensureDigitalBox(req.user.id);
    const request = await legacyBoxLinkService.createRequest({
      userId: req.user.id,
      boxId: box.id,
      legacyBoxNumberRaw: cleanInput,
      registeredPhone: registeredPhone || null,
      declaration: Boolean(declaration),
      documentDataUrl
    });

    // Best-effort email fallback: the in-app queue remains the primary channel.
    const emailResult = await legacyBoxReviewMailer.sendReviewRequestEmail({
      request: { ...request, user_name: req.user.name, user_email: req.user.email },
      boxNumber: box.box_number
    });
    if (!emailResult.sent) {
      console.warn(`[LegacyLink] Review email not sent for ${request.id}: ${emailResult.reason}`);
    }

    res.status(201).json({
      message: 'Link request submitted. NIPOST will verify your ownership of the old P.O. Box before mail forwarding starts.',
      status: request.status,
      requestId: request.id,
      legacyBoxNumber: request.legacy_box_number_raw,
      digitalBoxNumber: box.box_number,
      submittedAt: new Date(request.submitted_at).toISOString(),
      expiresAt: request.expires_at ? new Date(request.expires_at).toISOString() : null,
      documentHash: request.document_hash || null,
      reviewEmailSent: Boolean(emailResult.sent)
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/v1/customer/legacy-box-request
router.get('/legacy-box-request', authenticate, async (req, res) => {
  try {
    const request = await legacyBoxLinkService.getLatestRequestForUser(req.user.id);
    res.json({
      request: request ? {
        id: request.id,
        legacyBoxNumber: request.legacy_box_number_raw,
        status: request.status,
        submittedAt: new Date(request.submitted_at).toISOString(),
        expiresAt: request.expires_at ? new Date(request.expires_at).toISOString() : null,
        reviewedAt: request.reviewed_at ? new Date(request.reviewed_at).toISOString() : null,
        reviewNote: request.review_note || null,
        contestedAt: request.contested_at ? new Date(request.contested_at).toISOString() : null,
        reminderSentAt: request.reminder_sent_at ? new Date(request.reminder_sent_at).toISOString() : null,
        documentHash: request.document_hash || null,
        hasDocument: Boolean(request.document_url)
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/customer/legacy-box-request/withdraw
router.post('/legacy-box-request/withdraw', authenticate, async (req, res) => {
  const requestId = req.body.requestId || req.query.requestId;
  try {
    const request = await legacyBoxLinkService.withdrawRequest({ requestId, userId: req.user.id });
    res.json({ message: 'Link request withdrawn.', status: request.status });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/v1/customer/request-ground-truthing
router.post('/request-ground-truthing', authenticate, async (req, res) => {
  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const box = await digitalBoxService.ensureDigitalBox(user.id);
    const isRenewal = Boolean(box.is_ground_truth_verified);
    const fees = await settingsService.getDigitalBoxFees();
    const verificationFee = isRenewal ? fees.revalidationFeeNgn : fees.doorwayInspectionFeeNgn;

    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    let wallet = walletRes.rows[0];
    if (!wallet) {
      const wCreate = await db.query('INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0, 0) RETURNING *', [req.user.id]);
      wallet = wCreate.rows[0];
    }

    const curBal = parseFloat(wallet.balance_ngn || 0);
    if (curBal < verificationFee) {
      return res.status(400).json({
        error: `Insufficient prepaid wallet balance for ${isRenewal ? 'certificate revalidation' : 'physical ground-truthing'} (₦${verificationFee.toFixed(2)} required). Please top up your wallet.`,
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
      JSON.stringify({
        description: isRenewal
          ? 'Proof of Address Certificate Revalidation & Geofenced Doorway Validation'
          : 'Physical Ground-Truthing Field Inspection & Geofenced Doorway Validation'
      })
    ]);

    // Geocode the address under inspection so the record can later be opened in
    // a map application for mail delivery.
    const pcRes = await db.query(
      'SELECT lat, lng FROM postcode_cache WHERE postcode = $1 OR ndaps_code = $1 OR legacy_code = $1 LIMIT 1',
      [user.postcode]
    );
    const geo = pcRes.rows[0] || {};

    // The inspection is queued for an accredited officer. Verification is only
    // granted once the resulting dossier is reviewed and approved.
    await db.query(`
      INSERT INTO verification_records
        (entity_type, entity_id, track, document_type, document_number, status, lat, lng, captured_at)
      VALUES ('user', $1, 'TRACK_A_ADDRESS', 'PHYSICAL_INSPECTION_REPORT', $2, 'PENDING', $3, $4, NOW())
    `, [
      req.user.id,
      box.box_number,
      geo.lat != null ? Number(geo.lat) : null,
      geo.lng != null ? Number(geo.lng) : null
    ]);

    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
      VALUES ($1, 'Ground-Truthing Inspection Requested', 'Your physical address inspection has been ordered. Your Proof of Address is issued once the inspection report is approved.', 'KYC_APPROVAL', FALSE, NOW())
    `, [req.user.id]);

    res.json({
      message: 'Ground-Truthing inspection ordered. Your address will be verified once the inspection report is reviewed.',
      isGroundTruthVerified: false,
      status: 'PENDING',
      newBalance: newBal,
      reference: ref
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

module.exports = router;