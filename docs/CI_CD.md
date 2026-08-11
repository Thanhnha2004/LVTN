# CI/CD cho hệ thống quản lý bất động sản

## 1. Mục tiêu

Pipeline CI tự động kiểm tra mã nguồn mỗi khi có thay đổi được đẩy lên GitHub. Mục tiêu là phát hiện lỗi sớm, bảo đảm frontend lint/build thành công, backend vượt qua kiểm tra cú pháp và test, các kịch bản UI hoạt động, đồng thời cấu hình Docker vẫn hợp lệ và build được.

Dự án hiện đã có CI, nhưng chưa có bước CD/deploy tự động lên môi trường cloud hoặc VPS.

## 2. Công cụ sử dụng

- GitHub: quản lý mã nguồn.
- GitHub Actions: tự động chạy pipeline.
- Node.js 22: môi trường kiểm tra frontend và backend.
- Jest, Supertest: kiểm thử route/unit backend với database và phụ thuộc ngoài được mock.
- Playwright: chạy 5 kịch bản UI với API được mock.
- Docker Compose: kiểm tra cấu hình và build image cho các service.

## 3. Pipeline hiện tại

Pipeline được đặt tại:

```text
.github/workflows/ci.yml
```

Pipeline gồm 5 job chính.

## 3.1. Frontend build

Job này chạy trong thư mục `frontend`.

Các bước xử lý:

1. Checkout source code.
2. Cài đặt Node.js 22.
3. Cài thư viện bằng `npm ci`.
4. Lint các module frontend trọng yếu bằng `npm run lint:ci`.
5. Build giao diện bằng `npm run build`.

Kết quả mong muốn: frontend build thành công và không phát sinh lỗi ở các module đang được đưa vào quality gate.

## 3.2. Backend checks

Job này chạy theo ma trận cho các service:

- `api-gateway`
- `services/auth-service`
- `services/property-service`
- `services/listing-service`
- `services/contact-service`

Các bước xử lý:

1. Checkout source code.
2. Cài đặt Node.js 22.
3. Cài thư viện bằng `npm ci`.
4. Kiểm tra cú pháp toàn bộ file `.js` bằng `node --check`.
5. Chạy Jest cho bốn microservice backend; API Gateway hiện chỉ được kiểm tra cú pháp.

Kết quả mong muốn: backend không có lỗi cú pháp và 99 test backend hiện có đều đạt.

## 3.3. Docker Compose config

Job này kiểm tra file `docker-compose.yml`.

Lệnh kiểm tra:

```bash
docker compose config
```

Kết quả mong muốn: cấu hình Docker Compose hợp lệ.

## 3.4. Playwright UI scenarios

Job này cài Chromium và chạy:

```bash
npm run test:system
```

Hiện có 5 kịch bản UI. Các request API được mock, vì vậy đây là kiểm thử hành vi giao diện, không phải kiểm thử full-stack với MySQL/VNPay thật.

## 3.5. Docker Compose build

Job này chỉ chạy sau khi frontend, backend, Docker config và Playwright đều đạt.

Lệnh kiểm tra:

```bash
docker compose build
```

Kết quả mong muốn: các image của API Gateway và các backend service build thành công.

## 4. Cách kích hoạt pipeline

Pipeline tự động chạy khi:

- Push code lên nhánh `main` hoặc `master`.
- Tạo Pull Request vào nhánh `main` hoặc `master`.
- Chạy thủ công bằng nút `Run workflow` trên GitHub Actions.

## 5. Phạm vi đã hoàn thành

| Nội dung | Trạng thái |
| --- | --- |
| Tự động build frontend | Đã làm |
| Lint frontend module trọng yếu | Đã làm |
| Kiểm tra cú pháp backend | Đã làm |
| Route/unit test backend | Đã làm, 99 test |
| Kiểm tra cấu hình Docker Compose | Đã làm |
| Playwright UI test | Đã làm, 5 kịch bản mock API |
| Build Docker image | Đã làm |
| Integration test với MySQL thật | Hướng phát triển |
| Stress test | Hướng phát triển |
| Deploy tự động lên cloud/VPS | Hướng phát triển |

## 6. Hướng phát triển

Trong giai đoạn tiếp theo, CI/CD có thể mở rộng thêm các bước:

- Bổ sung integration test chạy với MySQL thật và kiểm thử full-stack không mock API.
- Bổ sung quality gate cho toàn bộ ESLint frontend, thay vì chỉ các module trọng yếu.
- Kiểm thử callback/IPN bằng tài khoản VNPay Sandbox thật trong môi trường staging.
- Thêm stress test để đánh giá hiệu năng API.
- Build Docker image và push lên Docker Hub hoặc GitHub Container Registry.
- Deploy tự động lên cloud/VPS sau khi pipeline chạy thành công.
