INSERT INTO system_settings (setting_key, setting_value, category, description)
VALUES (
  'digital_box_fees',
  '{"doorway_inspection_fee_ngn": 2500, "poa_revalidation_fee_ngn": 2500}'::jsonb,
  'digital_box',
  'Digital P.O. Box doorway inspection fee and Proof of Address annual revalidation fee.'
)
ON CONFLICT (setting_key) DO NOTHING;