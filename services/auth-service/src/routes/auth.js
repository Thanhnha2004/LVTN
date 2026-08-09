const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const { sendOtpEmail, sendResetPasswordOtpEmail } = require("../mailer");
const { cloudinary, upload } = require("../cloudinary");
const router = express.Router();

// ─── Helper: tạo mã OTP 6 số ────────────────────────────────
function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

const OTP_MAX_ATTEMPTS = 5;
const EMAIL_OTP_REQUEST_MESSAGE =
  "Nếu tài khoản hợp lệ và chưa xác minh, mã OTP sẽ được gửi đến email.";
const RESET_OTP_REQUEST_MESSAGE =
  "Nếu tài khoản hợp lệ, mã OTP đặt lại mật khẩu sẽ được gửi đến email.";

function otpMatches(input, expected) {
  const normalizedInput = String(input || "");
  const normalizedExpected = String(expected || "");
  if (!/^\d{6}$/.test(normalizedInput) || normalizedExpected.length !== 6)
    return false;

  return crypto.timingSafeEqual(
    Buffer.from(normalizedInput),
    Buffer.from(normalizedExpected),
  );
}

async function hasRecentOtp(userId, type) {
  const [rows] = await pool.query(
    `SELECT id FROM otp_codes
     WHERE user_id = ? AND type = ?
       AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, type],
  );
  return rows.length > 0;
}

// POST /api/auth/register
// Tạo tài khoản với email_verified = 0, tự động gửi OTP
// Public API: buyer/owner dang ky tai khoan, mat khau duoc hash bang bcrypt.
// Sau khi tao user, he thong sinh OTP email_verify de bat buoc xac minh email.
router.post("/register", async (req, res) => {
  const { full_name, email, password, role, phone_number } = req.body;
  const normalizedName = String(full_name || "").trim().replace(/\s+/g, " ");
  const normalizedPhone = String(phone_number || "").trim();
  const nameParts = normalizedName.split(" ").filter(Boolean);
  const nameRegex = /^[A-Za-zÀ-ỹ\s'.-]+$/;
  const phoneRegex = /^0\d{9}$/;

  if (normalizedName.length < 4 || nameParts.length < 2)
    return res
      .status(400)
      .json({ message: "Họ tên phải có ít nhất 2 từ và tối thiểu 4 ký tự" });

  if (!nameRegex.test(normalizedName))
    return res.status(400).json({
      message: "Họ tên không được chứa số hoặc ký tự đặc biệt không hợp lệ",
    });

  if (!phoneRegex.test(normalizedPhone))
    return res.status(400).json({
      message: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0",
    });

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

    // Khong luu mat khau goc. bcrypt tao hash kem salt de bao ve mat khau trong database.
    const hash = await bcrypt.hash(password, 10);
    // Client khong duoc tu y tao admin; chi chap nhan buyer/owner, role la thi fallback ve buyer.
    const validRole = ["buyer", "owner"].includes(role) ? role : "buyer";

    // Tạo tài khoản với email_verified = 0
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password_hash, role, phone_number, email_verified) VALUES (?, ?, ?, ?, ?, 0)",
      [normalizedName, email, hash, validRole, normalizedPhone],
    );

    // Gửi OTP ngay sau khi đăng ký
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await pool.query(
      "INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, 'email_verify', ?)",
      [result.insertId, otp, expiresAt],
    );

    // Gửi mail không đồng bộ không block response
    // Gui mail bat dong bo: neu SMTP loi thi user van duoc tao, backend chi log loi gui mail.
    sendOtpEmail({ toEmail: email, toName: normalizedName, otp }).catch((err) =>
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
// Public API: tao OTP xac minh email moi, dong thoi vo hieu hoa cac OTP cu chua dung.
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Thiếu email" });

  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email_verified FROM users WHERE email = ?",
      [email],
    );
    if (rows.length === 0)
      return res.json({ message: EMAIL_OTP_REQUEST_MESSAGE });

    const user = rows[0];
    if (user.email_verified)
      return res.json({ message: EMAIL_OTP_REQUEST_MESSAGE });

    if (await hasRecentOtp(user.id, "email_verify"))
      return res.json({ message: EMAIL_OTP_REQUEST_MESSAGE });

    // Đánh dấu OTP cũ là đã dùng
    // Vo hieu hoa OTP cu de tai mot thoi diem user chi nen dung OTP moi nhat.
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

    res.json({ message: EMAIL_OTP_REQUEST_MESSAGE });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/verify-email
// Xác minh OTP — cập nhật email_verified = 1
// Public API: kiem tra OTP dung ma, dung loai, chua dung va chua het han.
// Neu hop le thi cap nhat users.email_verified = 1.
router.post("/verify-email", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Thiếu email hoặc mã OTP" });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      "SELECT id, email_verified FROM users WHERE email = ? FOR UPDATE",
      [email],
    );
    if (users.length === 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });
    }

    const user = users[0];
    if (user.email_verified) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Email đã được xác minh trước đó" });
    }

    const [otpRows] = await connection.query(
      `SELECT id, code, attempt_count FROM otp_codes
       WHERE user_id = ?
         AND type = 'email_verify'
         AND used = 0
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [user.id],
    );

    if (otpRows.length === 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });
    }

    const otpRow = otpRows[0];
    if (!otpMatches(otp, otpRow.code)) {
      await connection.query(
        `UPDATE otp_codes
         SET attempt_count = attempt_count + 1,
             used = IF(attempt_count + 1 >= ?, 1, used)
         WHERE id = ?`,
        [OTP_MAX_ATTEMPTS, otpRow.id],
      );
      await connection.commit();
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });
    }

    await connection.query("UPDATE otp_codes SET used = 1 WHERE id = ?", [
      otpRow.id,
    ]);
    await connection.query("UPDATE users SET email_verified = 1 WHERE id = ?", [
      user.id,
    ]);
    await connection.commit();

    res.json({ message: "Xác minh email thành công! Bạn có thể đăng nhập." });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// POST /api/auth/forgot-password
// Gửi OTP đặt lại mật khẩu đến email tài khoản
// Public API: tao OTP loai reset_password de nguoi dung dat lai mat khau.
// Tai khoan banned khong duoc reset mat khau.
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Thiếu email" });

  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, status FROM users WHERE email = ?",
      [email],
    );

    if (rows.length === 0)
      return res.json({ message: RESET_OTP_REQUEST_MESSAGE });

    const user = rows[0];
    if (user.status === "banned")
      return res.json({ message: RESET_OTP_REQUEST_MESSAGE });

    if (await hasRecentOtp(user.id, "reset_password"))
      return res.json({ message: RESET_OTP_REQUEST_MESSAGE });

    // Reset password dung type rieng de khong lan voi OTP xac minh email.
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
    }).catch((err) =>
      console.error("Send reset password OTP error:", err.message),
    );

    res.json({ message: RESET_OTP_REQUEST_MESSAGE });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/auth/reset-password
// Kiểm tra OTP và cập nhật mật khẩu mới
// Public API: xac thuc OTP reset_password, hash mat khau moi roi cap nhat password_hash.
router.post("/reset-password", async (req, res) => {
  const { email, otp, new_password } = req.body;

  if (!email || !otp || !new_password)
    return res
      .status(400)
      .json({ message: "Thiếu email, OTP hoặc mật khẩu mới" });

  if (new_password.length < 6)
    return res
      .status(400)
      .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      "SELECT id, status FROM users WHERE email = ? FOR UPDATE",
      [email],
    );

    if (users.length === 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });
    }

    const user = users[0];
    if (user.status === "banned") {
      await connection.rollback();
      return res.status(403).json({ message: "Tài khoản đang bị khóa" });
    }

    const [otpRows] = await connection.query(
      `SELECT id, code, attempt_count FROM otp_codes
       WHERE user_id = ?
         AND type = 'reset_password'
         AND used = 0
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [user.id],
    );

    if (otpRows.length === 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });
    }

    const otpRow = otpRows[0];
    if (!otpMatches(otp, otpRow.code)) {
      await connection.query(
        `UPDATE otp_codes
         SET attempt_count = attempt_count + 1,
             used = IF(attempt_count + 1 >= ?, 1, used)
         WHERE id = ?`,
        [OTP_MAX_ATTEMPTS, otpRow.id],
      );
      await connection.commit();
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn" });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await connection.query(
      "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
      [hash, user.id],
    );
    await connection.query(
      "UPDATE otp_codes SET used = 1 WHERE user_id = ? AND type = 'reset_password' AND used = 0",
      [user.id],
    );
    await connection.commit();

    res.json({ message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập." });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// POST /api/auth/login
// Thêm cảnh báo nếu email chưa xác minh (không chặn login)
// Public API: kiem tra email, trang thai tai khoan, mat khau bcrypt va email_verified.
// Neu hop le thi tra JWT gom id va role de frontend goi cac API can dang nhap.
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, password_hash, avatar_url, role, status,
              email_verified, token_version, is_demo_account
       FROM users
       WHERE email = ?`,
      [email],
    );
    if (rows.length === 0)
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });

    const user = rows[0];

    if (user.status === "banned")
      return res.status(403).json({ message: "Tài khoản bị khoá" });

    // bcrypt.compare tu xu ly salt trong password_hash nen khong can giai ma mat khau.
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });

    if (
      user.role === "admin" &&
      Number(user.is_demo_account) === 1 &&
      process.env.ALLOW_DEMO_ADMIN_LOGIN !== "true"
    ) {
      return res.status(403).json({ message: "Tài khoản không khả dụng" });
    }

    if (!user.email_verified)
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Tài khoản chưa được xác minh. Vui lòng nhập mã OTP đã gửi đến email trước khi đăng nhập.",
      });

    // JWT chi chua thong tin can thiet cho phan quyen va thu hoi phien: id, role va token version.
    // expiresIn 7d giup token tu het han, giam rui ro neu token bi lo.
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        tv: Number(user.token_version) || 0,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role,
        email_verified: !!user.email_verified,
      },
      // Cảnh báo nhẹ — frontend hiển thị banner "Chưa xác minh email"
      // Truong warning giu lai de frontend co the hien thi canh bao neu can.
      warning: user.email_verified
        ? null
        : "Email chưa được xác minh. Một số tính năng có thể bị hạn chế.",
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/auth/me
// Protected API: lay thong tin user hien tai dua tren req.user.id trong JWT.
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

const receiveAvatar = upload.single("avatar");

function getCloudinaryPublicId(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex < 0) return null;
    const assetParts = parts.slice(uploadIndex + 1);
    if (/^v\d+$/.test(assetParts[0] || "")) assetParts.shift();
    if (assetParts.length === 0) return null;
    assetParts[assetParts.length - 1] = assetParts.at(-1).replace(/\.[^.]+$/, "");
    return assetParts.join("/");
  } catch {
    return null;
  }
}

async function cleanupUploadedAvatar(file) {
  const publicId = file?.filename || getCloudinaryPublicId(file?.path);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary cleanup avatar error:", err.message);
  }
}

function handleAvatarUpload(req, res, next) {
  receiveAvatar(req, res, async (err) => {
    if (!err) return next();
    await cleanupUploadedAvatar(req.file);
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const messages = {
      LIMIT_FILE_SIZE: "Ảnh đại diện không được vượt quá 2 MB",
      LIMIT_FILE_COUNT: "Mỗi lần chỉ được tải một ảnh đại diện",
      LIMIT_UNEXPECTED_FILE: "Trường ảnh đại diện không hợp lệ",
      INVALID_IMAGE_TYPE: "Chỉ chấp nhận ảnh đại diện JPG, PNG hoặc WEBP",
    };
    return res.status(status).json({
      message: messages[err.code] || "File ảnh đại diện không hợp lệ",
    });
  });
}

// PUT /api/auth/me — cập nhật thông tin + avatar
// Protected API: cap nhat ho so ca nhan. Neu co avatar thi upload qua Cloudinary va luu URL.
router.put("/me", authMiddleware, handleAvatarUpload, async (req, res) => {
  const { full_name, phone_number } = req.body;
  const normalizedName = String(full_name || "").trim().replace(/\s+/g, " ");
  const normalizedPhone = String(phone_number || "").trim();
  const nameParts = normalizedName.split(" ").filter(Boolean);
  const nameRegex = /^[A-Za-zÀ-ỹ\s'.-]+$/;
  const phoneRegex = /^0\d{9}$/;

  if (normalizedName.length < 4 || nameParts.length < 2) {
    await cleanupUploadedAvatar(req.file);
    return res
      .status(400)
      .json({ message: "Họ tên phải có ít nhất 2 từ và tối thiểu 4 ký tự" });
  }

  if (!nameRegex.test(normalizedName)) {
    await cleanupUploadedAvatar(req.file);
    return res.status(400).json({
      message: "Họ tên không được chứa số hoặc ký tự đặc biệt không hợp lệ",
    });
  }

  if (!phoneRegex.test(normalizedPhone)) {
    await cleanupUploadedAvatar(req.file);
    return res.status(400).json({
      message: "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0",
    });
  }

  try {
    const avatar_url = req.file?.path;
    let oldAvatarUrl = null;

    if (avatar_url) {
      const [rows] = await pool.query(
        "SELECT avatar_url FROM users WHERE id = ?",
        [req.user.id],
      );
      oldAvatarUrl = rows[0]?.avatar_url || null;
    }

    if (avatar_url) {
      await pool.query(
        "UPDATE users SET full_name = ?, phone_number = ?, avatar_url = ? WHERE id = ?",
        [normalizedName, normalizedPhone, avatar_url, req.user.id],
      );
    } else {
      await pool.query(
        "UPDATE users SET full_name = ?, phone_number = ? WHERE id = ?",
        [normalizedName, normalizedPhone, req.user.id],
      );
    }

    // Chỉ xóa avatar cũ sau khi DB đã trỏ tới ảnh mới thành công.
    const oldPublicId = getCloudinaryPublicId(oldAvatarUrl);
    if (avatar_url && oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (err) {
        console.error("Cloudinary delete old avatar error:", err.message);
      }
    }

    res.json({ message: "Cập nhật thành công", avatar_url });
  } catch (err) {
    await cleanupUploadedAvatar(req.file);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PUT /api/auth/change-password — đổi mật khẩu
// Protected API: doi mat khau bang cach so sanh old_password voi password_hash cu.
// Mat khau moi tiep tuc duoc hash bang bcrypt truoc khi luu.
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
    await pool.query(
      "UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?",
      [hash, req.user.id],
    );
    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
