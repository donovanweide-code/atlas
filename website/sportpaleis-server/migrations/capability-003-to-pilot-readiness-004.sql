-- SPW-BEDRUKKING-PILOT-READINESS-004-20260810
-- Additive only. Run through the existing controlled migration procedure.

ALTER TABLE sp_users
  ADD COLUMN sales_number VARCHAR(8) NULL AFTER seat_type,
  ADD UNIQUE KEY uq_sp_users_sales_number (organization_id, sales_number);

ALTER TABLE sp_associations
  ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 1 AFTER article_catalog_status,
  ADD COLUMN validation_history_json JSON NULL AFTER revision;
UPDATE sp_associations SET validation_history_json = JSON_ARRAY() WHERE validation_history_json IS NULL;
ALTER TABLE sp_associations MODIFY COLUMN validation_history_json JSON NOT NULL;

ALTER TABLE sp_orders
  MODIFY COLUMN order_kind ENUM('INDIVIDUAL','TEAM','CUSTOM','LEGACY') NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN accepted_by_json JSON NULL AFTER owner_user_id;
UPDATE sp_orders SET accepted_by_json = JSON_OBJECT('userId', owner_user_id, 'name', owner_user_id, 'salesNumber', NULL, 'at', created_at) WHERE accepted_by_json IS NULL;
ALTER TABLE sp_orders MODIFY COLUMN accepted_by_json JSON NOT NULL;

ALTER TABLE sp_feedback
  ADD COLUMN release_id VARCHAR(120) NULL AFTER description,
  ADD COLUMN order_id VARCHAR(32) NULL AFTER release_id,
  ADD COLUMN attachments_json JSON NULL AFTER order_id;
UPDATE sp_feedback SET release_id = 'MIGRATED_UNKNOWN', attachments_json = JSON_ARRAY() WHERE release_id IS NULL OR attachments_json IS NULL;
ALTER TABLE sp_feedback MODIFY COLUMN release_id VARCHAR(120) NOT NULL, MODIFY COLUMN attachments_json JSON NOT NULL;

-- No deployment or database mutation is performed by this repository change.
