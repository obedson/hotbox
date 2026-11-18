// Onboarding email for staff accounts provisioned on the Team screen.
// The email carries a single-use, expiring link that lets the new team member
// replace the administrator's temporary password with one of their own. The
// temporary password itself is never put in email; the administrator hands it
// over through a separate channel and the link is what makes it obsolete.
const crypto = require('crypto');
const db = require('../config/db');
const notificationService = require('./notificationService');

const RESET_TOKEN_TTL_MINUTES = 30;
function baseUrl() {
  return (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://hotbox.onrender.com').replace(/\/$/, '');
}

const ROLE_LABELS = {
  super_admin: 'Super admin',
  ops_admin: 'Operations admin',
  compliance_officer: 'Compliance officer',
  nipost_verifier: 'NIPOST verifier',
  finance_officer: 'Finance officer',
  support_agent: 'Support agent',
  hub_owner: 'Hub owner',
  hub_staff: 'Hub staff',
  rider: 'Rider',
  courier_company: 'Courier company',
  enterprise_shipper: 'Enterprise shipper',
  customer: 'Customer'
};

const roleLabel = (role) => ROLE_LABELS[role] || String(role || 'team member').replace(/_/g, ' ');

function emailText({ name, role: roleName, resetUrl, expiresMinutes }) {
  return [
    `Hi ${name},`,
    '',
    `Your Hotbox staff account is ready. Your role: ${roleName}.`,
    '',
    'Set your own password with this link:',
    resetUrl,
    '',
    `The link expires in ${expiresMinutes} minutes and can only be used once. Do not share it.`,
    'If it has expired, ask your administrator to send a fresh one.'
  ].join('\n');
}

function emailHtml({ name, role: roleName, resetUrl, expiresMinutes }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="margin: 0 0 8px; color: #0f172a;">Your Hotbox staff account is ready</h2>
      <p style="color: #475569; line-height: 1.5;">
        Hi ${name}, an administrator has created a Hotbox staff account for you with the role
        <strong>${roleName}</strong>.
      </p>
      <p style="color: #475569; line-height: 1.5;">
        Set your own password to finish onboarding. This replaces the temporary password the
        administrator gave you.
      </p>
      <a href="${resetUrl}" style="display: inline-block; margin: 16px 0; padding: 12px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold;">Set your password</a>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        This link expires in ${expiresMinutes} minutes and can only be used once. Do not share it.
        If it has expired, ask your administrator to send a fresh one.
      </p>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
        Hotbox &bull; Digital P.O. Box &amp; Ground-Truth Address
      </p>
    </div>
  `;
}

async function sendStaffOnboardingEmail({ userId, name, email, role }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  try {
    await db.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  } catch (err) {
    console.error('[StaffOnboardingMailer] failed to persist reset token:', err.message);
    return { sent: false, delivered: false, reason: 'token_failed' };
  }

  const resetUrl = `${baseUrl()}/?reset=${token}`;
  const label = roleLabel(role);
  const payload = {
    to: email,
    subject: 'Your Hotbox staff account is ready',
    text: emailText({ name, role: label, resetUrl, expiresMinutes: RESET_TOKEN_TTL_MINUTES }),
    html: emailHtml({ name, role: label, resetUrl, expiresMinutes: RESET_TOKEN_TTL_MINUTES })
  };

  try {
    const result = await notificationService.sendEmailNotification(payload);
    const delivered = Boolean(result && result.delivered);
    return { sent: delivered, delivered, reason: delivered ? undefined : 'not_delivered' };
  } catch (err) {
    console.error('[StaffOnboardingMailer] send failed:', err.message);
    return { sent: false, delivered: false, reason: 'send_failed' };
  }
}

module.exports = {
  RESET_TOKEN_TTL_MINUTES,
  roleLabel,
  emailText,
  emailHtml,
  sendStaffOnboardingEmail
};