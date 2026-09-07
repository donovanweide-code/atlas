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
