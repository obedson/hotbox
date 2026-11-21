-- Pickup OTP hardening.
--
-- The sender's pickup OTP was a static 6-digit Math.random() value that lived
-- for the whole shipment and was exposed by the public tracking endpoint.
-- These columns give it a validity window, an attempt ceiling, and a
-- single-use marker so a code cannot be replayed after a successful pickup.

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_otp_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_otp_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_otp_consumed_at TIMESTAMP WITH TIME ZONE;

-- Existing rows keep working: give live (not yet picked up) shipments a fresh
-- window, and mark anything already past pickup as consumed.
UPDATE shipments
SET pickup_otp_expires_at = NOW() + INTERVAL '10 minutes'
WHERE pickup_otp_expires_at IS NULL
  AND status IN ('BOOKED', 'DRAFT', 'RIDER_ASSIGNED');

UPDATE shipments
SET pickup_otp_consumed_at = NOW()
WHERE pickup_otp_consumed_at IS NULL
  AND status NOT IN ('BOOKED', 'DRAFT', 'RIDER_ASSIGNED');

CREATE INDEX IF NOT EXISTS idx_shipments_pickup_otp_expires ON shipments (pickup_otp_expires_at);
