# LVTN - Real Estate Management System

This graduation thesis project builds a real estate management website using a microservices architecture. The system supports three main roles: **Buyer**, **Owner**, and **Admin**.

## 1. Main Features

### Buyer

- Register, log in, verify email with OTP, and reset password.
- Search and filter real estate listings by property type, transaction type, location, price range, area range, and keyword.
- Use dependent location selectors for city, district, and ward in search forms.
- View property details, images, map location, and Owner contact information.
- Open a full image gallery from the property detail page.
- Send contact requests to Owner.
- See contact status after a request has already been sent.
- View Owner responses and additional contact phone number.
- Save and unsave favorite properties.
- Update personal profile and change password.

### Owner

- Create real estate listings.
- Validate listing input before submission, including price, area, address, rooms, and map coordinates.
- Prevent creating duplicate active listings with the same core information.
- Edit listings and upload property images.
- Select city, district, and ward from dependent dropdowns when creating or editing listings.
- Manage listing status: hide listing, resubmit listing, mark as sold/rented, and delete listing.
- View rejection reason and edit listing before resubmitting for approval.
- View listing status history.
- View and reply to Buyer contact requests.
- Manage contact leads.
- Buy or renew featured packages for each approved listing through VNPay Sandbox.
- View Owner dashboard statistics.

### Admin

- Log in with Admin role.
- View and filter property listings.
- View property details before approval.
- Approve listings, reject listings with reason, and hide violating listings.
- Manage user accounts: activate or disable accounts.
- View dashboard statistics.
- Use global loading indicators for long-running actions.

## 2. System Architecture

The system is divided into the following components:

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

### Services

| Service | Port | Responsibility |
|---|---:|---|
| Frontend | 5173 | React/Vite user interface |
| API Gateway | 3000 | Routes requests from frontend to backend services |
| Auth Service | 3001 | Register, login, OTP verification, forgot password, profile, user management |
| Property Service | 3002 | Property CRUD, image upload, approval workflow, status history, featured packages, VNPay payment |
| Listing Service | 3003 | Public search, category counts, filter, listing detail, similar listings |
| Contact Service | 3004 | Buyer/Owner contact flow, Owner reply, saved properties, lead management |
| MySQL | 3307 | Relational database |

API Gateway is the main backend entry point for the frontend:

```text
http://localhost:3000
```

## 3. Technology Stack

- Frontend: React, Vite, Axios, React Router, Leaflet.
- Backend: Node.js, Express.js.
- Database: MySQL 8.
- Authentication: JWT, bcrypt.
- Email: NodeMailer.
- Image upload: Cloudinary.
- Payment: VNPay Sandbox.
- Testing: Jest, Supertest.
- Container: Docker, Docker Compose.
- CI/CD: GitHub Actions.
- Source control: Git/GitHub.

## 4. Folder Structure

```text
LVTN/
  .github/
    workflows/
      ci.yml
  api-gateway/
  docs/
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

## 5. Environment Variables

Copy [`.env.example`](.env.example) to `.env` in the project root, then replace every
placeholder with a local secret:

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

VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay-return

# Chỉ bật tạm thời khi cần trình diễn bằng tài khoản Admin mẫu trong init.sql
ALLOW_DEMO_ADMIN_LOGIN=false
```

Notes:

- `MAIL_PASS` should be an app password, not the normal email login password.
- Cloudinary is used for property image upload.
- VNPay variables are used for Sandbox payment testing.
- Configure the VNPay merchant IPN URL as `https://<gateway-host>/api/property/vnpay-ipn`; the browser return URL is not a substitute for the server callback.
- Keep `ALLOW_DEMO_ADMIN_LOGIN=false` by default. Set it to `true` only for a local demo, then turn it off again.

## 6. Run With Docker

This Compose stack is intended for local development only. It binds MySQL and the API Gateway to `127.0.0.1`; backend services are reachable only through the Gateway. For production, do not run `init.sql` because it contains sample data and demo credentials.

At the project root:

```bash
docker compose up -d --build
```

Check containers:

```bash
docker compose ps
```

Stop containers:

```bash
docker compose down
```

Reset the database from scratch:

```bash
docker compose down -v
docker compose up -d --build
```

If the MySQL volume already existed before the security hardening changes, back
it up and apply [the database migration](migrations/README.md) once before
starting the updated services. A fresh volume receives the new schema from
`init.sql` automatically.

## 7. Run Frontend

If backend services are running with Docker, frontend can be run separately:

```bash
cd frontend
npm ci
npm run dev
```

Frontend default URL:

```text
http://localhost:5173
```

Build frontend:

```bash
npm run build
```

## 8. Database

The `init.sql` file is used to:

- Create database tables.
- Create primary keys and foreign keys.
- Insert sample data for demo.

Main tables:

- `users`
- `otp_codes`
- `properties`
- `property_images`
- `contacts`
- `saved_properties`
- `property_status_history`
- `featured_packages`
- `featured_orders`

Removed/simplified tables:

- `property_views` was removed. Listing views are stored directly in `properties.view_count`.
- `notifications` was removed. User messages are shown directly in the related UI flow.

## 9. Main API Endpoints

### Auth Service

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/send-otp
POST   /api/auth/verify-email
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
PUT    /api/auth/me
PUT    /api/auth/change-password
```

### Property Service

```text
GET    /api/property/owner/list
GET    /api/property/owner/stats
GET    /api/property/owner/stats/:id
POST   /api/property
GET    /api/property/:id
PUT    /api/property/:id
DELETE /api/property/:id
POST   /api/property/:id/images
PATCH  /api/property/:id/status
PATCH  /api/property/:id/hide
PATCH  /api/property/:id/unhide
PATCH  /api/property/:id/sold
GET    /api/property/:id/history
GET    /api/property/featured-packages
GET    /api/property/owner/featured-orders
POST   /api/property/:id/featured-orders
GET    /api/property/vnpay-return
```

### Listing Service

```text
GET    /api/listing/category-counts
GET    /api/listing
GET    /api/listing/:id
GET    /api/listing/:id/similar
```

### Contact Service

```text
POST   /api/contact
GET    /api/contact/buyer
GET    /api/contact/owner
PATCH  /api/contact/:id/reply
PATCH  /api/contact/:id/lead
POST   /api/contact/saved
DELETE /api/contact/saved/:property_id
GET    /api/contact/saved
```

### Admin

```text
GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:id/status
GET    /api/admin/properties
```

## 10. Testing

Backend service tests use Jest and Supertest.

### Test Coverage Scope

| Service | Test Scope |
|---|---|
| Auth Service | Register, OTP, login, forgot password, reset password, change password |
| Listing Service | Search/filter, listing detail, view count, similar listings |
| Contact Service | Send contact request, Owner reply, Buyer contact history, saved properties, lead update |
| Property Service | Create property, approval workflow, status history, hide/sold/unhide, featured package order |

### Run Backend Tests

```bash
npm test
```

Or run each service separately:

```bash
cd services/auth-service && npm test
cd ../listing-service && npm test
cd ../contact-service && npm test
cd ../property-service && npm test
```

### Run System Tests

```bash
npm run test:system
```

### Run All Tests

```bash
npm run test:all
```

### Run Backend Coverage

```bash
cd services/auth-service && npm run test:coverage
cd ../listing-service && npm run test:coverage
cd ../contact-service && npm run test:coverage
cd ../property-service && npm run test:coverage
```

Current backend test result:

| Service | Tests | Result |
|---|---:|---|
| Auth Service | 26 | Passed |
| Listing Service | 11 | Passed |
| Contact Service | 25 | Passed |
| Property Service | 37 | Passed |
| Total | 99 | Passed |

Current line coverage:

| Service | Line Coverage |
|---|---:|
| Auth Service | 69.78% |
| Listing Service | 66.13% |
| Contact Service | 83.33% |
| Property Service | 62.50% |

The backend suites are route/unit tests with database and external dependencies
mocked. Playwright currently adds 5 UI scenarios with mocked API responses; these
results do not replace a full-stack test against a real MySQL/VNPay environment.

### Frontend Build Check

```bash
cd frontend
npm run build
```

## 11. CI/CD

The project includes GitHub Actions configuration in `.github/workflows/ci.yml`.

The CI workflow is used to:

- Build/check frontend source.
- Check backend service test commands where configured.
- Support automatic verification when code is pushed to GitHub.

Additional CI/CD documentation is available in:

```text
docs/CI_CD.md
```

Planned improvements:

- Add stress testing for high-traffic APIs.
- Deploy backend services to a cloud/VPS environment.

## 12. Demo Accounts

Demo accounts are created in `init.sql`. They can be changed directly in `init.sql` before resetting the database.

Default password for seeded demo accounts:

```text
123456
```

Main accounts:

| Role | Email |
|---|---|
| Admin | admin@bds.com |
| Owner | owner@bds.com |
| Buyer | buyer@bds.com |
| Owner | owner2@bds.com |
| Buyer | buyer2@bds.com |

## 13. Notes

- New property listings are created with `pending` status and require Admin approval.
- Buyer can only view approved property listings.
- Owner can view rejection reasons, edit listings, and resubmit them for approval.
- Owner cannot create another active listing with the same title, address, property type, and transaction type.
- Featured packages are purchased by Owner for each approved property listing.
- VNPay integration is configured for Sandbox testing.
- Important actions such as delete, hide, approve, reject, and account disable include confirmation dialogs in the UI.
