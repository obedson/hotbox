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
  'host',
  'courier',
  'admin'
));

ALTER TABLE digital_boxes ADD COLUMN IF NOT EXISTS legacy_box_status VARCHAR(20) NOT NULL DEFAULT 'UNLINKED';
ALTER TABLE digital_boxes ADD COLUMN IF NOT EXISTS legacy_box_approved_at TIMESTAMP WITH TIME ZONE;

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
  WHERE status IN ('PENDING', 'CONTESTED');

CREATE INDEX IF NOT EXISTS idx_legacy_link_requests_user
  ON legacy_box_link_requests (user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_link_requests_status
  ON legacy_box_link_requests (status, expires_at);

UPDATE digital_boxes
   SET legacy_box_status = 'APPROVED',
       legacy_box_approved_at = COALESCE(legacy_box_approved_at, legacy_linked_at, NOW())
 WHERE legacy_box_number IS NOT NULL
   AND (legacy_box_status IS NULL OR legacy_box_status = 'UNLINKED');