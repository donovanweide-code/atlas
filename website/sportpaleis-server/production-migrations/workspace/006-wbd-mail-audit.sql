CREATE TABLE IF NOT EXISTS wbd_mail_audit (
  id VARCHAR(80) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  subject_id VARCHAR(160) NOT NULL,
  actor VARCHAR(120) NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  details_json JSON NOT NULL,
  KEY idx_wbd_mail_audit_recent (organization_id, occurred_at),
  KEY idx_wbd_mail_audit_subject (organization_id, subject_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
