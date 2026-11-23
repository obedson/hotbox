-- HOTBOX MASTER DATABASE SCHEMA & MIGRATION
-- Supports:
-- 1. All 11 platform roles
-- 2. Postcode-First Address Infrastructure (PostGIS enabled)
-- 3. Three Distinct Approval Tracks (Track A: Address, Track B: Regulatory, Track C: Accreditation)
-- 4. Hub Network & Bay Management
-- 5. Rider & Courier Operations
-- 6. Comprehensive Shipment Lifecycle & State Machine
-- 7. Immutable Custody Transfer Ledger
-- 8. Wallets, Transactions, & Escrow Financials
-- 9. Claims, Disputes & Support
-- 10. Enterprise API & Webhooks
-- 11. Notifications & Audit Logs

-- CONNECTION MODEL: the backend uses a single service-role connection
-- (DATABASE_URL). Row-level security is intentionally not enabled; routes
-- scope every query by the authenticated user. See
-- docs/database-operations.md for the full rationale and production
-- recommendations before exposing the database beyond the API.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. USERS & IDENTITY (11 Roles Supported + Legacy Aliases)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(25) NOT NULL UNIQUE,
  email VARCHAR(120) UNIQUE,
  password_hash VARCHAR(255),
  avatar_url TEXT,
  status VARCHAR(25) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(25) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Safely update role check constraint on users if it already exists
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
    'customer',
    'hub_owner',
    'hub_staff',
    'rider',
    'courier_company',
    'enterprise_shipper',
    'ops_admin',
    'compliance_officer',
    'finance_officer',
    'support_agent',
    'nipost_verifier',
    'super_admin',
    -- Legacy aliases for backward compatibility
    'host',
    'courier',
    'admin'
  ));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets (user_id);

-- ----------------------------------------------------------------------------
-- 2. ADDRESSES & POSTCODE INFRASTRUCTURE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS postcode_cache (
  postcode VARCHAR(20) PRIMARY KEY,
  state VARCHAR(50),
  lga VARCHAR(80),
  district VARCHAR(100),
  neighbourhood VARCHAR(120),
  description TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  source VARCHAR(50) DEFAULT 'NIPOST_DIGITAL_POSTCODE',
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist on postcode_cache if table was pre-existing
ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS lga VARCHAR(80);
ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS neighbourhood VARCHAR(120);
ALTER TABLE postcode_cache ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'NIPOST_DIGITAL_POSTCODE';

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  address_type VARCHAR(20) NOT NULL DEFAULT 'residential' CHECK (address_type IN ('residential', 'business', 'hub', 'delivery', 'dispatch')),
  postcode VARCHAR(20) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(80) NOT NULL,
  area_neighbourhood VARCHAR(120),
  street_address TEXT NOT NULL,
  building_number VARCHAR(50),
  landmark VARCHAR(120),
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_source VARCHAR(50) DEFAULT 'USER_INPUT',
  verified_at TIMESTAMP WITH TIME ZONE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_postcode ON addresses(postcode);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- Drop legacy tables if migrating to the authoritative hubs, shipments, and custody tables
DROP TABLE IF EXISTS parcel_events CASCADE;
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS hosts CASCADE;

-- ----------------------------------------------------------------------------
-- 3. HUBS NETWORK & STORAGE BAYS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  business_name VARCHAR(160) NOT NULL,
  cac_number VARCHAR(50),
  phone VARCHAR(25) NOT NULL,
  email VARCHAR(120),
  postcode VARCHAR(20) NOT NULL,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  address_text TEXT NOT NULL,
  neighbourhood VARCHAR(120) NOT NULL,
  lga VARCHAR(80) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  opening_hours VARCHAR(100) DEFAULT '08:00 - 20:00',
  capacity INT NOT NULL DEFAULT 50,
  current_load INT NOT NULL DEFAULT 0,
  status VARCHAR(25) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accredited', 'verified', 'suspended', 'inactive')),
  rating DECIMAL(3, 2) DEFAULT 5.00,
  total_ratings INT DEFAULT 0,
  security_features JSONB DEFAULT '["cctv", "fire_extinguisher", "locked_storage"]'::jsonb,
  is_accepting_parcels BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hubs_postcode ON hubs(postcode);
CREATE INDEX IF NOT EXISTS idx_hubs_status ON hubs(status);
CREATE INDEX IF NOT EXISTS idx_hubs_lat_lng ON hubs(lat, lng);

-- Storage bay compartmentalization for Hubs
CREATE TABLE IF NOT EXISTS hub_storage_bays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  bay_code VARCHAR(20) NOT NULL,
  size_tier VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (size_tier IN ('small', 'medium', 'large')),
  is_occupied BOOLEAN DEFAULT FALSE,
  current_shipment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hub_id, bay_code)
);

CREATE TABLE IF NOT EXISTS hub_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'attendant' CHECK (role IN ('manager', 'attendant')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hub_id, user_id)
);

-- Backward compatibility view for legacy 'hosts' table
CREATE OR REPLACE VIEW hosts AS
  SELECT 
    id,
    owner_id AS user_id,
    business_name,
    cac_number,
    phone,
    postcode,
    address_text AS address,
    neighbourhood,
    lat,
    lng,
    opening_hours,
    capacity,
    current_load,
    status,
    rating,
    created_at
  FROM hubs;

-- ----------------------------------------------------------------------------
-- 4. RIDERS & COURIER FLEETS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courier_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(150) NOT NULL,
  cac_number VARCHAR(50) NOT NULL,
  postal_licence_number VARCHAR(80),
  contact_person VARCHAR(100),
  fleet_size INT DEFAULT 1,
  status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'licensed', 'verified', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES courier_companies(id) ON DELETE SET NULL,
  vehicle_type VARCHAR(20) NOT NULL DEFAULT 'motorcycle' CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'van', 'truck')),
  plate_number VARCHAR(30),
  drivers_license_no VARCHAR(50),
  nin VARCHAR(30),
  operational_postcodes TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  rating DECIMAL(3, 2) DEFAULT 5.00,
  total_deliveries INT DEFAULT 0,
  status VARCHAR(25) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_riders_user_id ON riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_status ON riders(status);

-- ----------------------------------------------------------------------------
-- 5. THREE DISTINCT VERIFICATION TRACKS (Audit & Compliance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('user', 'hub', 'rider', 'courier')),
  entity_id UUID NOT NULL,
  track VARCHAR(30) NOT NULL CHECK (track IN ('TRACK_A_ADDRESS', 'TRACK_B_REGULATORY', 'TRACK_C_ACCREDITATION')),
  document_type VARCHAR(40) NOT NULL CHECK (document_type IN (
    'NIN',
    'CAC_CERTIFICATE',
    'DRIVERS_LICENSE',
    'VEHICLE_ROADWORTHINESS',
    'COURIER_LICENCE',
    'PROOF_OF_ADDRESS',
    'HUB_SPACE_PHOTOS',
    'PHYSICAL_INSPECTION_REPORT',
    'SECURITY_DEPOSIT'
  )),
  document_number VARCHAR(80),
  document_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_verification_entity ON verification_records(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_records(status);

-- ----------------------------------------------------------------------------
-- 6. SHIPMENTS & LIFECYCLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code VARCHAR(35) UNIQUE NOT NULL,
  service_type VARCHAR(30) NOT NULL DEFAULT 'DOOR_TO_HUB' CHECK (service_type IN (
    'ADDRESS_TO_HUB',
    'HUB_TO_HUB',
    'DOOR_TO_HUB',
    'HUB_TO_DOOR'
  )),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sender_name VARCHAR(120) NOT NULL,
  sender_phone VARCHAR(25) NOT NULL,
  sender_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  sender_postcode VARCHAR(20) NOT NULL,
  sender_address_text TEXT NOT NULL,
  
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(25) NOT NULL,
  recipient_email VARCHAR(120),
  recipient_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  recipient_postcode VARCHAR(20) NOT NULL,
  recipient_address_text TEXT NOT NULL,

  origin_hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
  destination_hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
  assigned_rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
  assigned_courier_id UUID REFERENCES courier_companies(id) ON DELETE SET NULL,
  assigned_bay_id UUID REFERENCES hub_storage_bays(id) ON DELETE SET NULL,

  size VARCHAR(15) NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 50),
  weight_kg DECIMAL(5, 2) DEFAULT 1.0,
  package_description TEXT,
  declared_value_ngn DECIMAL(12, 2) DEFAULT 0.00,

  pickup_otp VARCHAR(6),
  pickup_otp_expires_at TIMESTAMP WITH TIME ZONE,
  pickup_otp_attempts INT NOT NULL DEFAULT 0,
  pickup_otp_consumed_at TIMESTAMP WITH TIME ZONE,
  delivery_otp VARCHAR(6) NOT NULL,
  collection_qr_token VARCHAR(64) NOT NULL UNIQUE,

  status VARCHAR(30) NOT NULL DEFAULT 'BOOKED' CHECK (status IN (
    'DRAFT',
    'BOOKED',
    'RIDER_ASSIGNED',
    'PICKED_UP_FROM_SENDER',
    'IN_TRANSIT_TO_HUB',
    'RECEIVED_AT_HUB',
    'STORED_IN_BAY',
    'OUT_FOR_DELIVERY',
    'DELIVERED_TO_RECIPIENT',
    'COLLECTED_AT_HUB',
    'EXPIRED_AT_HUB',
    'RETURN_REQUESTED',
    'RETURNED_TO_SENDER',
    'DISPUTED',
    'CANCELLED'
  )),

  pricing_total_ngn DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
  holding_fee_per_day_ngn DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
  free_holding_days INT NOT NULL DEFAULT 3,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  picked_up_at TIMESTAMP WITH TIME ZONE,
  received_at_hub_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_sender ON shipments(sender_id);
CREATE INDEX IF NOT EXISTS idx_shipments_dest_hub ON shipments(destination_hub_id);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_otp_expires ON shipments (pickup_otp_expires_at);
CREATE INDEX IF NOT EXISTS idx_shipments_rider ON shipments(assigned_rider_id);

-- Backward compatibility view for legacy 'parcels'
CREATE OR REPLACE VIEW parcels AS
  SELECT
    id,
    tracking_code,
    id::text AS sender_ref,
    recipient_phone,
    recipient_name,
    destination_hub_id AS dropzone_id,
    assigned_rider_id AS courier_id,
    size,
    delivery_otp AS otp,
    CASE 
      WHEN status IN ('BOOKED', 'DRAFT') THEN 'RESERVED'
      WHEN status IN ('RECEIVED_AT_HUB', 'STORED_IN_BAY') THEN 'READY'
      WHEN status IN ('COLLECTED_AT_HUB', 'DELIVERED_TO_RECIPIENT') THEN 'COLLECTED'
      WHEN status = 'EXPIRED_AT_HUB' THEN 'EXPIRED'
      WHEN status IN ('RETURN_REQUESTED', 'RETURNED_TO_SENDER') THEN 'RETURNED'
      WHEN status = 'DISPUTED' THEN 'DISPUTED'
      ELSE 'DROPPED'
    END AS status,
    expires_at,
    created_at,
    picked_up_at AS dropped_at
  FROM shipments;

-- ----------------------------------------------------------------------------
-- 7. AUDITABLE PARCEL CUSTODY LEDGER (Immutable Chain of Custody)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custody_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  previous_holder_type VARCHAR(20) NOT NULL CHECK (previous_holder_type IN ('SENDER', 'RIDER', 'HUB', 'COURIER', 'NONE')),
  previous_holder_id UUID,
  new_holder_type VARCHAR(20) NOT NULL CHECK (new_holder_type IN ('RIDER', 'HUB', 'RECIPIENT', 'RETURN_STATION', 'COURIER')),
  new_holder_id UUID,
  handover_type VARCHAR(30) NOT NULL CHECK (handover_type IN (
    'SENDER_TO_RIDER',
    'RIDER_TO_HUB',
    'HUB_TO_RECIPIENT',
    'HUB_TO_RIDER',
    'RIDER_TO_RECIPIENT',
    'HUB_TO_RETURN'
  )),
  status_after_handover VARCHAR(30) NOT NULL,
  verification_method VARCHAR(25) NOT NULL CHECK (verification_method IN ('OTP', 'QR_SCAN', 'SIGNATURE_PHOTO', 'PIN', 'ADMIN_OVERRIDE')),
  verification_token VARCHAR(64),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(30) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custody_shipment ON custody_ledger(shipment_id);
CREATE INDEX IF NOT EXISTS idx_custody_actor ON custody_ledger(actor_id);
CREATE INDEX IF NOT EXISTS idx_custody_created_at ON custody_ledger(created_at);

-- Backward compatibility view for legacy 'parcel_events'
CREATE OR REPLACE VIEW parcel_events AS
  SELECT
    id,
    shipment_id AS parcel_id,
    handover_type AS event_type,
    actor_id,
    actor_role,
    created_at AS timestamp,
    notes AS location,
    verification_method AS proof
  FROM custody_ledger;

-- ----------------------------------------------------------------------------
-- 8. FINANCIAL WALLETS, TRANSACTIONS & SETTLEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance_ngn DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ledger_balance_ngn DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(5) NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'BOOKING_PAYMENT',
    'HUB_COMMISSION',
    'RIDER_PAYOUT',
    'HOLDING_FEE',
    'ESCROW_HOLD',
    'ESCROW_RELEASE',
    'DISPUTE_REFUND',
    'WITHDRAWAL',
    'LEGACY_LINK_FEE',
    'LEGACY_LINK_PLATFORM_FEE'
  )),
  amount_ngn DECIMAL(10, 2) NOT NULL,
  fee_ngn DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  net_amount_ngn DECIMAL(10, 2) NOT NULL,
  balance_before_ngn DECIMAL(12, 2) NOT NULL,
  balance_after_ngn DECIMAL(12, 2) NOT NULL,
  reference VARCHAR(100) NOT NULL UNIQUE,
  payment_gateway VARCHAR(30) DEFAULT 'WALLET' CHECK (payment_gateway IN ('PAYSTACK', 'FLUTTERWAVE', 'WALLET', 'MANUAL')),
  gateway_reference VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON transactions(reference);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_gateway_ref_unique ON transactions(gateway_reference) WHERE gateway_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type VARCHAR(30) NOT NULL UNIQUE,
  base_price_ngn DECIMAL(10, 2) NOT NULL,
  per_km_price_ngn DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  size_multiplier_json JSONB NOT NULL DEFAULT '{"small": 1.0, "medium": 1.3, "large": 1.8}'::jsonb,
  platform_cut_pct DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
  hub_cut_pct DECIMAL(5, 2) NOT NULL DEFAULT 40.00,
  rider_cut_pct DECIMAL(5, 2) NOT NULL DEFAULT 30.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. CLAIMS, DISPUTES & RESOLUTION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  claim_type VARCHAR(30) NOT NULL CHECK (claim_type IN (
    'LOST_PARCEL',
    'DAMAGED_PARCEL',
    'DELAYED_DELIVERY',
    'WRONG_HANDOVER',
    'EXCESS_HOLDING_FEE'
  )),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  claim_amount_ngn DECIMAL(10, 2) NOT NULL,
  resolution_amount_ngn DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(25) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_shipment ON claims(shipment_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

-- ----------------------------------------------------------------------------
-- 10. ENTERPRISE PORTALS, API KEYS & WEBHOOKS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(150) NOT NULL,
  billing_tier VARCHAR(25) DEFAULT 'PREPAID' CHECK (billing_tier IN ('PREPAID', 'MONTHLY_INVOICE')),
  monthly_credit_limit_ngn DECIMAL(12, 2) DEFAULT 500000.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_account_id UUID NOT NULL REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  key_prefix VARCHAR(12) NOT NULL,
  hashed_key TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['shipments:read', 'shipments:write']::TEXT[],
  is_revoked BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_account_id UUID NOT NULL REFERENCES enterprise_accounts(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['shipment.status_changed']::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_name VARCHAR(60) NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. NOTIFICATIONS & AUDIT TRAIL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'SHIPMENT_UPDATE' CHECK (type IN (
    'SHIPMENT_UPDATE',
    'OTP_ALERT',
    'PAYOUT',
    'KYC_APPROVAL',
    'SYSTEM_NOTICE'
  )),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ----------------------------------------------------------------------------
-- 12. INITIAL SEED DATA FOR PRODUCTION COMPLIANCE
-- ----------------------------------------------------------------------------

-- Pricing Rules
INSERT INTO pricing_rules (service_type, base_price_ngn, per_km_price_ngn, platform_cut_pct, hub_cut_pct, rider_cut_pct) VALUES
('ADDRESS_TO_HUB', 1200.00, 45.00, 30.00, 40.00, 30.00),
('HUB_TO_HUB', 950.00, 35.00, 25.00, 50.00, 25.00),
('DOOR_TO_HUB', 1500.00, 50.00, 30.00, 35.00, 35.00),
('HUB_TO_DOOR', 1500.00, 50.00, 30.00, 35.00, 35.00)
ON CONFLICT (service_type) DO UPDATE SET
  base_price_ngn = EXCLUDED.base_price_ngn,
  per_km_price_ngn = EXCLUDED.per_km_price_ngn;

-- Nigerian Postcode Cache (NDAPS Standard & Regional Caches)
INSERT INTO postcode_cache (postcode, state, lga, district, neighbourhood, description, lat, lng) VALUES
('FC-01-A03-FK-01', 'Abuja (FCT)', 'Abuja Municipal', 'Wuse', 'Wuse 2', 'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja Municipal, FCT', 9.0765, 7.4985),
('FC-01-A02-FK-02', 'Abuja (FCT)', 'Abuja Municipal', 'Jabi', 'Jabi District', 'Suite B12, Jabi Lake Mall, Jabi District, Abuja Municipal, FCT', 9.0820, 7.4410),
('900211', 'Abuja (FCT)', 'Abuja Municipal', 'Wuse', 'Wuse 2', 'Wuse 2, Abuja Municipal, FCT', 9.0765, 7.4985),
('900221', 'Abuja (FCT)', 'Abuja Municipal', 'Garki', 'Garki Area 1', 'Garki Area 1, Abuja Municipal, FCT', 9.0650, 7.4820),
('900108', 'Abuja (FCT)', 'Abuja Municipal', 'Central Area', 'Central Business District', 'CBD, Abuja Municipal, FCT', 9.0579, 7.4951),
('900241', 'Abuja (FCT)', 'Abuja Municipal', 'Jabi', 'Jabi District', 'Jabi District, Abuja Municipal, FCT', 9.0820, 7.4410),
('900271', 'Abuja (FCT)', 'Abuja Municipal', 'Maitama', 'Maitama District', 'Maitama District, Abuja Municipal, FCT', 9.0882, 7.4934),
('101233', 'Lagos', 'Eti-Osa', 'Victoria Island', 'Victoria Island', 'Victoria Island, Eti-Osa, Lagos', 6.4541, 3.4247),
('100252', 'Lagos', 'Ikeja', 'Ikeja', 'Allen Avenue', 'Allen Avenue, Ikeja, Lagos', 6.5244, 3.3792),
('101241', 'Lagos', 'Eti-Osa', 'Lekki Phase 1', 'Admiralty Way', 'Lekki Phase 1, Eti-Osa, Lagos', 6.4474, 3.4731),
('500272', 'Rivers', 'Port Harcourt', 'Old GRA', 'Old GRA', 'Old GRA, Port Harcourt, Rivers', 4.8156, 7.0128),
('700211', 'Kano', 'Nassarawa', 'Nassarawa GRA', 'Nassarawa GRA', 'Nassarawa GRA, Kano', 12.0022, 8.5920),
('200211', 'Oyo', 'Ibadan North', 'Bodija', 'Bodija Estate', 'Bodija, Ibadan North, Oyo', 7.4246, 3.9056)
ON CONFLICT (postcode) DO UPDATE SET
  state = EXCLUDED.state,
  lga = EXCLUDED.lga,
  district = EXCLUDED.district,
  neighbourhood = EXCLUDED.neighbourhood;

-- Seed Users across key roles
INSERT INTO users (id, role, name, phone, email, status) VALUES
('a0000000-0000-0000-0000-000000000001', 'hub_owner', 'Mallam Ibrahim', '+2348031112223', 'ibrahim@wusehub.ng', 'active'),
('a0000000-0000-0000-0000-000000000002', 'hub_owner', 'Chidi Okoro', '+2348032223334', 'chidi@gardenspot.ng', 'active'),
('a0000000-0000-0000-0000-000000000003', 'hub_owner', 'Amina Bello', '+2348033334445', 'amina@jabimart.ng', 'active'),
('a0000000-0000-0000-0000-000000000004', 'super_admin', 'System Super Admin', '+2348000000000', 'admin@hotbox.ng', 'active'),
('a0000000-0000-0000-0000-000000000005', 'customer', 'Tunde Fashola', '+2348037778899', 'tunde@gmail.com', 'active'),
('a0000000-0000-0000-0000-000000000006', 'rider', 'Musa Danladi', '+2348055556677', 'musa.rider@hotbox.ng', 'active'),
('a0000000-0000-0000-0000-000000000007', 'ops_admin', 'Fatima Abubakar', '+2348061122334', 'fatima.ops@hotbox.ng', 'active'),
('a0000000-0000-0000-0000-000000000008', 'compliance_officer', 'Oluwaseun Adeyemi', '+2348079988776', 'compliance@hotbox.ng', 'active'),
('a0000000-0000-0000-0000-000000000009', 'enterprise_shipper', 'Konga Logistics Ltd', '+2348090001122', 'enterprise@konga.ng', 'active')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status;

-- Seed Wallets for users
INSERT INTO wallets (user_id, balance_ngn, ledger_balance_ngn) VALUES
('a0000000-0000-0000-0000-000000000001', 45000.00, 45000.00),
('a0000000-0000-0000-0000-000000000002', 28500.00, 28500.00),
('a0000000-0000-0000-0000-000000000003', 62000.00, 62000.00),
('a0000000-0000-0000-0000-000000000005', 15000.00, 15000.00),
('a0000000-0000-0000-0000-000000000006', 12400.00, 12400.00)
ON CONFLICT (user_id) DO NOTHING;

-- Seed Hubs
INSERT INTO hubs (id, owner_id, business_name, cac_number, phone, email, postcode, address_text, neighbourhood, lga, state, lat, lng, opening_hours, capacity, current_load, status, rating, total_ratings) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Wuse 2 Express Mart & Hub', 'RC-123456', '+2348031112223', 'ibrahim@wusehub.ng', 'FC-01-A03-FK-01', 'Plot 112 Aminu Kano Crescent', 'Wuse 2', 'Abuja Municipal', 'Abuja (FCT)', 9.0772, 7.4990, '08:00 - 20:00', 60, 12, 'accredited', 4.8, 142),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Banex Plaza Gadgets & Hub', 'RC-789012', '+2348032223334', 'chidi@gardenspot.ng', 'FC-01-A03-FK-01', 'Shop 4, Banex Plaza Annex', 'Wuse 2', 'Abuja Municipal', 'Abuja (FCT)', 9.0758, 7.4972, '09:00 - 19:00', 40, 8, 'accredited', 4.9, 88),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Jabi Lakeside Community Hub', 'RC-345678', '+2348033334445', 'amina@jabimart.ng', '900241', 'Suite B12, Jabi Lake Mall', 'Jabi', 'Abuja Municipal', 'Abuja (FCT)', 9.0831, 7.4425, '08:00 - 21:00', 100, 35, 'accredited', 4.7, 215),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Garki Area 1 Pickup Kiosk', 'RC-998877', '+2348034445556', 'garki@wusehub.ng', '900221', 'Block 3, Area 1 Shopping Complex', 'Garki Area 1', 'Abuja Municipal', 'Abuja (FCT)', 9.0645, 7.4815, '08:00 - 18:00', 50, 20, 'accredited', 4.6, 94),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'CBD Central Logistics Vault', 'RC-554433', '+2348035556667', 'cbd@gardenspot.ng', '900108', 'Churchgate Towers, CBD', 'Central Business District', 'Abuja Municipal', 'Abuja (FCT)', 9.0585, 7.4960, '08:00 - 17:00', 80, 42, 'accredited', 4.9, 310)
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  status = EXCLUDED.status,
  capacity = EXCLUDED.capacity;

-- Seed Hub Storage Bays (5 bays per hub)
INSERT INTO hub_storage_bays (hub_id, bay_code, size_tier, is_occupied) VALUES
('b0000000-0000-0000-0000-000000000001', 'BAY-A01', 'small', FALSE),
('b0000000-0000-0000-0000-000000000001', 'BAY-A02', 'medium', FALSE),
('b0000000-0000-0000-0000-000000000001', 'BAY-A03', 'medium', FALSE),
('b0000000-0000-0000-0000-000000000001', 'BAY-A04', 'large', FALSE),
('b0000000-0000-0000-0000-000000000002', 'BAY-B01', 'small', FALSE),
('b0000000-0000-0000-0000-000000000002', 'BAY-B02', 'medium', FALSE),
('b0000000-0000-0000-0000-000000000003', 'BAY-C01', 'small', FALSE),
('b0000000-0000-0000-0000-000000000003', 'BAY-C02', 'large', FALSE)
ON CONFLICT (hub_id, bay_code) DO NOTHING;

-- Seed Rider
INSERT INTO riders (id, user_id, vehicle_type, plate_number, drivers_license_no, nin, operational_postcodes, is_active, is_available, current_lat, current_lng, rating, total_deliveries, status) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'motorcycle', 'ABJ-432-QA', 'DL-88299102-ABJ', 'NIN-19283746501', ARRAY['FC-01-A03-FK-01', 'FC-01-A02-FK-02'], TRUE, TRUE, 9.0760, 7.4980, 4.95, 342, 'verified')
ON CONFLICT (id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  is_available = EXCLUDED.is_available,
  status = EXCLUDED.status;

-- Seed Verification Records (demonstrating all 3 Tracks)
INSERT INTO verification_records (entity_type, entity_id, track, document_type, document_number, status, reviewed_by, reviewed_at) VALUES
-- Track A: Address verification for Hub 1
('hub', 'b0000000-0000-0000-0000-000000000001', 'TRACK_A_ADDRESS', 'PROOF_OF_ADDRESS', 'UTIL-FC01A0-1029', 'APPROVED', 'a0000000-0000-0000-0000-000000000008', NOW()),
-- Track B: Regulatory CAC & NIN for Hub Owner
('user', 'a0000000-0000-0000-0000-000000000001', 'TRACK_B_REGULATORY', 'CAC_CERTIFICATE', 'RC-123456', 'APPROVED', 'a0000000-0000-0000-0000-000000000008', NOW()),
-- Track C: Hotbox Accreditation for Hub 1
('hub', 'b0000000-0000-0000-0000-000000000001', 'TRACK_C_ACCREDITATION', 'PHYSICAL_INSPECTION_REPORT', 'INSP-ABJ-2026-0041', 'APPROVED', 'a0000000-0000-0000-0000-000000000007', NOW()),
-- Track B: Rider Driver's License & NIN
('rider', 'c0000000-0000-0000-0000-000000000001', 'TRACK_B_REGULATORY', 'DRIVERS_LICENSE', 'DL-88299102-ABJ', 'APPROVED', 'a0000000-0000-0000-0000-000000000008', NOW())
ON CONFLICT DO NOTHING;

-- Seed Sample Shipments demonstrating the Lifecycle
INSERT INTO shipments (
  id,
  tracking_code,
  service_type,
  sender_id,
  sender_name,
  sender_phone,
  sender_postcode,
  sender_address_text,
  recipient_name,
  recipient_phone,
  recipient_email,
  recipient_postcode,
  recipient_address_text,
  origin_hub_id,
  destination_hub_id,
  assigned_rider_id,
  size,
  weight_kg,
  package_description,
  declared_value_ngn,
  pickup_otp,
  delivery_otp,
  collection_qr_token,
  status,
  pricing_total_ngn,
  expires_at
) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'DBX-FC01A0-8100',
  'DOOR_TO_HUB',
  'a0000000-0000-0000-0000-000000000005',
  'Tunde Fashola',
  '+2348037778899',
  'FC-01-A03-FK-01',
  'Flat 4, Block B, Emeka Anyaoku Street, Wuse 2, Abuja',
  'Ngozi Eze',
  '+2348029988112',
  'ngozi@eze.ng',
  'FC-01-A03-FK-01',
  'Plot 112 Aminu Kano Crescent, Wuse 2, Abuja',
  NULL,
  'b0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'medium',
  2.5,
  'Electronic Tablet and Accessories',
  85000.00,
  '419201',
  '882194',
  'QR-TOKEN-DBX-FC01A0-8100',
  'STORED_IN_BAY',
  1800.00,
  NOW() + INTERVAL '3 days'
),
(
  'd0000000-0000-0000-0000-000000000002',
  'DBX-900241-2002',
  'HUB_TO_HUB',
  'a0000000-0000-0000-0000-000000000005',
  'Tunde Fashola',
  '+2348037778899',
  'FC-01-A03-FK-01',
  'Plot 112 Aminu Kano Crescent, Wuse 2',
  'Kabir Mohammed',
  '+2348035544332',
  'kabir@mohammed.ng',
  '900241',
  'Suite B12, Jabi Lake Mall, Jabi',
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  'small',
  0.8,
  'Original Legal Documents',
  15000.00,
  '120934',
  '654321',
  'QR-TOKEN-DBX-900241-2002',
  'IN_TRANSIT_TO_HUB',
  1400.00,
  NOW() + INTERVAL '3 days'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  tracking_code = EXCLUDED.tracking_code;

-- Seed Initial Custody Transfers
INSERT INTO custody_ledger (
  shipment_id,
  previous_holder_type,
  previous_holder_id,
  new_holder_type,
  new_holder_id,
  handover_type,
  status_after_handover,
  verification_method,
  verification_token,
  lat,
  lng,
  actor_id,
  actor_role,
  notes
) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'SENDER',
  'a0000000-0000-0000-0000-000000000005',
  'RIDER',
  'c0000000-0000-0000-0000-000000000001',
  'SENDER_TO_RIDER',
  'PICKED_UP_FROM_SENDER',
  'OTP',
  '419201',
  9.0765,
  7.4985,
  'a0000000-0000-0000-0000-000000000006',
  'rider',
  'Parcel collected from sender door in Wuse 2'
),
(
  'd0000000-0000-0000-0000-000000000001',
  'RIDER',
  'c0000000-0000-0000-0000-000000000001',
  'HUB',
  'b0000000-0000-0000-0000-000000000001',
  'RIDER_TO_HUB',
  'STORED_IN_BAY',
  'QR_SCAN',
  'QR-TOKEN-DBX-FC01A0-8100',
  9.0772,
  7.4990,
  'a0000000-0000-0000-0000-000000000001',
  'hub_owner',
  'Intake scanned and secured in BAY-A02 at Wuse 2 Express Hub'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Digital P.O. Box registry (anchor, forwarding history, certificates)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS digital_box_number_seq START WITH 1;

CREATE TABLE IF NOT EXISTS digital_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_number VARCHAR(20) NOT NULL UNIQUE,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  plan VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
  legacy_box_number VARCHAR(60) UNIQUE,
  legacy_box_number_norm VARCHAR(120),
  legacy_linked_at TIMESTAMP WITH TIME ZONE,
  legacy_box_status VARCHAR(20) NOT NULL DEFAULT 'UNLINKED',
  legacy_box_approved_at TIMESTAMP WITH TIME ZONE,
  is_ground_truth_verified BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_box_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  box_id UUID NOT NULL REFERENCES digital_boxes(id) ON DELETE CASCADE,
  legacy_box_number_raw VARCHAR(120) NOT NULL,
  legacy_box_number_norm VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'REVOKED',
    'CONTESTED',
    'WITHDRAWN'
  )),
  registered_phone VARCHAR(30),
  declaration BOOLEAN NOT NULL DEFAULT FALSE,
  document_url TEXT,
  document_hash VARCHAR(128),
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  contested_at TIMESTAMP WITH TIME ZONE,
  fee_ngn NUMERIC(12,2),
  fee_reference VARCHAR(100),
  registry_source VARCHAR(40),
  registry_ref VARCHAR(120),
  registry_verified_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_link_open_number
  ON legacy_box_link_requests (UPPER(legacy_box_number_norm))
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_legacy_link_requests_user
  ON legacy_box_link_requests (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_link_requests_status
  ON legacy_box_link_requests (status, expires_at);

-- Remittance statements for the NIPOST verification fee and Hotbox platform
-- fee. Amounts are copied from the ledger at record time and never blended.
CREATE TABLE IF NOT EXISTS legacy_link_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  nipost_amount_ngn NUMERIC(12,2) NOT NULL DEFAULT 0,
  hotbox_amount_ngn NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount_ngn NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_item_count INTEGER NOT NULL DEFAULT 0,
  fee_reference VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'RECORDED'
    CHECK (status IN ('RECORDED', 'SUBMITTED', 'PAID')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_legacy_link_remittances_period
  ON legacy_link_remittances (period_start, period_end);

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_boxes_approved_legacy_norm
  ON digital_boxes (legacy_box_number_norm)
  WHERE legacy_box_status = 'APPROVED';

UPDATE digital_boxes
   SET legacy_box_status = 'APPROVED',
       legacy_box_number_norm = UPPER(regexp_replace(legacy_box_number, '[^A-Z0-9]+', '', 'g')),
       legacy_box_approved_at = COALESCE(legacy_box_approved_at, legacy_linked_at, NOW())
 WHERE legacy_box_number IS NOT NULL
   AND (legacy_box_status IS NULL OR legacy_box_status = 'UNLINKED');

CREATE TABLE IF NOT EXISTS relocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID NOT NULL REFERENCES digital_boxes(id) ON DELETE CASCADE,
  old_postcode VARCHAR(40),
  old_address TEXT,
  new_postcode VARCHAR(40),
  new_address TEXT,
  phone VARCHAR(30),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proof_of_address_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_serial VARCHAR(40) NOT NULL UNIQUE,
  box_id UUID NOT NULL REFERENCES digital_boxes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_record_id UUID REFERENCES verification_records(id) ON DELETE SET NULL,
  postcode VARCHAR(40),
  address_text TEXT,
  district VARCHAR(120),
  lga VARCHAR(120),
  state VARCHAR(120),
  lat NUMERIC,
  lng NUMERIC,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Geocoordinates on verification records so an inspection can later be opened
-- in a map application for mail delivery.
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS lng NUMERIC;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS accuracy_m NUMERIC;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS captured_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(120);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS photo_url TEXT;
-- Field verifier report: who submitted the doorway inspection evidence and
-- what they found. Approval remains with the compliance desk.
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS field_reported_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS field_reported_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS field_report_notes TEXT;

-- ----------------------------------------------------------------------------
-- 12. HUB ACCREDITATION APPLICATIONS & INSPECTIONS
-- ----------------------------------------------------------------------------
-- Hub accreditation applications & inspections.
-- Every hub now passes through an application, a scheduled inspection and a
-- compliance decision before it is accredited. `hubs.status` stays the
-- operational truth: a submitted application creates a pending hub, and only
-- an approval accredits it.

CREATE SEQUENCE IF NOT EXISTS hub_application_ref_seq START 1;

CREATE TABLE IF NOT EXISTS hub_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(24) NOT NULL UNIQUE DEFAULT ('HBA-' || lpad(nextval('hub_application_ref_seq')::text, 5, '0')),
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT',
    'SUBMITTED',
    'INSPECTION_SCHEDULED',
    'INSPECTED',
    'APPROVED',
    'REJECTED',
    'ADDITIONAL_INFORMATION_REQUIRED'
  )),
  business_name VARCHAR(160) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_applications_status ON hub_applications(status);
CREATE INDEX IF NOT EXISTS idx_hub_applications_applicant ON hub_applications(applicant_id);

CREATE TABLE IF NOT EXISTS hub_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES hub_applications(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conducted_at TIMESTAMP WITH TIME ZONE,
  result VARCHAR(20) CHECK (result IN ('ELIGIBLE', 'NOT_ELIGIBLE')),
  findings TEXT,
  photo_url TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_inspections_application ON hub_inspections(application_id);
CREATE INDEX IF NOT EXISTS idx_hub_inspections_hub ON hub_inspections(hub_id);