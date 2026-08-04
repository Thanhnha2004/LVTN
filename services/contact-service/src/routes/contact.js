const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

function hasAppointmentSchedule(note) {
  return /lịch hẹn xem\s*:\s*\d{1,2}:\d{2}.*\d{1,2}\/\d{1,2}\/\d{4}/i.test(
    String(note || ""),
  );
}

function normalizeMessage(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

// POST /api/contact — Người dùng gửi yêu cầu liên hệ
// Contact API: tao mot yeu cau lien he cho tin approved.
// He thong chan tu lien he tin cua minh va chan gui trung lien he cho cung mot property.
router.post("/", authMiddleware, async (req, res) => {
  if (!["buyer", "owner"].includes(req.user.role))
    return res.status(403).json({ message: "Không có quyền gửi liên hệ" });

  const { property_id } = req.body;
  const message = normalizeMessage(req.body.message);
  if (!property_id || !message)
    return res.status(400).json({ message: "Thiếu property_id hoặc message" });
  if (message.length < 10) {
    return res
      .status(400)
      .json({ message: "Nội dung liên hệ phải có ít nhất 10 ký tự" });
  }
  if (message.length > 1000) {
    return res
      .status(400)
      .json({ message: "Nội dung liên hệ không được vượt quá 1000 ký tự" });
  }

  try {
    // Kiểm tra property tồn tại và đã approved
    // Chi cho lien he voi tin approved de tranh buyer lien he tin chua duyet/da an.
    const [props] = await pool.query(
      "SELECT id, owner_id FROM properties WHERE id = ? AND status = 'approved'",
      [property_id],
    );
    if (props.length === 0)
      return res.status(404).json({ message: "Bất động sản không tồn tại" });
    if (Number(props[0].owner_id) === Number(req.user.id))
      return res
        .status(400)
        .json({ message: "Bạn không thể gửi liên hệ cho tin đăng của chính mình" });

    // Kiểm tra đã gửi liên hệ cho tin này chưa
    // Moi buyer chi tao mot contact cho mot property de giam spam lead.
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
    // Lay them thong tin owner/property/buyer de gui email thong bao cho owner.
    const [details] = await pool.query(
      `
        SELECT  p.title, u.email as owner_email, u.full_name as owner_name,
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
// Owner API: lay danh sach lien he den cac tin cua owner hien tai, co loc theo lead_status.
// Du lieu tra ve kem ten tin va thong tin buyer de owner cham soc khach.
router.get("/owner", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner" && req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const { page = 1, limit = 10, lead_status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  // Owner chi xem lead cua cac property do minh so huu; dieu kien nay la hang rao phan quyen theo du lieu.
  const conditions = ["p.owner_id = ?"];
  const params = [req.user.id];

  if (lead_status) {
    conditions.push("c.lead_status = ?");
    params.push(lead_status);
  }

  // Dieu kien lead_status duoc them dong neu owner loc theo trang thai cham soc khach.
  const where = conditions.join(" AND ");

  try {
    const [rows] = await pool.query(
      `
        SELECT c.*, p.title as property_title, p.city, p.price,
               u.full_name as buyer_name, u.email as buyer_email,
               u.phone_number as buyer_phone
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

// PATCH /api/contact/:id/lead — Owner cập nhật trạng thái chăm sóc khách hang
// Owner API: cap nhat trang thai lead va ghi chu cham soc khach hang.
// Chi owner cua property chua contact nay moi duoc cap nhat.
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
  if (lead_status === "scheduled" && !hasAppointmentSchedule(owner_note)) {
    return res.status(400).json({
      message:
        "Trạng thái đã hẹn xem phải có lịch hẹn cụ thể trong ghi chú",
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT c.id, c.property_id, p.status AS property_status
       FROM contacts c
       JOIN properties p ON c.property_id = p.id
       WHERE c.id = ? AND p.owner_id = ?`,
      [req.params.id, req.user.id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res
        .status(403)
        .json({ message: "Không có quyền cập nhật lead này" });
    }

    await connection.query(
      "UPDATE contacts SET lead_status = ?, owner_note = ? WHERE id = ?",
      [lead_status, owner_note || null, req.params.id],
    );

    if (lead_status === "closed" && rows[0].property_status === "approved") {
      await connection.query(
        "UPDATE properties SET status = 'sold', sold_at = NOW() WHERE id = ?",
        [rows[0].property_id],
      );
      await connection.query(
        `INSERT INTO property_status_history
          (property_id, old_status, new_status, actor_id, note)
         VALUES (?, 'approved', 'sold', ?, ?)`,
        [
          rows[0].property_id,
          req.user.id,
          "Owner chốt lead liên hệ và đánh dấu tin đã giao dịch",
        ],
      );
    }

    await connection.commit();

    res.json({
      message:
        lead_status === "closed"
          ? "Đã chốt lead và cập nhật tin thành đã giao dịch"
          : "Cập nhật lead thành công",
    });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// PATCH /api/contact/:id/reply — Owner phản hồi
// Owner API: luu noi dung phan hoi cho buyer va doi contacts.status thanh replied.
// API nay cung kiem tra contact co thuoc tin cua owner dang dang nhap khong.
router.patch("/:id/reply", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được phản hồi" });

  const { owner_reply } = req.body;
  if (!owner_reply)
    return res.status(400).json({ message: "Thiếu nội dung phản hồi" });

  try {
    // Kiểm tra contact thuộc về tin của owner này không
    // Kiem tra contact co thuoc property cua owner khong truoc khi cho sua lead.
    const [rows] = await pool.query(
      `
        SELECT c.id FROM contacts c
        JOIN properties p ON c.property_id = p.id
        WHERE c.id = ? AND p.owner_id = ?
      `,
      [req.params.id, req.user.id],
    );

    if (rows.length === 0)
      return res.status(403).json({ message: "Không có quyền phản hồi" });

    // owner_note co the null neu owner chi doi trang thai ma khong ghi chu.
    await pool.query(
      "UPDATE contacts SET owner_reply = ?, status = 'replied' WHERE id = ?",
      [owner_reply, req.params.id],
    );

    res.json({ message: "Phản hồi thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/contact/buyer — Người dùng xem danh sách liên hệ đã gửi
// Contact API: xem lich su cac lien he minh da gui, kem thong tin tin dang va owner.
router.get("/buyer", authMiddleware, async (req, res) => {
  if (!["buyer", "owner"].includes(req.user.role))
    return res.status(403).json({ message: "Không có quyền" });

  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Phan hoi cung phai kiem tra ownership de owner khong tra loi contact cua owner khac.
    const [rows] = await pool.query(
      `
        SELECT c.*, p.title as property_title, p.city, p.price, p.owner_id,
              o.full_name as owner_name, o.phone_number as owner_phone,
              o.email as owner_email,
              (SELECT pi.url FROM property_images pi
               WHERE pi.property_id = p.id ORDER BY pi.\`order\` LIMIT 1) as thumbnail
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
// Buyer API: luu tin yeu thich vao saved_properties.
// INSERT IGNORE giup tranh tao ban ghi trung neu buyer bam luu nhieu lan.
router.post("/saved", authMiddleware, async (req, res) => {
  if (req.user.role !== "buyer")
    return res.status(403).json({ message: "Chỉ buyer mới được lưu tin" });

  const { property_id } = req.body;
  try {
    // Thêm kiểm tra approved
    // Chi cho luu tin approved vi tin chua duyet khong nen xuat hien trong danh sach yeu thich.
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
// Buyer API: bo luu mot tin yeu thich cua chinh buyer dang dang nhap.
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
// Buyer API: lay danh sach tin da luu, kem owner, thumbnail va thoi diem luu.
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
