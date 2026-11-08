const { test, after } = require('node:test');
const assert = require('node:assert/strict');

const db = require('../../src/config/db');
const { calculateDistanceKm, rankHubs } = require('../../src/services/rankingService');

const originalQuery = db.query;

after(() => {
  db.query = originalQuery;
});

test('calculateDistanceKm returns zero for identical coordinates', () => {
  assert.equal(calculateDistanceKm(6.5244, 3.3792, 6.5244, 3.3792), 0);
});

test('calculateDistanceKm returns roughly 111 km per degree of longitude at the equator', () => {
  const distance = calculateDistanceKm(0, 0, 0, 1);
  assert.ok(Math.abs(distance - 111.19) < 1, `expected ~111.19 km, got ${distance}`);
});

test('calculateDistanceKm is symmetric', () => {
  const forward = calculateDistanceKm(6.5244, 3.3792, 9.0765, 7.4836);
  const backward = calculateDistanceKm(9.0765, 7.4836, 6.5244, 3.3792);
  assert.equal(forward, backward);
});

test('rankHubs filters hubs outside the radius and ranks by composite score', async () => {
  db.query = async () => ({
    rows: [
      {
        id: 'hub-far',
        lat: '0',
        lng: '1',
        capacity: 10,
        current_load: 5,
        rating: '5.0',
        postcode: 'AB-02-B04-GH-02',
        status: 'verified',
        is_accepting_parcels: true,
        available_slots: 5,
        owner_name: 'Far Host'
      },
      {
        id: 'hub-near',
        lat: '0',
        lng: '0',
        capacity: 10,
        current_load: 5,
        rating: '5.0',
        postcode: 'FC-01-A03-FK-01',
        status: 'verified',
        is_accepting_parcels: true,
        available_slots: 5,
        owner_name: 'Near Host'
      }
    ]
  });

  const ranked = await rankHubs({
    userLat: 0,
    userLng: 0,
    targetPostcode: 'FC-01-A03-FK-01',
    maxRadiusKm: 25
  });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, 'hub-near');
  assert.equal(ranked[0].distanceKm, 0);
  assert.equal(ranked[0].isFullyLoaded, false);
  assert.equal(ranked[0].compositeScore, 100);
});

test('rankHubs sorts higher-scoring hubs first', async () => {
  db.query = async () => ({
    rows: [
      {
        id: 'hub-b',
        lat: '0',
        lng: '0.05',
        capacity: 10,
        current_load: 5,
        rating: '5.0',
        postcode: 'AB-02-B04-GH-02',
        status: 'verified',
        is_accepting_parcels: true,
        available_slots: 5,
        owner_name: 'Host B'
      },
      {
        id: 'hub-a',
        lat: '0',
        lng: '0',
        capacity: 10,
        current_load: 0,
        rating: '5.0',
        postcode: 'FC-01-A03-FK-01',
        status: 'verified',
        is_accepting_parcels: true,
        available_slots: 10,
        owner_name: 'Host A'
      }
    ]
  });

  const ranked = await rankHubs({
    userLat: 0,
    userLng: 0,
    targetPostcode: 'FC-01-A03-FK-01',
    maxRadiusKm: 25
  });

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].id, 'hub-a');
  assert.ok(ranked[0].compositeScore > ranked[1].compositeScore);
});
