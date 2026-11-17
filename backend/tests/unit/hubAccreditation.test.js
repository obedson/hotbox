process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFormData,
  validateForSubmit,
  provisionBays
} = require('../../src/routes/hubApplications');

test('buildFormData keeps only known fields and drops empty values', () => {
  const form = buildFormData({
    businessName: 'Wuse 2 Express Mart',
    postcode: 'FC-01-A03-FK-01',
    capacity: 60,
    notes: '',
    injected: 'nope'
  });

  assert.equal(form.businessName, 'Wuse 2 Express Mart');
  assert.equal(form.postcode, 'FC-01-A03-FK-01');
  assert.equal(form.capacity, 60);
  assert.equal(Object.prototype.hasOwnProperty.call(form, 'notes'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(form, 'injected'), false);
});

test('validateForSubmit requires the identity and premises fields', () => {
  const error = validateForSubmit({ businessName: 'Hub', postcode: 'FC-01-A03-FK-01' });
  assert.match(error, /addressText/);
});

test('validateForSubmit accepts a complete application', () => {
  const error = validateForSubmit({
    businessName: 'Hub',
    postcode: 'FC-01-A03-FK-01',
    addressText: 'Plot 10 Emeka Anyaoku Street',
    capacity: 60
  });
  assert.equal(error, null);
});

test('validateForSubmit rejects a non-positive capacity and bad coordinates', () => {
  const base = { businessName: 'Hub', postcode: 'FC-01', addressText: 'Street' };
  assert.match(validateForSubmit({ ...base, capacity: 0 }), /Capacity/);
  assert.match(validateForSubmit({ ...base, capacity: 'abc' }), /Capacity/);
  assert.match(validateForSubmit({ ...base, lat: 'north' }), /Latitude/);
  assert.match(validateForSubmit({ ...base, lng: 'east' }), /Longitude/);
});

test('provisionBays scales with capacity and never exceeds the bay ceiling', async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql, params });
      return Promise.resolve({ rows: [] });
    }
  };

  await provisionBays(client, 'hub-1', 60);
  assert.equal(calls.length, 5);
  assert.equal(calls[0].params[1], 'BAY-01');
  assert.equal(calls[0].params[2], 'small');
  assert.equal(calls[1].params[2], 'medium');
  assert.equal(calls[2].params[2], 'large');
  assert.equal(calls[3].params[2], 'small');
  assert.equal(calls[4].params[2], 'medium');
  assert.match(calls[0].sql, /ON CONFLICT/);

  calls.length = 0;
  await provisionBays(client, 'hub-1', 5000);
  assert.equal(calls.length, 40);
  assert.equal(calls[calls.length - 1].params[1], 'BAY-40');
});

test('provisionBays keeps a minimum number of bays for very small hubs', async () => {
  const calls = [];
  const client = { query: (sql, params) => { calls.push(params); return Promise.resolve({ rows: [] }); } };

  await provisionBays(client, 'hub-1', 1);
  assert.equal(calls.length, 5);
});