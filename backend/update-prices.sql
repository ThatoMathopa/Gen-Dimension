-- =====================================================
-- Gen Dimension — Price Update Migration
-- Run in cPanel > phpMyAdmin on gendimen_DB
-- Updates existing products to fee-absorbed prices
-- and renames/adds any missing products.
-- =====================================================

-- TV Stands
UPDATE `products` SET `name` = 'Beam TV Stand',         `price` = 1900.00 WHERE `name` LIKE '%Beam%'  AND `category` LIKE '%TV%';
UPDATE `products` SET `name` = 'Pivot TV Stand',        `price` = 1900.00 WHERE `name` LIKE '%Pivot%' AND `category` LIKE '%TV%';

-- Drawers
UPDATE `products` SET `name` = 'Drift 3-Drawer',        `price` = 1600.00 WHERE `name` LIKE '%Drift%';
UPDATE `products` SET `name` = 'Stack 5-Drawer',        `price` = 1600.00 WHERE `name` LIKE '%Stack%';
UPDATE `products` SET `name` = 'Ridge Bedside Drawers', `price` = 1600.00 WHERE `name` LIKE '%Ridge%';

-- Seating
UPDATE `products` SET `price` = 29800.00 WHERE `name` LIKE '%Slate%';
UPDATE `products` SET `price` = 12800.00 WHERE `name` LIKE '%Dune%';
UPDATE `products` SET `price` =  9200.00 WHERE `name` LIKE '%Lune%';

-- Tables
UPDATE `products` SET `price` = 35600.00 WHERE `name` LIKE '%Arca%';
UPDATE `products` SET `price` =  9900.00 WHERE `name` LIKE '%Axis%';

-- Storage
UPDATE `products` SET `price` = 18750.00 WHERE `name` LIKE '%Crest%';
UPDATE `products` SET `price` = 27200.00 WHERE `name` LIKE '%Vault%';

-- Bedroom
UPDATE `products` SET `price` = 23500.00 WHERE `name` LIKE '%Forma%';

SELECT 'Price update complete.' AS status;
SELECT `id`, `name`, `category`, `price` FROM `products` ORDER BY `category`, `name`;
