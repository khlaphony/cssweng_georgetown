USE georgetown;

ALTER TABLE applications
  ADD COLUMN citizenship_path        VARCHAR(500) NOT NULL AFTER resume_size,
  ADD COLUMN citizenship_original    VARCHAR(255) NOT NULL AFTER citizenship_path,
  ADD COLUMN citizenship_mime        VARCHAR(100) NULL     AFTER citizenship_original,
  ADD COLUMN citizenship_size        INT UNSIGNED NULL     AFTER citizenship_mime,
  ADD COLUMN photo_path              VARCHAR(500) NULL     AFTER citizenship_size,
  ADD COLUMN photo_original          VARCHAR(255) NULL     AFTER photo_path,
  ADD COLUMN photo_mime              VARCHAR(100) NULL     AFTER photo_original,
  ADD COLUMN photo_size              INT UNSIGNED NULL     AFTER photo_mime,
  ADD COLUMN age                     TINYINT UNSIGNED NULL AFTER mobile,
  ADD COLUMN years_experience        TINYINT UNSIGNED NULL AFTER age,
  ADD COLUMN prior_experience        TEXT         NULL     AFTER years_experience,
  ADD COLUMN similar_company         VARCHAR(255) NULL     AFTER prior_experience,
  ADD COLUMN soft_skills             TEXT         NULL     AFTER similar_company,
  ADD COLUMN hard_skills             TEXT         NULL     AFTER soft_skills,
  ADD COLUMN terms_accepted          TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN terms_accepted_at       TIMESTAMP    NULL,
  ADD INDEX idx_app_experience (years_experience);