CREATE TABLE IF NOT EXISTS users (
  id CHAR(32) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  whatsapp VARCHAR(40) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS campaigns (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  description TEXT NULL,
  is_paid TINYINT(1) NOT NULL DEFAULT 0,
  price_cents INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  total_questions INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS questions (
  id CHAR(36) PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  public_code VARCHAR(40) NULL,
  discipline VARCHAR(120) NULL,
  topic VARCHAR(190) NULL,
  base_text TEXT NULL,
  statement TEXT NOT NULL,
  correct_answer TINYINT(1) NOT NULL,
  feedback_correct TEXT NULL,
  feedback_wrong TEXT NULL,
  key_point TEXT NULL,
  difficulty VARCHAR(20) NULL,
  answer_status VARCHAR(20) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_campaign (campaign_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS attempts (
  id CHAR(32) PRIMARY KEY,
  user_id CHAR(32) NOT NULL,
  campaign_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  current_index INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  fingerprint VARCHAR(64) NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  INDEX idx_user (user_id, campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS attempt_answers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  attempt_id CHAR(32) NOT NULL,
  question_id CHAR(36) NOT NULL,
  position INT NOT NULL,
  answer TINYINT(1) NULL,
  is_correct TINYINT(1) NULL,
  answered_at TIMESTAMP NULL,
  UNIQUE KEY uniq_attempt_question (attempt_id, question_id),
  INDEX idx_attempt (attempt_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS simulado_access (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(32) NOT NULL,
  campaign_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'blocked',
  granted_at TIMESTAMP NULL,
  UNIQUE KEY uniq_user_campaign (user_id, campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(32) PRIMARY KEY,
  user_id CHAR(32) NULL,
  campaign_id CHAR(36) NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'purchase',
  provider_payment_id VARCHAR(64) NULL,
  amount_cents INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  qr_code TEXT NULL,
  qr_code_base64 LONGTEXT NULL,
  ticket_url TEXT NULL,
  fingerprint VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  INDEX idx_user (user_id),
  INDEX idx_provider (provider_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(32) NULL,
  name VARCHAR(160) NULL,
  email VARCHAR(190) NULL,
  whatsapp VARCHAR(40) NULL,
  source VARCHAR(60) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(80) PRIMARY KEY,
  `value` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;--END--
