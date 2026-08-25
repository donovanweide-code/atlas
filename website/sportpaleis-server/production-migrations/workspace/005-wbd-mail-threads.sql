CREATE TABLE IF NOT EXISTS wbd_mail_threads (
  id VARCHAR(80) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL,
  last_activity_at DATETIME(3) NOT NULL,
  thread_json JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_wbd_mail_thread_recent (organization_id, last_activity_at),
  KEY idx_wbd_mail_thread_attention (organization_id, status, priority, last_activity_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
