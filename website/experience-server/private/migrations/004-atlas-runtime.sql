CREATE TABLE experience_runtime_states (
  session_id CHAR(36) NOT NULL PRIMARY KEY,
  revision BIGINT UNSIGNED NOT NULL DEFAULT 0,
  field_json JSON NOT NULL,
  decision_json JSON NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_experience_runtime_state_session FOREIGN KEY (session_id) REFERENCES experience_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_runtime_journal (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  event_id VARCHAR(96) NOT NULL,
  base_revision BIGINT UNSIGNED NOT NULL,
  committed_revision BIGINT UNSIGNED NOT NULL,
  event_json JSON NOT NULL,
  transition_json JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_experience_runtime_event (session_id, event_id),
  UNIQUE KEY uq_experience_runtime_revision (session_id, committed_revision),
  CONSTRAINT fk_experience_runtime_journal_session FOREIGN KEY (session_id) REFERENCES experience_sessions(id) ON DELETE CASCADE,
  INDEX idx_experience_runtime_journal_created (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
