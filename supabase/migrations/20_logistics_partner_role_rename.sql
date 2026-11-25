-- Rename the courier company role to logistics partner so the role name
-- states its scope in plain language. No account held the old role when this was
-- applied, but the update keeps any other deployment consistent with the new
-- check constraint instead of leaving it unable to insert or migrate.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'customer',
  'hub_owner',
  'hub_staff',
  'rider',
  'logistics_partner',
  'enterprise_shipper',
  'ops_admin',
  'compliance_officer',
  'finance_officer',
  'support_agent',
  'nipost_verifier',
  'super_admin',
  'host',
  'courier',
  'admin'
));

UPDATE users SET role = 'logistics_partner' WHERE role = 'courier_company';
