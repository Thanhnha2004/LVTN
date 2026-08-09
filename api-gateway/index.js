const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.disable("x-powered-by");

function handleProxyError(err, req, res) {
  console.error(`Proxy error for ${req.method} ${req.originalUrl}:`, err.message);
  if (res.headersSent) return res.end();
  return res.status(502).json({ message: "Dịch vụ tạm thời không khả dụng" });
}

app.use(
  cors({
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  }),
);

const rateLimit = require("express-rate-limit");

// Giới hạn chung: 100 request/phút
// Dat rate limit o Gateway de tat ca service phia sau deu duoc bao ve truoc request spam.
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { message: "Quá nhiều request, vui lòng thử lại sau" },
  }),
);

// Giới hạn chặt hơn cho login: 10 lần/phút
// Login nhay cam hon cac API khac, nen gioi han rieng de giam brute-force password.
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
      message: "Quá nhiều lần đăng nhập, vui lòng thử lại sau 1 phút",
    },
  }),
);

// Giới hạn contact: 20 lần/phút
// Contact co the bi spam tao lead/email, nen gioi han rieng de bao ve owner va mailer.
app.use(
  "/api/contact",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: "Quá nhiều yêu cầu liên hệ" },
  }),
);

// Kiểm tra nhanh trạng thái Gateway (test Docker hoặc kiểm tra service còn sống không)
app.get("/health", (req, res) => res.json({ status: "ok" }));

// API Gateway: nhan /api/auth va chuyen sang auth-service.
// Service nay xu ly dang ky, dang nhap, OTP, JWT va ho so ca nhan.
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: "http://auth-service:3001",
    changeOrigin: true,
    // pathRewrite giu nguyen prefix /api/auth vi ben trong auth-service mount route o /api/auth.
    pathRewrite: (path) => `/api/auth${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: handleProxyError,
      proxyReq: (proxyReq, req) => {
        console.log(`→ ${req.method} /api/auth${req.url}`);
      },
    },
  }),
);

// API Gateway: nhan /api/property va chuyen sang property-service.
// Service nay xu ly tin dang cua owner, kiem duyet admin, upload anh va VNPay.
app.use(
  "/api/property",
  createProxyMiddleware({
    target: "http://property-service:3002",
    changeOrigin: true,
    // parseReqBody false giup proxy chuyen multipart/form-data upload anh sang service ma khong parse hong body.
    pathRewrite: (path) => `/api/property${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: handleProxyError,
    },
  }),
);

// API Gateway: nhan /api/listing va chuyen sang listing-service.
// Service nay chi tra ve cac tin approved de hien thi cong khai.
app.use(
  "/api/listing",
  createProxyMiddleware({
    target: "http://listing-service:3003",
    changeOrigin: true,
    // Listing la API public, Gateway chi proxy; service se tu xu ly filter va query database.
    pathRewrite: (path) => `/api/listing${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: handleProxyError,
    },
  }),
);

// API Gateway: nhan /api/contact va chuyen sang contact-service.
// Service nay xu ly lien he buyer-owner, lead va tin yeu thich.
app.use(
  "/api/contact",
  createProxyMiddleware({
    target: "http://contact-service:3004",
    changeOrigin: true,
    // Contact-service tu kiem tra JWT/role, Gateway chi dieu huong theo prefix.
    pathRewrite: (path) => `/api/contact${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: handleProxyError,
    },
  }),
);

// API Gateway: nhan /api/admin va chuyen sang auth-service.
// Cac route admin se tiep tuc kiem tra JWT va role admin trong service.
app.use(
  "/api/admin",
  createProxyMiddleware({
    target: "http://auth-service:3001",
    changeOrigin: true,
    pathRewrite: (path) => `/api/admin${path}`,
    proxyTimeout: 5000,
    on: {
      error: handleProxyError,
    },
  }),
);

app.listen(3000, () => console.log("Gateway running on port 3000"));


