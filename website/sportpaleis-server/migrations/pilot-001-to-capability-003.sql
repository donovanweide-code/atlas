-- SPW-BEDRUKKING-CAPABILITY-003-20260810
-- Review-only migration candidate. Apply only during a separately approved deployment.
START TRANSACTION;

ALTER TABLE sp_users
  MODIFY status ENUM('Actief','Inactief','Uitgenodigd') NOT NULL DEFAULT 'Actief',
  MODIFY password_hash VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS sp_user_activation_invites (
  id VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL, token_hash CHAR(64) NOT NULL,
  created_by VARCHAR(64) NOT NULL, created_at DATETIME(3) NOT NULL, expires_at DATETIME(3) NOT NULL, used_at DATETIME(3) NULL,
  CONSTRAINT fk_sp_activation_user FOREIGN KEY (user_id) REFERENCES sp_users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sp_activation_token_hash (token_hash), KEY idx_sp_activation_expiry (expires_at, used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sp_associations (
  id VARCHAR(80) PRIMARY KEY, organization_id VARCHAR(64) NOT NULL, name VARCHAR(160) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
  source_json JSON NOT NULL, production_configuration_json JSON NOT NULL, article_catalog_status VARCHAR(80) NOT NULL, updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_sp_association_org_name (organization_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE sp_orders MODIFY order_kind ENUM('INDIVIDUAL','TEAM','LEGACY') NOT NULL DEFAULT 'LEGACY';
ALTER TABLE sp_order_items
  ADD COLUMN source_type ENUM('CATALOG','CUSTOM','LEGACY') NOT NULL DEFAULT 'LEGACY' AFTER back_number_production_json,
  ADD COLUMN source_provenance VARCHAR(500) NULL AFTER source_type,
  ADD COLUMN production_readiness_json JSON NULL AFTER source_provenance;
UPDATE sp_order_items SET source_type = IF(article_id IS NULL, 'CUSTOM', 'CATALOG'), production_readiness_json = JSON_OBJECT('status', IF(production_profile_id IS NULL, 'DATA_GAP', 'CONFIGURED'), 'reason', IF(production_profile_id IS NULL, 'Productieprofiel ontbreekt', NULL));
ALTER TABLE sp_order_items MODIFY production_readiness_json JSON NOT NULL;
ALTER TABLE sp_order_item_variants ADD COLUMN participant_name VARCHAR(120) NULL AFTER id;

COMMIT;
