CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plans_name (name)
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone VARCHAR(32) NOT NULL,
  name VARCHAR(160) NULL,
  email VARCHAR(190) NULL,
  plan_id BIGINT UNSIGNED NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ativo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_plan_id (plan_id),
  CONSTRAINT fk_users_plan_id
    FOREIGN KEY (plan_id) REFERENCES plans (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  phone VARCHAR(32) NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'webhook',
  original_message TEXT NULL,
  type VARCHAR(40) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  category VARCHAR(120) NOT NULL DEFAULT 'geral',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transactions_user_id (user_id),
  KEY idx_transactions_phone (phone),
  KEY idx_transactions_created_at (created_at),
  CONSTRAINT fk_transactions_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  phone VARCHAR(32) NULL,
  mercadopago_payment_id VARCHAR(120) NULL,
  external_reference VARCHAR(160) NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(80) NOT NULL DEFAULT 'pending',
  raw_payload LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_user_id (user_id),
  KEY idx_payments_phone (phone),
  KEY idx_payments_mp_payment_id (mercadopago_payment_id),
  KEY idx_payments_external_reference (external_reference),
  CONSTRAINT fk_payments_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS downloads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  type VARCHAR(80) NOT NULL,
  required_plan_id BIGINT UNSIGNED NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_downloads_required_plan_id (required_plan_id),
  CONSTRAINT fk_downloads_required_plan_id
    FOREIGN KEY (required_plan_id) REFERENCES plans (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

INSERT INTO plans (name, price, status)
VALUES
  ('teste', 0.00, 'active'),
  ('mensal', 19.90, 'active')
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  status = VALUES(status);
