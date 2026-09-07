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
