CREATE DATABASE IF NOT EXISTS lvtn
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE lvtn;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS saved_properties;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS property_images;
DROP TABLE IF EXISTS featured_orders;
DROP TABLE IF EXISTS property_status_history;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS featured_packages;
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

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
-- BẢNG otp_codes (xác minh email / quên mật khẩu)
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

  -- Địa chỉ
  address          VARCHAR(255)  NOT NULL,
  ward             VARCHAR(100)  DEFAULT NULL,
  district         VARCHAR(100)  DEFAULT NULL,
  city             VARCHAR(100)  NOT NULL,

  -- Tọa độ bản đồ
  latitude         DECIMAL(10,8) DEFAULT NULL,
  longitude        DECIMAL(11,8) DEFAULT NULL,

  -- Thông tin thêm
  direction        ENUM('north','south','east','west','northeast','northwest','southeast','southwest') DEFAULT NULL,
  legal_status     ENUM('sohong','sokhongdo','dangchoso','other') DEFAULT NULL,

  -- Trạng thái và tin nổi bật
  status           ENUM('pending','approved','rejected','hidden','sold') NOT NULL DEFAULT 'pending',
  reject_reason    VARCHAR(500) DEFAULT NULL,
  approved_at      DATETIME DEFAULT NULL,
  rejected_at      DATETIME DEFAULT NULL,
  hidden_at        DATETIME DEFAULT NULL,
  sold_at          DATETIME DEFAULT NULL,
  featured_until   DATETIME     DEFAULT NULL,
  view_count       INT          NOT NULL DEFAULT 0,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prop_status   (status),
  INDEX idx_prop_city     (city),
  INDEX idx_prop_district (district),
  INDEX idx_prop_type_tx  (type, transaction_type),
  INDEX idx_prop_price    (price),
  INDEX idx_prop_area     (area),
  INDEX idx_prop_owner    (owner_id),
  INDEX idx_prop_created  (created_at),
  INDEX idx_prop_views    (view_count),
  INDEX idx_prop_featured_until (featured_until)
);

-- =============================================
-- BẢNG property_status_history (lịch sử trạng thái tin)
-- =============================================
CREATE TABLE property_status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  old_status  ENUM('pending','approved','rejected','hidden','sold') DEFAULT NULL,
  new_status  ENUM('pending','approved','rejected','hidden','sold') NOT NULL,
  actor_id    INT DEFAULT NULL,
  note        VARCHAR(500) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_history_property (property_id),
  INDEX idx_history_created  (created_at)
);

-- =============================================
-- BẢNG featured_packages (gói nổi bật tin đăng)
-- =============================================
CREATE TABLE featured_packages (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(500) DEFAULT NULL,
  price         DECIMAL(15,2) NOT NULL,
  duration_days INT NOT NULL,
  priority      INT NOT NULL DEFAULT 1,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_featured_package_active (is_active)
);

-- =============================================
-- BẢNG featured_orders (đơn thanh toán gói nổi bật)
-- =============================================
CREATE TABLE featured_orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  property_id       INT NOT NULL,
  owner_id          INT NOT NULL,
  package_id        INT NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,
  payment_method    ENUM('vnpay') NOT NULL DEFAULT 'vnpay',
  status            ENUM('pending','paid','failed','cancelled') NOT NULL DEFAULT 'pending',
  payment_code      VARCHAR(50) NOT NULL UNIQUE,
  paid_at           DATETIME DEFAULT NULL,
  featured_start_at DATETIME DEFAULT NULL,
  featured_end_at   DATETIME DEFAULT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES featured_packages(id),
  INDEX idx_featured_order_owner (owner_id),
  INDEX idx_featured_order_property (property_id),
  INDEX idx_featured_order_status (status)
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
-- BẢNG contacts / lead khách hàng
-- =============================================
CREATE TABLE contacts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  buyer_id     INT NOT NULL,
  message      TEXT NOT NULL,
  phone_number VARCHAR(15) DEFAULT NULL,
  owner_reply  TEXT,
  status       ENUM('pending','replied') NOT NULL DEFAULT 'pending',
  lead_status  ENUM('new','contacted','scheduled','closed','cancelled') NOT NULL DEFAULT 'new',
  owner_note   TEXT DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id)    REFERENCES users(id)      ON DELETE CASCADE,
  INDEX idx_contact_property (property_id),
  INDEX idx_contact_buyer    (buyer_id),
  INDEX idx_contact_status   (status),
  INDEX idx_contact_lead     (lead_status)
);

-- =============================================
-- BẢNG saved_properties
-- =============================================
CREATE TABLE saved_properties (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id    INT NOT NULL,
  property_id INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_save (buyer_id, property_id),
  FOREIGN KEY (buyer_id)    REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_saved_buyer (buyer_id)
);

-- =============================================
-- SEED DỮ LIỆU MẪU
-- Mật khẩu tất cả tài khoản: 123456
-- =============================================

INSERT INTO users (full_name, email, password_hash, phone_number, role, status, email_verified) VALUES
('Admin hệ thống',        'admin@bds.com',  '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0901000001', 'admin', 'active', 1),
('Nguyễn Văn An',         'owner@bds.com',  '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0901000002', 'owner', 'active', 1),
('Trần Thị Bình',         'buyer@bds.com',  '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0901000003', 'buyer', 'active', 1),
('Lê Hoàng Nam',          'owner2@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0901000004', 'owner', 'active', 1),
('Phạm Thị Mai',          'buyer2@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0901000005', 'buyer', 'active', 1),
('Tài khoản bị khóa',     'banned@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0901000006', 'buyer', 'banned', 1);

INSERT INTO featured_packages (name, description, price, duration_days, priority, is_active) VALUES
('Gói nổi bật 7 ngày', 'Tin được ưu tiên hiển thị trong danh sách tìm kiếm trong 7 ngày.', 99000, 7, 1, 1),
('Gói nổi bật 15 ngày', 'Tin được ưu tiên hiển thị trong danh sách tìm kiếm trong 15 ngày.', 179000, 15, 2, 1),
('Gói nổi bật 30 ngày', 'Tin được ưu tiên hiển thị trong danh sách tìm kiếm trong 30 ngày.', 299000, 30, 3, 1);

INSERT INTO properties
  (owner_id, title, description, type, transaction_type, price, area,
   bedrooms, bathrooms, address, ward, district, city,
   latitude, longitude, direction, legal_status, status, reject_reason,
   approved_at, rejected_at, hidden_at, sold_at, featured_until)
VALUES
(2,
 'Căn hộ 2PN Quận 1 view sông Sài Gòn',
 'Căn hộ cao cấp tầng 18, view trực diện sông Sài Gòn, đầy đủ nội thất cao cấp. Tiện ích: hồ bơi, gym, bảo vệ 24/7.',
 'apartment', 'sale', 3500000000, 72,
 2, 2, '123 Tôn Đức Thắng', 'Bến Nghé', 'Quận 1', 'Hồ Chí Minh',
 10.77375400, 106.70439400, 'east', 'sohong', 'approved', NULL,
 DATE_SUB(NOW(), INTERVAL 20 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 30 DAY)),

(2,
 'Nhà phố Bình Thạnh 4 tầng hẻm xe hơi',
 'Nhà phố đẹp hẻm thông xe hơi, gần chợ Bà Chiểu, thuận tiện kinh doanh. Kết cấu chắc chắn, thiết kế hiện đại.',
 'house', 'sale', 6800000000, 90,
 4, 3, '45 Đinh Tiên Hoàng', 'Đa Kao', 'Bình Thạnh', 'Hồ Chí Minh',
 10.80154600, 106.71398700, 'south', 'sohong', 'approved', NULL,
 DATE_SUB(NOW(), INTERVAL 18 DAY), NULL, NULL, NULL, NULL),

(2,
 'Cho thuê căn hộ Studio Quận 7 gần Phú Mỹ Hưng',
 'Studio 35m2 hiện đại, đầy đủ tiện nghi, ban công thoáng mát. Gần trung tâm Phú Mỹ Hưng, siêu thị, trường học.',
 'apartment', 'rent', 8000000, 35,
 1, 1, '88 Nguyễn Thị Thập', 'Tân Phú', 'Quận 7', 'Hồ Chí Minh',
 10.73152700, 106.71843500, 'north', 'sohong', 'approved', NULL,
 DATE_SUB(NOW(), INTERVAL 15 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 15 DAY)),

(2,
 'Đất nền Bình Dương 200m2 sổ hồng riêng',
 'Đất thổ cư 200m2, sổ hồng riêng, mặt đường 8m, khu dân cư hiện hữu đông đúc, pháp lý rõ ràng.',
 'land', 'sale', 1200000000, 200,
 NULL, NULL, 'KDC Mỹ Phước', 'Mỹ Phước', 'Thị xã Bến Cát', 'Bình Dương',
 11.11638900, 106.64583300, NULL, 'sohong', 'pending', NULL,
 NULL, NULL, NULL, NULL, NULL),

(2,
 'Văn phòng cho thuê Quận 3 trung tâm',
 'Văn phòng 80m2 tầng 5, thang máy, máy lạnh trung tâm, view đẹp, gần nhiều tiện ích. Phù hợp công ty 10-20 người.',
 'office', 'rent', 25000000, 80,
 NULL, NULL, '12 Nguyễn Thị Minh Khai', 'Võ Thị Sáu', 'Quận 3', 'Hồ Chí Minh',
 10.78033300, 106.68697300, 'west', NULL, 'approved', NULL,
 DATE_SUB(NOW(), INTERVAL 12 DAY), NULL, NULL, NULL, NULL),

(2,
 'Nhà hẻm Quận 10 cần bổ sung giấy tờ',
 'Tin mẫu bị từ chối để owner xem lý do và chỉnh sửa lại trước khi gửi duyệt.',
 'house', 'sale', 4200000000, 58,
 3, 2, '21 Thành Thái', 'Phường 14', 'Quận 10', 'Hồ Chí Minh',
 10.77130000, 106.66790000, 'east', 'dangchoso', 'rejected', 'Ảnh giấy tờ pháp lý chưa rõ, vui lòng bổ sung sổ hồng hoặc giấy tờ chứng minh quyền sở hữu.',
 NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL, NULL),

(2,
 'Nhà phố Tân Bình chủ nhà tạm ẩn',
 'Tin mẫu đang ẩn để kiểm tra chức năng hiện lại và gửi duyệt lại.',
 'house', 'sale', 5100000000, 75,
 3, 3, '30 Cộng Hòa', 'Phường 12', 'Tân Bình', 'Hồ Chí Minh',
 10.80110000, 106.65210000, 'south', 'sohong', 'hidden', NULL,
 DATE_SUB(NOW(), INTERVAL 8 DAY), NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),

(4,
 'Biệt thự mini Thủ Đức 3 phòng ngủ',
 'Biệt thự mini sân vườn, hồ bơi riêng, yên tĩnh. Gần ĐHQG, Metro Suối Tiên.',
 'house', 'sale', 5500000000, 150,
 3, 3, '56 Võ Văn Ngân', 'Bình Thọ', 'TP Thủ Đức', 'Hồ Chí Minh',
 10.85000000, 106.76000000, 'northeast', 'sohong', 'approved', NULL,
 DATE_SUB(NOW(), INTERVAL 10 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 45 DAY)),

(4,
 'Cho thuê nhà nguyên căn Gò Vấp 3PN',
 'Nhà nguyên căn 3 tầng, 3 phòng ngủ, phù hợp gia đình hoặc nhóm bạn. Có chỗ để xe ô tô.',
 'house', 'rent', 12000000, 110,
 3, 2, '78 Quang Trung', 'Hiệp Phú', 'Gò Vấp', 'Hồ Chí Minh',
 10.83827000, 106.68215000, 'south', 'sohong', 'approved', NULL,
 DATE_SUB(NOW(), INTERVAL 9 DAY), NULL, NULL, NULL, NULL),

(4,
 'Lô đất Long An đã giao dịch',
 'Tin mẫu đã bán để owner xem trạng thái đã giao dịch.',
 'land', 'sale', 950000000, 180,
 NULL, NULL, 'Đường tỉnh 830', 'Lương Hòa', 'Bến Lức', 'Long An',
 10.64260000, 106.47280000, NULL, 'sohong', 'sold', NULL,
 DATE_SUB(NOW(), INTERVAL 22 DAY), NULL, NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NULL);

INSERT INTO property_status_history (property_id, old_status, new_status, actor_id, note, created_at) VALUES
(1, NULL, 'pending', 2, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 21 DAY)),
(1, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(2, NULL, 'pending', 2, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 19 DAY)),
(2, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(3, NULL, 'pending', 2, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 16 DAY)),
(3, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(4, NULL, 'pending', 2, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, NULL, 'pending', 2, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 13 DAY)),
(5, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 12 DAY)),
(6, NULL, 'pending', 2, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(6, 'pending', 'rejected', 1, 'Ảnh giấy tờ pháp lý chưa rõ, vui lòng bổ sung sổ hồng hoặc giấy tờ chứng minh quyền sở hữu.', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(7, NULL, 'pending', 2, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 9 DAY)),
(7, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(7, 'approved', 'hidden', 2, 'Owner ẩn tin đăng', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, NULL, 'pending', 4, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 11 DAY)),
(8, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(9, NULL, 'pending', 4, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(9, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 9 DAY)),
(10, NULL, 'pending', 4, 'Owner tạo tin đăng', DATE_SUB(NOW(), INTERVAL 23 DAY)),
(10, 'pending', 'approved', 1, 'Admin duyệt tin đăng', DATE_SUB(NOW(), INTERVAL 22 DAY)),
(10, 'approved', 'sold', 4, 'Owner đánh dấu đã giao dịch', DATE_SUB(NOW(), INTERVAL 3 DAY));

INSERT INTO property_status_history (property_id, old_status, new_status, actor_id, note, created_at) VALUES
(8, 'approved', 'approved', 3, 'Người dùng báo cáo tin: Thông tin sai. Người xem phản ánh địa chỉ hẹn xem không khớp với nội dung tin đăng.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, 'approved', 'approved', 5, 'Người dùng báo cáo tin: Hình ảnh không đúng. Ảnh ngoại thất không giống bất động sản thực tế khi liên hệ xem.', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(9, 'approved', 'approved', 5, 'Người dùng báo cáo tin: Bất động sản không còn giao dịch. Chủ nhà báo đã cho thuê nhưng tin vẫn hiển thị.', DATE_SUB(NOW(), INTERVAL 12 HOUR));

INSERT INTO featured_orders
  (property_id, owner_id, package_id, amount, payment_method, status, payment_code,
   paid_at, featured_start_at, featured_end_at, created_at)
VALUES
(1, 2, 3, 299000, 'vnpay', 'paid', 'VIP-SEED-0001',
 DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 2, 2, 179000, 'vnpay', 'paid', 'VIP-SEED-0002',
 DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, 4, 3, 299000, 'vnpay', 'paid', 'VIP-SEED-0003',
 DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY));

INSERT INTO featured_orders
  (property_id, owner_id, package_id, amount, payment_method, status, payment_code,
   paid_at, featured_start_at, featured_end_at, created_at)
VALUES
(2, 2, 1, 99000, 'vnpay', 'pending', 'VIP-SEED-PENDING-0002',
 NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
(3, 2, 1, 99000, 'vnpay', 'failed', 'VIP-SEED-FAILED-0003',
 NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(7, 2, 1, 99000, 'vnpay', 'cancelled', 'VIP-SEED-CANCELLED-0007',
 NULL, NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO property_images (property_id, url, `order`) VALUES
(1, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&q=80', 1),
(1, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80', 2),
(1, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&q=80', 3),
(2, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1000&q=80', 1),
(2, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1000&q=80', 2),
(3, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80', 1),
(3, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1000&q=80', 2),
(4, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1),
(5, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&q=80', 1),
(6, 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=1000&q=80', 1),
(7, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1000&q=80', 1),
(8, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80', 1),
(8, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1000&q=80', 2),
(9, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1000&q=80', 1),
(10, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1);

UPDATE properties SET view_count = 9 WHERE id = 1;
UPDATE properties SET view_count = 4 WHERE id = 2;
UPDATE properties SET view_count = 3 WHERE id = 3;
UPDATE properties SET view_count = 2 WHERE id = 5;
UPDATE properties SET view_count = 3 WHERE id = 8;
UPDATE properties SET view_count = 1 WHERE id = 9;

INSERT INTO contacts
  (property_id, buyer_id, message, phone_number, owner_reply, status, lead_status, owner_note)
VALUES
(1, 3, 'Tôi muốn xem căn hộ này vào cuối tuần, liên hệ giúp tôi nhé.', '0901000003', NULL, 'pending', 'new', NULL),
(2, 3, 'Nhà còn không ạ? Tôi quan tâm muốn đặt lịch xem.', '0901000003', 'Nhà vẫn còn. Bạn có thể xem vào sáng thứ 7 tuần này nhé!', 'replied', 'scheduled', 'Lịch hẹn xem: 09:00 22/08/2026. Đã hẹn xem tại nhà.'),
(3, 5, 'Studio này còn trống không? Tôi cần thuê từ tháng sau.', '0901000005', NULL, 'pending', 'contacted', 'Đã gọi nhưng khách muốn xem thêm ảnh.'),
(5, 5, 'Văn phòng có xuất hóa đơn và cho thuê tối thiểu bao lâu?', '0901000005', 'Bên em có xuất hóa đơn, hợp đồng tối thiểu 12 tháng.', 'replied', 'closed', 'Khách đồng ý đặt cọc giữ chỗ.'),
(8, 3, 'Biệt thự có chỗ để ô tô không ạ? Cho tôi xem vào cuối tuần được không?', '0901000003', NULL, 'pending', 'scheduled', 'Lịch hẹn xem: 15:00 23/08/2026. Chờ xác nhận lịch xem nhà chiều chủ nhật.'),
(9, 5, 'Nhà nguyên căn có cho nuôi thú cưng không?', '0901000005', 'Chủ nhà đồng ý nếu giữ vệ sinh và không ảnh hưởng hàng xóm.', 'replied', 'contacted', 'Khách đang cân nhắc chuyển vào đầu tháng sau.');

INSERT INTO saved_properties (buyer_id, property_id) VALUES
(3, 1),
(3, 3),
(3, 8),
(5, 2),
(5, 5),
(5, 9);

-- =============================================
-- SEED BO SUNG: them nhieu du lieu de demo giao dien
-- Mat khau tat ca tai khoan: 123456
-- =============================================

INSERT INTO users (full_name, email, password_hash, phone_number, role, status, email_verified) VALUES
('Owner demo 3', 'owner3@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0902000001', 'owner', 'active', 1),
('Owner demo 4', 'owner4@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0902000002', 'owner', 'active', 1),
('Buyer demo 3', 'buyer3@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0902000003', 'buyer', 'active', 1),
('Buyer demo 4', 'buyer4@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0902000004', 'buyer', 'active', 1),
('Buyer demo 5', 'buyer5@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0902000005', 'buyer', 'active', 1),
('Buyer demo 6', 'buyer6@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0902000006', 'buyer', 'active', 1);

INSERT INTO properties
  (owner_id, title, description, type, transaction_type, price, area,
   bedrooms, bathrooms, address, ward, district, city,
   latitude, longitude, direction, legal_status, status, reject_reason,
   approved_at, rejected_at, hidden_at, sold_at, featured_until, view_count, created_at)
VALUES
(2, 'Can ho 1PN Thu Thiem view song', 'Can ho moi ban giao, view song, noi that co ban, phu hop nguoi di lam tai trung tam.', 'apartment', 'rent', 14000000, 48, 1, 1, '12 Tran Bach Dang', 'Thu Thiem', 'TP Thu Duc', 'Ho Chi Minh', 10.77510000, 106.72110000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 40 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 20 DAY), 28, DATE_SUB(NOW(), INTERVAL 42 DAY)),
(2, 'Can ho 3PN Tan Phu gan Aeon Mall', 'Can ho rong, 3 phong ngu, khu dan cu an ninh, gan trung tam thuong mai va truong hoc.', 'apartment', 'sale', 2950000000, 88, 3, 2, '30 Bo Bao Tan Thang', 'Son Ky', 'Tan Phu', 'Ho Chi Minh', 10.80190000, 106.61860000, 'south', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 35 DAY), NULL, NULL, NULL, NULL, 17, DATE_SUB(NOW(), INTERVAL 36 DAY)),
(2, 'Nha pho Phu Nhuan hem 6m', 'Nha pho 1 tret 3 lau, hem xe hoi, khu y te van phong, thich hop o ket hop kinh doanh.', 'house', 'sale', 7200000000, 82, 4, 4, '15 Hoa Lan', 'Phuong 2', 'Phu Nhuan', 'Ho Chi Minh', 10.79950000, 106.68520000, 'west', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 32 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 10 DAY), 35, DATE_SUB(NOW(), INTERVAL 33 DAY)),
(2, 'Van phong quan 1 toa nha hang B', 'San van phong da hoan thien tran san, co le tan, bao ve, phu hop cong ty nho.', 'office', 'rent', 36000000, 95, NULL, 2, '20 Le Thanh Ton', 'Ben Nghe', 'Quan 1', 'Ho Chi Minh', 10.77890000, 106.70420000, 'north', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 30 DAY), NULL, NULL, NULL, NULL, 22, DATE_SUB(NOW(), INTERVAL 31 DAY)),
(2, 'Dat nen Cu Chi 120m2 duong 10m', 'Dat nen khu dan cu hien huu, duong rong, phap ly ro rang, gan cho va truong hoc.', 'land', 'sale', 980000000, 120, NULL, NULL, 'Duong Nguyen Thi Ranh', 'Tan Thong Hoi', 'Cu Chi', 'Ho Chi Minh', 10.97060000, 106.50340000, NULL, 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 27 DAY), NULL, NULL, NULL, NULL, 11, DATE_SUB(NOW(), INTERVAL 28 DAY)),
(4, 'Can ho dich vu Binh Thanh full noi that', 'Can ho dich vu co thang may, bao ve, don vao o ngay, gan hang xanh.', 'apartment', 'rent', 9500000, 32, 1, 1, '90 Xo Viet Nghe Tinh', 'Phuong 21', 'Binh Thanh', 'Ho Chi Minh', 10.80360000, 106.71100000, 'south', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 25 DAY), NULL, NULL, NULL, NULL, 13, DATE_SUB(NOW(), INTERVAL 26 DAY)),
(4, 'Biet thu song lap Nha Be san vuon', 'Biet thu song lap co san vuon, gara oto, khu biet lap yen tinh, an ninh 24/7.', 'house', 'sale', 9200000000, 210, 4, 4, 'KDC Phuoc Kien', 'Phuoc Kien', 'Nha Be', 'Ho Chi Minh', 10.70980000, 106.70490000, 'northeast', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 24 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 25 DAY), 41, DATE_SUB(NOW(), INTERVAL 25 DAY)),
(4, 'Nha cho thue Thu Duc gan Vincom', 'Nha nguyen can moi son sua, 2 mat tien hem, phu hop gia dinh hoac van phong nho.', 'house', 'rent', 18000000, 120, 3, 3, '45 Vo Van Ngan', 'Linh Chieu', 'TP Thu Duc', 'Ho Chi Minh', 10.84900000, 106.77100000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL, NULL, NULL, NULL, 19, DATE_SUB(NOW(), INTERVAL 21 DAY)),
(4, 'Dat nen Long Thanh gan san bay', 'Lo dat dau tu dai han, gan truc duong lon, khu vuc phat trien quanh san bay Long Thanh.', 'land', 'sale', 1650000000, 150, NULL, NULL, 'Duong DT769', 'Long Duc', 'Long Thanh', 'Dong Nai', 10.79040000, 107.02610000, NULL, 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 18 DAY), NULL, NULL, NULL, NULL, 24, DATE_SUB(NOW(), INTERVAL 19 DAY)),
(4, 'Van phong chia se Go Vap 45m2', 'Mat bang van phong nho, co san de xe, phu hop startup hoac nhom kinh doanh online.', 'office', 'rent', 11000000, 45, NULL, 1, '100 Phan Van Tri', 'Phuong 10', 'Go Vap', 'Ho Chi Minh', 10.82930000, 106.67760000, 'west', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 16 DAY), NULL, NULL, NULL, NULL, 8, DATE_SUB(NOW(), INTERVAL 17 DAY)),
(7, 'Can ho cao cap District 7 2PN', 'Can ho view noi khu, noi that dep, tien ich day du, gan Crescent Mall.', 'apartment', 'sale', 4100000000, 76, 2, 2, 'Nguyen Luong Bang', 'Tan Phu', 'Quan 7', 'Ho Chi Minh', 10.72860000, 106.72190000, 'north', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 14 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 35 DAY), 31, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(7, 'Phong officetel quan 4 view kenh', 'Officetel vua o vua lam viec, gan trung tam quan 1, bao ve va thang may 24/7.', 'office', 'rent', 13000000, 38, 1, 1, 'Ben Van Don', 'Phuong 6', 'Quan 4', 'Ho Chi Minh', 10.76170000, 106.70070000, 'south', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 12 DAY), NULL, NULL, NULL, NULL, 16, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(7, 'Nha mat tien Tan Binh kinh doanh', 'Nha mat tien duong lon, hien dang cho thue, dong tien on dinh hang thang.', 'house', 'sale', 12500000000, 96, 5, 5, 'Cong Hoa', 'Phuong 13', 'Tan Binh', 'Ho Chi Minh', 10.80280000, 106.64280000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 11 DAY), NULL, NULL, NULL, NULL, 27, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(7, 'Dat vuon Bao Loc nghi duong', 'Dat vuon khi hau mat me, co duong xe hoi, phu hop lam homestay nghi duong.', 'land', 'sale', 750000000, 500, NULL, NULL, 'Xa Loc Thanh', 'Loc Thanh', 'Bao Loc', 'Lam Dong', 11.54850000, 107.80710000, NULL, 'dangchoso', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 5, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(7, 'Can ho rejected thieu hinh anh', 'Tin mau dang bi tu choi vi hinh anh chua dat yeu cau.', 'apartment', 'sale', 2100000000, 62, 2, 1, 'Duong Luy Ban Bich', 'Tan Thoi Hoa', 'Tan Phu', 'Ho Chi Minh', 10.77490000, 106.62770000, 'west', 'dangchoso', 'rejected', 'Hinh anh noi that bi mo, vui long cap nhat lai anh ro hon.', NULL, DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, NULL, NULL, 2, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(8, 'Can ho cho thue quan 5 gan benh vien', 'Can ho sach se, gan benh vien va truong dai hoc, phu hop sinh vien hoac gia dinh nho.', 'apartment', 'rent', 7500000, 40, 1, 1, 'Tran Hung Dao', 'Phuong 2', 'Quan 5', 'Ho Chi Minh', 10.75520000, 106.66640000, 'north', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 9 DAY), NULL, NULL, NULL, NULL, 14, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(8, 'Nha pho quan 8 gia tot', 'Nha pho khu dan cu dong duc, gan cau Nguyen Van Cu, thich hop mua o lau dai.', 'house', 'sale', 3900000000, 64, 3, 2, 'Ta Quang Buu', 'Phuong 5', 'Quan 8', 'Ho Chi Minh', 10.73780000, 106.67210000, 'southwest', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 8 DAY), NULL, NULL, NULL, NULL, 12, DATE_SUB(NOW(), INTERVAL 9 DAY)),
(8, 'Van phong Binh Thanh 120m2', 'San van phong rong, co phong hop rieng, gan khu cong ty cong nghe.', 'office', 'rent', 42000000, 120, NULL, 2, 'Dien Bien Phu', 'Phuong 25', 'Binh Thanh', 'Ho Chi Minh', 10.80210000, 106.71990000, 'east', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 7 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 18 DAY), 18, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(8, 'Dat nen Di An gan khu cong nghiep', 'Dat nen phap ly ro, gan khu cong nghiep, tiem nang cho thue phong tro.', 'land', 'sale', 1350000000, 100, NULL, NULL, 'Duong Nguyen An Ninh', 'Di An', 'Di An', 'Binh Duong', 10.90690000, 106.76940000, NULL, 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL, NULL, NULL, 10, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(8, 'Nha da ban tai Hoc Mon', 'Tin mau da giao dich thanh cong de hien thi trang thai sold.', 'house', 'sale', 2600000000, 70, 2, 2, 'Quoc lo 22', 'Ba Diem', 'Hoc Mon', 'Ho Chi Minh', 10.88290000, 106.58950000, 'northwest', 'sohong', 'sold', NULL, DATE_SUB(NOW(), INTERVAL 15 DAY), NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, 7, DATE_SUB(NOW(), INTERVAL 16 DAY)),
(2, 'Can ho dang cho duyet Binh Tan', 'Tin moi dang cho admin kiem duyet noi dung va hinh anh.', 'apartment', 'sale', 1850000000, 55, 2, 1, 'Ten Lua', 'Binh Tri Dong B', 'Binh Tan', 'Ho Chi Minh', 10.75500000, 106.61250000, 'south', 'sohong', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 'Dat nen dang cho duyet Nhon Trach', 'Tin moi cua owner dang doi xet duyet.', 'land', 'sale', 890000000, 110, NULL, NULL, 'Duong Hung Vuong', 'Phu Hoi', 'Nhon Trach', 'Dong Nai', 10.71990000, 106.89100000, NULL, 'sohong', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(7, 'Nha pho dang an quan 6', 'Tin da duyet nhung owner dang tam an de cap nhat gia.', 'house', 'sale', 4700000000, 68, 3, 3, 'Hau Giang', 'Phuong 11', 'Quan 6', 'Ho Chi Minh', 10.74670000, 106.63690000, 'west', 'sohong', 'hidden', NULL, DATE_SUB(NOW(), INTERVAL 12 DAY), NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, 6, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(8, 'Van phong cho thue Da Nang', 'Van phong trung tam thanh pho, gan song Han, phu hop chi nhanh cong ty.', 'office', 'rent', 22000000, 75, NULL, 1, 'Bach Dang', 'Hai Chau 1', 'Hai Chau', 'Da Nang', 16.06780000, 108.22080000, 'east', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL, NULL, NULL, 9, DATE_SUB(NOW(), INTERVAL 6 DAY));

INSERT INTO property_status_history (property_id, old_status, new_status, actor_id, note, created_at)
SELECT id, NULL, 'pending', owner_id, 'Owner tao tin dang', DATE_SUB(created_at, INTERVAL 1 HOUR)
FROM properties
WHERE id BETWEEN 11 AND 34;

INSERT INTO property_status_history (property_id, old_status, new_status, actor_id, note, created_at)
SELECT id, 'pending', status, 1,
       CASE
         WHEN status = 'approved' THEN 'Admin duyet tin dang'
         WHEN status = 'rejected' THEN reject_reason
         WHEN status = 'hidden' THEN 'Owner tam an tin dang'
         WHEN status = 'sold' THEN 'Owner danh dau da giao dich'
         ELSE 'Tin dang cho duyet'
       END,
       COALESCE(approved_at, rejected_at, hidden_at, sold_at, created_at)
FROM properties
WHERE id BETWEEN 11 AND 34
  AND status <> 'pending';

INSERT INTO featured_orders
  (property_id, owner_id, package_id, amount, payment_method, status, payment_code,
   paid_at, featured_start_at, featured_end_at, created_at)
VALUES
(11, 2, 2, 179000, 'vnpay', 'paid', 'VIP-SEED-0011', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(13, 2, 1, 99000, 'vnpay', 'paid', 'VIP-SEED-0013', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(17, 4, 2, 179000, 'vnpay', 'paid', 'VIP-SEED-0017', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_ADD(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(21, 7, 3, 299000, 'vnpay', 'paid', 'VIP-SEED-0021', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(28, 8, 2, 179000, 'vnpay', 'paid', 'VIP-SEED-0028', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO property_images (property_id, url, `order`) VALUES
(11, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1000&q=80', 1),
(12, 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1000&q=80', 1),
(13, 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1000&q=80', 1),
(14, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1000&q=80', 1),
(15, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1000&q=80', 1),
(16, 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1000&q=80', 1),
(17, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&q=80', 1),
(18, 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1000&q=80', 1),
(19, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1),
(20, 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=1000&q=80', 1),
(21, 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1000&q=80', 1),
(22, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&q=80', 1),
(23, 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1000&q=80', 1),
(24, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1000&q=80', 1),
(25, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80', 1),
(26, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80', 1),
(27, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&q=80', 1),
(28, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&q=80', 1),
(29, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1),
(30, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1000&q=80', 1),
(31, 'https://images.unsplash.com/photo-1560448075-bb485b067938?w=1000&q=80', 1),
(32, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1),
(33, 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=1000&q=80', 1),
(34, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1000&q=80', 1);

INSERT INTO contacts
  (property_id, buyer_id, message, phone_number, owner_reply, status, lead_status, owner_note)
VALUES
(11, 5, 'Toi muon xem can ho vao chieu thu bay.', '0901000005', NULL, 'pending', 'new', NULL),
(13, 9, 'Nha nay co thuong luong them khong?', '0902000003', 'Gia con thuong luong nhe, ban co the qua xem truoc.', 'replied', 'contacted', 'Da goi cho khach.'),
(17, 10, 'Biet thu co san dau xe may oto khong?', '0902000004', NULL, 'pending', 'scheduled', 'Lich hen xem: 14:30 24/08/2026. Hen xem nha cuoi tuan.'),
(21, 11, 'Can ho co noi that nhu hinh khong?', '0902000005', 'Can ho ban giao day du noi that nhu hinh.', 'replied', 'closed', 'Khach quan tam dat coc.'),
(23, 12, 'Nha mat tien hien co hop dong thue khong?', '0902000006', NULL, 'pending', 'new', NULL),
(26, 3, 'Can ho quan 5 co cho nuoi meo khong?', '0901000003', 'Co the trao doi them voi chu nha ve vat nuoi.', 'replied', 'contacted', 'Khach dang can nhac.'),
(28, 5, 'Van phong Binh Thanh con trong trong thang nay khong?', '0901000005', NULL, 'pending', 'new', NULL),
(34, 9, 'Van phong Da Nang co xuat hoa don khong?', '0902000003', 'Ben em co xuat hoa don day du.', 'replied', 'scheduled', 'Lich hen xem: 10:00 25/08/2026. Hen trao doi hop dong.');

INSERT IGNORE INTO saved_properties (buyer_id, property_id) VALUES
(3, 11), (3, 13), (3, 17), (3, 21),
(5, 12), (5, 16), (5, 23), (5, 28),
(9, 11), (9, 19), (9, 26),
(10, 17), (10, 21), (10, 34),
(11, 13), (11, 23), (11, 27),
(12, 14), (12, 28), (12, 34);

-- =============================================
-- SEED MO RONG LAN 2: du lieu co dau, da vung mien de demo loc nang cao
-- Mat khau tat ca tai khoan: 123456
-- =============================================

INSERT INTO users (full_name, email, password_hash, phone_number, role, status, email_verified) VALUES
('Công ty BĐS An Gia', 'owner5@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0903000001', 'owner', 'active', 1),
('Sàn giao dịch Nhà Xanh', 'owner6@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0903000002', 'owner', 'active', 1),
('Khách demo miền Bắc', 'buyer7@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0903000003', 'buyer', 'active', 1),
('Khách demo miền Trung', 'buyer8@bds.com', '$2b$10$nvgzofSTXqsU4CssCm..8eCx4WAN.biG8CFnpbfyQULMwF.Wq9l8y', '0903000004', 'buyer', 'active', 1);

INSERT INTO properties
  (owner_id, title, description, type, transaction_type, price, area,
   bedrooms, bathrooms, address, ward, district, city,
   latitude, longitude, direction, legal_status, status, reject_reason,
   approved_at, rejected_at, hidden_at, sold_at, featured_until, view_count, created_at)
VALUES
(13, 'Căn hộ Cầu Giấy 2PN gần công viên', 'Căn hộ sáng thoáng, ban công rộng, khu dân cư văn minh, gần trường học và công viên Cầu Giấy.', 'apartment', 'sale', 3850000000, 72, 2, 2, '68 Duy Tân', 'Dịch Vọng', 'Cầu Giấy', 'Hà Nội', 21.03020000, 105.78470000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 18 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 22 DAY), 46, DATE_SUB(NOW(), INTERVAL 19 DAY)),
(13, 'Cho thuê căn hộ Mỹ Đình full nội thất', 'Căn hộ 1 phòng ngủ, đầy đủ nội thất, phù hợp chuyên gia hoặc nhân viên văn phòng làm việc tại Mỹ Đình.', 'apartment', 'rent', 10500000, 45, 1, 1, '12 Hàm Nghi', 'Mỹ Đình 1', 'Nam Từ Liêm', 'Hà Nội', 21.02870000, 105.76920000, 'south', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 16 DAY), NULL, NULL, NULL, NULL, 29, DATE_SUB(NOW(), INTERVAL 17 DAY)),
(13, 'Nhà phố Thanh Xuân 5 tầng ô tô đỗ cửa', 'Nhà xây kiên cố, ngõ thông, gần Nguyễn Trãi, thuận tiện ở kết hợp cho thuê.', 'house', 'sale', 8250000000, 64, 4, 4, '35 Nguyễn Trãi', 'Nhân Chính', 'Thanh Xuân', 'Hà Nội', 21.00230000, 105.80750000, 'west', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 14 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 18 DAY), 52, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(13, 'Văn phòng Hoàn Kiếm gần phố đi bộ', 'Sàn văn phòng trung tâm, có thang máy, lễ tân, phù hợp công ty dịch vụ hoặc đại diện thương mại.', 'office', 'rent', 48000000, 110, NULL, 2, '22 Tràng Tiền', 'Tràng Tiền', 'Hoàn Kiếm', 'Hà Nội', 21.02410000, 105.85640000, 'north', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 12 DAY), NULL, NULL, NULL, NULL, 21, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(13, 'Căn hộ Vĩnh Tuy đang chờ duyệt', 'Tin mới đăng của chủ nhà, đang chờ admin kiểm duyệt hình ảnh và pháp lý.', 'apartment', 'sale', 2650000000, 58, 2, 1, '99 Minh Khai', 'Vĩnh Tuy', 'Hai Bà Trưng', 'Hà Nội', 20.99990000, 105.86880000, 'southeast', 'dangchoso', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 3, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(13, 'Căn hộ Sơn Trà view biển Mỹ Khê', 'Căn hộ nghỉ dưỡng view biển, nội thất đẹp, phù hợp ở hoặc khai thác cho thuê ngắn hạn.', 'apartment', 'sale', 5200000000, 86, 2, 2, 'Võ Nguyên Giáp', 'Phước Mỹ', 'Sơn Trà', 'Đà Nẵng', 16.06710000, 108.24560000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 11 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 28 DAY), 61, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(13, 'Nhà phố Hải Châu gần sông Hàn', 'Nhà phố vị trí trung tâm, khu dân cư sầm uất, thích hợp mở văn phòng hoặc homestay.', 'house', 'sale', 6900000000, 78, 3, 3, '48 Bạch Đằng', 'Hải Châu 1', 'Hải Châu', 'Đà Nẵng', 16.06800000, 108.22310000, 'north', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 10 DAY), NULL, NULL, NULL, NULL, 33, DATE_SUB(NOW(), INTERVAL 11 DAY)),
(13, 'Văn phòng Ngũ Hành Sơn cho thuê', 'Văn phòng nhỏ gần khu du lịch, mặt tiền sáng, phù hợp agency du lịch hoặc startup.', 'office', 'rent', 18500000, 62, NULL, 1, 'Ngũ Hành Sơn', 'Mỹ An', 'Ngũ Hành Sơn', 'Đà Nẵng', 16.04830000, 108.24420000, 'south', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 8 DAY), NULL, NULL, NULL, NULL, 17, DATE_SUB(NOW(), INTERVAL 9 DAY)),
(13, 'Đất nền Hòa Hải gần khu resort', 'Đất nền đường rộng, gần biển và khu nghỉ dưỡng, phù hợp đầu tư dài hạn.', 'land', 'sale', 3100000000, 150, NULL, NULL, 'Đường Trường Sa', 'Hòa Hải', 'Ngũ Hành Sơn', 'Đà Nẵng', 15.99230000, 108.26920000, NULL, 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 7 DAY), NULL, NULL, NULL, NULL, 24, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(13, 'Nhà phố Thủ Dầu Một gần trung tâm hành chính', 'Nhà phố 1 trệt 2 lầu, khu dân cư đông, gần trung tâm hành chính Bình Dương.', 'house', 'sale', 4200000000, 96, 3, 3, 'Đại lộ Bình Dương', 'Phú Hòa', 'Thủ Dầu Một', 'Bình Dương', 10.98040000, 106.67490000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 15 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 16 DAY), 38, DATE_SUB(NOW(), INTERVAL 16 DAY)),
(14, 'Căn hộ Dĩ An cho thuê gần làng đại học', 'Căn hộ mới, có hồ bơi, gym, di chuyển thuận tiện sang Thủ Đức.', 'apartment', 'rent', 8500000, 50, 2, 1, 'Quốc lộ 1K', 'Dĩ An', 'Dĩ An', 'Bình Dương', 10.90620000, 106.76900000, 'south', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 13 DAY), NULL, NULL, NULL, NULL, 19, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(14, 'Đất nền Mỹ Phước Bến Cát sổ riêng', 'Lô đất vuông vức, đường nhựa 12m, gần khu công nghiệp và tiện ích dân sinh.', 'land', 'sale', 1450000000, 125, NULL, NULL, 'Khu đô thị Mỹ Phước', 'Mỹ Phước', 'Bến Cát', 'Bình Dương', 11.15160000, 106.60760000, NULL, 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 9 DAY), NULL, NULL, NULL, NULL, 26, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(14, 'Nhà Thuận An đã giao dịch', 'Tin mẫu trạng thái đã bán để minh họa quy trình quản lý tin sau giao dịch.', 'house', 'sale', 3300000000, 74, 3, 2, 'Đường 22 tháng 12', 'An Phú', 'Thuận An', 'Bình Dương', 10.93320000, 106.71110000, 'west', 'sohong', 'sold', NULL, DATE_SUB(NOW(), INTERVAL 25 DAY), NULL, NULL, DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, 12, DATE_SUB(NOW(), INTERVAL 26 DAY)),
(14, 'Biệt thự Biên Hòa ven sông', 'Biệt thự sân vườn rộng, không gian yên tĩnh, phù hợp gia đình cần nghỉ dưỡng cuối tuần.', 'house', 'sale', 7800000000, 240, 4, 4, 'Đường ven sông Đồng Nai', 'Thống Nhất', 'Biên Hòa', 'Đồng Nai', 10.95060000, 106.82340000, 'northeast', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 20 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 40 DAY), 49, DATE_SUB(NOW(), INTERVAL 21 DAY)),
(14, 'Đất Nhơn Trạch gần khu đô thị mới', 'Đất nền đầu tư, gần cầu Cát Lái tương lai, khu vực có tiềm năng phát triển.', 'land', 'sale', 1180000000, 100, NULL, NULL, 'Đường Nguyễn Hữu Cảnh', 'Phú Hội', 'Nhơn Trạch', 'Đồng Nai', 10.71970000, 106.89050000, NULL, 'dangchoso', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 4, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(14, 'Căn hộ Vũng Tàu view biển cho thuê', 'Căn hộ nghỉ dưỡng gần bãi Sau, nội thất đầy đủ, có thể thuê ngắn hạn hoặc dài hạn.', 'apartment', 'rent', 16000000, 65, 2, 2, 'Thùy Vân', 'Phường 2', 'Vũng Tàu', 'Bà Rịa - Vũng Tàu', 10.33680000, 107.08790000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 18 DAY), NULL, NULL, NULL, NULL, 37, DATE_SUB(NOW(), INTERVAL 19 DAY)),
(14, 'Đất Phú Mỹ gần cụm cảng', 'Lô đất gần khu công nghiệp và cụm cảng, phù hợp đầu tư hoặc xây kho nhỏ.', 'land', 'sale', 2050000000, 180, NULL, NULL, 'Đường Mỹ Xuân', 'Phú Mỹ', 'Phú Mỹ', 'Bà Rịa - Vũng Tàu', 10.59020000, 107.04310000, NULL, 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 16 DAY), NULL, NULL, NULL, NULL, 20, DATE_SUB(NOW(), INTERVAL 17 DAY)),
(14, 'Nhà phố Bến Lức gần cao tốc', 'Nhà phố khu dân cư mới, kết nối nhanh TP.HCM qua cao tốc, phù hợp gia đình trẻ.', 'house', 'sale', 2450000000, 80, 3, 2, 'Đường Nguyễn Văn Tuôi', 'Bến Lức', 'Bến Lức', 'Long An', 10.64230000, 106.48910000, 'south', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 12 DAY), NULL, NULL, NULL, NULL, 18, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(14, 'Căn hộ Ninh Kiều trung tâm Cần Thơ', 'Căn hộ trung tâm, gần bến Ninh Kiều, tiện cho thuê hoặc ở lâu dài.', 'apartment', 'sale', 2350000000, 68, 2, 2, 'Đường 30 tháng 4', 'Xuân Khánh', 'Ninh Kiều', 'Cần Thơ', 10.03420000, 105.78110000, 'west', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 10 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 21 DAY), 34, DATE_SUB(NOW(), INTERVAL 11 DAY)),
(14, 'Nhà Hải Phòng gần Lạch Tray', 'Nhà phố 4 tầng, gần khu thương mại, trường học, giao thông thuận tiện.', 'house', 'sale', 5100000000, 70, 4, 3, 'Lạch Tray', 'Lạch Tray', 'Ngô Quyền', 'Hải Phòng', 20.84830000, 106.68810000, 'north', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 9 DAY), NULL, NULL, NULL, NULL, 23, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(14, 'Căn hộ Nha Trang gần biển Lộc Thọ', 'Căn hộ dịch vụ gần biển, khai thác cho thuê tốt, nội thất hiện đại.', 'apartment', 'sale', 3600000000, 62, 2, 1, 'Trần Phú', 'Lộc Thọ', 'Nha Trang', 'Khánh Hòa', 12.23960000, 109.19670000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 8 DAY), NULL, NULL, NULL, DATE_ADD(NOW(), INTERVAL 19 DAY), 44, DATE_SUB(NOW(), INTERVAL 9 DAY)),
(14, 'Đất Đà Lạt view đồi thông', 'Đất nghỉ dưỡng view thoáng, phù hợp xây homestay hoặc biệt thự vườn.', 'land', 'sale', 1900000000, 320, NULL, NULL, 'Đường Hoàng Hoa Thám', 'Phường 10', 'Đà Lạt', 'Lâm Đồng', 11.95040000, 108.46760000, NULL, 'dangchoso', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL, NULL, NULL, 30, DATE_SUB(NOW(), INTERVAL 7 DAY)),
(14, 'Căn hộ Hạ Long view vịnh', 'Căn hộ du lịch view vịnh, gần Bãi Cháy, tiện khai thác lưu trú.', 'apartment', 'sale', 4300000000, 75, 2, 2, 'Đường Hạ Long', 'Bãi Cháy', 'Hạ Long', 'Quảng Ninh', 20.95060000, 107.05100000, 'east', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL, NULL, NULL, 36, DATE_SUB(NOW(), INTERVAL 6 DAY)),
(14, 'Nhà phố Từ Sơn gần khu công nghiệp', 'Nhà phố khu dân cư hiện hữu, nhu cầu thuê cao, phù hợp đầu tư dòng tiền.', 'house', 'sale', 3150000000, 72, 3, 3, 'Đường Lý Thường Kiệt', 'Đình Bảng', 'Từ Sơn', 'Bắc Ninh', 21.11820000, 105.96090000, 'south', 'sohong', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, NULL, NULL, NULL, 15, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(14, 'Đất Văn Giang gần Ecopark bị từ chối', 'Tin mẫu bị từ chối do thiếu thông tin pháp lý chi tiết.', 'land', 'sale', 2700000000, 95, NULL, NULL, 'Đường liên xã', 'Xuân Quan', 'Văn Giang', 'Hưng Yên', 20.96290000, 105.93070000, NULL, 'dangchoso', 'rejected', 'Vui lòng bổ sung giấy tờ pháp lý và ảnh mặt bằng rõ hơn.', NULL, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL, NULL, 6, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(14, 'Văn phòng Sầm Sơn gần biển', 'Mặt bằng văn phòng kết hợp kinh doanh dịch vụ du lịch, vị trí gần trục chính ra biển.', 'office', 'rent', 15000000, 58, NULL, 1, 'Đường Hồ Xuân Hương', 'Trường Sơn', 'Sầm Sơn', 'Thanh Hóa', 19.74300000, 105.90200000, 'east', 'other', 'approved', NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, NULL, NULL, NULL, 9, DATE_SUB(NOW(), INTERVAL 4 DAY)),
(14, 'Nhà phố Huế gần Vỹ Dạ đang ẩn', 'Tin đã duyệt nhưng chủ nhà tạm ẩn để cập nhật giá bán và hình ảnh.', 'house', 'sale', 2900000000, 66, 3, 2, 'Đường Nguyễn Sinh Cung', 'Vỹ Dạ', 'Huế', 'Thừa Thiên Huế', 16.46470000, 107.60740000, 'northwest', 'sohong', 'hidden', NULL, DATE_SUB(NOW(), INTERVAL 7 DAY), NULL, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, 8, DATE_SUB(NOW(), INTERVAL 8 DAY));

INSERT INTO property_status_history (property_id, old_status, new_status, actor_id, note, created_at)
SELECT id, NULL, 'pending', owner_id, 'Owner tạo tin đăng', DATE_SUB(created_at, INTERVAL 1 HOUR)
FROM properties
WHERE id BETWEEN 35 AND 60;

INSERT INTO property_status_history (property_id, old_status, new_status, actor_id, note, created_at)
SELECT id, 'pending', status, 1,
       CASE
         WHEN status = 'approved' THEN 'Admin duyệt tin đăng'
         WHEN status = 'rejected' THEN reject_reason
         WHEN status = 'hidden' THEN 'Owner tạm ẩn tin đăng'
         WHEN status = 'sold' THEN 'Owner đánh dấu đã giao dịch'
         ELSE 'Tin đăng chờ duyệt'
       END,
       COALESCE(approved_at, rejected_at, hidden_at, sold_at, created_at)
FROM properties
WHERE id BETWEEN 35 AND 60
  AND status <> 'pending';

INSERT INTO featured_orders
  (property_id, owner_id, package_id, amount, payment_method, status, payment_code,
   paid_at, featured_start_at, featured_end_at, created_at)
VALUES
(35, 13, 2, 179000, 'vnpay', 'paid', 'VIP-SEED-0035', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(37, 13, 1, 99000, 'vnpay', 'paid', 'VIP-SEED-0037', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
(40, 13, 3, 299000, 'vnpay', 'paid', 'VIP-SEED-0040', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
(44, 13, 1, 99000, 'vnpay', 'paid', 'VIP-SEED-0044', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_ADD(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),
(48, 14, 3, 299000, 'vnpay', 'paid', 'VIP-SEED-0048', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
(53, 14, 2, 179000, 'vnpay', 'paid', 'VIP-SEED-0053', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 21 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
(55, 14, 2, 179000, 'vnpay', 'paid', 'VIP-SEED-0055', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 19 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY));

INSERT INTO property_images (property_id, url, `order`) VALUES
(35, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80', 1),
(35, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&q=80', 2),
(36, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80', 1),
(37, 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1000&q=80', 1),
(38, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1000&q=80', 1),
(39, 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=1000&q=80', 1),
(40, 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1000&q=80', 1),
(41, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1000&q=80', 1),
(42, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&q=80', 1),
(43, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1),
(44, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&q=80', 1),
(45, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80', 1),
(46, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1000&q=80', 1),
(47, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1000&q=80', 1),
(48, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1000&q=80', 1),
(49, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1),
(50, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80', 1),
(51, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&q=80', 1),
(52, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1000&q=80', 1),
(53, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1000&q=80', 1),
(54, 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1000&q=80', 1),
(55, 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=1000&q=80', 1),
(56, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1000&q=80', 1),
(57, 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1000&q=80', 1),
(58, 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1000&q=80', 1),
(59, 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=1000&q=80', 1),
(60, 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=1000&q=80', 1);

INSERT INTO contacts
  (property_id, buyer_id, message, phone_number, owner_reply, status, lead_status, owner_note)
VALUES
(35, 15, 'Tôi muốn xem căn hộ Cầu Giấy vào cuối tuần này.', '0903000003', 'Bên em còn lịch chiều thứ bảy, anh/chị xác nhận giúp em.', 'replied', 'scheduled', 'Lịch hẹn xem: 16:00 22/08/2026. Khách quan tâm vị trí gần công viên.'),
(37, 16, 'Nhà Thanh Xuân có thương lượng được thêm không?', '0903000004', NULL, 'pending', 'new', NULL),
(40, 15, 'Căn hộ Sơn Trà có khai thác cho thuê theo ngày được không?', '0903000003', 'Khu này cho thuê ngắn hạn tốt, em sẽ gửi thêm bảng dòng tiền tham khảo.', 'replied', 'contacted', 'Khách hỏi về đầu tư nghỉ dưỡng.'),
(44, 16, 'Nhà Thủ Dầu Một có hỗ trợ vay ngân hàng không?', '0903000004', NULL, 'pending', 'new', NULL),
(48, 15, 'Biệt thự Biên Hòa có sân đậu xe mấy chiếc?', '0903000003', 'Sân có thể đậu 2 ô tô và vài xe máy.', 'replied', 'scheduled', 'Lịch hẹn xem: 08:30 23/08/2026. Đã hẹn xem nhà sáng chủ nhật.'),
(53, 16, 'Căn hộ Ninh Kiều có cho thuê lại được không?', '0903000004', NULL, 'pending', 'contacted', 'Khách cần tính dòng tiền.'),
(55, 15, 'Căn hộ Nha Trang có phí quản lý bao nhiêu?', '0903000003', 'Phí quản lý khoảng 12.000đ/m2/tháng.', 'replied', 'closed', 'Khách muốn giữ chỗ.'),
(60, 16, 'Nhà Huế đang ẩn thì khi nào xem được?', '0903000004', NULL, 'pending', 'new', NULL);

INSERT IGNORE INTO saved_properties (buyer_id, property_id) VALUES
(15, 35), (15, 40), (15, 48), (15, 55),
(16, 37), (16, 44), (16, 53), (16, 60),
(3, 35), (3, 48), (5, 40), (5, 55);

-- =============================================
-- CHUAN HOA DU LIEU DEMO CU: doi cac tin khong dau sang co dau
-- de hien thi dep va loc khop voi select dia diem tren giao dien.
-- =============================================

UPDATE properties SET
  title = 'Căn hộ 1PN Thủ Thiêm view sông',
  description = 'Căn hộ mới bàn giao, view sông, nội thất cơ bản, phù hợp người đi làm tại trung tâm.',
  address = '12 Trần Bạch Đằng',
  ward = 'Thủ Thiêm',
  district = 'TP Thủ Đức',
  city = 'Hồ Chí Minh'
WHERE id = 11;

UPDATE properties SET
  title = 'Căn hộ 3PN Tân Phú gần Aeon Mall',
  description = 'Căn hộ rộng, 3 phòng ngủ, khu dân cư an ninh, gần trung tâm thương mại và trường học.',
  address = '30 Bờ Bao Tân Thắng',
  ward = 'Sơn Kỳ',
  district = 'Tân Phú',
  city = 'Hồ Chí Minh'
WHERE id = 12;

UPDATE properties SET
  title = 'Nhà phố Phú Nhuận hẻm 6m',
  description = 'Nhà phố 1 trệt 3 lầu, hẻm xe hơi, khu y tế văn phòng, thích hợp ở kết hợp kinh doanh.',
  address = '15 Hoa Lan',
  ward = 'Phường 2',
  district = 'Phú Nhuận',
  city = 'Hồ Chí Minh'
WHERE id = 13;

UPDATE properties SET
  title = 'Văn phòng Quận 1 tòa nhà hạng B',
  description = 'Sàn văn phòng đã hoàn thiện trần sàn, có lễ tân, bảo vệ, phù hợp công ty nhỏ.',
  address = '20 Lê Thánh Tôn',
  ward = 'Bến Nghé',
  district = 'Quận 1',
  city = 'Hồ Chí Minh'
WHERE id = 14;

UPDATE properties SET
  title = 'Đất nền Củ Chi 120m2 đường 10m',
  description = 'Đất nền khu dân cư hiện hữu, đường rộng, pháp lý rõ ràng, gần chợ và trường học.',
  address = 'Đường Nguyễn Thị Rành',
  ward = 'Tân Thông Hội',
  district = 'Củ Chi',
  city = 'Hồ Chí Minh'
WHERE id = 15;

UPDATE properties SET
  title = 'Căn hộ dịch vụ Bình Thạnh full nội thất',
  description = 'Căn hộ dịch vụ có thang máy, bảo vệ, dọn vào ở ngay, gần Hàng Xanh.',
  address = '90 Xô Viết Nghệ Tĩnh',
  ward = 'Phường 21',
  district = 'Bình Thạnh',
  city = 'Hồ Chí Minh'
WHERE id = 16;

UPDATE properties SET
  title = 'Biệt thự song lập Nhà Bè sân vườn',
  description = 'Biệt thự song lập có sân vườn, gara ô tô, khu biệt lập yên tĩnh, an ninh 24/7.',
  address = 'KDC Phước Kiển',
  ward = 'Phước Kiển',
  district = 'Nhà Bè',
  city = 'Hồ Chí Minh'
WHERE id = 17;

UPDATE properties SET
  title = 'Nhà cho thuê Thủ Đức gần Vincom',
  description = 'Nhà nguyên căn mới sơn sửa, 2 mặt tiền hẻm, phù hợp gia đình hoặc văn phòng nhỏ.',
  address = '45 Võ Văn Ngân',
  ward = 'Linh Chiểu',
  district = 'TP Thủ Đức',
  city = 'Hồ Chí Minh'
WHERE id = 18;

UPDATE properties SET
  title = 'Đất nền Long Thành gần sân bay',
  description = 'Lô đất đầu tư dài hạn, gần trục đường lớn, khu vực phát triển quanh sân bay Long Thành.',
  address = 'Đường ĐT769',
  ward = 'Long Đức',
  district = 'Long Thành',
  city = 'Đồng Nai'
WHERE id = 19;

UPDATE properties SET
  title = 'Văn phòng chia sẻ Gò Vấp 45m2',
  description = 'Mặt bằng văn phòng nhỏ, có sân để xe, phù hợp startup hoặc nhóm kinh doanh online.',
  address = '100 Phan Văn Trị',
  ward = 'Phường 10',
  district = 'Gò Vấp',
  city = 'Hồ Chí Minh'
WHERE id = 20;

UPDATE properties SET
  title = 'Căn hộ cao cấp Quận 7 2PN',
  description = 'Căn hộ view nội khu, nội thất đẹp, tiện ích đầy đủ, gần Crescent Mall.',
  address = 'Nguyễn Lương Bằng',
  ward = 'Tân Phú',
  district = 'Quận 7',
  city = 'Hồ Chí Minh'
WHERE id = 21;

UPDATE properties SET
  title = 'Officetel Quận 4 view kênh',
  description = 'Officetel vừa ở vừa làm việc, gần trung tâm Quận 1, bảo vệ và thang máy 24/7.',
  address = 'Bến Vân Đồn',
  ward = 'Phường 6',
  district = 'Quận 4',
  city = 'Hồ Chí Minh'
WHERE id = 22;

UPDATE properties SET
  title = 'Nhà mặt tiền Tân Bình kinh doanh',
  description = 'Nhà mặt tiền đường lớn, hiện đang cho thuê, dòng tiền ổn định hằng tháng.',
  address = 'Cộng Hòa',
  ward = 'Phường 13',
  district = 'Tân Bình',
  city = 'Hồ Chí Minh'
WHERE id = 23;

UPDATE properties SET
  title = 'Đất vườn Bảo Lộc nghỉ dưỡng',
  description = 'Đất vườn khí hậu mát mẻ, có đường xe hơi, phù hợp làm homestay nghỉ dưỡng.',
  address = 'Xã Lộc Thành',
  ward = 'Lộc Thành',
  district = 'Bảo Lộc',
  city = 'Lâm Đồng'
WHERE id = 24;

UPDATE properties SET
  title = 'Căn hộ bị từ chối do thiếu hình ảnh',
  description = 'Tin mẫu đang bị từ chối vì hình ảnh chưa đạt yêu cầu.',
  address = 'Đường Lũy Bán Bích',
  ward = 'Tân Thới Hòa',
  district = 'Tân Phú',
  city = 'Hồ Chí Minh',
  reject_reason = 'Hình ảnh nội thất bị mờ, vui lòng cập nhật lại ảnh rõ hơn.'
WHERE id = 25;

UPDATE properties SET
  title = 'Căn hộ cho thuê Quận 5 gần bệnh viện',
  description = 'Căn hộ sạch sẽ, gần bệnh viện và trường đại học, phù hợp sinh viên hoặc gia đình nhỏ.',
  address = 'Trần Hưng Đạo',
  ward = 'Phường 2',
  district = 'Quận 5',
  city = 'Hồ Chí Minh'
WHERE id = 26;

UPDATE properties SET
  title = 'Nhà phố Quận 8 giá tốt',
  description = 'Nhà phố khu dân cư đông đúc, gần cầu Nguyễn Văn Cừ, thích hợp mua ở lâu dài.',
  address = 'Tạ Quang Bửu',
  ward = 'Phường 5',
  district = 'Quận 8',
  city = 'Hồ Chí Minh'
WHERE id = 27;

UPDATE properties SET
  title = 'Văn phòng Bình Thạnh 120m2',
  description = 'Sàn văn phòng rộng, có phòng họp riêng, gần khu công ty công nghệ.',
  address = 'Điện Biên Phủ',
  ward = 'Phường 25',
  district = 'Bình Thạnh',
  city = 'Hồ Chí Minh'
WHERE id = 28;

UPDATE properties SET
  title = 'Đất nền Dĩ An gần khu công nghiệp',
  description = 'Đất nền pháp lý rõ, gần khu công nghiệp, tiềm năng cho thuê phòng trọ.',
  address = 'Đường Nguyễn An Ninh',
  ward = 'Dĩ An',
  district = 'Dĩ An',
  city = 'Bình Dương'
WHERE id = 29;

UPDATE properties SET
  title = 'Nhà đã bán tại Hóc Môn',
  description = 'Tin mẫu đã giao dịch thành công để hiển thị trạng thái sold.',
  address = 'Quốc lộ 22',
  ward = 'Bà Điểm',
  district = 'Hóc Môn',
  city = 'Hồ Chí Minh'
WHERE id = 30;

UPDATE properties SET
  title = 'Căn hộ đang chờ duyệt Bình Tân',
  description = 'Tin mới đang chờ admin kiểm duyệt nội dung và hình ảnh.',
  address = 'Tên Lửa',
  ward = 'Bình Trị Đông B',
  district = 'Bình Tân',
  city = 'Hồ Chí Minh'
WHERE id = 31;

UPDATE properties SET
  title = 'Đất nền đang chờ duyệt Nhơn Trạch',
  description = 'Tin mới của owner đang đợi xét duyệt.',
  address = 'Đường Hùng Vương',
  ward = 'Phú Hội',
  district = 'Nhơn Trạch',
  city = 'Đồng Nai'
WHERE id = 32;

UPDATE properties SET
  title = 'Nhà phố đang ẩn Quận 6',
  description = 'Tin đã duyệt nhưng owner đang tạm ẩn để cập nhật giá.',
  address = 'Hậu Giang',
  ward = 'Phường 11',
  district = 'Quận 6',
  city = 'Hồ Chí Minh'
WHERE id = 33;

UPDATE properties SET
  title = 'Văn phòng cho thuê Đà Nẵng',
  description = 'Văn phòng trung tâm thành phố, gần sông Hàn, phù hợp chi nhánh công ty.',
  address = 'Bạch Đằng',
  ward = 'Hải Châu 1',
  district = 'Hải Châu',
  city = 'Đà Nẵng'
WHERE id = 34;
