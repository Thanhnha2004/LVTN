const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const { sendOtpEmail, sendResetPasswordOtpEmail } = require("../mailer");
const { cloudinary, upload } = require("../cloudinary");
const router = express.Router();

// ─── Helper: tạo mã OTP 6 số ────────────────────────────────
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register
// Tạo tài khoản với email_verified = 0, tự động gửi OTP
router.post("/register", async (req, res) => {
  const { full_name, email, password, role, phone_number } = req.body;

  if (!full_name || full_name.trim().length < 2)
    return res.status(400).json({ message: "Họ tên phải có ít nhất 2 ký tự" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ message: "Email không hợp lệ" });

  if (!password || password.length < 6)
    return res
      .status(400)
      .json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Email đã tồn tại" });

    const hash = await bcrypt.hash(password, 10);
    const validRole = ["buyer", "owner"].includes(role) ? role : "buyer";

    // Tạo tài khoản với email_verified = 0
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, phone_number, email_verified) VALUES (?, ?, ?, ?, ?, 0)",
      [full_name, email, hash, validRole, phone_number || null],
    );

    // Gửi OTP ngay sau khi đăng ký
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await pool.query(
      "INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, 'email_verify', ?)",
      [result.insertId, otp, expiresAt],
    );

    // Gửi mail không đồng bộ không block response
    sendOtpEmail({ toEmail: email, toName: full_name, otp }).catch((err) =>
      console.error("Send OTP mail error:", err.message),
    );

    res.status(201).json({
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã xác minh.",
      email_verified: false,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/send-otp
// Gửi lại OTP (dùng khi user chưa xác minh hoặc OTP hết hạn)
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Thiếu email" });

  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email_verified FROM users WHERE email = ?",
      [email],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Email không tồn tại" });

    const user = rows[0];
    if (user.email_verified)
      return res.status(400).json({ message: "Email đã được xác minh" });

    // Đánh dấu OTP cũ là đã dùng
    await pool.query(
      "UPDATE otp_codes SET used = 1 WHERE user_id = ? AND type = 'email_verify' AND used = 0",
      [user.id],
    );

    // Tạo OTP mới
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, 'email_verify', ?)",
      [user.id, otp, expiresAt],
    );

    sendOtpEmail({ toEmail: email, toName: user.full_name, otp }).catch((err) =>
      console.error("Send OTP mail error:", err.message),
    );

    res.json({ message: "Đã gửi mã OTP mới về email" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/verify-email
// Xác minh OTP — cập nhật email_verified = 1
router.post("/verify-email", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Thiếu email hoặc mã OTP" });

  try {
    const [users] = await pool.query(
      "SELECT id, email_verified FROM users WHERE email = ?",
      [email],
    );
    if (users.length === 0)
      return res.status(404).json({ message: "Email không tồn tại" });

    const user = users[0];
    if (user.email_verified)
      return res
        .status(400)
        .json({ message: "Email đã được xác minh trước đó" });

    // Tìm OTP hợp lệ: đúng mã, chưa dùng, chưa hết hạn
    const [otpRows] = await pool.query(
      `SELECT id FROM otp_codes
       WHERE user_id = ?
         AND code = ?
         AND type = 'email_verify'
         AND used = 0
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, otp],
    );

    if (otpRows.length === 0)
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });

    // Đánh dấu OTP đã dùng + cập nhật email_verified
    await pool.query("UPDATE otp_codes SET used = 1 WHERE id = ?", [
      otpRows[0].id,
    ]);
    await pool.query("UPDATE users SET email_verified = 1 WHERE id = ?", [
      user.id,
    ]);

    res.json({ message: "Xác minh email thành công! Bạn có thể đăng nhập." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/forgot-password
// Gửi OTP đặt lại mật khẩu đến email tài khoản
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Thiếu email" });

  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, status FROM users WHERE email = ?",
      [email],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Email không tồn tại" });

    const user = rows[0];
    if (user.status === "banned")
      return res.status(403).json({ message: "Tài khoản đang bị khóa" });

    await pool.query(
      "UPDATE otp_codes SET used = 1 WHERE user_id = ? AND type = 'reset_password' AND used = 0",
      [user.id],
    );

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, 'reset_password', ?)",
      [user.id, otp, expiresAt],
    );

    sendResetPasswordOtpEmail({
      toEmail: user.email,
      toName: user.full_name,
      otp,
    }).catch((err) => console.error("Send reset password OTP error:", err.message));

    res.json({ message: "Đã gửi mã OTP đặt lại mật khẩu về email" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/reset-password
// Kiểm tra OTP và cập nhật mật khẩu mới
router.post("/reset-password", async (req, res) => {
  const { email, otp, new_password } = req.body;

  if (!email || !otp || !new_password)
    return res.status(400).json({ message: "Thiếu email, OTP hoặc mật khẩu mới" });

  if (new_password.length < 6)
    return res
      .status(400)
      .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

  try {
    const [users] = await pool.query(
      "SELECT id, status FROM users WHERE email = ?",
      [email],
    );

    if (users.length === 0)
      return res.status(404).json({ message: "Email không tồn tại" });

    const user = users[0];
    if (user.status === "banned")
      return res.status(403).json({ message: "Tài khoản đang bị khóa" });

    const [otpRows] = await pool.query(
      `SELECT id FROM otp_codes
       WHERE user_id = ?
         AND code = ?
         AND type = 'reset_password'
         AND used = 0
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, otp],
    );

    if (otpRows.length === 0)
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      hash,
      user.id,
    ]);
    await pool.query("UPDATE otp_codes SET used = 1 WHERE id = ?", [
      otpRows[0].id,
    ]);

    res.json({ message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/login
// Thêm cảnh báo nếu email chưa xác minh (không chặn login)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(400).json({ message: "Email không tồn tại" });

    const user = rows[0];

    if (user.status === "banned")
      return res.status(403).json({ message: "Tài khoản bị khoá" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ message: "Sai mật khẩu" });

    if (!user.email_verified)
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Tài khoản chưa được xác minh. Vui lòng nhập mã OTP đã gửi đến email trước khi đăng nhập.",
      });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        email_verified: !!user.email_verified,
      },
      // Cảnh báo nhẹ — frontend hiển thị banner "Chưa xác minh email"
      warning: user.email_verified
        ? null
        : "Email chưa được xác minh. Một số tính năng có thể bị hạn chế.",
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, phone_number, avatar_url, role, email_verified, created_at FROM users WHERE id = ?",
      [req.user.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy user" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PUT /api/auth/me — cập nhật thông tin + avatar
router.put("/me", authMiddleware, upload.single("avatar"), async (req, res) => {
  const { full_name, phone_number } = req.body;
  if (!full_name) return res.status(400).json({ message: "Thiếu họ tên" });

  try {
    let avatar_url = undefined;

    if (req.file) {
      // Xoá avatar cũ trên Cloudinary nếu có
      const [rows] = await pool.query(
        "SELECT avatar_url FROM users WHERE id = ?",
        [req.user.id],
      );
      const oldUrl = rows[0]?.avatar_url;
      if (oldUrl) {
        try {
          const parts = oldUrl.split("/");
          const folder = parts[parts.length - 2];
          const filename = parts[parts.length - 1].split(".")[0];
          await cloudinary.uploader.destroy(`${folder}/${filename}`);
        } catch (e) {
          console.error("Cloudinary delete old avatar error:", e.message);
        }
      }

      avatar_url = req.file.path; // URL Cloudinary trả về
    }

    if (avatar_url !== undefined) {
      await pool.query(
        "UPDATE users SET full_name = ?, phone_number = ?, avatar_url = ? WHERE id = ?",
        [full_name, phone_number || null, avatar_url, req.user.id],
      );
    } else {
      await pool.query(
        "UPDATE users SET full_name = ?, phone_number = ? WHERE id = ?",
        [full_name, phone_number || null, req.user.id],
      );
    }

    res.json({ message: "Cập nhật thành công", avatar_url });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PUT /api/auth/change-password — đổi mật khẩu
router.put("/change-password", authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password)
    return res.status(400).json({ message: "Thiếu mật khẩu" });
  if (new_password.length < 6)
    return res
      .status(400)
      .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

  try {
    const [rows] = await pool.query(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id],
    );
    const match = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!match)
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      hash,
      req.user.id,
    ]);
    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
