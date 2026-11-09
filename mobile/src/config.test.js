const { test } = require('node:test');
const assert = require('node:assert/strict');

test('config uses EXPO_PUBLIC_API_BASE and strips a trailing slash', () => {
  process.env.EXPO_PUBLIC_API_BASE = 'https://api.example.com/api/v1/';
  delete require.cache[require.resolve('./config')];
  const { API_BASE } = require('./config');
  assert.equal(API_BASE, 'https://api.example.com/api/v1');
});

test('config falls back to localhost', () => {
  delete process.env.EXPO_PUBLIC_API_BASE;
  delete require.cache[require.resolve('./config')];
  const { API_BASE } = require('./config');
  assert.equal(API_BASE, 'http://localhost:5000/api/v1');
});
