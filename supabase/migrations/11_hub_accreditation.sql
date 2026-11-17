-- Hub accreditation applications & inspections.
-- Every hub now passes through an application, a scheduled inspection and a
-- compliance decision before it is accredited. `hubs.status` stays the
-- operational truth: a submitted application creates a pending hub, and only
-- an approval accredits it.

CREATE SEQUENCE IF NOT EXISTS hub_application_ref_seq START 1;

CREATE TABLE IF NOT EXISTS hub_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(24) NOT NULL UNIQUE DEFAULT ('HBA-' || lpad(nextval('hub_application_ref_seq')::text, 5, '0')),
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT',
    'SUBMITTED',
    'INSPECTION_SCHEDULED',
    'INSPECTED',
    'APPROVED',
    'REJECTED',
    'ADDITIONAL_INFORMATION_REQUIRED'
  )),
  business_name VARCHAR(160) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_applications_status ON hub_applications(status);
CREATE INDEX IF NOT EXISTS idx_hub_applications_applicant ON hub_applications(applicant_id);

CREATE TABLE IF NOT EXISTS hub_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES hub_applications(id) ON DELETE CASCADE,
  hub_id UUID REFERENCES hubs(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conducted_at TIMESTAMP WITH TIME ZONE,
  result VARCHAR(20) CHECK (result IN ('ELIGIBLE', 'NOT_ELIGIBLE')),
  findings TEXT,
  photo_url TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hub_inspections_application ON hub_inspections(application_id);
CREATE INDEX IF NOT EXISTS idx_hub_inspections_hub ON hub_inspections(hub_id);