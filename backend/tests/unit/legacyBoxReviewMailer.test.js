const { test, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const mailer = require('../../src/services/legacyBoxReviewMailer');
const notificationService = require('../../src/services/notificationService');
const settingsService = require('../../src/services/settingsService');

const originalSend = notificationService.sendEmailNotification;
const originalEmail = settingsService.getNipostReviewEmail;
const originalSecret = process.env.JWT_SECRET;

after(() => {
  notificationService.sendEmailNotification = originalSend;
  settingsService.getNipostReviewEmail = originalEmail;
  process.env.JWT_SECRET = originalSecret;
});

const request = {
  id: 'req-1',
  legacy_box_number_raw: 'P.O. Box 1234',
  user_name: 'Obed Uchenna',
  user_email: 'obed@x.com',
  submitted_at: new Date().toISOString()
};

test('signs and verifies a review token for each action', () => {
  const approve = mailer.signReviewToken('req-1', 'approve');
  assert.deepEqual(mailer.verifyReviewToken(approve), { requestId: 'req-1', action: 'approve' });

  const reject = mailer.signReviewToken('req-1', 'reject');
  assert.deepEqual(mailer.verifyReviewToken(reject), { requestId: 'req-1', action: 'reject' });
});

test('review links carry one token per action', () => {
  const urls = mailer.reviewUrls('req-9');
  assert.match(urls.approve, /\/api\/v1\/nipost-review\/approve\?token=/);
  assert.match(urls.reject, /\/api\/v1\/nipost-review\/reject\?token=/);
  assert.notEqual(urls.approve, urls.reject);
});

test('rejects a token with the wrong purpose', () => {
  const forged = jwt.sign({ purpose: 'other', requestId: 'req-1', action: 'approve' }, 'test-secret');
  assert.throws(() => mailer.verifyReviewToken(forged), /not valid/i);
});

test('rejects an incomplete token', () => {
  const forged = jwt.sign({ purpose: mailer.TOKEN_PURPOSE, requestId: 'req-1' }, 'test-secret');
  assert.throws(() => mailer.verifyReviewToken(forged), /incomplete/i);
});

test('rejects a garbage token as a bad request', () => {
  assert.throws(
    () => mailer.verifyReviewToken('not-a-token'),
    (err) => err.status === 400 && /invalid or has expired/i.test(err.message)
  );
});

test('refuses to sign without a JWT secret', () => {
  delete process.env.JWT_SECRET;
  assert.throws(() => mailer.signReviewToken('req-1', 'approve'), /JWT_SECRET/);
  process.env.JWT_SECRET = 'test-secret';
});

test('sends review links to the configured NIPOST reviewer', async () => {
  let captured = null;
  settingsService.getNipostReviewEmail = async () => 'nipost@microcbt.com';
  notificationService.sendEmailNotification = async (args) => { captured = args; return { success: true }; };

  const result = await mailer.sendReviewRequestEmail({ request, boxNumber: 'HBX-0001' });

  assert.equal(result.sent, true);
  assert.equal(captured.to, 'nipost@microcbt.com');
  assert.match(captured.html, /Approve link/);
  assert.match(captured.html, /P.O. Box 1234/);
  assert.match(captured.text, /Reject:/);
});

test('skips sending when no reviewer email is configured', async () => {
  settingsService.getNipostReviewEmail = async () => null;
  let sent = false;
  notificationService.sendEmailNotification = async () => { sent = true; return { success: true }; };

  const result = await mailer.sendReviewRequestEmail({ request, boxNumber: 'HBX-0001' });

  assert.equal(result.sent, false);
  assert.equal(sent, false);
});

test('reports a send failure instead of throwing', async () => {
  settingsService.getNipostReviewEmail = async () => 'nipost@microcbt.com';
  notificationService.sendEmailNotification = async () => { throw new Error('smtp down'); };

  const result = await mailer.sendReviewRequestEmail({ request, boxNumber: 'HBX-0001' });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'send_failed');
});

test('renders a decision page for email reviewers', () => {
  const html = mailer.decisionPage({ action: 'approve', ok: true, message: 'Linked.' });
  assert.match(html, /Decision recorded/);
  assert.match(html, /Linked/);
});