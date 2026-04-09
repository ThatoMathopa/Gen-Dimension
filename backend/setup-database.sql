-- =====================================================
-- Gen Dimension — Database Setup
-- Run this in cPanel > phpMyAdmin on gendimen_DB
-- =====================================================

USE `gendimen_DB`;

-- ── Orders ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
  `id`               VARCHAR(20)     NOT NULL,
  `customer_name`    VARCHAR(255)    NOT NULL,
  `customer_email`   VARCHAR(255)    NOT NULL,
  `customer_phone`   VARCHAR(50)     NOT NULL,
  `delivery_address` TEXT            NOT NULL,
  `items`            JSON            NOT NULL,
  `total`            DECIMAL(10,2)   NOT NULL,
  `notes`            TEXT            DEFAULT NULL,
  `payment_method`   VARCHAR(50)     DEFAULT 'pending',
  `payment_status`   VARCHAR(20)     NOT NULL DEFAULT 'unpaid',
  `status`           VARCHAR(20)     NOT NULL DEFAULT 'new',
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status`         (`status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_created_at`     (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Newsletter ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `newsletter` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255)  NOT NULL,
  `subscribed_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Products ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `products` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255)   NOT NULL,
  `category`    VARCHAR(100)   NOT NULL DEFAULT '',
  `price`       DECIMAL(10,2)  NOT NULL,
  `description` TEXT           NOT NULL DEFAULT '',
  `image`       VARCHAR(500)   NOT NULL DEFAULT '',
  `created_at`  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `products` (`id`, `name`, `category`, `price`, `description`, `image`) VALUES
  (1, 'TV Stand Beam',  'TV Stand', 1800.00, 'Sleek low-profile TV stand with open shelving.',    ''),
  (2, 'TV Stand Pivot', 'TV Stand', 1800.00, 'Compact TV stand with swivel-mount compatibility.', ''),
  (3, 'Drawer Drift',   'Drawer',   1500.00, '3-drawer chest in a smooth matte finish.',          ''),
  (4, 'Drawer Stack',   'Drawer',   1500.00, 'Stackable drawer unit for versatile storage.',      ''),
  (5, 'Drawer Ridge',   'Drawer',   1500.00, 'Wide 4-drawer dresser with ridge-line handles.',    '');

-- ── Contacts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `contacts` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255)  NOT NULL,
  `email`      VARCHAR(255)  NOT NULL,
  `subject`    VARCHAR(255)  DEFAULT '',
  `message`    TEXT          NOT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
