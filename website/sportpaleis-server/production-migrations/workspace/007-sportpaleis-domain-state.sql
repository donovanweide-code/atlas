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

CREATE TABLE IF NOT EXISTS sp_workspace_domain_reconciliation (
  organization_id VARCHAR(64) NOT NULL,
  legacy_revision BIGINT UNSIGNED NOT NULL,
  contract_version INT UNSIGNED NOT NULL,
  legacy_sha256 CHAR(64) NOT NULL,
  composed_sha256 CHAR(64) NOT NULL,
  domain_manifest_json JSON NOT NULL,
  status ENUM('MATCH','MISMATCH') NOT NULL,
  compared_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, legacy_revision, contract_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS sp_workspace_domain_record (
  organization_id VARCHAR(64) NOT NULL,
  domain_key VARCHAR(40) NOT NULL,
  collection_key VARCHAR(80) NOT NULL,
  record_id VARCHAR(160) NOT NULL,
  ordinal INT UNSIGNED NOT NULL,
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

CREATE TABLE IF NOT EXISTS sp_workspace_order_history_event (
  organization_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(120) NOT NULL,
  event_id VARCHAR(160) NOT NULL,
  ordinal INT UNSIGNED NOT NULL,
  order_revision BIGINT UNSIGNED NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  event_json LONGTEXT NOT NULL,
  event_sha256 CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, order_id, event_id),
  KEY idx_sp_order_history_order (organization_id, order_id, ordinal),
  KEY idx_sp_order_history_revision (organization_id, global_revision),
  CONSTRAINT fk_sp_history_domain_meta FOREIGN KEY (organization_id) REFERENCES sp_workspace_domain_meta(organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sp_workspace_artifact_reference (
  organization_id VARCHAR(64) NOT NULL,
  plot_job_id VARCHAR(120) NOT NULL,
  artifact_sha256 CHAR(64) NOT NULL,
  artifact_path VARCHAR(500) NOT NULL,
  artifact_format VARCHAR(20) NOT NULL,
  immutable TINYINT(1) NOT NULL DEFAULT 1,
  global_revision BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, plot_job_id, artifact_sha256),
  KEY idx_sp_artifact_sha (organization_id, artifact_sha256),
  CONSTRAINT fk_sp_artifact_domain_meta FOREIGN KEY (organization_id) REFERENCES sp_workspace_domain_meta(organization_id),
  CONSTRAINT chk_sp_artifact_immutable CHECK (immutable = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
