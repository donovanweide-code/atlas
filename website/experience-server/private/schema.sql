CREATE TABLE experience_invitations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  description VARCHAR(120) NULL,
  entry_type VARCHAR(16) NOT NULL DEFAULT 'personal',
  participant_name VARCHAR(120) NULL,
  participant_role VARCHAR(120) NULL,
  participant_organization VARCHAR(160) NULL,
  referral_id VARCHAR(96) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'created',
  technical_test TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  opened_at DATETIME(6) NULL,
  started_at DATETIME(6) NULL,
  completed_at DATETIME(6) NULL,
  last_active_at DATETIME(6) NULL,
  expires_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  INDEX idx_experience_invitations_status (status),
  INDEX idx_experience_invitations_entry_type (entry_type),
  INDEX idx_experience_invitations_referral (referral_id),
  INDEX idx_experience_invitations_last_active (last_active_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  invitation_id CHAR(36) NOT NULL UNIQUE,
  phase VARCHAR(16) NOT NULL,
  current_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
  chosen_step_id VARCHAR(24) NULL,
  insight_recognition VARCHAR(16) NULL,
  active_reflection_topic VARCHAR(24) NULL,
  workspace_opened TINYINT(1) NOT NULL DEFAULT 0,
  experience_version VARCHAR(40) NOT NULL,
  started_at DATETIME(6) NOT NULL,
  completed_at DATETIME(6) NULL,
  last_active_at DATETIME(6) NOT NULL,
  error_status VARCHAR(80) NULL,
  CONSTRAINT fk_experience_session_invitation FOREIGN KEY (invitation_id) REFERENCES experience_invitations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_answers (
  session_id CHAR(36) NOT NULL,
  step_id VARCHAR(24) NOT NULL,
  answer TEXT NOT NULL,
  submitted_at DATETIME(6) NOT NULL,
  PRIMARY KEY (session_id, step_id),
  CONSTRAINT fk_experience_answer_session FOREIGN KEY (session_id) REFERENCES experience_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE experience_feedback (
  id CHAR(36) NOT NULL PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  expected TEXT NOT NULL,
  happened TEXT NOT NULL,
  `natural` TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_experience_feedback_session FOREIGN KEY (session_id) REFERENCES experience_sessions(id) ON DELETE CASCADE,
  INDEX idx_experience_feedback_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invitation_id CHAR(36) NOT NULL,
  session_id CHAR(36) NULL,
  event_type VARCHAR(40) NOT NULL,
  step_id VARCHAR(24) NULL,
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_experience_event_invitation FOREIGN KEY (invitation_id) REFERENCES experience_invitations(id) ON DELETE CASCADE,
  CONSTRAINT fk_experience_event_session FOREIGN KEY (session_id) REFERENCES experience_sessions(id) ON DELETE CASCADE,
  INDEX idx_experience_events_invitation_created (invitation_id, created_at),
  INDEX idx_experience_events_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_participant_access (
  id CHAR(36) NOT NULL PRIMARY KEY,
  invitation_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at DATETIME(6) NOT NULL,
  last_used_at DATETIME(6) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_experience_access_invitation FOREIGN KEY (invitation_id) REFERENCES experience_invitations(id) ON DELETE CASCADE,
  INDEX idx_experience_access_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_observations (
  invitation_id CHAR(36) NOT NULL PRIMARY KEY,
  expected TEXT NOT NULL,
  surprising TEXT NOT NULL,
  valuable TEXT NOT NULL,
  confusing TEXT NOT NULL,
  improvement TEXT NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_experience_observation_invitation FOREIGN KEY (invitation_id) REFERENCES experience_invitations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_rate_limits (
  rate_key CHAR(64) NOT NULL PRIMARY KEY,
  window_started_at DATETIME(6) NOT NULL,
  request_count SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
