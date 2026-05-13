## API Endpoints

### Auth Service  (PORT 3001)
POST   /api/auth/register        — Đăng ký tài khoản
POST   /api/auth/login           — Đăng nhập, trả về JWT
GET    /api/auth/me              — Lấy thông tin user hiện tại (cần JWT)

### Property Service  (PORT 3002)
POST   /api/property             — Tạo tin đăng (owner)
GET    /api/property/:id         — Xem chi tiết 1 tin
PUT    /api/property/:id         — Sửa tin đăng (owner)
DELETE /api/property/:id         — Xoá tin đăng (owner)
PATCH  /api/property/:id/status  — Duyệt / từ chối tin (admin)

### Listing Service  (PORT 3003)
GET    /api/listing              — Danh sách tin + lọc + phân trang
GET    /api/listing/:id          — Chi tiết tin (public)

### Contact Service  (PORT 3004)
POST   /api/contact              — Gửi yêu cầu liên hệ (buyer)
GET    /api/contact/owner        — Danh sách liên hệ nhận được (owner)
PATCH  /api/contact/:id/reply    — Phản hồi liên hệ (owner)