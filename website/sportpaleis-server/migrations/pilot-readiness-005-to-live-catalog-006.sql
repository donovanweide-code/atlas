-- SPW-BEDRUKKING-LIVE-CATALOG-006-20260810
-- Review-only migration contract. No deployment or database mutation was executed.

ALTER TABLE sp_catalog_articles
  ADD COLUMN catalog_metadata_json JSON NOT NULL AFTER validation_history_json;

