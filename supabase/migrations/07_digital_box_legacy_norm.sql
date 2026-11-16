ALTER TABLE digital_boxes ADD COLUMN IF NOT EXISTS legacy_box_number_norm VARCHAR(120);

UPDATE digital_boxes
   SET legacy_box_number_norm = UPPER(regexp_replace(legacy_box_number, '[^A-Z0-9]+', '', 'g'))
 WHERE legacy_box_number IS NOT NULL
   AND legacy_box_number_norm IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_boxes_approved_legacy_norm
  ON digital_boxes (legacy_box_number_norm)
  WHERE legacy_box_status = 'APPROVED';