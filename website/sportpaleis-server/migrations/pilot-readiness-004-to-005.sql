-- SPW-BEDRUKKING-PILOT-READINESS-005-20260810
-- Additive validation/provenance storage only. Run through the controlled migration procedure.

ALTER TABLE sp_catalog_articles
  ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 1 AFTER active,
  ADD COLUMN variant_labels_json JSON NULL AFTER revision,
  ADD COLUMN available_sizes_json JSON NULL AFTER variant_labels_json,
  ADD COLUMN validation_json JSON NULL AFTER available_sizes_json,
  ADD COLUMN validation_history_json JSON NULL AFTER validation_json;
UPDATE sp_catalog_articles SET variant_labels_json = JSON_ARRAY(), available_sizes_json = JSON_ARRAY(), validation_json = JSON_OBJECT('status','DATA_GAP','source','Migratie: bronbevestiging vereist'), validation_history_json = JSON_ARRAY() WHERE variant_labels_json IS NULL OR available_sizes_json IS NULL OR validation_json IS NULL OR validation_history_json IS NULL;
ALTER TABLE sp_catalog_articles
  MODIFY COLUMN variant_labels_json JSON NOT NULL,
  MODIFY COLUMN available_sizes_json JSON NOT NULL,
  MODIFY COLUMN validation_json JSON NOT NULL,
  MODIFY COLUMN validation_history_json JSON NOT NULL;

ALTER TABLE sp_production_profiles
  MODIFY COLUMN mirror BOOLEAN NULL,
  MODIFY COLUMN rotation_deg SMALLINT NULL,
  ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 1 AFTER back_number_size_classes_json,
  ADD COLUMN validation_json JSON NULL AFTER revision,
  ADD COLUMN validation_history_json JSON NULL AFTER validation_json;
UPDATE sp_production_profiles SET validation_json = JSON_OBJECT('status','DATA_GAP','source','Migratie: technische bronbevestiging vereist'), validation_history_json = JSON_ARRAY() WHERE validation_json IS NULL OR validation_history_json IS NULL;
ALTER TABLE sp_production_profiles
  MODIFY COLUMN validation_json JSON NOT NULL,
  MODIFY COLUMN validation_history_json JSON NOT NULL;

-- No deployment or database mutation is performed by this repository change.
