const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../config/db');

const SEEDED_NDAPS = [
  {
    ndaps: 'FC-01-A03-FK-01',
    compact: 'FC01A03FK01',
    legacy: '900211',
    state: 'Federal Capital Territory',
    stateCode: 'FC',
    lga: 'Abuja Municipal',
    district: 'Wuse',
    neighbourhood: 'Wuse 2',
    description: 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja',
    zone: 'NORTH CENTRAL',
    lat: 9.07650000,
    lng: 7.49850000
  },
  {
    ndaps: 'FC-01-A02-FK-02',
    compact: 'FC01A02FK02',
    legacy: '900241',
    state: 'Federal Capital Territory',
    stateCode: 'FC',
    lga: 'Abuja Municipal',
    district: 'Jabi',
    neighbourhood: 'Jabi District',
    description: 'Suite B12, Jabi Lake Mall, Jabi, Abuja',
    zone: 'NORTH CENTRAL',
    lat: 9.08200000,
    lng: 7.44100000
  },
  {
    ndaps: 'FC-01-A01-FK-03',
    compact: 'FC01A01FK03',
    legacy: '900221',
    state: 'Federal Capital Territory',
    stateCode: 'FC',
    lga: 'Abuja Municipal',
    district: 'Garki',
    neighbourhood: 'Garki Area 1',
    description: 'Block 3, Area 1 Shopping Complex, Garki, Abuja',
    zone: 'NORTH CENTRAL',
    lat: 9.06500000,
    lng: 7.48200000
  },
  {
    ndaps: 'FC-01-A04-FK-04',
    compact: 'FC01A04FK04',
    legacy: '900108',
    state: 'Federal Capital Territory',
    stateCode: 'FC',
    lga: 'Abuja Municipal',
    district: 'Central Area',
    neighbourhood: 'Central Business District',
    description: 'Churchgate Towers, Central Business District, Abuja',
    zone: 'NORTH CENTRAL',
    lat: 9.05790000,
    lng: 7.49510000
  },
  {
    ndaps: 'FC-01-A05-FK-05',
    compact: 'FC01A05FK05',
    legacy: '900271',
    state: 'Federal Capital Territory',
    stateCode: 'FC',
    lga: 'Abuja Municipal',
    district: 'Maitama',
    neighbourhood: 'Maitama District',
    description: '5 Amazon Street, Maitama District, Abuja',
    zone: 'NORTH CENTRAL',
    lat: 9.08820000,
    lng: 7.49340000
  },
  {
    ndaps: 'EK-01-A03-FK-01',
    compact: 'EK01A03FK01',
    legacy: '360101',
    state: 'Ekiti',
    stateCode: 'EK',
    lga: 'Ado Ekiti',
    district: 'Ado Ekiti',
    neighbourhood: 'Ado Ekiti Central',
    description: 'NTA Road, Back of Fabian Hotel, Ado Ekiti',
    zone: 'SOUTH WEST',
    lat: 7.62110000,
    lng: 5.22140000
  },
  {
    ndaps: 'LA-01-A01-AA-01',
    compact: 'LA01A01AA01',
    legacy: '101233',
    state: 'Lagos',
    stateCode: 'LA',
    lga: 'Eti-Osa',
    district: 'Victoria Island',
    neighbourhood: 'Victoria Island',
    description: 'Adeola Odeku Street, Victoria Island, Lagos',
    zone: 'SOUTH WEST',
    lat: 6.45410000,
    lng: 3.42470000
  },
  {
    ndaps: 'LA-02-A02-BB-02',
    compact: 'LA02A02BB02',
    legacy: '100252',
    state: 'Lagos',
    stateCode: 'LA',
    lga: 'Ikeja',
    district: 'Ikeja',
    neighbourhood: 'Allen Avenue',
    description: 'Allen Avenue, Ikeja, Lagos',
    zone: 'SOUTH WEST',
    lat: 6.52440000,
    lng: 3.37920000
  },
  {
    ndaps: 'LA-01-A03-CC-03',
    compact: 'LA01A03CC03',
    legacy: '101241',
    state: 'Lagos',
    stateCode: 'LA',
    lga: 'Eti-Osa',
    district: 'Lekki',
    neighbourhood: 'Lekki Phase 1',
    description: 'Admiralty Way, Lekki Phase 1, Lagos',
    zone: 'SOUTH WEST',
    lat: 6.44740000,
    lng: 3.47310000
  },
  {
    ndaps: 'RV-01-A01-DD-01',
    compact: 'RV01A01DD01',
    legacy: '500272',
    state: 'Rivers',
    stateCode: 'RV',
    lga: 'Port Harcourt',
    district: 'Old GRA',
    neighbourhood: 'Old GRA',
    description: 'Forces Avenue, Old GRA, Port Harcourt',
    zone: 'SOUTH SOUTH',
    lat: 4.81560000,
    lng: 7.01280000
  },
  {
    ndaps: 'KN-01-A01-EE-01',
    compact: 'KN01A01EE01',
    legacy: '700211',
    state: 'Kano',
    stateCode: 'KN',
    lga: 'Nassarawa',
    district: 'Nassarawa GRA',
    neighbourhood: 'Nassarawa GRA',
    description: 'Bompai Road, Nassarawa GRA, Kano',
    zone: 'NORTH WEST',
    lat: 12.00220000,
    lng: 8.59200000
  },
  {
    ndaps: 'OY-01-A01-FF-01',
    compact: 'OY01A01FF01',
    legacy: '200211',
    state: 'Oyo',
    stateCode: 'OY',
    lga: 'Ibadan North',
    district: 'Bodija',
    neighbourhood: 'Bodija Estate',
    description: 'Bodija Estate, Ibadan North, Oyo',
    zone: 'SOUTH WEST',
    lat: 7.42460000,
    lng: 3.90560000
  }
];

async function seed() {
  try {
    console.log('Ensuring NDAPS schema columns on postcode_cache...');
    await db.query(`
      ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS ndaps_code VARCHAR(25);
      ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS legacy_code VARCHAR(20);
      ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS zone VARCHAR(50);
    `);

    for (const item of SEEDED_NDAPS) {
      // 1. Insert/Update formatted NDAPS code
      await db.query(`
        INSERT INTO postcode_cache (postcode, state, lga, district, neighbourhood, description, lat, lng, source, ndaps_code, legacy_code, zone, fetched_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NIPOST_NDAPS', $1, $9, $10, NOW())
        ON CONFLICT (postcode) DO UPDATE SET
          state = EXCLUDED.state,
          lga = EXCLUDED.lga,
          district = EXCLUDED.district,
          neighbourhood = EXCLUDED.neighbourhood,
          description = EXCLUDED.description,
          ndaps_code = EXCLUDED.ndaps_code,
          legacy_code = EXCLUDED.legacy_code,
          zone = EXCLUDED.zone;
      `, [item.ndaps, item.state, item.lga, item.district, item.neighbourhood, item.description, item.lat, item.lng, item.legacy, item.zone]);

      // 2. Insert/Update compact NDAPS code
      await db.query(`
        INSERT INTO postcode_cache (postcode, state, lga, district, neighbourhood, description, lat, lng, source, ndaps_code, legacy_code, zone, fetched_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NIPOST_NDAPS_COMPACT', $9, $10, $11, NOW())
        ON CONFLICT (postcode) DO UPDATE SET
          state = EXCLUDED.state,
          lga = EXCLUDED.lga,
          district = EXCLUDED.district,
          neighbourhood = EXCLUDED.neighbourhood,
          description = EXCLUDED.description,
          ndaps_code = EXCLUDED.ndaps_code,
          legacy_code = EXCLUDED.legacy_code,
          zone = EXCLUDED.zone;
      `, [item.compact, item.state, item.lga, item.district, item.neighbourhood, item.description, item.lat, item.lng, item.ndaps, item.legacy, item.zone]);

      // 3. Update legacy 6-digit postcode with NDAPS mapping
      if (item.legacy) {
        await db.query(`
          INSERT INTO postcode_cache (postcode, state, lga, district, neighbourhood, description, lat, lng, source, ndaps_code, legacy_code, zone, fetched_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NIPOST_LEGACY', $9, $1, $10, NOW())
          ON CONFLICT (postcode) DO UPDATE SET
            ndaps_code = EXCLUDED.ndaps_code,
            legacy_code = EXCLUDED.legacy_code,
            zone = EXCLUDED.zone;
        `, [item.legacy, item.state, item.lga, item.district, item.neighbourhood, item.description, item.lat, item.lng, item.ndaps, item.zone]);
      }
    }

    console.log(`Successfully seeded ${SEEDED_NDAPS.length} NDAPS postcode records!`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
