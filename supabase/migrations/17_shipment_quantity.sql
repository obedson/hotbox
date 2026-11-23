-- Parcel quantity on a shipment booking.
--
-- A booking can cover more than one parcel of the same size. The dispatch fee
-- is charged per parcel, so the booking stores the quantity and the total
-- (unit rate x quantity) in pricing_total_ngn.

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_quantity_check'
  ) THEN
    ALTER TABLE shipments
      ADD CONSTRAINT shipments_quantity_check CHECK (quantity >= 1 AND quantity <= 50);
  END IF;
END $$;