-- If importing through phpMyAdmin on Hostinger, skip the next two lines
-- and import into the database hPanel created for you.
CREATE DATABASE IF NOT EXISTS georgetown;
USE georgetown;

CREATE TABLE contact_messages (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_name  VARCHAR(150) NOT NULL,
  company_name  VARCHAR(150) NULL,
  email         VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(30)  NOT NULL,
  message       TEXT         NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE applications (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name        VARCHAR(150) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  mobile           VARCHAR(30)  NOT NULL,
  position         VARCHAR(50)  NOT NULL,   -- electrical-engineer, field-technician, project-manager, administrative-staff
  resume_path      VARCHAR(500) NOT NULL,   -- where the uploaded file is saved, not the file itself
  resume_original  VARCHAR(255) NOT NULL,   -- original filename, e.g. "Juan_Cruz_CV.pdf"
  resume_mime      VARCHAR(100) NULL,
  resume_size      INT UNSIGNED NULL,       -- bytes
  message          TEXT         NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_position (position),
  INDEX idx_app_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;