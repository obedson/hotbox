const { test } = require('node:test');
const assert = require('node:assert/strict');

const logger = require('../../src/lib/logger');

function capture(stream, fn) {
  const original = stream.write;
  let output = '';
  stream.write = (chunk) => {
    output += chunk;
    return true;
  };
  try {
    fn();
  } finally {
    stream.write = original;
  }
  return output;
}

test('logger.info writes a structured JSON line', () => {
  const output = capture(process.stdout, () => logger.info('request completed', { method: 'GET', statusCode: 200 }));
  const entry = JSON.parse(output.trim());
  assert.equal(entry.level, 'info');
  assert.equal(entry.message, 'request completed');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.statusCode, 200);
  assert.ok(!Number.isNaN(Date.parse(entry.timestamp)));
});

test('logger.warn includes metadata', () => {
  const output = capture(process.stdout, () => logger.warn('authentication failed', { ip: '127.0.0.1', path: '/api/v1/operations/stats' }));
  const entry = JSON.parse(output.trim());
  assert.equal(entry.level, 'warn');
  assert.equal(entry.ip, '127.0.0.1');
  assert.equal(entry.path, '/api/v1/operations/stats');
});

test('logger.error writes to stderr', () => {
  const output = capture(process.stderr, () => logger.error('Unhandled server error', { error: 'boom' }));
  const entry = JSON.parse(output.trim());
  assert.equal(entry.level, 'error');
  assert.equal(entry.error, 'boom');
});
