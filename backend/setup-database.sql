-- =====================================================
-- Gen Dimension — Full Database Setup
-- Run this in cPanel > phpMyAdmin on gendimen_DB
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = '';

-- ── Drop existing tables (clean slate) ───────────────────────────
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `newsletter`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `contacts`;

-- ── Orders ────────────────────────────────────────────────────────
CREATE TABLE `orders` (
  `id`               VARCHAR(20)    NOT NULL,
  `customer_name`    VARCHAR(255)   NOT NULL,
  `customer_email`   VARCHAR(255)   NOT NULL,
  `customer_phone`   VARCHAR(50)    NOT NULL,
  `delivery_address` TEXT           NOT NULL,
  `items`            LONGTEXT       NOT NULL,
  `total`            DECIMAL(10,2)  NOT NULL,
  `notes`            TEXT           DEFAULT NULL,
  `payment_method`    VARCHAR(50)    DEFAULT 'pending',
  `payment_status`    VARCHAR(20)    NOT NULL DEFAULT 'unpaid',
  `status`            VARCHAR(20)    NOT NULL DEFAULT 'new',
  `delivery_province` VARCHAR(50)    NOT NULL DEFAULT 'Gauteng',
  `delivery_fee`      DECIMAL(10,2)  NOT NULL DEFAULT 150.00,
  `created_at`        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status`         (`status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_created_at`     (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Newsletter ────────────────────────────────────────────────────
CREATE TABLE `newsletter` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255)  NOT NULL,
  `subscribed_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Products ──────────────────────────────────────────────────────
CREATE TABLE `products` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(255)   NOT NULL,
  `category`    VARCHAR(100)   NOT NULL DEFAULT '',
  `price`       DECIMAL(10,2)  NOT NULL,
  `description` TEXT           NOT NULL DEFAULT '',
  `image`       VARCHAR(500)   NOT NULL DEFAULT '',
  `created_at`  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Contacts ──────────────────────────────────────────────────────
CREATE TABLE `contacts` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255)  NOT NULL,
  `email`      VARCHAR(255)  NOT NULL,
  `subject`    VARCHAR(255)  DEFAULT '',
  `message`    TEXT          NOT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed products ─────────────────────────────────────────────────
-- Prices absorb PayFast card fee (2.9% + R1) so displayed price = final amount received
INSERT INTO `products` (`name`, `category`, `price`, `description`, `image`) VALUES
  -- TV Stands
  ('Beam TV Stand',          'TV Stand', 1900.00, 'Sleek low-profile TV stand with open shelving.',                  ''),
  ('Pivot TV Stand',         'TV Stand', 1900.00, 'Compact TV stand with swivel-mount compatibility.',               ''),
  -- Drawers
  ('Drift 3-Drawer',         'Drawer',   1600.00, '3-drawer chest in a smooth matte finish.',                        ''),
  ('Stack 5-Drawer',         'Drawer',   1600.00, 'Stackable drawer unit for versatile storage.',                    ''),
  ('Ridge Bedside Drawers',  'Drawer',   1600.00, 'Wide bedside drawer unit with ridge-line handles.',               ''),
  -- Seating
  ('Slate Sofa',             'Seating', 29800.00, 'Contemporary fabric sofa in slate grey tones.',                   ''),
  ('Dune Armchair',          'Seating', 12800.00, 'Plush single armchair with solid wood legs.',                     ''),
  ('Lune Accent Chair',      'Seating',  9200.00, 'Curved accent chair with premium upholstery.',                    ''),
  -- Tables
  ('Arca Dining Table',      'Tables',  35600.00, 'Solid wood dining table seats 6–8 comfortably.',                  ''),
  ('Axis Coffee Table',      'Tables',   9900.00, 'Minimalist coffee table with lower shelf storage.',               ''),
  -- Storage
  ('Crest Bookshelf',        'Storage', 18750.00, 'Open-back bookshelf with adjustable shelves.',                    ''),
  ('Vault Sideboard',        'Storage', 27200.00, 'Wide sideboard with soft-close doors and brass handles.',         ''),
  -- Bedroom
  ('Forma Bed Frame',        'Bedroom', 23500.00, 'Platform bed frame with upholstered headboard.', '');

SET FOREIGN_KEY_CHECKS = 1;

-- ── Done ─────────────────────────────────────────────────────────
SELECT 'Database setup complete.' AS status;
