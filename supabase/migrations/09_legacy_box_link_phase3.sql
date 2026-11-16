-- Phase 3: NIPOST registry auto-verification and remittance reporting.
-- Registry fields record when an approval came from a digitized NIPOST source
-- rather than a manual reviewer decision. They stay NULL for manual approvals,
-- so the audit trail always shows exactly how a link was verified.

ALTER TABLE legacy_box_link_requests
  ADD COLUMN IF NOT EXISTS registry_source VARCHAR(40),
  ADD COLUMN IF NOT EXISTS registry_ref VARCHAR(120),
  ADD COLUMN IF NOT EXISTS registry_verified_at TIMESTAMP WITH TIME ZONE;

-- One remittance record per period. Amounts are copied from the fee ledger so a
-- statement stays correct even if fee settings change later. The NIPOST and
-- Hotbox amounts are stored separately and are never blended.
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