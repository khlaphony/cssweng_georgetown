-- Apply after applicationForm.sql to relax columns required by an earlier form.
-- These fields are retained for existing data but are no longer part of the application form.
USE georgetown;

ALTER TABLE applications
  MODIFY COLUMN photo_path         VARCHAR(500) NULL,
  MODIFY COLUMN photo_original     VARCHAR(255) NULL,
  MODIFY COLUMN age                TINYINT UNSIGNED NULL,
  MODIFY COLUMN years_experience   TINYINT UNSIGNED NULL,
  MODIFY COLUMN prior_experience   TEXT NULL,
  MODIFY COLUMN soft_skills        TEXT NULL,
  MODIFY COLUMN hard_skills        TEXT NULL;

CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(50)  PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS product_inquiries;
