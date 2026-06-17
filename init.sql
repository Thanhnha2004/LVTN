CREATE DATABASE IF NOT EXISTS bds_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE bds_db;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS saved_properties;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS property_views;
DROP TABLE IF EXISTS property_images;
DROP TABLE IF EXISTS properties;
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
  is_featured      TINYINT(1)   NOT NULL DEFAULT 0,
  featured_until   DATETIME     DEFAULT NULL,
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
  INDEX idx_prop_featured (is_featured, featured_until)
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
-- BẢNG property_views
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

INSERT INTO properties
  (owner_id, title, description, type, transaction_type, price, area,
   bedrooms, bathrooms, address, ward, district, city,
   latitude, longitude, direction, legal_status, status, reject_reason, is_featured, featured_until)
VALUES
(2,
 'Căn hộ 2PN Quận 1 view sông Sài Gòn',
 'Căn hộ cao cấp tầng 18, view trực diện sông Sài Gòn, đầy đủ nội thất cao cấp. Tiện ích: hồ bơi, gym, bảo vệ 24/7.',
 'apartment', 'sale', 3500000000, 72,
 2, 2, '123 Tôn Đức Thắng', 'Bến Nghé', 'Quận 1', 'Hồ Chí Minh',
 10.77375400, 106.70439400, 'east', 'sohong', 'approved', NULL, 1, DATE_ADD(NOW(), INTERVAL 30 DAY)),

(2,
 'Nhà phố Bình Thạnh 4 tầng hẻm xe hơi',
 'Nhà phố đẹp hẻm thông xe hơi, gần chợ Bà Chiểu, thuận tiện kinh doanh. Kết cấu chắc chắn, thiết kế hiện đại.',
 'house', 'sale', 6800000000, 90,
 4, 3, '45 Đinh Tiên Hoàng', 'Đa Kao', 'Bình Thạnh', 'Hồ Chí Minh',
 10.80154600, 106.71398700, 'south', 'sohong', 'approved', NULL, 0, NULL),

(2,
 'Cho thuê căn hộ Studio Quận 7 gần Phú Mỹ Hưng',
 'Studio 35m2 hiện đại, đầy đủ tiện nghi, ban công thoáng mát. Gần trung tâm Phú Mỹ Hưng, siêu thị, trường học.',
 'apartment', 'rent', 8000000, 35,
 1, 1, '88 Nguyễn Thị Thập', 'Tân Phú', 'Quận 7', 'Hồ Chí Minh',
 10.73152700, 106.71843500, 'north', 'sohong', 'approved', NULL, 1, DATE_ADD(NOW(), INTERVAL 15 DAY)),

(2,
 'Đất nền Bình Dương 200m2 sổ hồng riêng',
 'Đất thổ cư 200m2, sổ hồng riêng, mặt đường 8m, khu dân cư hiện hữu đông đúc, pháp lý rõ ràng.',
 'land', 'sale', 1200000000, 200,
 NULL, NULL, 'KDC Mỹ Phước', 'Mỹ Phước', 'Thị xã Bến Cát', 'Bình Dương',
 11.11638900, 106.64583300, NULL, 'sohong', 'pending', NULL, 0, NULL),

(2,
 'Văn phòng cho thuê Quận 3 trung tâm',
 'Văn phòng 80m2 tầng 5, thang máy, máy lạnh trung tâm, view đẹp, gần nhiều tiện ích. Phù hợp công ty 10-20 người.',
 'office', 'rent', 25000000, 80,
 NULL, NULL, '12 Nguyễn Thị Minh Khai', 'Võ Thị Sáu', 'Quận 3', 'Hồ Chí Minh',
 10.78033300, 106.68697300, 'west', NULL, 'approved', NULL, 0, NULL),

(2,
 'Nhà hẻm Quận 10 cần bổ sung giấy tờ',
 'Tin mẫu bị từ chối để owner xem lý do và chỉnh sửa lại trước khi gửi duyệt.',
 'house', 'sale', 4200000000, 58,
 3, 2, '21 Thành Thái', 'Phường 14', 'Quận 10', 'Hồ Chí Minh',
 10.77130000, 106.66790000, 'east', 'dangchoso', 'rejected', 'Ảnh giấy tờ pháp lý chưa rõ, vui lòng bổ sung sổ hồng hoặc giấy tờ chứng minh quyền sở hữu.', 0, NULL),

(2,
 'Nhà phố Tân Bình chủ nhà tạm ẩn',
 'Tin mẫu đang ẩn để kiểm tra chức năng hiện lại và gửi duyệt lại.',
 'house', 'sale', 5100000000, 75,
 3, 3, '30 Cộng Hòa', 'Phường 12', 'Tân Bình', 'Hồ Chí Minh',
 10.80110000, 106.65210000, 'south', 'sohong', 'hidden', NULL, 0, NULL),

(4,
 'Biệt thự mini Thủ Đức 3 phòng ngủ',
 'Biệt thự mini sân vườn, hồ bơi riêng, yên tĩnh. Gần ĐHQG, Metro Suối Tiên.',
 'house', 'sale', 5500000000, 150,
 3, 3, '56 Võ Văn Ngân', 'Bình Thọ', 'TP Thủ Đức', 'Hồ Chí Minh',
 10.85000000, 106.76000000, 'northeast', 'sohong', 'approved', NULL, 1, DATE_ADD(NOW(), INTERVAL 45 DAY)),

(4,
 'Cho thuê nhà nguyên căn Gò Vấp 3PN',
 'Nhà nguyên căn 3 tầng, 3 phòng ngủ, phù hợp gia đình hoặc nhóm bạn. Có chỗ để xe ô tô.',
 'house', 'rent', 12000000, 110,
 3, 2, '78 Quang Trung', 'Hiệp Phú', 'Gò Vấp', 'Hồ Chí Minh',
 10.83827000, 106.68215000, 'south', 'sohong', 'approved', NULL, 0, NULL),

(4,
 'Lô đất Long An đã giao dịch',
 'Tin mẫu đã bán để owner xem trạng thái đã giao dịch.',
 'land', 'sale', 950000000, 180,
 NULL, NULL, 'Đường tỉnh 830', 'Lương Hòa', 'Bến Lức', 'Long An',
 10.64260000, 106.47280000, NULL, 'sohong', 'sold', NULL, 0, NULL);

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

INSERT INTO property_views (property_id, viewer_ip, viewed_at) VALUES
(1, '127.0.0.1', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(1, '127.0.0.2', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(1, '127.0.0.3', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, '127.0.0.4', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, '127.0.0.5', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(1, '127.0.0.6', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(1, '127.0.0.7', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, '127.0.0.8', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, '127.0.0.9', NOW()),
(2, '127.0.1.1', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(2, '127.0.1.2', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, '127.0.1.3', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, '127.0.1.4', NOW()),
(3, '127.0.2.1', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, '127.0.2.2', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, '127.0.2.3', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, '127.0.3.1', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(5, '127.0.3.2', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, '127.0.4.1', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, '127.0.4.2', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(8, '127.0.4.3', NOW()),
(9, '127.0.5.1', DATE_SUB(NOW(), INTERVAL 1 DAY));

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
