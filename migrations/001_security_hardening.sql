-- Chạy một lần cho database đã được tạo trước bản vá bảo mật.
-- Nên sao lưu database trước khi chạy migration trong môi trường có dữ liệu thật.

ALTER TABLE users
  ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER email_verified,
  ADD COLUMN is_demo_account TINYINT(1) NOT NULL DEFAULT 0 AFTER token_version;

UPDATE users
SET is_demo_account = 1,
    token_version = token_version + 1
WHERE email = 'admin@bds.com' AND role = 'admin';

ALTER TABLE otp_codes
  ADD COLUMN attempt_count INT NOT NULL DEFAULT 0 AFTER used;

-- Kiểm tra đơn pending trùng trước khi thêm UNIQUE; xem migrations/README.md.
ALTER TABLE featured_orders
  ADD COLUMN pending_guard TINYINT GENERATED ALWAYS AS (
    CASE WHEN status = 'pending' THEN 1 ELSE NULL END
  ) STORED AFTER featured_end_at,
  ADD UNIQUE KEY unique_pending_featured_order (
    property_id,
    owner_id,
    pending_guard
  );

ALTER TABLE property_images
  ADD UNIQUE KEY unique_property_image_order (property_id, `order`);

-- Các UNIQUE bên trên và bên dưới sẽ dừng nếu dữ liệu cũ bị trùng.
-- Chạy các truy vấn preflight trong migrations/README.md trước khi ALTER.
ALTER TABLE contacts
  ADD UNIQUE KEY unique_contact_request (property_id, buyer_id);
