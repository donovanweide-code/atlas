-- Sportpaleis Workspace Pilot Foundation 006
-- Deployment target: existing TransIP MariaDB/MySQL, utf8mb4, InnoDB.
-- No credentials or customer data belong in this file.

CREATE TABLE sp_users (
  id VARCHAR(64) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  initials VARCHAR(8) NOT NULL,
  email VARCHAR(254) NOT NULL,
  role ENUM('admin','operator','store','support') NOT NULL,
  status ENUM('Actief','Inactief','Uitgenodigd') NOT NULL DEFAULT 'Actief',
  seat_type ENUM('customer','support') NOT NULL,
  sales_number VARCHAR(8) NULL,
  password_hash VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_sp_users_email (email),
  UNIQUE KEY uq_sp_users_sales_number (organization_id, sales_number),
  KEY idx_sp_users_org_status (organization_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_user_activation_invites (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  CONSTRAINT fk_sp_activation_user FOREIGN KEY (user_id) REFERENCES sp_users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sp_activation_token_hash (token_hash),
  KEY idx_sp_activation_expiry (expires_at, used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_associations (
  id VARCHAR(80) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  name VARCHAR(160) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source_json JSON NOT NULL,
  production_configuration_json JSON NOT NULL,
  article_catalog_status VARCHAR(80) NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  validation_history_json JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_sp_association_org_name (organization_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_sessions (
  id_hash CHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  csrf_hash CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_sp_sessions_user FOREIGN KEY (user_id) REFERENCES sp_users(id) ON DELETE CASCADE,
  KEY idx_sp_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_orders (
  id VARCHAR(32) PRIMARY KEY,
  organization_id VARCHAR(64) NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  customer VARCHAR(160) NOT NULL,
  customer_email VARCHAR(254) NULL,
  customer_phone VARCHAR(40) NULL,
  association_name VARCHAR(160) NOT NULL,
  associations_json JSON NOT NULL,
  standard_personalization_json JSON NOT NULL,
  promised_at DATETIME(3) NULL,
  order_kind ENUM('INDIVIDUAL','TEAM','CUSTOM','LEGACY') NOT NULL DEFAULT 'LEGACY',
  stage ENUM('ORDER','CONTROL','PRINT','DONE') NOT NULL DEFAULT 'ORDER',
  owner_user_id VARCHAR(64) NOT NULL,
  accepted_by_json JSON NOT NULL,
  total_pieces SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  attention VARCHAR(500) NULL,
  production_reference VARCHAR(64) NULL,
  foil_states_json JSON NOT NULL,
  notes_json JSON NOT NULL,
  priority_json JSON NULL,
  communication_json JSON NOT NULL,
  barcode_json JSON NULL,
  pickup_json JSON NOT NULL,
  event_history_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_sp_orders_owner FOREIGN KEY (owner_user_id) REFERENCES sp_users(id),
  KEY idx_sp_orders_org_stage (organization_id, stage),
  KEY idx_sp_orders_promised (promised_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL,
  article_id VARCHAR(64) NULL,
  article_number VARCHAR(120) NULL,
  image_key VARCHAR(120) NULL,
  product VARCHAR(180) NOT NULL,
  association_name VARCHAR(160) NULL,
  size_label VARCHAR(40) NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  personalization VARCHAR(500) NOT NULL,
  personalization_values_json JSON NULL,
  deviation BOOLEAN NOT NULL DEFAULT FALSE,
  foil_color VARCHAR(40) NOT NULL,
  production_profile_id VARCHAR(64) NULL,
  production_instruction TEXT NULL,
  back_number_production_json JSON NULL,
  source_type ENUM('CATALOG','CUSTOM','LEGACY') NOT NULL DEFAULT 'LEGACY',
  source_provenance VARCHAR(500) NULL,
  production_readiness_json JSON NOT NULL,
  CONSTRAINT fk_sp_order_items_order FOREIGN KEY (order_id) REFERENCES sp_orders(id) ON DELETE CASCADE,
  KEY idx_sp_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_order_item_variants (
  id VARCHAR(64) PRIMARY KEY,
  order_item_id VARCHAR(64) NOT NULL,
  sequence_no SMALLINT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  size_label VARCHAR(40) NOT NULL,
  personalization VARCHAR(500) NOT NULL,
  personalization_values_json JSON NULL,
  deviation BOOLEAN NOT NULL DEFAULT FALSE,
  back_number_production_json JSON NULL,
  participant_name VARCHAR(120) NULL,
  CONSTRAINT fk_sp_variants_item FOREIGN KEY (order_item_id) REFERENCES sp_order_items(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sp_variants_item_sequence (order_item_id, sequence_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_catalog_articles (
  id VARCHAR(64) PRIMARY KEY,
  article_number VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  image_key VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  association_name VARCHAR(160) NOT NULL,
  production_profile_id VARCHAR(64) NOT NULL,
  supports_json JSON NOT NULL,
  personalization_policy_json JSON NOT NULL,
  price_configuration_json JSON NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  variant_labels_json JSON NOT NULL,
  available_sizes_json JSON NOT NULL,
  validation_json JSON NOT NULL,
  validation_history_json JSON NOT NULL,
  catalog_metadata_json JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_sp_catalog_association_active (association_name, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_production_profiles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  placement VARCHAR(180) NOT NULL,
  reference_distance_cm DECIMAL(6,2) NULL,
  size_label VARCHAR(120) NOT NULL,
  font_profile VARCHAR(120) NOT NULL,
  foil_color VARCHAR(40) NOT NULL,
  mirror BOOLEAN NULL,
  rotation_deg SMALLINT NULL,
  instruction TEXT NOT NULL,
  back_number_size_classes_json JSON NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  validation_json JSON NOT NULL,
  validation_history_json JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_settings (
  organization_id VARCHAR(64) PRIMARY KEY,
  settings_json JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_foil_rolls (
  id VARCHAR(64) PRIMARY KEY,
  color VARCHAR(40) NOT NULL,
  supplier_type VARCHAR(160) NOT NULL,
  purchase_price_eur DECIMAL(10,2) NULL,
  original_length_m DECIMAL(10,2) NULL,
  width_mm DECIMAL(10,2) NOT NULL,
  used_length_mm DECIMAL(12,2) NOT NULL,
  updated_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_feedback (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  page VARCHAR(180) NOT NULL,
  module_name VARCHAR(80) NOT NULL,
  category ENUM('Vraag','Verbetering','Probleem') NOT NULL,
  description TEXT NOT NULL,
  release_id VARCHAR(120) NOT NULL,
  order_id VARCHAR(32) NULL,
  attachments_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_sp_feedback_user FOREIGN KEY (user_id) REFERENCES sp_users(id),
  KEY idx_sp_feedback_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_preferences (
  user_id VARCHAR(64) PRIMARY KEY,
  preference_json JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_sp_preferences_user FOREIGN KEY (user_id) REFERENCES sp_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  action_name VARCHAR(120) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  details_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_sp_audit_subject_created (subject, created_at),
  KEY idx_sp_audit_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_idempotency (
  identity_hash CHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  operation_name VARCHAR(80) NOT NULL,
  response_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_sp_idempotency_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_login_attempts (
  attempt_hash CHAR(64) NOT NULL,
  attempted_at DATETIME(3) NOT NULL,
  KEY idx_sp_login_attempts_window (attempt_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sp_user_requests (
  id VARCHAR(64) PRIMARY KEY,
  requested_by VARCHAR(64) NOT NULL,
  quantity TINYINT UNSIGNED NOT NULL,
  monthly_price_eur DECIMAL(6,2) NOT NULL,
  status VARCHAR(40) NOT NULL,
  requested_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_sp_user_requests_user FOREIGN KEY (requested_by) REFERENCES sp_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
