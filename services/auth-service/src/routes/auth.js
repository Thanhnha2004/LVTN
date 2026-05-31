const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { full_name, email, password, role } = req.body;
  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "Email đã tồn tại" });

    const hash = await bcrypt.hash(password, 10);
    const validRole = ["buyer", "owner"].includes(role) ? role : "buyer";
    await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [full_name, email, hash, validRole],
    );
    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/login
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

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: { id: user.id, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, full_name, email, role, created_at FROM users WHERE id = ?",
    [req.user.id],
  );
  res.json(rows[0]);
});

// PUT /api/auth/me — cập nhật thông tin cá nhân
router.put("/me", authMiddleware, async (req, res) => {
  const { full_name } = req.body;
  if (!full_name) return res.status(400).json({ message: "Thiếu họ tên" });

  try {
    await pool.query("UPDATE users SET full_name = ? WHERE id = ?", [
      full_name,
      req.user.id,
    ]);
    res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PUT /api/auth/change-password — đổi mật khẩu
router.put("/change-password", authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password)
    return res.status(400).json({ message: "Thiếu mật khẩu" });

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
