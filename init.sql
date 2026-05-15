CREATE DATABASE IF NOT EXISTS bds_db;
USE bds_db;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Bảng users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('buyer', 'owner', 'admin') NOT NULL DEFAULT 'buyer',
  status ENUM('active', 'banned') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng properties
CREATE TABLE properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('apartment', 'house', 'land', 'office') NOT NULL,
  transaction_type ENUM('sale', 'rent') NOT NULL DEFAULT 'sale',
  price DECIMAL(15,2) NOT NULL,
  area DECIMAL(10,2) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'hidden', 'sold') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng property_images
CREATE TABLE property_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  `order` INT DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Bảng contacts
CREATE TABLE contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  buyer_id INT NOT NULL,
  message TEXT NOT NULL,
  owner_reply TEXT,
  status ENUM('pending', 'replied') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng saved_properties (lưu tin quan tâm)
CREATE TABLE saved_properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_save (buyer_id, property_id),
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- =====================
-- SEED DỮ LIỆU MẪU
-- =====================

-- Tài khoản mẫu (password đều là: 123456)
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Admin',         'admin@bds.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Nguyễn Văn An', 'owner@bds.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner'),
('Trần Thị Bình', 'buyer@bds.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'buyer');

-- Tin đăng mẫu (owner_id = 2)
INSERT INTO properties (owner_id, title, description, type, transaction_type, price, area, address, city, status) VALUES
(2, 'Căn hộ 2PN Quận 1 view sông', 'Căn hộ cao cấp tầng 18, view sông Sài Gòn, đầy đủ nội thất.', 'apartment', 'sale', 3500000000, 72, '123 Tôn Đức Thắng', 'Hồ Chí Minh', 'approved'),
(2, 'Nhà phố Bình Thạnh 4 tầng',   'Nhà phố đẹp hẻm xe hơi, gần chợ, tiện kinh doanh.',          'house',     'sale', 6800000000, 90, '45 Đinh Tiên Hoàng', 'Hồ Chí Minh', 'approved'),
(2, 'Cho thuê căn hộ Studio Quận 7','Studio hiện đại, đầy đủ tiện nghi, gần Phú Mỹ Hưng.',        'apartment', 'rent', 8000000,    35, '88 Nguyễn Thị Thập',  'Hồ Chí Minh', 'approved'),
(2, 'Đất nền Bình Dương 200m2',     'Đất thổ cư, sổ hồng riêng, đường 8m, khu dân cư đông đúc.', 'land',      'sale', 1200000000, 200,'KDC Mỹ Phước',        'Bình Dương',  'pending');

-- Ảnh mẫu cho tin đăng
INSERT INTO property_images (property_id, url, `order`) VALUES
(1, 'https://placehold.co/800x500?text=Căn+hộ+Q1+ảnh+1', 1),
(1, 'https://placehold.co/800x500?text=Căn+hộ+Q1+ảnh+2', 2),
(2, 'https://placehold.co/800x500?text=Nhà+phố+BT+ảnh+1', 1),
(3, 'https://placehold.co/800x500?text=Studio+Q7+ảnh+1',  1);

-- Liên hệ mẫu
INSERT INTO contacts (property_id, buyer_id, message, status) VALUES
(1, 3, 'Tôi muốn xem căn hộ này vào cuối tuần, liên hệ giúp tôi nhé.', 'pending'),
(2, 3, 'Nhà còn không ạ? Tôi quan tâm muốn đặt lịch xem.', 'pending');