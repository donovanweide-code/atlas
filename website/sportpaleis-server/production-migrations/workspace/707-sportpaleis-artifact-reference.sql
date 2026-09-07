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
