const db = require('../config/db');
const { generateOtp, otpExpiryFromNow, OTP_EXPIRY_MINUTES } = require('../utils/otp');
const notificationService = require('./notificationService');

async function senderEmailOf(senderId) {
  if (!senderId) return null;
  try {
    const res = await db.query('SELECT email FROM users WHERE id = $1', [senderId]);
    return res.rows.length > 0 ? res.rows[0].email : null;
  } catch (err) {
    console.warn('[pickupOtp] Could not load sender email:', err.message);
    return null;
  }
}

async function deliverOtp({ phone, email, otp, trackingCode, arrived }) {
  const message = arrived
    ? `Your Hotbox rider has arrived for ${trackingCode}. Handover OTP is ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Hand it to the rider at pickup.`
    : `Hotbox pickup OTP for ${trackingCode} is ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Hand it to the rider at pickup.`;
  const receipt = { sms: null, email: null };

  if (phone) {
    try {
      receipt.sms = await notificationService.sendSmsNotification({ phone, message });
    } catch (err) {
      console.warn('[pickupOtp] SMS delivery failed:', err.message);
      receipt.sms = { success: false, delivered: false };
    }
  }

  if (email) {
    try {
      receipt.email = await notificationService.sendEmailNotification({
        to: email,
        subject: `Hotbox rider arrived - pickup OTP for ${trackingCode}`,
        text: message,
        html: `<p style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;">${message}</p>`
      });
    } catch (err) {
      console.warn('[pickupOtp] Email delivery failed:', err.message);
      receipt.email = { success: false, delivered: false };
    }
  }

  return receipt;
}

// Issues (or reissues) the pickup OTP and delivers it to the sender. The code is
// only ever sent to the sender; the rider proves possession by reading it at
// the door, so callers must never return it to a rider client.
async function issuePickupOtp({ shipmentId, trackingCode, phone, email, arrived = true }) {
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
    [pickupOtp, pickupOtpExpiresAt, shipmentId]
  );
  const receipt = await deliverOtp({ phone, email, otp: pickupOtp, trackingCode, arrived });
  return { pickupOtp, pickupOtpExpiresAt, receipt };
}

// Tells the sender a rider has accepted the job. Deliberately carries no OTP:
// the handover code is only issued when the rider actually arrives.
async function notifyRiderOnTheWay({ shipment, riderName, riderPhone }) {
  const riderLabel = riderName
    ? `${riderName}${riderPhone ? ` (${riderPhone})` : ''}`
    : 'Your Hotbox rider';
  const message = `${riderLabel} has accepted pickup ${shipment.tracking_code} and is on the way to ${shipment.sender_address_text || 'your address'}. Your handover code will be sent by SMS and email when the rider arrives.`;
  const receipt = { sms: null, email: null };

  if (shipment.sender_phone) {
    try {
      receipt.sms = await notificationService.sendSmsNotification({ phone: shipment.sender_phone, message });
    } catch (err) {
      console.warn('[pickupOtp] Rider-assigned SMS failed:', err.message);
      receipt.sms = { success: false, delivered: false };
    }
  }

  const email = await senderEmailOf(shipment.sender_id);
  if (email) {
    try {
      receipt.email = await notificationService.sendEmailNotification({
        to: email,
        subject: `Hotbox rider on the way for ${shipment.tracking_code}`,
        text: message,
        html: `<p style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;">${message}</p>`
      });
    } catch (err) {
      console.warn('[pickupOtp] Rider-assigned email failed:', err.message);
      receipt.email = { success: false, delivered: false };
    }
  }

  return receipt;
}

module.exports = {
  issuePickupOtp,
  notifyRiderOnTheWay,
  senderEmailOf,
  deliverOtp
};