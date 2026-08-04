const express = require("express");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authRouter = require("../routes/auth");

jest.mock("../db", () => ({ query: jest.fn() }));
jest.mock("../mailer", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(),
  sendResetPasswordOtpEmail: jest.fn().mockResolvedValue(),
}));
jest.mock("../cloudinary", () => ({
  cloudinary: { uploader: { destroy: jest.fn().mockResolvedValue() } },
  upload: { single: () => (req, res, next) => next() },
}));
jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = global.mockUser || { id: 1, role: "buyer" };
  next();
});

function app() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  return app;
}

describe("auth-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  test("register rejects invalid email", async () => {
    const res = await request(app())
      .post("/api/auth/register")
      .send({
        full_name: "Nguyen Van A",
        email: "bad-email",
        phone_number: "0901234567",
        password: "123456",
        role: "buyer",
      });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("register creates unverified user and OTP", async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/register")
      .send({
        full_name: "Nguyen Van A",
        email: "buyer@test.com",
        phone_number: "0901234567",
        password: "123456",
        role: "buyer",
      });

    expect(res.status).toBe(201);
    expect(res.body.email_verified).toBe(false);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      expect.any(Array),
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO otp_codes"),
      expect.any(Array),
    );
  });

  test("login blocks unverified email", async () => {
    const hash = await bcrypt.hash("123456", 4);
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          full_name: "Buyer",
          role: "buyer",
          password_hash: hash,
          email_verified: 0,
          status: "active",
        },
      ],
    ]);

    const res = await request(app())
      .post("/api/auth/login")
      .send({ email: "buyer@test.com", password: "123456" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  test("login returns JWT for verified user", async () => {
    const hash = await bcrypt.hash("123456", 4);
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 2,
          full_name: "Owner",
          role: "owner",
          password_hash: hash,
          email_verified: 1,
          status: "active",
        },
      ],
    ]);

    const res = await request(app())
      .post("/api/auth/login")
      .send({ email: "owner@test.com", password: "123456" });

    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.token, "test-secret")).toMatchObject({
      id: 2,
      role: "owner",
    });
  });

  test("reset password validates OTP before updating password", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 3, status: "active" }]])
      .mockResolvedValueOnce([[{ id: 99 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/reset-password")
      .send({ email: "buyer@test.com", otp: "123456", new_password: "abcdef" });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE users SET password_hash"),
      expect.any(Array),
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE otp_codes SET used = 1"),
      [99],
    );
  });
  test("send-otp invalidates old OTP and creates new OTP", async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id: 5, full_name: "Buyer", email_verified: 0 }],
      ])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/send-otp")
      .send({ email: "buyer@test.com" });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE otp_codes SET used = 1"),
      [5],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO otp_codes"),
      expect.any(Array),
    );
  });

  test("verify-email marks OTP used and verifies user", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 5, email_verified: 0 }]])
      .mockResolvedValueOnce([[{ id: 88 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/verify-email")
      .send({ email: "buyer@test.com", otp: "123456" });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE otp_codes SET used = 1 WHERE id = ?",
      [88],
    );
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE users SET email_verified = 1 WHERE id = ?",
      [5],
    );
  });

  test("forgot-password creates reset OTP for active account", async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            id: 6,
            full_name: "Buyer",
            email: "buyer@test.com",
            status: "active",
          },
        ],
      ])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/forgot-password")
      .send({ email: "buyer@test.com" });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("type = 'reset_password'"),
      [6],
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("'reset_password'"),
      expect.any(Array),
    );
  });

  test("change-password rejects wrong old password", async () => {
    const hash = await bcrypt.hash("oldpass", 4);
    pool.query.mockResolvedValueOnce([[{ password_hash: hash }]]);

    const res = await request(app())
      .put("/api/auth/change-password")
      .send({ old_password: "wrongpass", new_password: "newpass" });

    expect(res.status).toBe(400);
  });
});
