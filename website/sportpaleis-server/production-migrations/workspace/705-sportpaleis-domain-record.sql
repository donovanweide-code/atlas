CREATE TABLE IF NOT EXISTS sp_workspace_domain_record (
  organization_id VARCHAR(64) NOT NULL,
  domain_key VARCHAR(40) NOT NULL,
  collection_key VARCHAR(80) NOT NULL,
  record_id VARCHAR(160) NOT NULL,
  ordinal BIGINT NOT NULL,
  record_revision BIGINT UNSIGNED NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  record_json LONGTEXT NOT NULL,
  record_sha256 CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, collection_key, record_id),
  KEY idx_sp_domain_record_order (organization_id, domain_key, collection_key, ordinal),
  KEY idx_sp_domain_record_revision (organization_id, global_revision),
  CONSTRAINT fk_sp_record_domain_meta FOREIGN KEY (organization_id) REFERENCES sp_workspace_domain_meta(organization_id),
  CONSTRAINT chk_sp_record_revision CHECK (record_revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
