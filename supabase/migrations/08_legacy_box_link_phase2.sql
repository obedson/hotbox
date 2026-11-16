-- Phase 2: contested claims, reminders, revocation audit fields and fee ledger.
-- Only one PENDING claim may exist per normalized number; competing claims are
-- recorded as CONTESTED so the NIPOST queue can see every open claim.

DROP INDEX IF EXISTS idx_legacy_link_open_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_link_open_number
  ON legacy_box_link_requests (UPPER(legacy_box_number_norm))
  WHERE status = 'PENDING';

ALTER TABLE legacy_box_link_requests
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS contested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS fee_ngn NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS fee_reference VARCHAR(100);

-- Fee line items use their own ledger types so NIPOST verification and the
-- Hotbox platform fee are never blended in reporting.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN (
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
));

INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES (
  'legacy_box_link_fees',
  '{"nipost_verification_fee_ngn": 0, "hotbox_platform_fee_ngn": 0}'::jsonb,
  'digital_box',
  'Legacy P.O. Box link NIPOST verification fee and Hotbox platform fee, charged on approval.'
)
ON CONFLICT (setting_key) DO NOTHING;