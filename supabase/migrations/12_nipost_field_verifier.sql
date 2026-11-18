-- NIPOST field verifier role: four-eyes separation between the field agent who
-- submits a doorway inspection report and the compliance desk who approves it.
-- A report never changes the record status; it only attaches the evidence the
-- desk needs to decide.
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS field_reported_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS field_reported_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS field_report_notes TEXT;