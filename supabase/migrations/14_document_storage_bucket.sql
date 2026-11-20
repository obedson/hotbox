-- Private evidence document bucket (Supabase Storage).
--
-- Uploaded evidence (legacy P.O. Box proof, rider KYC documents, verification
-- documents) is stored as an object in this bucket. The database keeps only the
-- object key in document_url, and the API hands the portal a short-lived signed
-- URL, so the bucket itself must stay private.
--
-- The bucket is created with the same limits enforced in the application:
-- 2 MB maximum and an image/PDF allowlist.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- No anonymous or authenticated read policies are added on purpose. Access goes
-- through the backend service role plus signed URLs, so the default deny holds.
-- Add explicit storage.objects policies only if a future phase moves uploads
-- directly into the browser.

COMMENT ON TABLE storage.buckets IS 'Hotbox buckets. "documents" holds private evidence files referenced by verification_records / legacy_box_link_requests.';
