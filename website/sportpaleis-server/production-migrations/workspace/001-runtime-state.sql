CREATE TABLE IF NOT EXISTS sp_runtime_state (
  organization_id VARCHAR(64) PRIMARY KEY,
  schema_version INT UNSIGNED NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  state_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT chk_sp_runtime_state_organization CHECK (organization_id <> ''),
  CONSTRAINT chk_sp_runtime_state_revision CHECK (revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

