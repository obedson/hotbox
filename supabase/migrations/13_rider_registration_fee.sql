-- Rider registration fee and KYC completeness.
-- The fee defaults to zero so rider onboarding stays free until a super
-- administrator consciously sets an amount. It is charged from the rider's
-- prepaid wallet and must be settled before operations may grant dispatch
-- clearance.

INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES (
  'rider_registration_fees',
  '{"registration_fee_ngn": 0}'::jsonb,
  'riders',
  'Rider registration and Track B accreditation fee, charged from the rider wallet before dispatch clearance is granted.'
)
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE riders ADD COLUMN IF NOT EXISTS registration_fee_paid_at TIMESTAMPTZ;
