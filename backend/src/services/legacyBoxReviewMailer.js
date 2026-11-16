// Email fallback approval for the legacy P.O. Box queue.
// The in-app queue is the primary channel; these signed, expiring links let a
// NIPOST reviewer decide from email without an account. The token is a capability
// scoped to one request and one action, so it can never be replayed or widened.
const jwt = require('jsonwebtoken');
const settingsService = require('./settingsService');
const { sendEmailNotification } = require('./notificationService');

const REVIEW_TOKEN_TTL = '7d';
const TOKEN_PURPOSE = 'legacy_link_review';
const BASE_URL = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://hotbox.onrender.com').replace(/\/$/, '');

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is required to sign NIPOST review links.');
  return value;
}

function signReviewToken(requestId, action) {
  return jwt.sign({ purpose: TOKEN_PURPOSE, requestId, action }, secret(), { expiresIn: REVIEW_TOKEN_TTL });
}

function verifyReviewToken(token) {
  const decoded = jwt.verify(String(token || ''), secret());
  if (decoded.purpose !== TOKEN_PURPOSE) throw new Error('This review link is not valid.');
  if (!decoded.requestId || !['approve', 'reject'].includes(decoded.action)) {
    throw new Error('This review link is incomplete.');
  }
  return { requestId: decoded.requestId, action: decoded.action };
}

function reviewUrls(requestId) {
  return {
    approve: `${BASE_URL}/api/v1/nipost-review/approve?token=${encodeURIComponent(signReviewToken(requestId, 'approve'))}`,
    reject: `${BASE_URL}/api/v1/nipost-review/reject?token=${encodeURIComponent(signReviewToken(requestId, 'reject'))}`
  };
}

function emailHtml({ request, boxNumber, urls }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="margin: 0 0 8px; color: #0f172a;">Legacy P.O. Box link request</h2>
      <p style="color: #475569; line-height: 1.5;">
        A Hotbox customer has requested that old P.O. Box
        <strong>${request.legacy_box_number_raw}</strong> be linked to Digital P.O. Box
        <strong>${boxNumber}</strong>. NIPOST must verify ownership before mail forwarding starts.
      </p>
      <p style="color: #475569; line-height: 1.5;">
        Customer: <strong>${request.user_name || request.user_email || 'Hotbox customer'}</strong><br/>
        Submitted: ${new Date(request.submitted_at).toLocaleString('en-GB')}
      </p>
      <div style="margin: 18px 0;">
        <a href="${urls.approve}" style="display: inline-block; margin-right: 10px; padding: 12px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold;">Approve link</a>
        <a href="${urls.reject}" style="display: inline-block; padding: 12px 20px; background: #e11d48; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold;">Reject</a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        These links expire in 7 days and apply only to this request. If you cannot act now, use the Hotbox NIPOST queue.
      </p>
    </div>
  `;
}

async function sendReviewRequestEmail({ request, boxNumber }) {
  const to = await settingsService.getNipostReviewEmail();
  if (!to) return { sent: false, reason: 'no_reviewer_email' };

  const urls = reviewUrls(request.id);
  try {
    await sendEmailNotification({
      to,
      subject: `NIPOST verification requested: old P.O. Box ${request.legacy_box_number_raw}`,
      text: `Customer ${request.user_name || request.user_email} requested linking old P.O. Box ${request.legacy_box_number_raw} to ${boxNumber}. Approve: ${urls.approve} Reject: ${urls.reject}`,
      html: emailHtml({ request, boxNumber, urls })
    });
    return { sent: true };
  } catch (err) {
    console.error('[LegacyBoxReviewMailer] send failed:', err.message);
    return { sent: false, reason: 'send_failed' };
  }
}

function decisionPage({ action, ok, message }) {
  const color = ok ? '#059669' : '#e11d48';
  const title = ok ? 'Decision recorded' : 'Decision could not be recorded';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title></head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px;">
    <h1 style="color: ${color}; font-size: 20px; margin: 0 0 10px;">${title}</h1>
    <p style="color: #475569; line-height: 1.6; margin: 0;">${message}</p>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 18px;">Hotbox • Legacy P.O. Box verification</p>
  </div>
</body></html>`;
}

module.exports = {
  REVIEW_TOKEN_TTL,
  TOKEN_PURPOSE,
  signReviewToken,
  verifyReviewToken,
  reviewUrls,
  sendReviewRequestEmail,
  decisionPage
};