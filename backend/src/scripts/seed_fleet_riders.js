const db = require('../config/db');

async function seedFleet() {
  console.log('--- SEEDING COURIER COMPANIES & FLEET RIDERS ---');

  // 1. Seed or retrieve courier companies
  const companyUser1 = 'a0000000-0000-0000-0000-000000000002'; // admin user as owner placeholder
  
  const comp1Res = await db.query(`
    INSERT INTO courier_companies (id, user_id, company_name, cac_number, postal_licence_number, contact_person, fleet_size, status)
    VALUES ('e0000000-0000-0000-0000-000000000001', $1, 'GIG Logistics Partner Fleet', 'CAC-RC-1849204', 'NIPOST/CL/2024/089', 'Kelechi Nwosu', 45, 'licensed')
    ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name
    RETURNING id
  `, [companyUser1]);

  const comp2Res = await db.query(`
    INSERT INTO courier_companies (id, user_id, company_name, cac_number, postal_licence_number, contact_person, fleet_size, status)
    VALUES ('e0000000-0000-0000-0000-000000000002', $1, 'Red Star Express Corporate Fleet', 'CAC-RC-2910482', 'NIPOST/CL/2023/042', 'Babajide Adeleke', 80, 'licensed')
    ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name
    RETURNING id
  `, [companyUser1]);

  // 2. Update existing rider Musa Danladi with official NDAPS postcodes
  await db.query(`
    UPDATE riders 
    SET operational_postcodes = ARRAY['FC-01-A03-FK-01', 'FC-01-A02-FK-02', 'FC-01-B04-GR-01'],
        updated_at = NOW()
    WHERE id = 'c0000000-0000-0000-0000-000000000001'
  `);

  // 3. Define new couriers to seed
  const couriers = [
    {
      userId: 'a0000000-0000-0000-0000-000000000011',
      riderId: 'c0000000-0000-0000-0000-000000000002',
      name: 'Chinedu Okafor',
      phone: '+2348021112233',
      email: 'chinedu.okafor@giglogistics.ng',
      courierId: 'e0000000-0000-0000-0000-000000000001',
      vehicleType: 'motorcycle',
      plateNumber: 'KJA-719-LK',
      licenseNo: 'DL-99120481-LA',
      nin: 'NIN-88291024510',
      postcodes: ['LA-01-B02-IK-01', 'LA-01-B03-VI-02'],
      isActive: true,
      isAvailable: true,
      rating: 4.88,
      deliveries: 215,
      status: 'verified',
      balanceNgn: 45200.00
    },
    {
      userId: 'a0000000-0000-0000-0000-000000000012',
      riderId: 'c0000000-0000-0000-0000-000000000003',
      name: 'Bello Aliyu',
      phone: '+2348039998877',
      email: 'bello.aliyu@redstar.ng',
      courierId: 'e0000000-0000-0000-0000-000000000002',
      vehicleType: 'van',
      plateNumber: 'ABJ-821-XP',
      licenseNo: 'DL-77382910-ABJ',
      nin: 'NIN-55481920394',
      postcodes: ['FC-01-A03-FK-01', 'FC-01-C05-JB-01'],
      isActive: true,
      isAvailable: true,
      rating: 4.92,
      deliveries: 489,
      status: 'verified',
      balanceNgn: 89500.00
    },
    {
      userId: 'a0000000-0000-0000-0000-000000000013',
      riderId: 'c0000000-0000-0000-0000-000000000004',
      name: 'Emeka Ani',
      phone: '+2348074445566',
      email: 'emeka.ani@dropboxz.ng',
      courierId: null, // Independent
      vehicleType: 'bicycle',
      plateNumber: 'ECO-012-BY',
      licenseNo: 'DL-33910284-FC',
      nin: 'NIN-11294820193',
      postcodes: ['FC-01-A03-FK-01'],
      isActive: true,
      isAvailable: false, // Currently executing delivery
      rating: 4.75,
      deliveries: 94,
      status: 'verified',
      balanceNgn: 18400.00
    },
    {
      userId: 'a0000000-0000-0000-0000-000000000014',
      riderId: 'c0000000-0000-0000-0000-000000000005',
      name: 'Fatima Garba',
      phone: '+2348123334455',
      email: 'fatima.garba@courier.ng',
      courierId: null, // Independent
      vehicleType: 'van',
      plateNumber: 'KNO-338-TR',
      licenseNo: 'DL-55291039-KN',
      nin: 'NIN-77381920481',
      postcodes: ['KN-01-A01-DL-01'],
      isActive: false,
      isAvailable: false,
      rating: 5.00,
      deliveries: 0,
      status: 'pending', // Pending Track B
      balanceNgn: 0.00
    },
    {
      userId: 'a0000000-0000-0000-0000-000000000015',
      riderId: 'c0000000-0000-0000-0000-000000000006',
      name: 'Olawale Sanni',
      phone: '+2348086667788',
      email: 'olawale.sanni@giglogistics.ng',
      courierId: 'e0000000-0000-0000-0000-000000000001',
      vehicleType: 'truck',
      plateNumber: 'LAG-552-ZZ',
      licenseNo: 'DL-11284920-LA',
      nin: 'NIN-66291039482',
      postcodes: ['LA-01-B02-IK-01'],
      isActive: false,
      isAvailable: false,
      rating: 4.60,
      deliveries: 156,
      status: 'suspended', // License expired
      balanceNgn: 31200.00
    }
  ];

  for (const c of couriers) {
    // Upsert User
    await db.query(`
      INSERT INTO users (id, phone, name, email, role, is_phone_verified, is_email_verified)
      VALUES ($1, $2, $3, $4, 'rider', TRUE, TRUE)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email
    `, [c.userId, c.phone, c.name, c.email]);

    // Upsert Rider
    await db.query(`
      INSERT INTO riders (
        id, user_id, courier_id, vehicle_type, plate_number, drivers_license_no,
        nin, operational_postcodes, is_active, is_available, rating, total_deliveries, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        courier_id = EXCLUDED.courier_id,
        vehicle_type = EXCLUDED.vehicle_type,
        plate_number = EXCLUDED.plate_number,
        drivers_license_no = EXCLUDED.drivers_license_no,
        nin = EXCLUDED.nin,
        operational_postcodes = EXCLUDED.operational_postcodes,
        is_active = EXCLUDED.is_active,
        is_available = EXCLUDED.is_available,
        rating = EXCLUDED.rating,
        total_deliveries = EXCLUDED.total_deliveries,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [
      c.riderId, c.userId, c.courierId, c.vehicleType, c.plateNumber, c.licenseNo,
      c.nin, c.postcodes, c.isActive, c.isAvailable, c.rating, c.deliveries, c.status
    ]);

    // Upsert Wallet
    await db.query(`
      INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn, currency)
      VALUES ($1, $2, $2, 'NGN')
      ON CONFLICT (user_id) DO UPDATE SET
        balance_ngn = EXCLUDED.balance_ngn,
        ledger_balance_ngn = EXCLUDED.ledger_balance_ngn
    `, [c.userId, c.balanceNgn]);

    // Upsert Track B Verification Record
    const verStatus = c.status === 'verified' ? 'APPROVED' : c.status === 'suspended' ? 'REJECTED' : 'PENDING';
    await db.query(`
      INSERT INTO verification_records (
        entity_type, entity_id, track, status, document_type, document_number,
        reviewed_by, reviewed_at
      ) VALUES (
        'rider', $1, 'TRACK_B_REGULATORY', $2, 'DRIVERS_LICENSE', $3,
        'a0000000-0000-0000-0000-000000000002', NOW()
      )
      ON CONFLICT DO NOTHING
    `, [c.riderId, verStatus, c.licenseNo]);
  }

  // 4. Assign an active parcel to Emeka Ani (c0000000-0000-0000-0000-000000000004) to demonstrate active custody
  await db.query(`
    UPDATE shipments 
    SET assigned_rider_id = 'c0000000-0000-0000-0000-000000000004',
        status = 'IN_TRANSIT_TO_HUB',
        updated_at = NOW()
    WHERE id = (
      SELECT id FROM shipments 
      WHERE status IN ('IN_TRANSIT_TO_HUB', 'BOOKED') 
      LIMIT 1
    )
  `);

  console.log('✅ Successfully seeded courier companies, diverse fleet classes, and NDAPS zones.');
  process.exit(0);
}

seedFleet().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
