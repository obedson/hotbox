-- Digital P.O. Box subscription model and Proof of Address decoupling.
--
-- The Digital P.O. Box becomes an opt-in paid subscription whose issuance is
-- authorised by an active Proof of Address certificate. The certificate keeps
-- its own lifecycle: it is never invalidated by a box payment, and a box is
-- never created implicitly as a side effect of registration or login.
--
-- Existing boxes are labelled LEGACY_AUTO rather than reassigned. Box numbers
-- are drawn from a monotonic sequence and are never recycled.

ALTER TABLE digital_boxes
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS price_paid_ngn NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS poa_certificate_id UUID REFERENCES proof_of_address_certificates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS issued_by VARCHAR(20) NOT NULL DEFAULT 'LEGACY_AUTO',
  ADD COLUMN IF NOT EXISTS source VARCHAR(40);

ALTER TABLE digital_boxes DROP CONSTRAINT IF EXISTS digital_boxes_status_check;
ALTER TABLE digital_boxes ADD CONSTRAINT digital_boxes_status_check
  CHECK (status IN ('ACTIVE', 'GRACE', 'LAPSED', 'CANCELLED'));

ALTER TABLE digital_boxes DROP CONSTRAINT IF EXISTS digital_boxes_issued_by_check;
ALTER TABLE digital_boxes ADD CONSTRAINT digital_boxes_issued_by_check
  CHECK (issued_by IN ('USER', 'ADMIN', 'TRIAL', 'LEGACY_AUTO'));

UPDATE digital_boxes SET issued_by = 'LEGACY_AUTO' WHERE issued_by IS NULL;

ALTER TABLE proof_of_address_certificates
  ADD COLUMN IF NOT EXISTS moved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS supersede_reason VARCHAR(40),
  ADD COLUMN IF NOT EXISTS revalidation_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;

-- A certificate stands on its own. Authority runs from certificate to box, so
-- the link is optional and a customer may hold a certificate with no box.
ALTER TABLE proof_of_address_certificates ALTER COLUMN box_id DROP NOT NULL;

ALTER TABLE proof_of_address_certificates DROP CONSTRAINT IF EXISTS proof_of_address_certificates_status_check;
ALTER TABLE proof_of_address_certificates ADD CONSTRAINT proof_of_address_certificates_status_check
  CHECK (status IN ('ACTIVE', 'MOVED', 'EXPIRED', 'SUPERSEDED', 'REVOKED'));

INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES (
  'digital_box_fees',
  '{"annual_subscription_fee_ngn": 3500, "poa_revalidation_months": 12, "grace_period_days": 30, "free_trial_days": 0}'::jsonb,
  'digital_box',
  'Digital P.O. Box annual subscription, Proof of Address revalidation interval, post-expiry grace window and optional free trial length.'
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value || system_settings.setting_value;
