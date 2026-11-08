const dns = require('dns');
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
const db = require('../config/db');

async function seedNdapsHubs() {
  console.log('--- SEEDING & MIGRATING HUBS TO NDAPS STANDARD ---');

  // Hub owner user IDs
  const ownerIbrahim = 'a0000000-0000-0000-0000-000000000003';
  const ownerChidi = 'a0000000-0000-0000-0000-000000000004';
  const ownerAmina = 'a0000000-0000-0000-0000-000000000007';

  // Ensure owner Amina exists as hub_owner
  await db.query(`
    INSERT INTO users (id, phone, name, email, role, is_phone_verified, is_email_verified)
    VALUES ($1, '+2348033334445', 'Amina Bello', 'amina.bello@dropboxz.ng', 'hub_owner', TRUE, TRUE)
    ON CONFLICT (id) DO UPDATE SET role = 'hub_owner'
  `, [ownerAmina]);

  const hubs = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      ownerId: ownerIbrahim,
      name: 'Wuse 2 Express Mart & Hub',
      cac: 'CAC-BN-2918402',
      phone: '+2348031112223',
      email: 'wuse2.hub@dropboxz.ng',
      postcode: 'FC-01-A03-FK-01',
      addressText: 'Plot 10 Emeka Anyaoku Street, Wuse 2, Abuja',
      neighbourhood: 'Wuse 2',
      lga: 'Abuja Municipal',
      state: 'Federal Capital Territory',
      lat: 9.0765,
      lng: 7.4985,
      hours: '08:00 - 20:00',
      capacity: 60,
      currentLoad: 12,
      status: 'accredited',
      rating: 4.85,
      security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage', 'burglar_proof']),
      accepting: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      ownerId: ownerChidi,
      name: 'Banex Plaza Gadgets & Hub',
      cac: 'CAC-BN-1849201',
      phone: '+2348034445566',
      email: 'banex.hub@dropboxz.ng',
      postcode: 'FC-01-A02-FK-02',
      addressText: 'Suite B12, Banex Plaza, Aminu Kano Crescent, Wuse 2',
      neighbourhood: 'Wuse 2',
      lga: 'Abuja Municipal',
      state: 'Federal Capital Territory',
      lat: 9.0820,
      lng: 7.4790,
      hours: '09:00 - 19:30',
      capacity: 40,
      currentLoad: 8,
      status: 'accredited',
      rating: 4.90,
      security: JSON.stringify(['cctv', 'locked_storage', 'fire_extinguisher']),
      accepting: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000003',
      ownerId: ownerAmina,
      name: 'Jabi Lakeside Community Hub',
      cac: 'CAC-BN-3920184',
      phone: '+2348033334445',
      email: 'jabi.hub@dropboxz.ng',
      postcode: 'FC-01-C05-JB-01',
      addressText: 'Plot 224 Jabi Lake Boulevard, Jabi District',
      neighbourhood: 'Jabi',
      lga: 'Abuja Municipal',
      state: 'Federal Capital Territory',
      lat: 9.0680,
      lng: 7.4250,
      hours: '08:00 - 21:00',
      capacity: 100,
      currentLoad: 35,
      status: 'accredited',
      rating: 4.70,
      security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage']),
      accepting: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000004',
      ownerId: ownerIbrahim,
      name: 'Garki Area 1 Pickup Kiosk',
      cac: 'CAC-BN-4910283',
      phone: '+2348031112223',
      email: 'garki.hub@dropboxz.ng',
      postcode: 'FC-01-B04-GR-01',
      addressText: 'Block 4 Commercial Layout, Area 1, Garki',
      neighbourhood: 'Garki',
      lga: 'Abuja Municipal',
      state: 'Federal Capital Territory',
      lat: 9.0340,
      lng: 7.4890,
      hours: '08:30 - 18:30',
      capacity: 50,
      currentLoad: 20,
      status: 'accredited',
      rating: 4.60,
      security: JSON.stringify(['locked_storage', 'fire_extinguisher']),
      accepting: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000005',
      ownerId: ownerChidi,
      name: 'CBD Central Logistics Vault',
      cac: 'CAC-BN-5510294',
      phone: '+2348034445566',
      email: 'cbd.hub@dropboxz.ng',
      postcode: 'FC-01-A01-CB-01',
      addressText: 'Ground Floor, Constitution Avenue, Central Business District',
      neighbourhood: 'Central District',
      lga: 'Abuja Municipal',
      state: 'Federal Capital Territory',
      lat: 9.0550,
      lng: 7.4950,
      hours: '07:30 - 20:30',
      capacity: 80,
      currentLoad: 42,
      status: 'accredited',
      rating: 4.95,
      security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage', 'biometric_access']),
      accepting: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000006',
      ownerId: ownerChidi,
      name: 'Ikeja City Express Logistics Hub',
      cac: 'CAC-BN-8829104',
      phone: '+2348029991122',
      email: 'ikeja.hub@dropboxz.ng',
      postcode: 'LA-01-B02-IK-01',
      addressText: '14 Obafemi Awolowo Way, Alausa, Ikeja',
      neighbourhood: 'Alausa',
      lga: 'Ikeja',
      state: 'Lagos',
      lat: 6.6018,
      lng: 3.3515,
      hours: '08:00 - 21:00',
      capacity: 50,
      currentLoad: 43, // 86% utilized -> triggers Near Capacity alert
      status: 'accredited',
      rating: 4.88,
      security: JSON.stringify(['cctv', 'fire_extinguisher', 'locked_storage']),
      accepting: true
    },
    {
      id: 'b0000000-0000-0000-0000-000000000007',
      ownerId: ownerAmina,
      name: 'Victoria Island Tech Mart Hub',
      cac: 'CAC-BN-9920184',
      phone: '+2348033334445',
      email: 'vi.hub@dropboxz.ng',
      postcode: 'LA-01-B03-VI-02',
      addressText: 'Plot 42 Ahmadu Bello Way, Victoria Island',
      neighbourhood: 'Victoria Island',
      lga: 'Eti-Osa',
      state: 'Lagos',
      lat: 6.4281,
      lng: 3.4219,
      hours: '09:00 - 19:00',
      capacity: 40,
      currentLoad: 0,
      status: 'pending', // Pending Track C accreditation space vetting
      rating: 5.00,
      security: JSON.stringify(['cctv', 'locked_storage']),
      accepting: false
    }
  ];

  for (const h of hubs) {
    await db.query(`
      INSERT INTO hubs (
        id, owner_id, business_name, cac_number, phone, email, postcode,
        address_text, neighbourhood, lga, state, lat, lng, opening_hours,
        capacity, current_load, status, rating, security_features, is_accepting_parcels
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        cac_number = EXCLUDED.cac_number,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        postcode = EXCLUDED.postcode,
        address_text = EXCLUDED.address_text,
        neighbourhood = EXCLUDED.neighbourhood,
        lga = EXCLUDED.lga,
        state = EXCLUDED.state,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        opening_hours = EXCLUDED.opening_hours,
        capacity = EXCLUDED.capacity,
        current_load = EXCLUDED.current_load,
        status = EXCLUDED.status,
        rating = EXCLUDED.rating,
        security_features = EXCLUDED.security_features,
        is_accepting_parcels = EXCLUDED.is_accepting_parcels,
        updated_at = NOW()
    `, [
      h.id, h.ownerId, h.name, h.cac, h.phone, h.email, h.postcode,
      h.addressText, h.neighbourhood, h.lga, h.state, h.lat, h.lng, h.hours,
      h.capacity, h.currentLoad, h.status, h.rating, h.security, h.accepting
    ]);

    // Seed 5 compartmentalized bays for this hub: BAY-A01 to BAY-A05
    const bayTiers = ['small', 'medium', 'medium', 'large', 'large'];
    for (let b = 1; b <= 5; b++) {
      const bayCode = `BAY-A0${b}`;
      const isOccupied = (b === 1 && h.currentLoad > 0);
      await db.query(`
        INSERT INTO hub_storage_bays (hub_id, bay_code, size_tier, is_occupied)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (hub_id, bay_code) DO UPDATE SET
          size_tier = EXCLUDED.size_tier,
          is_occupied = EXCLUDED.is_occupied
      `, [h.id, bayCode, bayTiers[b - 1], isOccupied]);
    }

    // Seed Track C Accreditation record
    const accStatus = h.status === 'accredited' ? 'APPROVED' : 'PENDING';
    await db.query(`
      INSERT INTO verification_records (
        entity_type, entity_id, track, status, document_type, document_number,
        reviewed_by, reviewed_at
      ) VALUES (
        'hub', $1, 'TRACK_C_ACCREDITATION', $2, 'PREMISES_INSPECTION', $3,
        'a0000000-0000-0000-0000-000000000002', NOW()
      )
      ON CONFLICT DO NOTHING
    `, [h.id, accStatus, h.cac]);
  }

  // Also seed hub staff attendants
  await db.query(`
    INSERT INTO hub_staff (hub_id, user_id, role, is_active)
    VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'manager', TRUE)
    ON CONFLICT (hub_id, user_id) DO NOTHING
  `);

  console.log('✅ Successfully seeded hubs with official NDAPS postcodes, storage bays, and Track C records.');
  process.exit(0);
}

seedNdapsHubs().catch(err => {
  console.error('Hub seed error:', err);
  process.exit(1);
});
