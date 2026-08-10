ALTER TABLE experience_sessions
  ADD COLUMN insight_recognition VARCHAR(16) NULL AFTER chosen_step_id,
  ADD COLUMN active_reflection_topic VARCHAR(24) NULL AFTER insight_recognition;

CREATE TABLE experience_reflections (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  topic VARCHAR(24) NOT NULL,
  response TEXT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_experience_reflection_topic (session_id, topic),
  CONSTRAINT fk_experience_reflection_session FOREIGN KEY (session_id) REFERENCES experience_sessions(id) ON DELETE CASCADE,
  INDEX idx_experience_reflection_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
