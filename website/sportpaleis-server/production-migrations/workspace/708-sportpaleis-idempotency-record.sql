CREATE TABLE IF NOT EXISTS sp_workspace_idempotency_record (
  organization_id VARCHAR(64) NOT NULL,
  identity_sha256 CHAR(64) NOT NULL,
  identity_key VARCHAR(512) NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  record_json LONGTEXT NOT NULL,
  record_sha256 CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, identity_sha256),
  UNIQUE KEY uq_sp_idempotency_identity (organization_id, identity_key),
  KEY idx_sp_idempotency_revision (organization_id, global_revision),
  CONSTRAINT fk_sp_idempotency_domain_meta FOREIGN KEY (organization_id) REFERENCES sp_workspace_domain_meta(organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
