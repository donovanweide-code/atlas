CREATE TABLE IF NOT EXISTS sp_workspace_audit_event (
  organization_id VARCHAR(64) NOT NULL,
  event_id VARCHAR(120) NOT NULL,
  ordinal BIGINT NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  event_json LONGTEXT NOT NULL,
  event_sha256 CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, event_id),
  UNIQUE KEY uq_sp_audit_ordinal (organization_id, ordinal),
  KEY idx_sp_audit_revision (organization_id, global_revision),
  CONSTRAINT fk_sp_audit_domain_meta FOREIGN KEY (organization_id) REFERENCES sp_workspace_domain_meta(organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
