const express = require("express");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authRouter = require("../routes/auth");
const { cloudinary } = require("../cloudinary");

jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../mailer", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(),
  sendResetPasswordOtpEmail: jest.fn().mockResolvedValue(),
}));
jest.mock("../cloudinary", () => ({
  cloudinary: { uploader: { destroy: jest.fn().mockResolvedValue() } },
  upload: {
    single: () => (req, res, next) => {
      if (global.mockAvatarFile) req.file = global.mockAvatarFile;
      next();
    },
  },
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
  const mockConnection = {
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.getConnection.mockReset();
    mockConnection.query.mockReset();
    delete global.mockAvatarFile;
    delete process.env.ALLOW_DEMO_ADMIN_LOGIN;
    process.env.JWT_SECRET = "test-secret";
    pool.getConnection.mockResolvedValue(mockConnection);
    mockConnection.beginTransaction.mockResolvedValue();
    mockConnection.commit.mockResolvedValue();
    mockConnection.rollback.mockResolvedValue();
    mockConnection.release.mockReturnValue();
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
    const otpInsert = pool.query.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO otp_codes"),
    );
    expect(otpInsert[1][1]).toMatch(/^\d{6}$/);
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
          token_version: 4,
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
      tv: 4,
    });
  });

  test("blocks seeded demo admin unless explicitly enabled", async () => {
    const hash = await bcrypt.hash("123456", 4);
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          full_name: "Admin",
          role: "admin",
          status: "active",
          email_verified: 1,
          is_demo_account: 1,
          token_version: 0,
          password_hash: hash,
        },
      ],
    ]);

    const res = await request(app())
      .post("/api/auth/login")
      .send({ email: "admin@bds.com", password: "123456" });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Tài khoản không khả dụng");
  });

  test("reset password validates OTP before updating password", async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 3, status: "active" }]])
      .mockResolvedValueOnce([[{ id: 99, code: "123456", attempt_count: 0 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/reset-password")
      .send({ email: "buyer@test.com", otp: "123456", new_password: "abcdef" });

    expect(res.status).toBe(200);
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining("token_version = token_version + 1"),
      expect.any(Array),
    );
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE otp_codes SET used = 1"),
      [3],
    );
    expect(mockConnection.commit).toHaveBeenCalled();
  });
  test("send-otp invalidates old OTP and creates new OTP", async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id: 5, full_name: "Buyer", email_verified: 0 }],
      ])
      .mockResolvedValueOnce([[]])
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
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 5, email_verified: 0 }]])
      .mockResolvedValueOnce([[{ id: 88, code: "123456", attempt_count: 0 }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/verify-email")
      .send({ email: "buyer@test.com", otp: "123456" });

    expect(res.status).toBe(200);
    expect(mockConnection.query).toHaveBeenCalledWith(
      "UPDATE otp_codes SET used = 1 WHERE id = ?",
      [88],
    );
    expect(mockConnection.query).toHaveBeenCalledWith(
      "UPDATE users SET email_verified = 1 WHERE id = ?",
      [5],
    );
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test("verify-email counts a wrong OTP attempt atomically", async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 5, email_verified: 0 }]])
      .mockResolvedValueOnce([[{ id: 88, code: "654321", attempt_count: 0 }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/verify-email")
      .send({ email: "buyer@test.com", otp: "123456" });

    expect(res.status).toBe(400);
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining("attempt_count = attempt_count + 1"),
      [5, 88],
    );
    expect(mockConnection.commit).toHaveBeenCalled();
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
      .mockResolvedValueOnce([[]])
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

  test("forgot-password does not reveal an unknown email", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app())
      .post("/api/auth/forgot-password")
      .send({ email: "missing@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("Nếu tài khoản hợp lệ");
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("reset-password rejects a wrong OTP and records the attempt", async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 3, status: "active" }]])
      .mockResolvedValueOnce([[{ id: 99, code: "654321", attempt_count: 0 }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/auth/reset-password")
      .send({ email: "buyer@test.com", otp: "123456", new_password: "abcdef" });

    expect(res.status).toBe(400);
    expect(mockConnection.query).toHaveBeenCalledWith(
      expect.stringContaining("attempt_count = attempt_count + 1"),
      [5, 99],
    );
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test("profile validation cleans up a newly uploaded avatar", async () => {
    global.mockAvatarFile = {
      path: "https://res.cloudinary.com/demo/image/upload/v1/bds-platform/avatars/new.jpg",
      filename: "bds-platform/avatars/new",
    };

    const res = await request(app()).put("/api/auth/me").send({
      full_name: "A",
      phone_number: "0901234567",
    });

    expect(res.status).toBe(400);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      "bds-platform/avatars/new",
    );
  });

  test("profile update stores the new avatar before deleting the old one", async () => {
    global.mockAvatarFile = {
      path: "https://res.cloudinary.com/demo/image/upload/v2/bds-platform/avatars/new.jpg",
      filename: "bds-platform/avatars/new",
    };
    pool.query
      .mockResolvedValueOnce([
        [
          {
            avatar_url:
              "https://res.cloudinary.com/demo/image/upload/v1/bds-platform/avatars/old.jpg",
          },
        ],
      ])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).put("/api/auth/me").send({
      full_name: "Nguyen Van A",
      phone_number: "0901234567",
    });

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[1][0]).toContain("UPDATE users");
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      "bds-platform/avatars/old",
    );
  });

  test("profile update cleans up the new avatar when the database write fails", async () => {
    global.mockAvatarFile = {
      path: "https://res.cloudinary.com/demo/image/upload/v2/bds-platform/avatars/new.jpg",
      filename: "bds-platform/avatars/new",
    };
    pool.query
      .mockResolvedValueOnce([[{ avatar_url: null }]])
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app()).put("/api/auth/me").send({
      full_name: "Nguyen Van A",
      phone_number: "0901234567",
    });

    expect(res.status).toBe(500);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      "bds-platform/avatars/new",
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

  test("change-password increments token version", async () => {
    const hash = await bcrypt.hash("oldpass", 4);
    pool.query
      .mockResolvedValueOnce([[{ password_hash: hash }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .put("/api/auth/change-password")
      .send({ old_password: "oldpass", new_password: "newpass" });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("token_version = token_version + 1"),
      expect.any(Array),
    );
  });
});
