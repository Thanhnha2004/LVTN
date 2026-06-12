const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const rateLimit = require("express-rate-limit");

// Giới hạn chung: 100 request/phút
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { message: "Quá nhiều request, vui lòng thử lại sau" },
  }),
);

// Giới hạn chặt hơn cho login: 10 lần/phút
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
app.use(
  "/api/contact",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: "Quá nhiều yêu cầu liên hệ" },
  }),
);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: "http://auth-service:3001",
    changeOrigin: true,
    pathRewrite: (path) => `/api/auth${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: (err, req, res) => {
        res.status(502).json({ message: err.message });
      },
      proxyReq: (proxyReq, req) => {
        console.log(`→ ${req.method} /api/auth${req.url}`);
      },
    },
  }),
);

app.use(
  "/api/property",
  createProxyMiddleware({
    target: "http://property-service:3002",
    changeOrigin: true,
    pathRewrite: (path) => `/api/property${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: (err, req, res) => res.status(502).json({ message: err.message }),
    },
  }),
);

app.use(
  "/api/listing",
  createProxyMiddleware({
    target: "http://listing-service:3003",
    changeOrigin: true,
    pathRewrite: (path) => `/api/listing${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: (err, req, res) => res.status(502).json({ message: err.message }),
    },
  }),
);

app.use(
  "/api/contact",
  createProxyMiddleware({
    target: "http://contact-service:3004",
    changeOrigin: true,
    pathRewrite: (path) => `/api/contact${path}`,
    proxyTimeout: 5000,
    parseReqBody: false,
    on: {
      error: (err, req, res) => res.status(502).json({ message: err.message }),
    },
  }),
);

app.use(
  "/api/admin",
  createProxyMiddleware({
    target: "http://auth-service:3001",
    changeOrigin: true,
    pathRewrite: (path) => `/api/admin${path}`,
    proxyTimeout: 5000,
    on: {
      error: (err, req, res) => res.status(502).json({ message: err.message }),
    },
  }),
);

app.listen(3000, () => console.log("Gateway running on port 3000"));
