const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

async function createNotification(userId, type, title, message, link) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, link)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message || null, link || null],
  );
}

// POST /api/contact — Buyer gửi yêu cầu liên hệ
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "buyer")
    return res.status(403).json({ message: "Chỉ buyer mới được liên hệ" });

  const { property_id, message } = req.body;
  if (!property_id || !message)
    return res.status(400).json({ message: "Thiếu property_id hoặc message" });

  try {
    // Kiểm tra property tồn tại và đã approved
    const [props] = await pool.query(
      "SELECT id FROM properties WHERE id = ? AND status = 'approved'",
      [property_id],
    );
    if (props.length === 0)
      return res.status(404).json({ message: "Bất động sản không tồn tại" });

    // Kiểm tra đã gửi liên hệ cho tin này chưa
    const [existing] = await pool.query(
      "SELECT id FROM contacts WHERE property_id = ? AND buyer_id = ?",
      [property_id, req.user.id],
    );
    if (existing.length > 0)
      return res
        .status(400)
        .json({ message: "Bạn đã gửi yêu cầu liên hệ cho tin này rồi" });

    await pool.query(
      "INSERT INTO contacts (property_id, buyer_id, message) VALUES (?, ?, ?)",
      [property_id, req.user.id, message],
    );

    // Lấy thông tin owner và property để gửi mail
    const [details] = await pool.query(
      `
  SELECT p.title, u.email as owner_email, u.full_name as owner_name,
    b.full_name as buyer_name
  FROM properties p
  JOIN users u ON p.owner_id = u.id
  JOIN users b ON b.id = ?
  WHERE p.id = ?
`,
      [req.user.id, property_id],
    );

    if (details.length > 0) {
      const { sendContactNotification } = require("../mailer");
      sendContactNotification({
        ownerEmail: details[0].owner_email,
        ownerName: details[0].owner_name,
        buyerName: details[0].buyer_name,
        propertyTitle: details[0].title,
        message,
      }).catch((err) => console.error("Mail error:", err));
    }

    res.status(201).json({ message: "Gửi yêu cầu thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/contact/owner — Owner xem danh sách liên hệ nhận được
router.get("/owner", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner" && req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { page = 1, limit = 10, lead_status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ["p.owner_id = ?"];
  const params = [req.user.id];

  if (lead_status) {
    conditions.push("c.lead_status = ?");
    params.push(lead_status);
  }

  const where = conditions.join(" AND ");

  try {
    const [rows] = await pool.query(
      `
      SELECT c.*, p.title as property_title, u.full_name as buyer_name, u.email as buyer_email
      FROM contacts c
      JOIN properties p ON c.property_id = p.id
      JOIN users u ON c.buyer_id = u.id
      WHERE ${where}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, parseInt(limit), offset],
    );

    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) as total FROM contacts c
      JOIN properties p ON c.property_id = p.id
      WHERE ${where}
    `,
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

// PATCH /api/contact/:id/lead — Owner cập nhật trạng thái chăm sóc khách
router.patch("/:id/lead", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res
      .status(403)
      .json({ message: "Chỉ owner mới được cập nhật lead" });

  const { lead_status, owner_note } = req.body;
  const validStatuses = [
    "new",
    "contacted",
    "scheduled",
    "closed",
    "cancelled",
  ];

  if (!validStatuses.includes(lead_status)) {
    return res.status(400).json({ message: "Trạng thái lead không hợp lệ" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT c.id
       FROM contacts c
       JOIN properties p ON c.property_id = p.id
       WHERE c.id = ? AND p.owner_id = ?`,
      [req.params.id, req.user.id],
    );

    if (rows.length === 0)
      return res
        .status(403)
        .json({ message: "Không có quyền cập nhật lead này" });

    await pool.query(
      "UPDATE contacts SET lead_status = ?, owner_note = ? WHERE id = ?",
      [lead_status, owner_note || null, req.params.id],
    );

    res.json({ message: "Cập nhật lead thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/contact/:id/reply — Owner phản hồi
router.patch("/:id/reply", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được phản hồi" });

  const { owner_reply } = req.body;
  if (!owner_reply)
    return res.status(400).json({ message: "Thiếu nội dung phản hồi" });

  try {
    // Kiểm tra contact thuộc về tin của owner này không
    const [rows] = await pool.query(
      `
      SELECT c.id, c.buyer_id, p.title AS property_title FROM contacts c
      JOIN properties p ON c.property_id = p.id
      WHERE c.id = ? AND p.owner_id = ?
    `,
      [req.params.id, req.user.id],
    );

    if (rows.length === 0)
      return res.status(403).json({ message: "Không có quyền phản hồi" });

    await pool.query(
      "UPDATE contacts SET owner_reply = ?, status = 'replied' WHERE id = ?",
      [owner_reply, req.params.id],
    );

    await createNotification(
      rows[0].buyer_id,
      "contact_replied",
      "Owner đã phản hồi yêu cầu liên hệ",
      `Yêu cầu liên hệ của bạn về tin "${rows[0].property_title}" đã có phản hồi.`,
      "/profile?tab=contacts",
    );

    res.json({ message: "Phản hồi thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/contact/buyer — Buyer xem danh sách liên hệ đã gửi
router.get("/buyer", authMiddleware, async (req, res) => {
  if (req.user.role !== "buyer")
    return res.status(403).json({ message: "Không có quyền" });

  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [rows] = await pool.query(
      `
      SELECT c.*, p.title as property_title, p.city, p.price,
             o.full_name as owner_name, o.phone_number as owner_phone,
             o.email as owner_email
      FROM contacts c
      JOIN properties p ON c.property_id = p.id
      JOIN users o ON p.owner_id = o.id
      WHERE c.buyer_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [req.user.id, parseInt(limit), offset],
    );

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) as total FROM contacts WHERE buyer_id = ?",
      [req.user.id],
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

// POST /api/contact/saved — Buyer lưu tin quan tâm
router.post("/saved", authMiddleware, async (req, res) => {
  if (req.user.role !== "buyer")
    return res.status(403).json({ message: "Chỉ buyer mới được lưu tin" });

  const { property_id } = req.body;
  try {
    // Thêm kiểm tra approved
    const [rows] = await pool.query(
      "SELECT id FROM properties WHERE id = ? AND status = 'approved'",
      [property_id],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "Bất động sản không tồn tại hoặc chưa được duyệt" });

    await pool.query(
      "INSERT IGNORE INTO saved_properties (buyer_id, property_id) VALUES (?, ?)",
      [req.user.id, property_id],
    );
    res.json({ message: "Đã lưu tin" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// DELETE /api/contact/saved/:id — Buyer bỏ lưu
router.delete("/saved/:property_id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM saved_properties WHERE buyer_id = ? AND property_id = ?",
      [req.user.id, req.params.property_id],
    );
    res.json({ message: "Đã bỏ lưu" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/contact/saved — Buyer xem danh sách tin đã lưu
router.get("/saved", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT p.*, u.full_name as owner_name,
        (SELECT pi.url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.order LIMIT 1) as thumbnail,
        sp.created_at as saved_at
      FROM saved_properties sp
      JOIN properties p ON sp.property_id = p.id
      JOIN users u ON p.owner_id = u.id
      WHERE sp.buyer_id = ?
      ORDER BY sp.created_at DESC
    `,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
