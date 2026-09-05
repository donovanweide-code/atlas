CREATE TABLE IF NOT EXISTS wbd_owner_domain_meta (
  organization_id VARCHAR(64) PRIMARY KEY,
  schema_version INT UNSIGNED NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  legacy_source_revision BIGINT UNSIGNED NOT NULL,
  contract_version INT UNSIGNED NOT NULL,
  cutover_mode VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT chk_wbd_owner_domain_org CHECK (organization_id = 'we-build-and-design'),
  CONSTRAINT chk_wbd_owner_domain_revision CHECK (global_revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wbd_owner_domain_state (
  organization_id VARCHAR(64) NOT NULL,
  domain_key VARCHAR(32) NOT NULL,
  domain_revision BIGINT UNSIGNED NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  payload_json JSON NOT NULL,
  payload_sha256 CHAR(64) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, domain_key),
  KEY idx_wbd_owner_domain_revision (organization_id, global_revision),
  CONSTRAINT fk_wbd_owner_domain_meta FOREIGN KEY (organization_id) REFERENCES wbd_owner_domain_meta (organization_id),
  CONSTRAINT chk_wbd_owner_domain_state_revision CHECK (domain_revision > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wbd_owner_domain_reconciliation (
  organization_id VARCHAR(64) NOT NULL,
  legacy_revision BIGINT UNSIGNED NOT NULL,
  contract_version INT UNSIGNED NOT NULL,
  legacy_sha256 CHAR(64) NOT NULL,
  composed_sha256 CHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  verified_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, legacy_revision, contract_version),
  CONSTRAINT chk_wbd_owner_reconciliation_status CHECK (status = 'MATCH')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wbd_owner_audit_event (
  organization_id VARCHAR(64) NOT NULL,
  event_id VARCHAR(80) NOT NULL,
  ordinal BIGINT UNSIGNED NOT NULL,
  global_revision BIGINT UNSIGNED NOT NULL,
  event_json JSON NOT NULL,
  event_sha256 CHAR(64) NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  PRIMARY KEY (organization_id, event_id),
  UNIQUE KEY uq_wbd_owner_audit_ordinal (organization_id, ordinal),
  KEY idx_wbd_owner_audit_revision (organization_id, global_revision),
  CONSTRAINT fk_wbd_owner_audit_meta FOREIGN KEY (organization_id) REFERENCES wbd_owner_domain_meta (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
