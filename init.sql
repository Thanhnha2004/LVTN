CREATE DATABASE IF NOT EXISTS bds_db;
USE bds_db;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =============================================
-- BẢNG users
-- =============================================
CREATE TABLE users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  full_name      VARCHAR(100)  NOT NULL,
  email          VARCHAR(100)  NOT NULL UNIQUE,
  password_hash  VARCHAR(255)  NOT NULL,
  phone_number   VARCHAR(15)   DEFAULT NULL,
  avatar_url     VARCHAR(500)  DEFAULT NULL,
  role           ENUM('buyer','owner','admin') NOT NULL DEFAULT 'buyer',
  status         ENUM('active','banned')       NOT NULL DEFAULT 'active',
  email_verified TINYINT(1)    NOT NULL DEFAULT 0,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- BẢNG otp_codes  (xác minh email)
-- =============================================
CREATE TABLE otp_codes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT         NOT NULL,
  code       VARCHAR(6)  NOT NULL,
  type       ENUM('email_verify','reset_password') NOT NULL DEFAULT 'email_verify',
  expires_at DATETIME    NOT NULL,
  used       TINYINT(1)  NOT NULL DEFAULT 0,
  created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_otp_user    (user_id),
  INDEX idx_otp_expires (expires_at)
);

-- =============================================
-- BẢNG properties
-- =============================================
CREATE TABLE properties (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  owner_id         INT           NOT NULL,
  title            VARCHAR(200)  NOT NULL,
  description      TEXT,

  -- Phân loại
  type             ENUM('apartment','house','land','office') NOT NULL,
  transaction_type ENUM('sale','rent') NOT NULL DEFAULT 'sale',

  -- Giá & diện tích
  price            DECIMAL(15,2) NOT NULL,
  area             DECIMAL(10,2) NOT NULL,
  bedrooms         TINYINT       DEFAULT NULL,
  bathrooms        TINYINT       DEFAULT NULL,

  -- Địa chỉ 3 cấp
  address          VARCHAR(255)  NOT NULL,
  ward             VARCHAR(100)  DEFAULT NULL,
  district         VARCHAR(100)  DEFAULT NULL,
  city             VARCHAR(100)  NOT NULL,

  -- Toạ độ (cho bản đồ Leaflet)
  latitude         DECIMAL(10,8) DEFAULT NULL,
  longitude        DECIMAL(11,8) DEFAULT NULL,

  -- Thông tin thêm
  direction        ENUM('north','south','east','west','northeast','northwest','southeast','southwest') DEFAULT NULL,
  legal_status     ENUM('sohong','sokhongdo','dangchoso','other') DEFAULT NULL,

  -- Trạng thái
  status           ENUM('pending','approved','rejected','hidden','sold') NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Index cho tìm kiếm thường xuyên
  INDEX idx_prop_status   (status),
  INDEX idx_prop_city     (city),
  INDEX idx_prop_district (district),
  INDEX idx_prop_type_tx  (type, transaction_type),
  INDEX idx_prop_price    (price),
  INDEX idx_prop_area     (area),
  INDEX idx_prop_owner    (owner_id),
  INDEX idx_prop_created  (created_at)
);

-- =============================================
-- BẢNG property_images
-- =============================================
CREATE TABLE property_images (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT          NOT NULL,
  url         VARCHAR(500) NOT NULL,
  `order`     INT          DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_img_property (property_id)
);

-- =============================================
-- BẢNG property_views  (đếm lượt xem)
-- =============================================
CREATE TABLE property_views (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT         NOT NULL,
  viewer_ip   VARCHAR(45) DEFAULT NULL,
  viewed_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_views_property (property_id),
  INDEX idx_views_date     (viewed_at)
);

-- =============================================
-- BẢNG contacts
-- =============================================
CREATE TABLE contacts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT  NOT NULL,
  buyer_id     INT  NOT NULL,
  message      TEXT NOT NULL,
  phone_number VARCHAR(15)  DEFAULT NULL,
  owner_reply  TEXT,
  status       ENUM('pending','replied') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id)    REFERENCES users(id)       ON DELETE CASCADE,
  INDEX idx_contact_property (property_id),
  INDEX idx_contact_buyer    (buyer_id)
);

-- =============================================
-- BẢNG saved_properties
-- =============================================
CREATE TABLE saved_properties (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id    INT NOT NULL,
  property_id INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY  unique_save (buyer_id, property_id),
  FOREIGN KEY (buyer_id)    REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE CASCADE,
  INDEX idx_saved_buyer (buyer_id)
);

-- =============================================
-- SEED DỮ LIỆU MẪU
-- password đều là: 123456
-- =============================================

INSERT INTO users (full_name, email, password_hash, phone_number, role, email_verified) VALUES
('Admin',           'admin@bds.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0901000001', 'admin', 1),
('Nguyễn Văn An',   'owner@bds.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0901000002', 'owner', 1),
('Trần Thị Bình',   'buyer@bds.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0901000003', 'buyer', 1),
('Lê Hoàng Nam',    'owner2@bds.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0901000004', 'owner', 1),
('Phạm Thị Mai',    'buyer2@bds.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '0901000005', 'buyer', 1);

-- Tin đăng mẫu với đầy đủ thông tin
-- owner_id = 2 (Nguyễn Văn An)
INSERT INTO properties
  (owner_id, title, description, type, transaction_type, price, area,
   bedrooms, bathrooms, address, ward, district, city,
   latitude, longitude, direction, legal_status, status)
VALUES
(2,
 'Căn hộ 2PN Quận 1 view sông Sài Gòn',
 'Căn hộ cao cấp tầng 18, view trực diện sông Sài Gòn, đầy đủ nội thất cao cấp. Tiện ích: hồ bơi, gym, bảo vệ 24/7.',
 'apartment', 'sale', 3500000000, 72,
 2, 2, '123 Tôn Đức Thắng', 'Bến Nghé', 'Quận 1', 'Hồ Chí Minh',
 10.77375400, 106.70439400, 'east', 'sohong', 'approved'),

(2,
 'Nhà phố Bình Thạnh 4 tầng hẻm xe hơi',
 'Nhà phố đẹp hẻm thông xe hơi, gần chợ Bà Chiểu, thuận tiện kinh doanh. Kết cấu chắc chắn, thiết kế hiện đại.',
 'house', 'sale', 6800000000, 90,
 4, 3, '45 Đinh Tiên Hoàng', 'Đa Kao', 'Bình Thạnh', 'Hồ Chí Minh',
 10.80154600, 106.71398700, 'south', 'sohong', 'approved'),

(2,
 'Cho thuê căn hộ Studio Quận 7 gần Phú Mỹ Hưng',
 'Studio 35m2 hiện đại, đầy đủ tiện nghi, ban công thoáng mát. Gần trung tâm Phú Mỹ Hưng, siêu thị, trường học.',
 'apartment', 'rent', 8000000, 35,
 1, 1, '88 Nguyễn Thị Thập', 'Tân Phú', 'Quận 7', 'Hồ Chí Minh',
 10.73152700, 106.71843500, 'north', 'sohong', 'approved'),

(2,
 'Đất nền Bình Dương 200m2 sổ hồng riêng',
 'Đất thổ cư 200m2, sổ hồng riêng, mặt đường 8m, khu dân cư hiện hữu đông đúc, pháp lý rõ ràng.',
 'land', 'sale', 1200000000, 200,
 NULL, NULL, 'KDC Mỹ Phước', 'Mỹ Phước', 'Thị xã Bến Cát', 'Bình Dương',
 11.11638900, 106.64583300, NULL, 'sohong', 'pending'),

(2,
 'Văn phòng cho thuê Quận 3 trung tâm',
 'Văn phòng 80m2 tầng 5, thang máy, máy lạnh trung tâm, view đẹp, gần nhiều tiện ích. Phù hợp công ty 10-20 người.',
 'office', 'rent', 25000000, 80,
 NULL, NULL, '12 Nguyễn Thị Minh Khai', 'Võ Thị Sáu', 'Quận 3', 'Hồ Chí Minh',
 10.78033300, 106.68697300, 'west', NULL, 'approved');

-- owner_id = 4 (Lê Hoàng Nam)
INSERT INTO properties
  (owner_id, title, description, type, transaction_type, price, area,
   bedrooms, bathrooms, address, ward, district, city,
   latitude, longitude, direction, legal_status, status)
VALUES
(4,
 'Biệt thự mini Thủ Đức 3 phòng ngủ',
 'Biệt thự mini sân vườn, hồ bơi riêng, yên tĩnh. Gần ĐHQG, Metro Suối Tiên.',
 'house', 'sale', 5500000000, 150,
 3, 3, '56 Võ Văn Ngân', 'Bình Thọ', 'TP Thủ Đức', 'Hồ Chí Minh',
 10.85000000, 106.76000000, 'northeast', 'sohong', 'approved'),

(4,
 'Cho thuê nhà nguyên căn Gò Vấp 3PN',
 'Nhà nguyên căn 3 tầng, 3 phòng ngủ, phù hợp gia đình hoặc nhóm bạn. Có chỗ để xe ô tô.',
 'house', 'rent', 12000000, 110,
 3, 2, '78 Quang Trung', 'Hiệp Phú', 'Gò Vấp', 'Hồ Chí Minh',
 10.83827000, 106.68215000, 'south', 'sohong', 'approved');

-- Ảnh mẫu
INSERT INTO property_images (property_id, url, `order`) VALUES
(1, 'https://placehold.co/800x500/0D9488/white?text=Căn+hộ+Q1+Ảnh+1', 1),
(1, 'https://placehold.co/800x500/0D9488/white?text=Căn+hộ+Q1+Ảnh+2', 2),
(1, 'https://placehold.co/800x500/0D9488/white?text=Căn+hộ+Q1+Ảnh+3', 3),
(2, 'https://placehold.co/800x500/1E40AF/white?text=Nhà+phố+BT+Ảnh+1', 1),
(2, 'https://placehold.co/800x500/1E40AF/white?text=Nhà+phố+BT+Ảnh+2', 2),
(3, 'https://placehold.co/800x500/7C3AED/white?text=Studio+Q7+Ảnh+1',  1),
(3, 'https://placehold.co/800x500/7C3AED/white?text=Studio+Q7+Ảnh+2',  2),
(5, 'https://placehold.co/800x500/B45309/white?text=Văn+phòng+Q3+Ảnh+1', 1),
(6, 'https://placehold.co/800x500/065F46/white?text=Biệt+thự+TD+Ảnh+1', 1),
(6, 'https://placehold.co/800x500/065F46/white?text=Biệt+thự+TD+Ảnh+2', 2),
(7, 'https://placehold.co/800x500/991B1B/white?text=Nhà+GV+Ảnh+1', 1);

-- Lượt xem mẫu (để dashboard owner có data ngay)
INSERT INTO property_views (property_id, viewer_ip, viewed_at) VALUES
(1, '127.0.0.1', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(1, '127.0.0.2', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(1, '127.0.0.3', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, '127.0.0.1', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, '127.0.0.4', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(1, '127.0.0.2', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, '127.0.0.5', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, '127.0.0.3', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, '127.0.0.6', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, '127.0.0.1', NOW()),
(2, '127.0.0.2', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, '127.0.0.3', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, '127.0.0.4', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, '127.0.0.5', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, '127.0.0.1', NOW()),
(3, '127.0.0.2', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, '127.0.0.3', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, '127.0.0.4', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, '127.0.0.2', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(5, '127.0.0.3', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6, '127.0.0.1', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6, '127.0.0.2', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(7, '127.0.0.3', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Liên hệ mẫu
INSERT INTO contacts (property_id, buyer_id, message, phone_number, status) VALUES
(1, 3, 'Tôi muốn xem căn hộ này vào cuối tuần, liên hệ giúp tôi nhé.',       '0901000003', 'pending'),
(2, 3, 'Nhà còn không ạ? Tôi quan tâm muốn đặt lịch xem.',                   '0901000003', 'replied'),
(3, 5, 'Studio này còn trống không? Tôi cần thuê từ tháng sau.',              '0901000005', 'pending'),
(6, 3, 'Biệt thự có chỗ để ô tô không ạ? Cho tôi xem vào cuối tuần được không?', '0901000003', 'pending');

-- Cập nhật owner_reply cho liên hệ đã phản hồi
UPDATE contacts SET owner_reply = 'Nhà vẫn còn. Bạn có thể xem vào sáng thứ 7 tuần này nhé!' WHERE id = 2;

-- Tin yêu thích mẫu
INSERT INTO saved_properties (buyer_id, property_id) VALUES
(3, 1),
(3, 3),
(3, 6),
(5, 2),
(5, 7);