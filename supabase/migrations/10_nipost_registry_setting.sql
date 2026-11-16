-- Phase 3: admin toggle for NIPOST registry auto-verification.
-- The endpoint and API key stay in the environment; this setting is the
-- business switch that turns auto-verification on and selects how strictly a
-- registry record must match the claimant.

INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES (
  'nipost_registry',
  '{"enabled": false, "match_policy": "name_or_phone"}'::jsonb,
  'digital_box',
  'NIPOST registry auto-verification switch and ownership match policy. Requires NIPOST_REGISTRY_URL and NIPOST_REGISTRY_API_KEY in the environment.'
)
ON CONFLICT (setting_key) DO NOTHING;