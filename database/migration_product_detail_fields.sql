-- Bổ sung thông tin sản phẩm (chạy một lần trên DB hiện có)
-- mysql -u ... auction_db < database/migration_product_detail_fields.sql

ALTER TABLE products
  ADD COLUMN buy_now_price DECIMAL(15, 2) DEFAULT NULL COMMENT 'Giá mua ngay (tùy chọn)',
  ADD COLUMN bid_increment DECIMAL(15, 2) DEFAULT NULL COMMENT 'Bước giá tối thiểu; NULL = theo quy tắc hệ thống',
  ADD COLUMN deposit_required DECIMAL(15, 2) NOT NULL DEFAULT 0 COMMENT 'Cọc tham gia (thông tin hiển thị)',
  ADD COLUMN location VARCHAR(255) DEFAULT NULL COMMENT 'Khu vực / địa điểm xem hàng',
  ADD COLUMN video_url VARCHAR(512) DEFAULT NULL COMMENT 'Link video (YouTube/Vimeo/Direct)',
  ADD COLUMN attributes JSON DEFAULT NULL COMMENT 'Thông số bổ sung dạng object key-value';
