# CI/CD cho hệ thống quản lý bất động sản

## 1. Mục tiêu

Pipeline CI tự động kiểm tra mã nguồn mỗi khi có thay đổi được đẩy lên GitHub. Mục tiêu là phát hiện lỗi sớm, bảo đảm frontend lint/build thành công, backend vượt qua kiểm tra cú pháp và test, các kịch bản UI hoạt động, đồng thời cấu hình Docker vẫn build được. Dự án chưa có bước CD/deploy tự động.

## 2. Công cụ sử dụng

- GitHub: quản lý mã nguồn.
- GitHub Actions: tự động chạy pipeline.
- Node.js 22: môi trường kiểm tra frontend và backend.
- Jest, Supertest: kiểm thử route/unit backend với các phụ thuộc được mock.
- Playwright: chạy 5 kịch bản UI với API được mock.
- Docker Compose: kiểm tra cấu hình triển khai các service.

## 3. Pipeline hiện tại

Pipeline được đặt tại:

`.github/workflows/ci.yml`

Pipeline gồm 5 job chính:

### 3.1. Frontend build

Job này chạy cho thư mục `frontend`.

Các bước xử lý:

1. Checkout source code.
2. Cài đặt Node.js.
3. Cài thư viện bằng `npm ci`.
4. Lint các module frontend trọng yếu bằng `npm run lint:ci`.
5. Build giao diện bằng `npm run build`.

Kết quả mong muốn: frontend build thành công, không phát sinh lỗi biên dịch.

### 3.2. Backend checks

Job này chạy lần lượt cho các service:

- `api-gateway`
- `auth-service`
- `property-service`
- `listing-service`
- `contact-service`

Các bước xử lý:

1. Checkout source code.
2. Cài đặt Node.js.
3. Cài thư viện bằng `npm ci`.
4. Kiểm tra cú pháp toàn bộ file `.js` bằng `node --check`.
5. Chạy Jest cho bốn microservice; API Gateway hiện chỉ được kiểm tra cú pháp.

Kết quả mong muốn: backend không có lỗi cú pháp và 99 test hiện có đều đạt.

### 3.3. Docker Compose config

Job này kiểm tra file `docker-compose.yml`.

Lệnh kiểm tra:

```bash
docker compose config
```

Kết quả mong muốn: cấu hình Docker Compose hợp lệ và có thể dùng để khởi động toàn bộ hệ thống.

### 3.4. Playwright UI scenarios

Job này cài Chromium và chạy:

```bash
npm run test:system
```

Hiện có 5 kịch bản UI. Các request API được mock, vì vậy đây là kiểm thử hành vi giao diện, không phải kiểm thử full-stack với MySQL/VNPay thật.

### 3.5. Docker Compose build

Job này kiểm tra việc build Docker image cho các service trong hệ thống.

Lệnh kiểm tra:

```bash
docker compose build
```

Kết quả mong muốn: các image của API Gateway và các service backend build thành công.

## 4. Cách kích hoạt pipeline

Pipeline tự động chạy khi:

- Push code lên nhánh `main`.
- Tạo Pull Request vào nhánh `main`.
- Chạy thủ công bằng nút `Run workflow` trên GitHub Actions.

## 5. Phạm vi đã hoàn thành

| Nội dung | Trạng thái |
| --- | --- |
| Đẩy mã nguồn lên GitHub | Đã hỗ trợ |
| Tự động build frontend | Đã làm |
| Tự động kiểm tra backend | Đã làm |
| Kiểm tra cấu hình Docker Compose | Đã làm |
| Tự động build Docker image | Đã làm |
| Route/unit test backend tự động | Đã làm (99 test) |
| Playwright UI test | Đã làm (5 kịch bản, API mock) |
| Integration test với MySQL thật | Hướng phát triển |
| Stress test | Hướng phát triển |
| Deploy lên cloud | Hướng phát triển |

## 6. Hướng phát triển

Trong giai đoạn tiếp theo, CI/CD có thể mở rộng thêm các bước:

- Bổ sung integration test chạy với MySQL thật và kiểm thử full-stack không mock API.
- Bổ sung quality gate cho toàn bộ ESLint frontend, thay vì chỉ các module trọng yếu.
- Kiểm thử callback/IPN bằng tài khoản VNPay Sandbox thật trong môi trường staging.
- Thêm stress test để đánh giá hiệu năng API.
- Build Docker image và push lên Docker Hub hoặc GitHub Container Registry.
- Deploy tự động lên cloud sau khi pipeline chạy thành công.
