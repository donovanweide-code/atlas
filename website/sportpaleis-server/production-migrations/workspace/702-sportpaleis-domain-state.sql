CREATE TABLE IF NOT EXISTS sp_workspace_domain_state (
  organization_id VARCHAR(64) NOT NULL,
  domain_key VARCHAR(40) NOT NULL,
  domain_revision BIGINT UNSIGNED NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  payload_json LONGTEXT NOT NULL,
  payload_sha256 CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, domain_key),
  KEY idx_sp_domain_global_revision (organization_id, global_revision),
  CONSTRAINT fk_sp_domain_meta FOREIGN KEY (organization_id) REFERENCES sp_workspace_domain_meta(organization_id),
  CONSTRAINT chk_sp_domain_revision CHECK (domain_revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
