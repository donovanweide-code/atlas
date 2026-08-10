CREATE TABLE IF NOT EXISTS atlas_runtime_boundary (
  organization_id VARCHAR(64) PRIMARY KEY,
  boundary_version INT UNSIGNED NOT NULL,
  state_json JSON NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT chk_atlas_runtime_boundary_organization CHECK (organization_id <> ''),
  CONSTRAINT chk_atlas_runtime_boundary_version CHECK (boundary_version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

