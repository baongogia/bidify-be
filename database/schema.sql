-- ==========================================
-- C2C AUCTION DATABASE SCHEMA
-- Compatible with XAMPP/MySQL
-- ==========================================

DROP DATABASE IF EXISTS auction_db;
CREATE DATABASE auction_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auction_db;

-- Disable foreign key checks for clean setup
SET FOREIGN_KEY_CHECKS=0;

-- Bảng Users (với hệ thống phân quyền)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('BUYER', 'SELLER', 'ADMIN') DEFAULT 'BUYER',
    seller_status ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'NONE',
    seller_request_date DATETIME DEFAULT NULL,
    seller_approved_date DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id INT DEFAULT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Bảng Products
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    condition_status ENUM('NEW', 'USED') DEFAULT 'USED',
    starting_price DECIMAL(15, 2) NOT NULL,
    current_price DECIMAL(15, 2) NOT NULL,
    images JSON,
    status ENUM('DRAFT', 'ACTIVE', 'ENDED_WAITING_PAYMENT', 'COMPLETED', 'UNSOLD', 'CANCELLED') DEFAULT 'DRAFT',
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    payment_deadline DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    INDEX idx_products_status_endtime (status, end_time)
);

-- Bảng Bids
CREATE TABLE bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    bidder_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_bids_product_created (product_id, created_at)
);

-- Bảng Watchlist
CREATE TABLE watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, product_id),
    INDEX idx_watchlist_user_created (user_id, created_at)
);

-- Bảng Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_isread (user_id, is_read)
);

-- Bảng Seller Applications (Đơn đăng ký người bán)
CREATE TABLE seller_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    business_description TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    admin_note TEXT DEFAULT NULL,
    admin_id INT DEFAULT NULL,
    category_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- ==========================================
-- DỮ LIỆU MẪU (SEED DATA)
-- ==========================================

-- 1. Thêm Users với roles
-- Tất cả đều có password là 'password123' (đã được băm sẵn bằng bcrypt $2a$10 round 10)
INSERT INTO users (id, name, email, password_hash, role, seller_status, seller_approved_date) VALUES 
(1, 'Admin Võ', 'admin@daugia.local', '$2a$10$RG8t25so.bes6GV7AWRwcudaa1Aqq7m.v8raT5tWcXeqfAUYLlnC6', 'ADMIN', 'NONE', NULL), 
(2, 'Nhà Bán Uy Tín', 'seller@daugia.local', '$2a$10$RG8t25so.bes6GV7AWRwcudaa1Aqq7m.v8raT5tWcXeqfAUYLlnC6', 'SELLER', 'APPROVED', NOW()),
(3, 'Nguyễn Mua', 'buyer1@daugia.local', '$2a$10$RG8t25so.bes6GV7AWRwcudaa1Aqq7m.v8raT5tWcXeqfAUYLlnC6', 'BUYER', 'NONE', NULL),
(4, 'Trần Đấu Giá', 'buyer2@daugia.local', '$2a$10$RG8t25so.bes6GV7AWRwcudaa1Aqq7m.v8raT5tWcXeqfAUYLlnC6', 'BUYER', 'NONE', NULL);

-- 2. Thêm Categories
INSERT INTO categories (id, name, slug) VALUES 
(1, 'Điện thoại & Máy tính bảng', 'dien-thoai-may-tinh-bang'),
(2, 'Laptop & Phụ kiện', 'laptop-phu-kien'),
(3, 'Tai nghe & Loa', 'tai-nghe-loa'),
(4, 'Đồng hồ & Đồ dùng thông minh', 'dong-ho-thiet-bi-thong-minh'),
(5, 'Máy ảnh, Chơi game & Thể thao', 'may-anh-giat-tri-the-thao'),
(6, 'Gia dụng & Đời sống', 'gia-dung-doi-song');

-- 4. Thêm Products (20 sản phẩm mẫu)
INSERT INTO products (id, seller_id, category_id, title, description, condition_status, starting_price, current_price, images, status, start_time, end_time) VALUES
(1, 2, 1, 'iPhone 13 Pro', 'Tình trạng 98%, xước nhẹ viền máy, pin ổn định, ngoại hình đẹp.', 'USED', 12500000, 12800000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Apple_iPhone_13_Pro.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY)),
(2, 2, 2, 'MacBook Air M1', 'Tình trạng 97%, máy mỏng nhẹ, bàn phím tốt, màn hình đẹp.', 'USED', 14500000, 14800000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/MacBook_Air_M1.png'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 60 HOUR)),
(3, 2, 3, 'AirPods Pro', 'Tình trạng 95%, hộp sạc còn tốt, âm thanh rõ, pin dùng ổn.', 'USED', 2900000, 3100000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Apple_airpods_pro.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 48 HOUR)),
(4, 2, 4, 'Apple Watch Series 8', 'Tình trạng 96%, mặt kính đẹp, dây đeo chắc chắn, hoạt động bình thường.', 'USED', 6800000, 7100000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Apple_Watch_Series_8.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 54 HOUR)),
(5, 2, 2, 'Túi laptop', 'Tình trạng 90%, còn chắc chắn, khóa kéo tốt, phù hợp mang đi học hoặc đi làm.', 'USED', 350000, 420000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Laptop_bag.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 36 HOUR)),
(6, 2, 2, 'Bàn phím cơ', 'Tình trạng 94%, switch nhạy, đèn hoạt động tốt, ngoại hình còn đẹp.', 'USED', 900000, 1050000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Mechanical_Keyboard.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 40 HOUR)),
(7, 2, 2, 'Chuột Logitech', 'Tình trạng 93%, bấm nhạy, kết nối ổn định, ít trầy xước.', 'USED', 550000, 620000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Logitech_Mouse.JPG'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 44 HOUR)),
(8, 2, 2, 'Màn hình Dell', 'Tình trạng 96%, hiển thị tốt, không ám màu, viền đẹp.', 'USED', 2900000, 3150000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Dell_Computer_Monitor.png'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 66 HOUR)),
(9, 2, 3, 'Loa JBL Bluetooth', 'Tình trạng 92%, âm lượng lớn, pin khá, vỏ có xước nhẹ.', 'USED', 1400000, 1650000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/JBL_speaker%2C_2021.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 30 HOUR)),
(10, 2, 5, 'Máy ảnh Canon', 'Tình trạng 95%, chụp nét, lens sạch, ngoại hình tốt.', 'USED', 7300000, 7600000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/My_Canon_EOS_camera.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 70 HOUR)),
(11, 2, 6, 'Ghế văn phòng', 'Tình trạng 90%, khung chắc chắn, bánh xe mượt, đệm ngồi còn tốt.', 'USED', 1100000, 1260000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Office_Chair_Derby_%28157328893%29.jpeg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 28 HOUR)),
(12, 2, 6, 'Bình giữ nhiệt', 'Tình trạng 97%, giữ nhiệt tốt, thân bình đẹp, không móp méo.', 'USED', 250000, 310000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/18oz_Thermos_hydration_bottle.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 52 HOUR)),
(13, 2, 5, 'Xe đạp thể thao', 'Tình trạng 91%, khung chắc, phanh tốt, lốp còn sử dụng ổn.', 'USED', 4200000, 4550000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Bicycle_BK_%281%29.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(14, 2, 6, 'Nồi cơm điện', 'Tình trạng 94%, nấu tốt, lòng nồi sạch, hoạt động ổn định.', 'USED', 620000, 760000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Rice_Cookers.JPG'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 34 HOUR)),
(15, 2, 6, 'Quạt điện', 'Tình trạng 89%, quay tốt, gió mạnh, thân quạt có trầy nhẹ.', 'USED', 350000, 430000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Electric_Fan_20170121.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 22 HOUR)),
(16, 2, 2, 'Máy in HP', 'Tình trạng 93%, in rõ, khay giấy ổn, dùng tốt văn phòng nhỏ.', 'USED', 1500000, 1720000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/HP_Deskjet_All_in_One_Printer.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 46 HOUR)),
(17, 2, 6, 'Đèn bàn học', 'Tình trạng 96%, sáng tốt, gập chỉnh linh hoạt, ngoại hình đẹp.', 'USED', 280000, 340000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Desk_lamp.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 58 HOUR)),
(18, 2, 6, 'Giày sneaker trắng', 'Tình trạng 90%, đế còn tốt, form đẹp, có dấu hiệu sử dụng nhẹ.', 'USED', 700000, 820000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/White_sneakers.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 62 HOUR)),
(19, 2, 6, 'Túi xách da', 'Tình trạng 92%, da còn đẹp, khóa tốt, phù hợp đi làm.', 'USED', 880000, 970000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Bag_made_from_leather_product.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 50 HOUR)),
(20, 2, 6, 'Ly sứ cà phê', 'Tình trạng 98%, sạch đẹp, không nứt mẻ, dùng tốt hằng ngày.', 'USED', 120000, 170000, JSON_ARRAY('https://commons.wikimedia.org/wiki/Special:FilePath/Coffee_mug.jpg'), 'ACTIVE', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 26 HOUR));

-- 5. Thêm Bids mẫu
INSERT INTO bids (product_id, bidder_id, amount, created_at) VALUES 
(1, 4, 12800000, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(2, 3, 14800000, DATE_SUB(NOW(), INTERVAL 10 HOUR)),
(3, 4, 3100000, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, 3, 390000, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(5, 4, 420000, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(9, 3, 1650000, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(11, 3, 1260000, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(14, 3, 760000, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(16, 4, 1720000, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(17, 3, 340000, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(18, 4, 820000, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(20, 3, 170000, DATE_SUB(NOW(), INTERVAL 12 HOUR));

-- 6. Thêm Watchlist mẫu
INSERT INTO watchlist (user_id, product_id) VALUES 
(3, 1), (3, 5), (3, 11),
(4, 2), (4, 3), (4, 11);

-- 7. Thêm Notifications mẫu
INSERT INTO notifications (user_id, type, title, message, is_read, created_at) VALUES
(3, 'AUCTION_WON', 'Bạn đã trúng đấu giá!', 'Chúc mừng, bạn đã chiến thắng sản phẩm "Canon EOS M50".', FALSE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'AUCTION_UNSOLD', 'Không có ai mua sản phẩm', 'Sản phẩm "Nikon D5600" của bạn đã kết thúc mà không có ai đặt giá.', TRUE, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4, 'SYSTEM', 'Chào mừng gia nhập!', 'Chào mừng bạn đã đến với sàn đấu giá C2C.', TRUE, DATE_SUB(NOW(), INTERVAL 10 DAY));

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- ==========================================
-- SETUP COMPLETE!
-- ==========================================
-- Database: auction_db
-- Users: 4 (admin, seller, buyer1, buyer2)
-- Password: password123
-- Products: 20 items
-- ==========================================
