const https = require('https');
const dns = require('dns');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');

// Robust IPv4 DNS lookup with retry for WSL2 container environments
function robustLookup(hostname, options, callback) {
  dns.lookup(hostname, { family: 4 }, (err, address, family) => {
    if (err) {
      setTimeout(() => {
        dns.lookup(hostname, { family: 4 }, callback);
      }, 200);
      return;
    }
    callback(null, address, family);
  });
}

// Helper for reliable IPv4 HTTPS requests in container/WSL environments
function httpsPost(urlStr, headers, data, isForm = false) {
  return new Promise((resolve, reject) => {
    const postData = isForm
      ? new URLSearchParams(data).toString()
      : (typeof data === 'string' ? data : JSON.stringify(data));

    const req = https.request(urlStr, {
      method: 'POST',
      family: 4,
      lookup: robustLookup,
      headers: {
        'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: json });
        } catch {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out'));
    });
    req.write(postData);
    req.end();
  });
}

// 1. Email Transporter Configuration (SMTP or Gmail)
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  }

  // Gmail App Password shortcut
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS
      }
    });
  }

  return null;
}

// Send Email OTP
async function sendEmailOtp(recipientEmail, code) {
  const transporter = getEmailTransporter();
  const subject = `Hotbox Verification Code: ${code}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 20px;">
        <h2 style="color: #064e3b; margin: 0; font-size: 22px;">HOTBOX 🇳🇬</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">National Postcode-Powered Logistics Network • hotbox.com.ng</p>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <p style="color: #334155; font-size: 14px; margin-top: 0;">Your email verification OTP code is:</p>
        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; font-family: monospace;">${code}</span>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0; margin-top: 8px;">Valid for 10 minutes. Never share this code with anyone.</p>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        You received this email because an email confirmation request was initiated on your Hotbox account. If you did not make this request, you can safely ignore this message.
      </p>
    </div>
  `;

  // Option A: Real SMTP / Gmail Delivery
  if (transporter) {
    try {
      const from = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@hotboxng.com';
      await transporter.sendMail({
        from: `"Hotbox Security" <${from}>`,
        to: recipientEmail,
        subject,
        html
      });
      console.log(`[NotificationService] Real Email sent to ${recipientEmail} via SMTP`);
      return { success: true, provider: 'SMTP', delivered: true };
    } catch (err) {
      console.error('[NotificationService] SMTP error:', err.message);
    }
  }

  // Option B: Resend API Delivery
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await httpsPost(
        'https://api.resend.com/emails',
        { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        {
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: recipientEmail,
          subject,
          html
        }
      );
      if (res.ok) {
        console.log(`[NotificationService] Real Email sent to ${recipientEmail} via Resend. ID: ${res.data?.id}`);
        return { success: true, provider: 'RESEND', delivered: true, id: res.data?.id };
      } else {
        console.warn(`[NotificationService] Resend API response (${res.status}):`, res.data?.message);
        const isSandbox = res.status === 403 && res.data?.message?.includes('testing emails');
        return {
          success: true,
          provider: 'RESEND_SANDBOX',
          delivered: false,
          otp: code,
          notice: isSandbox
            ? `Resend Free Sandbox: Free API keys can only send to your account email (obedsonfield@gmail.com). To send to all customer emails, verify your domain at resend.com.`
            : `Resend error: ${res.data?.message || 'Check Resend key in .env'}`
        };
      }
    } catch (err) {
      console.error('[NotificationService] Resend error:', err.message);
    }
  }

  // Fallback: Provider credentials pending activation
  console.log('--------------------------------------------------');
  console.log(`[EMAIL OTP ADAPTER] Destination: ${recipientEmail}`);
  console.log(`[EMAIL OTP ADAPTER] Generated Code: >>> ${code} <<<`);
  console.log('[EMAIL OTP ADAPTER] Provider: Pending SMTP / Resend Credentials');
  console.log('--------------------------------------------------');

  return {
    success: true,
    provider: 'EMAIL',
    delivered: false,
    otp: code,
    notice: 'A 6-digit verification code has been generated. Use the code above to confirm your email.'
  };
}

// Send SMS OTP (Termii or Twilio)
async function sendSmsOtp(phone, code) {
  const message = `Your Hotbox confirmation OTP is ${code}. Valid for 10 minutes.`;

  // 1. Twilio SMS Gateway Integration (Prioritized if credentials present)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const formData = {
        To: phone,
        Body: message
      };

      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 
        (process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_PHONE_NUMBER.startsWith('MG') ? process.env.TWILIO_PHONE_NUMBER : null);

      if (messagingServiceSid) {
        formData.MessagingServiceSid = messagingServiceSid;
      } else if (process.env.TWILIO_PHONE_NUMBER) {
        formData.From = process.env.TWILIO_PHONE_NUMBER;
      }

      const res = await httpsPost(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        { Authorization: `Basic ${auth}` },
        formData,
        true
      );

      if (res.ok) {
        console.log(`[NotificationService] Real SMS dispatched to ${phone} via Twilio SID: ${res.data?.sid}`);
        return { success: true, provider: 'SMS', delivered: true, sid: res.data?.sid };
      } else {
        console.warn(`[NotificationService] Twilio API error (${res.status}):`, res.data?.message);
        return {
          success: true,
          provider: 'SMS',
          delivered: false,
          otp: code,
          notice: 'A 6-digit verification code has been generated. Use the code above to confirm your phone.'
        };
      }
    } catch (err) {
      console.error('[NotificationService] Twilio error stack:', err);
    }
  }

  // 2. Termii Nigerian SMS Integration
  if (process.env.TERMII_API_KEY) {
    try {
      const cleanPhone = phone.replace(/^\+/, ''); // Termii format: 2349063085415
      const res = await httpsPost(
        'https://api.ng.termii.com/api/sms/send',
        {},
        {
          to: cleanPhone,
          from: process.env.TERMII_SENDER_ID || 'Hotbox',
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: process.env.TERMII_API_KEY
        }
      );
      if (res.ok) {
        console.log(`[NotificationService] Real SMS dispatched to ${cleanPhone} via Termii`);
        return { success: true, provider: 'SMS', delivered: true };
      } else {
        console.warn(`[NotificationService] Termii API returned ${res.status}:`, res.data?.message);
        return {
          success: true,
          provider: 'SMS',
          delivered: false,
          otp: code,
          notice: 'A 6-digit verification code has been generated. Use the code above to confirm your phone.'
        };
      }
    } catch (err) {
      console.error('[NotificationService] Termii SMS error:', err.message);
    }
  }

  // 3. Fallback
  console.log('--------------------------------------------------');
  console.log(`[SMS OTP ADAPTER] Destination: ${phone}`);
  console.log(`[SMS OTP ADAPTER] Message: "${message}"`);
  console.log('[SMS OTP ADAPTER] Provider: Pending Termii / Twilio Credentials');
  console.log('--------------------------------------------------');

  return {
    success: true,
    provider: 'SMS',
    delivered: false,
    otp: code,
    notice: 'A 6-digit verification code has been generated. Use the code above to confirm your phone.'
  };
}

// Send WhatsApp Notification
async function sendWhatsAppAlert(phone, text) {
  if (process.env.TERMII_API_KEY && process.env.TERMII_DEVICE_ID) {
    try {
      const cleanPhone = phone.replace(/^\+/, '');
      await httpsPost(
        'https://api.ng.termii.com/api/whatsapp/message/send',
        {},
        {
          phone: cleanPhone,
          text,
          api_key: process.env.TERMII_API_KEY
        }
      );
      return { success: true, provider: 'TERMII_WHATSAPP' };
    } catch (err) {
      console.error('[NotificationService] WhatsApp error:', err.message);
    }
  }

  console.log(`[WHATSAPP ADAPTER] Routed to ${phone}: "${text}" (Pending WhatsApp Cloud API credentials)`);
  return { success: true, provider: 'PENDING_ACTIVATION' };
}

// =============================================================================
// HOTBOX DUAL-PARTY REROUTE ALERTS & CHANNEL PRICING
// Domains: hotbox.com.ng | hotboxng.com
// =============================================================================

const ALERT_PRICING = {
  inapp: 0.00,       // 100% Free (₦0.00)
  email: 0.00,       // 100% Free (₦0.00)
  sms: 20.00,        // ₦20.00 per SMS alert
  whatsapp: 35.00    // ₦35.00 per WhatsApp alert
};

// Generic Email Dispatch (SMTP or Resend)
async function sendEmailNotification({ to, subject, html, text }) {
  const transporter = getEmailTransporter();
  if (transporter) {
    try {
      const from = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@hotboxng.com';
      await transporter.sendMail({
        from: `"Hotbox Alerts" <${from}>`,
        to,
        subject,
        html,
        text: text || subject
      });
      console.log(`[NotificationService] Real Email sent to ${to} via SMTP`);
      return { success: true, provider: 'SMTP', delivered: true };
    } catch (err) {
      console.error('[NotificationService] SMTP error:', err.message);
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await httpsPost(
        'https://api.resend.com/emails',
        { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        {
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to,
          subject,
          html,
          text: text || subject
        }
      );
      if (res.ok) {
        console.log(`[NotificationService] Real Email sent to ${to} via Resend. ID: ${res.data?.id}`);
        return { success: true, provider: 'RESEND', delivered: true, id: res.data?.id };
      }
    } catch (err) {
      console.error('[NotificationService] Resend error:', err.message);
    }
  }

  console.log('--------------------------------------------------');
  console.log(`[EMAIL ADAPTER] Destination: ${to}`);
  console.log(`[EMAIL ADAPTER] Subject: "${subject}"`);
  console.log('--------------------------------------------------');
  return { success: true, provider: 'DEV_PREVIEW', delivered: false };
}

// Generic SMS Dispatch (Twilio or Termii)
async function sendSmsNotification({ phone, message }) {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const formData = { To: phone, Body: message };
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 
        (process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_PHONE_NUMBER.startsWith('MG') ? process.env.TWILIO_PHONE_NUMBER : null);
      if (messagingServiceSid) formData.MessagingServiceSid = messagingServiceSid;
      else if (process.env.TWILIO_PHONE_NUMBER) formData.From = process.env.TWILIO_PHONE_NUMBER;

      const res = await httpsPost(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        { Authorization: `Basic ${auth}` },
        formData,
        true
      );
      if (res.ok) {
        console.log(`[NotificationService] Real SMS dispatched to ${phone} via Twilio SID: ${res.data?.sid}`);
        return { success: true, provider: 'TWILIO', delivered: true, sid: res.data?.sid };
      }
    } catch (err) {
      console.error('[NotificationService] Twilio SMS error:', err.message);
    }
  }

  if (process.env.TERMII_API_KEY) {
    try {
      const cleanPhone = phone.replace(/^\+/, '');
      const res = await httpsPost(
        'https://api.ng.termii.com/api/sms/send',
        {},
        {
          to: cleanPhone,
          from: process.env.TERMII_SENDER_ID || 'Hotbox',
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: process.env.TERMII_API_KEY
        }
      );
      if (res.ok) {
        console.log(`[NotificationService] Real SMS dispatched to ${cleanPhone} via Termii`);
        return { success: true, provider: 'TERMII', delivered: true };
      }
    } catch (err) {
      console.error('[NotificationService] Termii SMS error:', err.message);
    }
  }

  console.log('--------------------------------------------------');
  console.log(`[SMS ADAPTER] Destination: ${phone}`);
  console.log(`[SMS ADAPTER] Message: "${message}"`);
  console.log('--------------------------------------------------');
  return { success: true, provider: 'DEV_PREVIEW', delivered: false };
}

// Deduct fee for paid alert channels (SMS ₦20, WhatsApp ₦35)
async function deductAlertFee(userId, shipmentId, channel, feeAmount, trackingCode) {
  if (!userId || feeAmount <= 0) return { debited: true, fee: 0, reason: 'FREE_CHANNEL' };
  try {
    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    let wallet = walletRes.rows[0];
    if (!wallet) {
      const wCreate = await db.query(
        'INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES ($1, 0.00, 0.00) RETURNING *',
        [userId]
      );
      wallet = wCreate.rows[0];
    }

    const curBal = parseFloat(wallet.balance_ngn || 0);
    if (curBal < feeAmount) {
      return {
        debited: false,
        fee: feeAmount,
        reason: 'INSUFFICIENT_FUNDS',
        currentBalance: curBal,
        required: feeAmount
      };
    }

    const newBal = curBal - feeAmount;
    await db.query(
      'UPDATE wallets SET balance_ngn = $1, ledger_balance_ngn = $1, updated_at = NOW() WHERE id = $2',
      [newBal, wallet.id]
    );

    const ref = `ALERT-${channel.toUpperCase()}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await db.query(`
      INSERT INTO transactions (
        wallet_id, shipment_id, transaction_type, amount_ngn, fee_ngn, net_amount_ngn,
        balance_before_ngn, balance_after_ngn, reference, payment_gateway, gateway_reference, status, metadata
      ) VALUES ($1, $2, $3, $4, 0.00, $4, $5, $6, $7, 'WALLET', $7, 'COMPLETED', $8)
    `, [
      wallet.id,
      shipmentId || null,
      `REROUTE_${channel.toUpperCase()}_FEE`,
      feeAmount,
      curBal,
      newBal,
      ref,
      JSON.stringify({
        description: `Automated Reroute Alert (${channel.toUpperCase()}) for ${trackingCode || 'Shipment'}`,
        channel,
        rateNgn: feeAmount
      })
    ]);

    return {
      debited: true,
      fee: feeAmount,
      previousBalance: curBal,
      newBalance: newBal,
      reference: ref
    };
  } catch (err) {
    console.error(`[AlertFee] Error debiting fee for ${channel}:`, err.message);
    return { debited: false, fee: feeAmount, reason: err.message };
  }
}

// Automated Dual-Party Reroute Alerts: Dispatches to both Sender and Recipient
async function dispatchDualPartyRerouteAlert({
  shipment,
  oldPostcode,
  newPostcode,
  reason = 'Address Relocation via Hotbox Digital P.O. Box',
  reroutedBy = 'Hotbox System'
}) {
  if (!shipment) throw new Error('Shipment details required for dual-party reroute alert');

  const trackingCode = shipment.tracking_code || 'HOTBOX-ITEM';
  const timestamp = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });

  // 1. Identify Recipient User & Notification Preferences
  let recipientUser = null;
  if (shipment.recipient_phone || shipment.recipient_email) {
    const rRes = await db.query(
      `SELECT id, name, phone, email, notification_preferences 
       FROM users 
       WHERE phone = $1 OR (email = $2 AND email IS NOT NULL) 
       LIMIT 1`,
      [shipment.recipient_phone, shipment.recipient_email || null]
    );
    if (rRes.rows.length > 0) recipientUser = rRes.rows[0];
  }

  const recipientPrefs = {
    inapp: true,
    email: true,
    sms: false,
    whatsapp: false,
    ...(recipientUser?.notification_preferences || {})
  };

  // 2. Identify Sender User & Notification Preferences
  let senderUser = null;
  if (shipment.sender_id) {
    const sRes = await db.query(
      `SELECT id, name, phone, email, notification_preferences FROM users WHERE id = $1`,
      [shipment.sender_id]
    );
    if (sRes.rows.length > 0) senderUser = sRes.rows[0];
  } else if (shipment.sender_phone) {
    const sRes = await db.query(
      `SELECT id, name, phone, email, notification_preferences FROM users WHERE phone = $1 LIMIT 1`,
      [shipment.sender_phone]
    );
    if (sRes.rows.length > 0) senderUser = sRes.rows[0];
  }

  const senderPrefs = {
    inapp: true,
    email: true,
    sms: false,
    whatsapp: false,
    ...(senderUser?.notification_preferences || {})
  };

  const recipientReport = { channels: {}, totalFeeNgn: 0 };
  const senderReport = { channels: {}, totalFeeNgn: 0 };

  // -------------------------------------------------------------
  // RECIPIENT DISPATCH (Free In-App & Email; Paid SMS & WhatsApp)
  // -------------------------------------------------------------
  const recipientName = shipment.recipient_name || recipientUser?.name || 'Valued Resident';
  const recipientEmail = shipment.recipient_email || recipientUser?.email;
  const recipientPhone = shipment.recipient_phone || recipientUser?.phone;

  // A. Recipient In-App (FREE: ₦0.00)
  if (recipientPrefs.inapp !== false && recipientUser) {
    try {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, is_read, metadata, created_at)
        VALUES ($1, $2, $3, 'REROUTE_ALERT', FALSE, $4, NOW())
      `, [
        recipientUser.id,
        `📬 Mail Redirected Safely: ${trackingCode}`,
        `Your incoming item (${trackingCode}) originally addressed to ${oldPostcode} has been safely redirected to your active verified address (${newPostcode}) via your Hotbox Digital P.O. Box.`,
        JSON.stringify({
          shipmentId: shipment.id,
          trackingCode,
          oldPostcode,
          newPostcode,
          party: 'RECIPIENT',
          feeNgn: 0.00,
          reason
        })
      ]);
      recipientReport.channels.inapp = { status: 'DELIVERED', feeNgn: 0.00, note: 'Free in-app alert' };
    } catch (e) {
      recipientReport.channels.inapp = { status: 'FAILED', error: e.message };
    }
  }

  // B. Recipient Email (FREE: ₦0.00)
  if (recipientPrefs.email !== false && recipientEmail) {
    try {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #10b981; padding-bottom: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h2 style="color: #064e3b; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">HOTBOX 🇳🇬</h2>
              <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Digital P.O. Box Forwarding</span>
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">National Postcode-Powered Logistics Network • hotbox.com.ng</p>
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
            <div style="color: #166534; font-size: 15px; font-weight: 700; margin-bottom: 6px;">
              ✅ Mail Redirected Safely
            </div>
            <p style="color: #15803d; font-size: 13px; margin: 0; line-height: 1.5;">
              Dear <strong>${recipientName}</strong>, your incoming parcel has been automatically intercepted and redirected to your current verified address.
            </p>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Tracking ID:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">${trackingCode}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Previous Address Postcode:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #dc2626; text-align: right; font-family: monospace;">${oldPostcode}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">New Destination Postcode:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #059669; text-align: right; font-family: monospace;">${newPostcode}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Redirected On:</td>
                <td style="padding: 6px 0; color: #334155; text-align: right;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Notification Fee:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #059669; text-align: right;">₦0.00 (Free)</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="https://hotboxng.com/track/${trackingCode}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: bold;">Track Parcel Live ➔</a>
          </div>

          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
            You are receiving this automated alert because you have active Digital P.O. Box mail forwarding enabled on Hotbox (hotbox.com.ng / hotboxng.com).
          </p>
        </div>
      `;
      const emailRes = await sendEmailNotification({
        to: recipientEmail,
        subject: `📬 Hotbox Notice: Mail ${trackingCode} Safely Redirected to ${newPostcode}`,
        html: emailHtml
      });
      recipientReport.channels.email = { status: 'DELIVERED', feeNgn: 0.00, delivered: emailRes.delivered, note: 'Free email alert' };
    } catch (e) {
      recipientReport.channels.email = { status: 'FAILED', error: e.message };
    }
  }

  // C. Recipient SMS (PAID: ₦20.00)
  if (recipientPrefs.sms && recipientPhone) {
    const feeResult = await deductAlertFee(recipientUser?.id, shipment.id, 'sms', ALERT_PRICING.sms, trackingCode);
    if (feeResult.debited) {
      const smsMsg = `Hotbox Alert: Mail ${trackingCode} redirected safely from ${oldPostcode} to verified address ${newPostcode}. Track: hotboxng.com/track/${trackingCode}`;
      const smsRes = await sendSmsNotification({ phone: recipientPhone, message: smsMsg });
      recipientReport.channels.sms = { status: 'DELIVERED', feeNgn: ALERT_PRICING.sms, delivered: smsRes.delivered, provider: smsRes.provider };
      recipientReport.totalFeeNgn += ALERT_PRICING.sms;
    } else {
      recipientReport.channels.sms = { status: 'SKIPPED_INSUFFICIENT_FUNDS', feeNgn: 0.00, reason: feeResult.reason };
    }
  }

  // D. Recipient WhatsApp (PAID: ₦35.00)
  if (recipientPrefs.whatsapp && recipientPhone) {
    const feeResult = await deductAlertFee(recipientUser?.id, shipment.id, 'whatsapp', ALERT_PRICING.whatsapp, trackingCode);
    if (feeResult.debited) {
      const waMsg = `📬 *Hotbox Reroute Notice*\nHello *${recipientName}*, your mail *${trackingCode}* addressed to *${oldPostcode}* has been redirected safely to your verified address *${newPostcode}*.\nTrack live at: https://hotboxng.com/track/${trackingCode}`;
      const waRes = await sendWhatsAppAlert(recipientPhone, waMsg);
      recipientReport.channels.whatsapp = { status: 'DELIVERED', feeNgn: ALERT_PRICING.whatsapp, provider: waRes.provider };
      recipientReport.totalFeeNgn += ALERT_PRICING.whatsapp;
    } else {
      recipientReport.channels.whatsapp = { status: 'SKIPPED_INSUFFICIENT_FUNDS', feeNgn: 0.00, reason: feeResult.reason };
    }
  }

  // -------------------------------------------------------------
  // SENDER DISPATCH (Dual-Party Notification Guarantee)
  // -------------------------------------------------------------
  const senderName = shipment.sender_name || senderUser?.name || 'Shipper / Institution';
  const senderEmail = senderUser?.email || shipment.sender_email;
  const senderPhone = shipment.sender_phone || senderUser?.phone;

  // A. Sender In-App (FREE: ₦0.00)
  if (senderPrefs.inapp !== false && senderUser) {
    try {
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, is_read, metadata, created_at)
        VALUES ($1, $2, $3, 'REROUTE_ALERT', FALSE, $4, NOW())
      `, [
        senderUser.id,
        `📦 Shipment Redirected Safely: ${trackingCode}`,
        `Your shipment to ${recipientName} has been safely redirected to their updated verified address (${newPostcode}) due to verified address relocation.`,
        JSON.stringify({
          shipmentId: shipment.id,
          trackingCode,
          oldPostcode,
          newPostcode,
          party: 'SENDER',
          feeNgn: 0.00,
          reason
        })
      ]);
      senderReport.channels.inapp = { status: 'DELIVERED', feeNgn: 0.00, note: 'Free in-app alert' };
    } catch (e) {
      senderReport.channels.inapp = { status: 'FAILED', error: e.message };
    }
  }

  // B. Sender Email (FREE: ₦0.00)
  if (senderPrefs.email !== false && senderEmail) {
    try {
      const senderHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h2 style="color: #0c4a6e; margin: 0; font-size: 22px; font-weight: 800;">HOTBOX 🇳🇬</h2>
              <span style="background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Dual-Party Reroute Notice</span>
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Sender Logistics Audit Trail • hotbox.com.ng</p>
          </div>

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
            <div style="color: #0369a1; font-size: 15px; font-weight: 700; margin-bottom: 6px;">
              📦 Recipient Relocation Intercepted & Forwarded
            </div>
            <p style="color: #0284c7; font-size: 13px; margin: 0; line-height: 1.5;">
              Dear <strong>${senderName}</strong>, your parcel dispatched to <strong>${recipientName}</strong> has been safely redirected to their updated verified address without return-to-sender penalty.
            </p>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Tracking ID:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">${trackingCode}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Recipient:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${recipientName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Original Postcode:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #dc2626; text-align: right; font-family: monospace;">${oldPostcode}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Redirected Destination:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #059669; text-align: right; font-family: monospace;">${newPostcode}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Redirected On:</td>
                <td style="padding: 6px 0; color: #334155; text-align: right;">${timestamp}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Notification Fee:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #059669; text-align: right;">₦0.00 (Free)</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 20px;">
            <a href="https://hotboxng.com/track/${trackingCode}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: bold;">View Custody Audit Trail ➔</a>
          </div>
        </div>
      `;
      const sEmailRes = await sendEmailNotification({
        to: senderEmail,
        subject: `📦 Hotbox Notice: Shipment ${trackingCode} Safely Redirected to ${newPostcode}`,
        html: senderHtml
      });
      senderReport.channels.email = { status: 'DELIVERED', feeNgn: 0.00, delivered: sEmailRes.delivered };
    } catch (e) {
      senderReport.channels.email = { status: 'FAILED', error: e.message };
    }
  }

  // C. Sender SMS (PAID: ₦20.00)
  if (senderPrefs.sms && senderPhone) {
    const feeResult = await deductAlertFee(senderUser?.id, shipment.id, 'sms', ALERT_PRICING.sms, trackingCode);
    if (feeResult.debited) {
      const smsMsg = `Hotbox Dispatch: Your parcel ${trackingCode} to ${recipientName} was safely redirected to their updated verified address ${newPostcode}.`;
      const smsRes = await sendSmsNotification({ phone: senderPhone, message: smsMsg });
      senderReport.channels.sms = { status: 'DELIVERED', feeNgn: ALERT_PRICING.sms, delivered: smsRes.delivered, provider: smsRes.provider };
      senderReport.totalFeeNgn += ALERT_PRICING.sms;
    } else {
      senderReport.channels.sms = { status: 'SKIPPED_INSUFFICIENT_FUNDS', feeNgn: 0.00, reason: feeResult.reason };
    }
  }

  // D. Sender WhatsApp (PAID: ₦35.00)
  if (senderPrefs.whatsapp && senderPhone) {
    const feeResult = await deductAlertFee(senderUser?.id, shipment.id, 'whatsapp', ALERT_PRICING.whatsapp, trackingCode);
    if (feeResult.debited) {
      const waMsg = `📦 *Hotbox Dispatch Notice*\nDear *${senderName}*, your shipment *${trackingCode}* to *${recipientName}* was redirected safely to their verified address *${newPostcode}*. Delivery in progress.`;
      const waRes = await sendWhatsAppAlert(senderPhone, waMsg);
      senderReport.channels.whatsapp = { status: 'DELIVERED', feeNgn: ALERT_PRICING.whatsapp, provider: waRes.provider };
      senderReport.totalFeeNgn += ALERT_PRICING.whatsapp;
    } else {
      senderReport.channels.whatsapp = { status: 'SKIPPED_INSUFFICIENT_FUNDS', feeNgn: 0.00, reason: feeResult.reason };
    }
  }

  return {
    success: true,
    trackingCode,
    shipmentId: shipment.id,
    oldPostcode,
    newPostcode,
    reason,
    reroutedBy,
    reroutedAt: new Date().toISOString(),
    pricing: ALERT_PRICING,
    recipient: recipientReport,
    sender: senderReport
  };
}

module.exports = {
  ALERT_PRICING,
  sendEmailOtp,
  sendSmsOtp,
  sendWhatsAppAlert,
  sendEmailNotification,
  sendSmsNotification,
  deductAlertFee,
  dispatchDualPartyRerouteAlert
};
