ALTER TABLE experience_invitations
  ADD COLUMN entry_type VARCHAR(16) NOT NULL DEFAULT 'personal' AFTER description,
  ADD COLUMN participant_name VARCHAR(120) NULL AFTER entry_type,
  ADD COLUMN participant_role VARCHAR(120) NULL AFTER participant_name,
  ADD COLUMN participant_organization VARCHAR(160) NULL AFTER participant_role,
  ADD COLUMN referral_id VARCHAR(96) NULL AFTER participant_organization,
  ADD INDEX idx_experience_invitations_entry_type (entry_type),
  ADD INDEX idx_experience_invitations_referral (referral_id);
