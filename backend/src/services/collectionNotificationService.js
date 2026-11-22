// Collection credential delivery.
//
// A parcel becomes collectable the moment it is shelved at a hub, so that is
// when the recipient must receive their release credentials. The QR pass is the
// primary credential (scannable at the counter) and the 6-digit OTP is the
// fallback. Both are minted at booking; this service only ever re-delivers them.
const notificationService = require('./notificationService');

function buildSmsMessage({ shipment, hubName }) {
  const { tracking_code: trackingCode, collection_qr_token: collectionQrToken, delivery_otp: deliveryOtp, recipient_name: recipientName } = shipment;
  const who = recipientName ? ` Hi ${recipientName},` : '';
  return [
    `Hotbox:${who} your parcel ${trackingCode} is ready for collection at ${hubName}.`,
    `Show this QR Pass: ${collectionQrToken}`,
    `Fallback OTP: ${deliveryOtp}`,
    'Valid for collection at the hub counter. Do not share these codes.'
  ].join('\n');
}

async function sendCollectionCredentials({ shipment, hubName, recipientPhone, recipientEmail }) {
  const message = buildSmsMessage({ shipment, hubName: hubName || 'the receiving Hotbox hub' });

  const receipt = {
    sms: { success: false, delivered: false },
    email: { success: false, delivered: false }
  };

  if (recipientPhone) {
    try {
      const sms = await notificationService.sendSmsNotification({ phone: recipientPhone, message });
      receipt.sms = { success: sms?.success !== false, delivered: sms?.delivered === true, provider: sms?.provider || null };
    } catch (err) {
      // A failed SMS must never fail the custody transfer; the hub host can read
      // the credential from the intake screen instead.
      receipt.sms = { success: false, delivered: false, error: err.message };
    }
  }

  if (recipientEmail) {
    try {
      const email = await notificationService.sendEmailNotification({
        to: recipientEmail,
        subject: `Your Hotbox parcel ${shipment.tracking_code} is ready for collection`,
        text: message,
        html: [
          '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">',
          '<h2 style="color:#064e3b;margin:0;font-size:20px;">HOTBOX &#127479;&#127468;</h2>',
          `<p style="color:#334155;font-size:14px;line-height:1.6;">Your parcel <strong style="font-family:monospace;">${shipment.tracking_code}</strong> is ready for collection at <strong>${hubName || 'the receiving Hotbox hub'}</strong>.</p>`,
          '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">',
          `<p style="margin:0 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">QR Pass (show at counter)</p>`,
          `<p style="margin:0;font-family:monospace;font-size:18px;font-weight:700;color:#059669;word-break:break-all;">${shipment.collection_qr_token}</p>`,
          `<p style="margin:12px 0 6px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Fallback OTP</p>`,
          `<p style="margin:0;font-family:monospace;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:4px;">${shipment.delivery_otp}</p>`,
          '</div>',
          '<p style="color:#64748b;font-size:12px;line-height:1.5;">Present the QR pass at the hub counter, or quote the OTP if the scanner is unavailable. Never share these codes with anyone.</p>',
          '</div>'
        ].join('')
      });
      receipt.email = { success: email?.success !== false, delivered: email?.delivered === true };
    } catch (err) {
      receipt.email = { success: false, delivered: false, error: err.message };
    }
  }

  return { success: true, trackingCode: shipment.tracking_code, receipt };
}

module.exports = {
  buildSmsMessage,
  sendCollectionCredentials
};