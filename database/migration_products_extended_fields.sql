-- Optional columns used by createProduct (buy now, custom bid step, vehicle metadata, etc.)
-- Prefer restarting the API: initAdminTables() adds these idempotently.
-- If applying by hand, run only the statements for columns you are missing (ignore Duplicate column errors).

USE auction_db;

ALTER TABLE products ADD COLUMN buy_now_price DECIMAL(15, 2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN bid_increment DECIMAL(15, 2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN deposit_required DECIMAL(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN location VARCHAR(255) DEFAULT NULL;
ALTER TABLE products ADD COLUMN video_url VARCHAR(512) DEFAULT NULL;
ALTER TABLE products ADD COLUMN attributes JSON DEFAULT NULL;
