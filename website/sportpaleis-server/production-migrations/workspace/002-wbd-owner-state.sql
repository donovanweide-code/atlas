CREATE TABLE IF NOT EXISTS wbd_owner_state (
  organization_id VARCHAR(64) PRIMARY KEY,
  schema_version INT UNSIGNED NOT NULL,
  revision BIGINT UNSIGNED NOT NULL,
  state_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT chk_wbd_owner_state_organization CHECK (organization_id = 'we-build-and-design'),
  CONSTRAINT chk_wbd_owner_state_revision CHECK (revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
