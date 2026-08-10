-- Sportpaleis Bedrukking minimal pilot build
-- Reproduceerbare MariaDB migration candidate. NIET autonoom op TransIP uitvoeren.
-- Maak vooraf een databaseback-up en controleer de preflight-resultaten.

SELECT COUNT(*) AS orders_before FROM sp_orders;
SELECT COUNT(*) AS items_before FROM sp_order_items;
SELECT COUNT(*) AS duplicate_order_ids FROM (SELECT id FROM sp_orders GROUP BY id HAVING COUNT(*) > 1) AS duplicates;

ALTER TABLE sp_users
  MODIFY COLUMN role ENUM('admin','operator','store','support') NOT NULL;

ALTER TABLE sp_orders
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(254) NULL AFTER customer,
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(40) NULL AFTER customer_email,
  ADD COLUMN IF NOT EXISTS associations_json JSON NULL AFTER association_name,
  ADD COLUMN IF NOT EXISTS standard_personalization_json JSON NULL AFTER associations_json,
  MODIFY COLUMN promised_at DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS order_kind ENUM('INDIVIDUAL','LEGACY') NOT NULL DEFAULT 'LEGACY' AFTER promised_at,
  ADD COLUMN IF NOT EXISTS total_pieces SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER owner_user_id,
  ADD COLUMN IF NOT EXISTS foil_states_json JSON NULL AFTER production_reference,
  ADD COLUMN IF NOT EXISTS notes_json JSON NULL AFTER foil_states_json,
  ADD COLUMN IF NOT EXISTS priority_json JSON NULL AFTER notes_json,
  ADD COLUMN IF NOT EXISTS communication_json JSON NULL AFTER priority_json,
  ADD COLUMN IF NOT EXISTS barcode_json JSON NULL AFTER communication_json,
  ADD COLUMN IF NOT EXISTS pickup_json JSON NULL AFTER barcode_json,
  ADD COLUMN IF NOT EXISTS event_history_json JSON NULL AFTER pickup_json;

UPDATE sp_orders
SET associations_json = COALESCE(associations_json, JSON_ARRAY(association_name)),
    standard_personalization_json = COALESCE(standard_personalization_json, JSON_OBJECT(
      'initials', '', 'name', '', 'backNumber', '', 'backNumberSizeClass', '', 'shortsNumber', ''
    )),
    foil_states_json = COALESCE(foil_states_json, JSON_ARRAY()),
    notes_json = COALESCE(notes_json, JSON_ARRAY()),
    communication_json = COALESCE(communication_json, JSON_OBJECT(
      'requiredForIndividualOrder', FALSE,
      'receipt', JSON_OBJECT('status', 'NOT_SENT', 'updatedAt', DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.000Z')),
      'ready', JSON_OBJECT('status', 'NOT_SENT', 'updatedAt', DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.000Z'))
    )),
    pickup_json = COALESCE(pickup_json, JSON_OBJECT('status', 'NOT_PICKED_UP', 'pickedUpAt', NULL, 'pickedUpBy', NULL)),
    event_history_json = COALESCE(event_history_json, JSON_ARRAY()),
    total_pieces = COALESCE((SELECT SUM(item.quantity) FROM sp_order_items item WHERE item.order_id = sp_orders.id), 0);

ALTER TABLE sp_orders
  MODIFY COLUMN associations_json JSON NOT NULL,
  MODIFY COLUMN standard_personalization_json JSON NOT NULL,
  MODIFY COLUMN foil_states_json JSON NOT NULL,
  MODIFY COLUMN notes_json JSON NOT NULL,
  MODIFY COLUMN communication_json JSON NOT NULL,
  MODIFY COLUMN pickup_json JSON NOT NULL,
  MODIFY COLUMN event_history_json JSON NOT NULL;

ALTER TABLE sp_order_items
  ADD COLUMN IF NOT EXISTS article_id VARCHAR(64) NULL AFTER order_id,
  ADD COLUMN IF NOT EXISTS article_number VARCHAR(120) NULL AFTER article_id,
  ADD COLUMN IF NOT EXISTS image_key VARCHAR(120) NULL AFTER article_number,
  ADD COLUMN IF NOT EXISTS association_name VARCHAR(160) NULL AFTER product,
  ADD COLUMN IF NOT EXISTS size_label VARCHAR(40) NULL AFTER association_name,
  ADD COLUMN IF NOT EXISTS personalization_values_json JSON NULL AFTER personalization,
  ADD COLUMN IF NOT EXISTS deviation BOOLEAN NOT NULL DEFAULT FALSE AFTER personalization_values_json,
  ADD COLUMN IF NOT EXISTS production_profile_id VARCHAR(64) NULL AFTER foil_color,
  ADD COLUMN IF NOT EXISTS production_instruction TEXT NULL AFTER production_profile_id,
  ADD COLUMN IF NOT EXISTS back_number_production_json JSON NULL AFTER production_instruction;

CREATE TABLE IF NOT EXISTS sp_order_item_variants (
  id VARCHAR(64) PRIMARY KEY,
  order_item_id VARCHAR(64) NOT NULL,
  sequence_no SMALLINT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  size_label VARCHAR(40) NOT NULL,
  personalization VARCHAR(500) NOT NULL,
  personalization_values_json JSON NULL,
  deviation BOOLEAN NOT NULL DEFAULT FALSE,
  back_number_production_json JSON NULL,
  CONSTRAINT fk_sp_variants_item FOREIGN KEY (order_item_id) REFERENCES sp_order_items(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sp_variants_item_sequence (order_item_id, sequence_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sp_audit (user_id, action_name, subject, details_json, created_at)
VALUES ('system', 'Schema migration voorbereid', 'SPW-BEDRUKKING-PILOT-001-20260809', JSON_OBJECT('from', '008A', 'to', 'pilot-001', 'productionExecuted', FALSE), UTC_TIMESTAMP(3));

SELECT COUNT(*) AS orders_after FROM sp_orders;
SELECT COUNT(*) AS items_after FROM sp_order_items;
SELECT COUNT(*) AS orders_missing_required_json
FROM sp_orders
WHERE associations_json IS NULL
   OR standard_personalization_json IS NULL
   OR communication_json IS NULL
   OR event_history_json IS NULL;
