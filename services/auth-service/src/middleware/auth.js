const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Lay JWT tu header Authorization: Bearer <token>.
  // Neu token hop le, jwt.verify se tra ve payload gom id va role cua user.
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Không có token" });

  try {
    // Gan thong tin user vao req.user de cac API phia sau phan quyen theo role.
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};
