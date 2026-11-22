USE georgetown;

-- Email and mobile optional
ALTER TABLE contact_messages
  MODIFY COLUMN email         VARCHAR(255) NULL,
  MODIFY COLUMN mobile_number VARCHAR(30)  NULL;

-- topic: quotation | services | products | careers | other
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_messages' AND COLUMN_NAME = 'topic');
SET @sql := IF(@has_col = 0,
  "ALTER TABLE contact_messages ADD COLUMN topic VARCHAR(30) NOT NULL DEFAULT 'other' AFTER mobile_number",
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- replied: 0 = not yet replied, 1 = admin marked it as replied
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_messages' AND COLUMN_NAME = 'replied');
SET @sql := IF(@has_col = 0,
  'ALTER TABLE contact_messages ADD COLUMN replied TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- replied_at: when the admin ticked the checkmark
SET @has_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_messages' AND COLUMN_NAME = 'replied_at');
SET @sql := IF(@has_col = 0,
  'ALTER TABLE contact_messages ADD COLUMN replied_at TIMESTAMP NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;