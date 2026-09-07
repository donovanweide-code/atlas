CREATE TABLE IF NOT EXISTS sp_workspace_domain_meta (
  organization_id VARCHAR(64) PRIMARY KEY,
  schema_version INT UNSIGNED NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  legacy_source_revision BIGINT UNSIGNED NOT NULL,
  contract_version INT UNSIGNED NOT NULL,
  cutover_mode ENUM('SHADOW','DOMAIN_READS') NOT NULL DEFAULT 'SHADOW',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT chk_sp_domain_meta_revision CHECK (global_revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
