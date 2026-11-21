-- Vehicle roadworthiness certificate (Track B, rider).
--
-- Dispatch clearance requires evidence that the vehicle a rider will dispatch
-- with is roadworthy. The certificate is issued per vehicle, so it is tied to
-- the rider's license plate. The database-level document_type allowlist must
-- admit the new type before the API can persist a submission.

ALTER TABLE verification_records
  DROP CONSTRAINT IF EXISTS verification_records_document_type_check;

ALTER TABLE verification_records
  ADD CONSTRAINT verification_records_document_type_check
  CHECK (document_type IN (
    'NIN',
    'CAC_CERTIFICATE',
    'DRIVERS_LICENSE',
    'VEHICLE_ROADWORTHINESS',
    'COURIER_LICENCE',
    'PROOF_OF_ADDRESS',
    'HUB_SPACE_PHOTOS',
    'PHYSICAL_INSPECTION_REPORT',
    'SECURITY_DEPOSIT'
  ));
