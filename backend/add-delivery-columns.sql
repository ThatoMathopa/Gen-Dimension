-- =====================================================
-- Gen Dimension — Delivery columns migration
-- Run in cPanel > phpMyAdmin on gendimen_DB
-- Safe to run on an existing database with orders
-- =====================================================

ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `delivery_province` VARCHAR(50)   NOT NULL DEFAULT 'Gauteng'  AFTER `status`,
  ADD COLUMN IF NOT EXISTS `delivery_fee`      DECIMAL(10,2) NOT NULL DEFAULT 150.00      AFTER `delivery_province`;

SELECT 'Migration complete.' AS status;
SELECT `id`, `delivery_province`, `delivery_fee` FROM `orders` LIMIT 10;
