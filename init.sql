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
(2, 3, 'Nhà còn không ạ? Tôi quan tâm muốn đặt lịch xem.', '0901000003', 'Nhà vẫn còn. Bạn có thể xem vào sáng thứ 7 tuần này nhé!', 'replied', 'scheduled', 'Đã hẹn xem lúc 9h sáng thứ 7.'),
(3, 5, 'Studio này còn trống không? Tôi cần thuê từ tháng sau.', '0901000005', NULL, 'pending', 'contacted', 'Đã gọi nhưng khách muốn xem thêm ảnh.'),
(5, 5, 'Văn phòng có xuất hóa đơn và cho thuê tối thiểu bao lâu?', '0901000005', 'Bên em có xuất hóa đơn, hợp đồng tối thiểu 12 tháng.', 'replied', 'closed', 'Khách đồng ý đặt cọc giữ chỗ.'),
(8, 3, 'Biệt thự có chỗ để ô tô không ạ? Cho tôi xem vào cuối tuần được không?', '0901000003', NULL, 'pending', 'scheduled', 'Chờ xác nhận lịch xem nhà chiều chủ nhật.'),
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
(17, 10, 'Biet thu co san dau xe may oto khong?', '0902000004', NULL, 'pending', 'scheduled', 'Hen xem nha cuoi tuan.'),
(21, 11, 'Can ho co noi that nhu hinh khong?', '0902000005', 'Can ho ban giao day du noi that nhu hinh.', 'replied', 'closed', 'Khach quan tam dat coc.'),
(23, 12, 'Nha mat tien hien co hop dong thue khong?', '0902000006', NULL, 'pending', 'new', NULL),
(26, 3, 'Can ho quan 5 co cho nuoi meo khong?', '0901000003', 'Co the trao doi them voi chu nha ve vat nuoi.', 'replied', 'contacted', 'Khach dang can nhac.'),
(28, 5, 'Van phong Binh Thanh con trong trong thang nay khong?', '0901000005', NULL, 'pending', 'new', NULL),
(34, 9, 'Van phong Da Nang co xuat hoa don khong?', '0902000003', 'Ben em co xuat hoa don day du.', 'replied', 'scheduled', 'Hen trao doi hop dong.');

INSERT IGNORE INTO saved_properties (buyer_id, property_id) VALUES
(3, 11), (3, 13), (3, 17), (3, 21),
(5, 12), (5, 16), (5, 23), (5, 28),
(9, 11), (9, 19), (9, 26),
(10, 17), (10, 21), (10, 34),
(11, 13), (11, 23), (11, 27),
(12, 14), (12, 28), (12, 34);
