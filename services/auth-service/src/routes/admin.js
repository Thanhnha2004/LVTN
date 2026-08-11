const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

function parsePagination(query) {
  const requestedPage = Number(query.page);
  const requestedLimit = Number(query.limit);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 1_000_000)
      : 1;
  const limit =
    Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 10;
  return { page, limit, offset: (page - 1) * limit };
}

// GET /api/admin/stats — thống kê tổng quan
// Admin API: tong hop so lieu dashboard nhu user, tin dang, lien he, top owner va top tin xem nhieu.
router.get("/stats", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    // Cac COUNT tach rieng giup code de doc va dashboard nhan duoc nhieu chi so tong quan.
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
    const [[{ total_hidden }]] = await pool.query(
      "SELECT COUNT(*) as total_hidden FROM properties WHERE status = 'hidden'",
    );
    const [[{ total_contacts }]] = await pool.query(
      "SELECT COUNT(*) as total_contacts FROM contacts",
    );

    // Tin mới theo tháng (6 tháng gần nhất)
    // DATE_FORMAT gom tin theo thang de ve bieu do 6 thang gan nhat tren dashboard.
    const [monthly] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM properties
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

    const [byTransactionType] = await pool.query(`
      SELECT transaction_type, COUNT(*) AS count
      FROM properties
      GROUP BY transaction_type
    `);

    const [byPropertyType] = await pool.query(`
      SELECT type, COUNT(*) AS count
      FROM properties
      GROUP BY type
    `);

    // Top owner dua tren so luong property de admin nhan dien nguoi dang tin nhieu.
    const [topOwners] = await pool.query(`
      SELECT u.id, u.full_name, u.email, COUNT(p.id) AS property_count
      FROM users u
      JOIN properties p ON p.owner_id = u.id
      WHERE u.role = 'owner'
      GROUP BY u.id
      ORDER BY property_count DESC
      LIMIT 5
    `);

    const [topViewedProperties] = await pool.query(`
      SELECT p.id, p.title, p.city, p.district, p.view_count
      FROM properties p
      ORDER BY p.view_count DESC
      LIMIT 5
    `);

    res.json({
      users: { total: total_users, buyers: total_buyers, owners: total_owners },
      properties: {
        total: total_properties,
        pending: total_pending,
        approved: total_approved,
        rejected: total_rejected,
        hidden: total_hidden,
      },
      contacts: { total: total_contacts },
      monthly_properties: monthly,
      properties_by_transaction_type: byTransactionType,
      properties_by_type: byPropertyType,
      top_owners: topOwners,
      top_viewed_properties: topViewedProperties,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/admin/users — danh sách tất cả user
// Admin API: lay danh sach tai khoan co tim kiem theo ten/email va phan trang.
router.get("/users", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { search, role, status } = req.query;
  const { page, limit, offset } = parsePagination(req.query);

  const conditions = [];
  const params = [];
  // Search duoc dua vao params LIKE ? thay vi noi chuoi truc tiep de tranh SQL injection.
  if (search && search.trim()) {
    const clauses = [];
    const tokens = search.trim().split(/\s+/).filter(Boolean).slice(0, 8);
    tokens.forEach((token) => {
      clauses.push("(full_name LIKE ? OR email LIKE ?)");
      const kw = `%${token}%`;
      params.push(kw, kw);
    });
    conditions.push(`(${clauses.join(" AND ")})`);
  }
  if (role && !["buyer", "owner", "admin"].includes(role))
    return res.status(400).json({ message: "Vai trò không hợp lệ" });
  if (status && !["active", "banned"].includes(status))
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  if (role) {
    conditions.push("role = ?");
    params.push(role);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, role, status, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${where}`,
      params,
    );
    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(role = 'owner') AS owners,
              SUM(role = 'buyer') AS buyers,
              SUM(status = 'banned') AS banned
       FROM users`,
    );
    res.json({
      data: rows,
      summary: {
        total: Number(summary.total || 0),
        owners: Number(summary.owners || 0),
        buyers: Number(summary.buyers || 0),
        banned: Number(summary.banned || 0),
      },
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/admin/users/:id/status — kích hoạt / vô hiệu hóa tài khoản
// Admin API: khoa hoac kich hoat tai khoan bang status active/banned.
// Tai khoan banned se bi chan o luong dang nhap.
router.patch("/users/:id/status", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { status } = req.body;
  if (!["active", "banned"].includes(status))
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });
  if (Number(req.params.id) === Number(req.user.id) && status === "banned")
    return res
      .status(400)
      .json({ message: "Admin không thể tự vô hiệu hóa tài khoản của mình" });

  try {
    const [result] = await pool.query(
      "UPDATE users SET status = ?, token_version = token_version + 1 WHERE id = ?",
      [status, req.params.id],
    );
    if (result.affectedRows !== 1)
      return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/admin/properties — danh sách tất cả tin (có lọc theo status)
// Admin API: xem tat ca tin dang cua he thong, ke ca pending/rejected/hidden de phuc vu kiem duyet.
router.get("/properties", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { status } = req.query;
  const { page, limit, offset } = parsePagination(req.query);

  let where = "";
  let params = [];
  // Admin co the loc theo status de tap trung vao pending/rejected/approved khi kiem duyet.
  if (status) {
    where = "WHERE p.status = ?";
    params.push(status);
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT p.id, p.title, p.type, p.transaction_type, p.price, p.city,
             p.status, p.reject_reason, p.featured_until, p.created_at,
             u.full_name as owner_name, u.email as owner_email,
             (
               SELECT COUNT(*)
               FROM property_status_history h
               WHERE h.property_id = p.id AND h.note LIKE 'Người dùng báo cáo tin:%'
             ) AS report_count
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM properties p ${where}`,
      params,
    );

    res.json({
      data: rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
