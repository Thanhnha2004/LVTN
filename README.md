# LVTN - Hệ thống quản lý bất động sản

Đây là project luận văn tốt nghiệp xây dựng website quản lý bất động sản theo kiến trúc Microservices. Hệ thống hỗ trợ 3 vai trò chính: **Buyer**, **Owner** và **Admin**.

## 1. Chức năng chính

### Buyer

- Đăng ký, đăng nhập, xác minh email bằng OTP.
- Tìm kiếm và lọc bất động sản theo loại hình, hình thức giao dịch, khu vực, giá, diện tích và từ khóa.
- Xem chi tiết tin đăng, hình ảnh, vị trí bản đồ và thông tin Owner.
- Gửi yêu cầu liên hệ đến Owner.
- Xem phản hồi liên hệ từ Owner.
- Lưu và bỏ lưu tin yêu thích.
- Cập nhật hồ sơ cá nhân, đổi mật khẩu, quên mật khẩu.

### Owner

- Tạo tin bất động sản.
- AI hỗ trợ gợi ý mô tả tin đăng.
- Chỉnh sửa tin đăng và upload hình ảnh.
- Quản lý trạng thái tin: ẩn tin, hiện lại tin, đánh dấu đã giao dịch, xóa tin.
- Xem lý do từ chối và gửi duyệt lại.
- Xem và phản hồi yêu cầu liên hệ từ Buyer.
- Quản lý lead liên hệ.
- Xem dashboard thống kê và lịch sử trạng thái tin đăng.

### Admin

- Đăng nhập với vai trò Admin.
- Xem danh sách tin chờ duyệt.
- Xem chi tiết tin đăng trước khi duyệt.
- Duyệt, từ chối kèm lý do, ẩn tin vi phạm.
- Bật/tắt tin nổi bật.
- Quản lý tài khoản người dùng.
- Xem dashboard thống kê tổng quan.

## 2. Kiến trúc hệ thống

Hệ thống được chia thành các thành phần:

```text
frontend
api-gateway
services
  auth-service
  property-service
  listing-service
  contact-service
mysql
```

### Các service

| Service | Port | Chức năng |
|---|---:|---|
| Frontend | 5173 | Giao diện React/Vite |
| API Gateway | 3000 | Điều hướng request đến các service |
| Auth Service | 3001 | Đăng ký, đăng nhập, OTP, quên mật khẩu, hồ sơ cá nhân, thông báo, quản lý user |
| Property Service | 3002 | Quản lý tin đăng, upload ảnh, duyệt tin, lịch sử trạng thái, AI mô tả |
| Listing Service | 3003 | API public tìm kiếm, lọc và xem chi tiết bất động sản |
| Contact Service | 3004 | Liên hệ Buyer/Owner, phản hồi, lưu tin yêu thích, quản lý lead |
| MySQL | 3307 | Cơ sở dữ liệu |

API Gateway là điểm truy cập chính của frontend:

```text
http://localhost:3000
```

## 3. Công nghệ sử dụng

- Frontend: React, Vite, Axios, React Router, Leaflet.
- Backend: Node.js, Express.js.
- Database: MySQL 8.
- Authentication: JWT, bcrypt.
- Email: NodeMailer.
- Upload hình ảnh: Cloudinary.
- Container: Docker, Docker Compose.
- Source control: Git/GitHub.

## 4. Cấu trúc thư mục

```text
LVTN/
  api-gateway/
  frontend/
  services/
    auth-service/
    property-service/
    listing-service/
    contact-service/
  tests/
  init.sql
  docker-compose.yml
  README.md
```

## 5. Biến môi trường

Tạo file `.env` ở thư mục gốc project:

```env
DB_HOST=mysql
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=lvtn

JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173

MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Lưu ý:

- `MAIL_PASS` nên là app password của email, không nên dùng mật khẩu đăng nhập trực tiếp.
- Cloudinary dùng cho chức năng upload hình ảnh bất động sản.

## 6. Chạy project bằng Docker

Tại thư mục gốc project:

```bash
docker compose up -d --build
```

Kiểm tra container:

```bash
docker compose ps
```

Dừng project:

```bash
docker compose down
```

Reset lại database từ đầu:

```bash
docker compose down -v
docker compose up -d --build
```

## 7. Chạy frontend

Nếu backend đang chạy bằng Docker, có thể chạy frontend riêng:

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

Build frontend:

```bash
npm run build
```

## 8. Database

File `init.sql` được dùng để:

- Tạo các bảng chính.
- Tạo khóa chính, khóa ngoại.
- Tạo dữ liệu mẫu để demo.

Một số bảng chính:

- `users`
- `otp_codes`
- `properties`
- `property_images`
- `property_views`
- `contacts`
- `saved_properties`
- `notifications`
- `property_status_history`

## 9. API endpoints chính

### Auth Service

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-email
POST   /api/auth/resend-otp
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
PUT    /api/auth/profile
PUT    /api/auth/change-password
```

### Notifications

```text
GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

### Property Service

```text
POST   /api/property
GET    /api/property/:id
PUT    /api/property/:id
DELETE /api/property/:id
POST   /api/property/:id/images
PATCH  /api/property/:id/status
PATCH  /api/property/:id/hide
PATCH  /api/property/:id/unhide
PATCH  /api/property/:id/sold
PATCH  /api/property/:id/featured
GET    /api/property/:id/history
POST   /api/property/ai-description
```

### Listing Service

```text
GET    /api/listing
GET    /api/listing/:id
```

### Contact Service

```text
POST   /api/contact
GET    /api/contact/buyer
GET    /api/contact/owner
PATCH  /api/contact/:id/reply
PATCH  /api/contact/:id/lead-status
POST   /api/contact/save/:propertyId
DELETE /api/contact/save/:propertyId
GET    /api/contact/saved
```

### Admin

```text
GET    /api/admin/users
PATCH  /api/admin/users/:id/status
GET    /api/admin/dashboard
```

## 10. Kiểm thử và kiểm tra

Kiểm tra frontend:

```bash
cd frontend
npm run build
```

Kiểm tra cú pháp backend:

```bash
node --check api-gateway/index.js
node --check services/auth-service/src/routes/auth.js
node --check services/property-service/src/routes/property.js
node --check services/contact-service/src/routes/contact.js
```

Trong báo cáo, các kịch bản kiểm thử chính được chia theo vai trò:

- Người dùng chung: đăng ký, xác minh email, đăng nhập, quên mật khẩu.
- Buyer: tìm kiếm, xem chi tiết, gửi liên hệ, lưu tin.
- Owner: đăng tin, AI mô tả, chỉnh sửa tin, phản hồi liên hệ.
- Admin: duyệt/từ chối tin, quản lý tài khoản, dashboard.

## 11. CI/CD

Project đã có các nền tảng phục vụ CI/CD:

- Quản lý mã nguồn bằng Git/GitHub.
- Chạy hệ thống bằng Docker Compose.
- Có API Gateway cho kiến trúc microservices.
- Có lệnh build frontend.
- Có thể kiểm tra cú pháp backend bằng `node --check`.

Hướng phát triển tiếp theo:

- Thêm GitHub Actions để tự động build frontend.
- Thêm GitHub Actions để kiểm tra backend.
- Thêm test tự động bằng Playwright cho các luồng giao diện chính.
- Triển khai lên cloud/VPS nếu cần demo online.

## 12. Tài khoản demo

Tài khoản demo được tạo trong `init.sql`. Có thể xem và điều chỉnh trực tiếp trong file này khi reset database.

Vai trò chính:

- Buyer
- Owner
- Admin

## 13. Ghi chú

- Tin mới tạo sẽ ở trạng thái `pending` và cần Admin duyệt.
- Buyer chỉ xem được tin đã được duyệt.
- Owner xem được lý do từ chối và có thể chỉnh sửa để gửi duyệt lại.
- Các thao tác nguy hiểm như xóa/ẩn/duyệt/tắt tài khoản có popup xác nhận.
- AI mô tả tin đăng hiện tại là chức năng hỗ trợ tạo nội dung dựa trên dữ liệu tin đăng đã nhập.
