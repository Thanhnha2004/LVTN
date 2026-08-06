const jwt = require("jsonwebtoken");
const pool = require("../db");

module.exports = async (req, res, next) => {
  // Lay JWT tu header Authorization: Bearer <token>.
  // Neu token hop le, jwt.verify se tra ve payload gom id va role cua user.
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Không có token" });

  try {
    // Gan thong tin user vao req.user de cac API phia sau phan quyen theo role.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query("SELECT status FROM users WHERE id = ?", [
      payload.id,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    if (rows[0].status !== "active")
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};
