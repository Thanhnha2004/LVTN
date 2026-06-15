const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

// GET /api/admin/stats — thống kê tổng quan
router.get("/stats", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    const [[{ total_users }]] = await pool.query(
      "SELECT COUNT(*) as total_users FROM users",
    );
    const [[{ total_buyers }]] = await pool.query(
      "SELECT COUNT(*) as total_buyers FROM users WHERE role = 'buyer'",
    );
    const [[{ total_owners }]] = await pool.query(
      "SELECT COUNT(*) as total_owners FROM users WHERE role = 'owner'",
    );
    const [[{ total_properties }]] = await pool.query(
      "SELECT COUNT(*) as total_properties FROM properties",
    );
    const [[{ total_pending }]] = await pool.query(
      "SELECT COUNT(*) as total_pending FROM properties WHERE status = 'pending'",
    );
    const [[{ total_approved }]] = await pool.query(
      "SELECT COUNT(*) as total_approved FROM properties WHERE status = 'approved'",
    );
    const [[{ total_rejected }]] = await pool.query(
      "SELECT COUNT(*) as total_rejected FROM properties WHERE status = 'rejected'",
    );
    const [[{ total_contacts }]] = await pool.query(
      "SELECT COUNT(*) as total_contacts FROM contacts",
    );

    // Tin mới theo tháng (6 tháng gần nhất)
    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM properties
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    res.json({
      users: { total: total_users, buyers: total_buyers, owners: total_owners },
      properties: {
        total: total_properties,
        pending: total_pending,
        approved: total_approved,
        rejected: total_rejected,
      },
      contacts: { total: total_contacts },
      monthly_properties: monthly,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/admin/users — danh sách tất cả user
router.get("/users", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [parseInt(limit), offset],
    );
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM users",
    );
    res.json({
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/admin/users/:id/status — kích hoạt / vô hiệu hóa tài khoản
router.patch("/users/:id/status", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { status } = req.body;
  if (!["active", "banned"].includes(status))
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });

  try {
    await pool.query("UPDATE users SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/admin/properties — danh sách tất cả tin (có lọc theo status)
router.get("/properties", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = "";
  let params = [];
  if (status) {
    where = "WHERE p.status = ?";
    params.push(status);
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.type, p.transaction_type, p.price, p.city,
             p.status, p.reject_reason, p.created_at, u.full_name as owner_name, u.email as owner_email
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, parseInt(limit), offset],
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM properties p ${where}`,
      params,
    );

    res.json({
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
