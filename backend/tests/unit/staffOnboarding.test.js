const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const mailer = require('../../src/services/staffOnboardingMailer');
const notificationService = require('../../src/services/notificationService');
const db = require('../../src/config/db');
const usersRouter = require('../../src/routes/operations/users');
const operationsRouter = require('../../src/routes/operations');

const originalQuery = db.query;
const originalSend = notificationService.sendEmailNotification;
const originalBaseUrl = process.env.APP_BASE_URL;

after(() => {
  db.query = originalQuery;
  notificationService.sendEmailNotification = originalSend;
  if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalBaseUrl;
});

function routeLayer(router, method, path) {
  return router.stack.find(
    (layer) => layer.route &&
      layer.route.path === path &&
      Object.keys(layer.route.methods).includes(method)
  ) || null;
}

test('role labels read like the Team screen', () => {
  assert.equal(mailer.roleLabel('compliance_officer'), 'Compliance officer');
  assert.equal(mailer.roleLabel('nipost_verifier'), 'NIPOST verifier');
  assert.equal(mailer.roleLabel('hub_owner'), 'Hub owner');
  assert.equal(mailer.roleLabel('something_new'), 'something new');
});

test('onboarding email carries the link and never the temporary password', () => {
  const resetUrl = 'https://hotbox.onrender.com/?reset=abc123';
  const args = {
    name: 'Amina Bello',
    role: 'Compliance officer',
    resetUrl,
    expiresMinutes: mailer.RESET_TOKEN_TTL_MINUTES
  };

  const html = mailer.emailHtml(args);
  assert.match(html, /Amina Bello/);
  assert.match(html, /Compliance officer/);
  assert.match(html, new RegExp(resetUrl.replace(/[?=]/g, (m) => `\\${m}`)));
  assert.match(html, new RegExp(`${mailer.RESET_TOKEN_TTL_MINUTES} minutes`));
  assert.doesNotMatch(html, /temporary password is/i);

  const text = mailer.emailText(args);
  assert.match(text, /Amina Bello/);
  assert.match(text, new RegExp(resetUrl.replace(/[?=]/g, (m) => `\\${m}`)));
});

test('persists a hashed token and emails the plaintext link', async () => {
  process.env.APP_BASE_URL = 'https://hotbox.onrender.com';
  let capturedQuery = null;
  let capturedEmail = null;
  db.query = async (sql, params) => {
    capturedQuery = { sql, params };
    return { rows: [{ id: 'reset-1' }] };
  };
  notificationService.sendEmailNotification = async (args) => {
    capturedEmail = args;
    return { success: true, delivered: true };
  };

  const result = await mailer.sendStaffOnboardingEmail({
    userId: 'user-1',
    name: 'Amina Bello',
    email: 'amina@hotbox.ng',
    role: 'compliance_officer'
  });

  assert.equal(result.sent, true);
  assert.equal(result.delivered, true);
  assert.match(capturedQuery.sql, /INSERT INTO password_resets/);
  assert.equal(capturedQuery.params[0], 'user-1');
  // Only the SHA-256 hash is stored, never the token itself.
  assert.match(capturedQuery.params[1], /^[a-f0-9]{64}$/);
  assert.ok(capturedQuery.params[2] instanceof Date);
  assert.match(capturedEmail.to, /amina@hotbox\.ng/);
  assert.match(capturedEmail.subject, /staff account is ready/);
  assert.match(capturedEmail.html, /https:\/\/hotbox\.onrender\.com\/\?reset=/);
  assert.match(capturedEmail.html, /Compliance officer/);
  assert.doesNotMatch(capturedEmail.html, /compliance_officer/);
  assert.ok(capturedEmail.html.includes(capturedQuery.params[1]) === false);
});

test('reports a token persistence failure instead of throwing', async () => {
  db.query = async () => { throw new Error('db down'); };
  let sent = false;
  notificationService.sendEmailNotification = async () => { sent = true; return { success: true, delivered: true }; };

  const result = await mailer.sendStaffOnboardingEmail({
    userId: 'user-1', name: 'Amina', email: 'a@b.com', role: 'support_agent'
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'token_failed');
  assert.equal(sent, false);
});

test('reports an undelivered email without throwing', async () => {
  db.query = async () => ({ rows: [] });
  notificationService.sendEmailNotification = async () => ({ success: true, delivered: false });

  const result = await mailer.sendStaffOnboardingEmail({
    userId: 'user-1', name: 'Amina', email: 'a@b.com', role: 'support_agent'
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, 'not_delivered');
});

test('the onboarding email routes exist and sit behind the operations gate', () => {
  assert.ok(routeLayer(usersRouter, 'post', '/users'), 'POST /users should exist');
  assert.ok(
    routeLayer(usersRouter, 'post', '/users/:id/onboarding-email'),
    'POST /users/:id/onboarding-email should exist'
  );

  const gate = operationsRouter.stack
    .filter((layer) => !layer.route)
    .map((layer) => layer.handle)
    .find((fn) => Array.isArray(fn.allowedRoles));
  assert.ok(gate, 'operations router should carry a role gate');
  assert.deepEqual([...gate.allowedRoles].sort(), ['ops_admin', 'super_admin']);
});