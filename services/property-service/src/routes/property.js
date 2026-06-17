const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const router = express.Router();
const { upload, cloudinary } = require("../cloudinary");

// GET /api/property/owner/list — danh sách tin của Owner
router.get("/owner/list", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let conditions = ["p.owner_id = ?"];
  let params = [req.user.id];

  if (status) {
    conditions.push("p.status = ?");
    params.push(status);
  }

  const where = conditions.join(" AND ");

  try {
    const [rows] = await pool.query(
      `
      SELECT p.*,
        (SELECT pi.url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.\`order\` LIMIT 1) as thumbnail,
        (SELECT COUNT(*) FROM contacts c WHERE c.property_id = p.id) as contact_count
      FROM properties p
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, parseInt(limit), offset],
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM properties p WHERE ${where}`,
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

// GET /api/property/owner/stats — tổng quan dashboard
router.get("/owner/stats", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    const [[overview]] = await pool.query(
      `SELECT
        COUNT(DISTINCT p.id)                                    AS total_properties,
        SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) AS active_count,
        SUM(CASE WHEN p.status = 'pending'  THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN p.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
        SUM(CASE WHEN p.status = 'sold'     THEN 1 ELSE 0 END) AS sold_count,
        SUM(CASE WHEN p.status = 'hidden'   THEN 1 ELSE 0 END) AS hidden_count,
        COUNT(DISTINCT pv.id)                                   AS total_views,
        COUNT(DISTINCT c.id)                                    AS total_contacts
      FROM properties p
      LEFT JOIN property_views pv ON p.id = pv.property_id
      LEFT JOIN contacts       c  ON p.id = c.property_id
      WHERE p.owner_id = ?`,
      [req.user.id],
    );

    // Top 5 tin được xem nhiều nhất
    const [topProperties] = await pool.query(
      `SELECT
        p.id, p.title, p.status, p.price, p.city, p.district,
        COUNT(pv.id) AS view_count,
        (SELECT pi.url FROM property_images pi
         WHERE pi.property_id = p.id ORDER BY pi.\`order\` LIMIT 1) AS thumbnail
      FROM properties p
      LEFT JOIN property_views pv ON p.id = pv.property_id
      WHERE p.owner_id = ?
      GROUP BY p.id
      ORDER BY view_count DESC
      LIMIT 5`,
      [req.user.id],
    );

    const [topContactedProperties] = await pool.query(
      `SELECT
    p.id, p.title, p.status, p.price, p.city, p.district,
    COUNT(c.id) AS contact_count,
    (SELECT pi.url FROM property_images pi
     WHERE pi.property_id = p.id ORDER BY pi.\`order\` LIMIT 1) AS thumbnail
   FROM properties p
   LEFT JOIN contacts c ON p.id = c.property_id
   WHERE p.owner_id = ?
   GROUP BY p.id
   ORDER BY contact_count DESC
   LIMIT 5`,
      [req.user.id],
    );

    // Views 7 ngày gần nhất (tất cả tin của owner)
    const [viewsByDay] = await pool.query(
      `SELECT
        DATE(pv.viewed_at)  AS date,
        COUNT(*)            AS views
      FROM property_views pv
      JOIN properties p ON pv.property_id = p.id
      WHERE p.owner_id = ?
        AND pv.viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(pv.viewed_at)
      ORDER BY date ASC`,
      [req.user.id],
    );

    // Contacts chưa reply
    const [[{ pending_contacts }]] = await pool.query(
      `SELECT COUNT(*) AS pending_contacts
       FROM contacts c
       JOIN properties p ON c.property_id = p.id
       WHERE p.owner_id = ? AND c.status = 'pending'`,
      [req.user.id],
    );

    const [leadStats] = await pool.query(
      `SELECT c.lead_status, COUNT(*) AS count
   FROM contacts c
   JOIN properties p ON c.property_id = p.id
   WHERE p.owner_id = ?
   GROUP BY c.lead_status`,
      [req.user.id],
    );

    const conversionRate =
      Number(overview.total_views) > 0
        ? Number(
            ((overview.total_contacts / overview.total_views) * 100).toFixed(2),
          )
        : 0;

    res.json({
      overview: {
        ...overview,
        pending_contacts,
        conversion_rate: conversionRate,
      },
      top_properties: topProperties,
      views_by_day: viewsByDay,
      top_contacted_properties: topContactedProperties,
      lead_stats: leadStats,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/property/owner/stats/:id — chi tiết 1 tin cụ thể
router.get("/owner/stats/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    // Kiểm tra tin thuộc owner này không
    const [rows] = await pool.query(
      "SELECT id, title, status, price, area, city, district, created_at FROM properties WHERE id = ? AND owner_id = ?",
      [req.params.id, req.user.id],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "Không tìm thấy hoặc không có quyền" });

    const property = rows[0];

    // Views theo ngày 7 ngày gần nhất
    const [viewsByDay] = await pool.query(
      `SELECT
        DATE(viewed_at) AS date,
        COUNT(*)        AS views
      FROM property_views
      WHERE property_id = ?
        AND viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(viewed_at)
      ORDER BY date ASC`,
      [req.params.id],
    );

    // Tổng views + contacts
    const [[{ total_views }]] = await pool.query(
      "SELECT COUNT(*) AS total_views FROM property_views WHERE property_id = ?",
      [req.params.id],
    );
    const [[{ total_contacts, pending_contacts }]] = await pool.query(
      `SELECT
        COUNT(*) AS total_contacts,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_contacts
       FROM contacts WHERE property_id = ?`,
      [req.params.id],
    );

    const conversionRate =
      Number(total_views) > 0
        ? Number(((total_contacts / total_views) * 100).toFixed(2))
        : 0;

    // 5 liên hệ gần nhất
    const [recentContacts] = await pool.query(
      `SELECT c.id, c.message, c.status, c.created_at, c.owner_reply,
              u.full_name AS buyer_name, u.phone_number AS buyer_phone
       FROM contacts c
       JOIN users u ON c.buyer_id = u.id
       WHERE c.property_id = ?
       ORDER BY c.created_at DESC
       LIMIT 5`,
      [req.params.id],
    );

    const [leadStats] = await pool.query(
      `SELECT lead_status, COUNT(*) AS count
   FROM contacts
   WHERE property_id = ?
   GROUP BY lead_status`,
      [req.params.id],
    );

    res.json({
      property,
      stats: {
        total_views,
        total_contacts,
        pending_contacts,
        conversion_rate: conversionRate,
      },
      views_by_day: viewsByDay,
      recent_contacts: recentContacts,
      lead_stats: leadStats,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/property — tạo tin (owner)
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được đăng tin" });

  const {
    title,
    description,
    type,
    transaction_type,
    price,
    area,
    address,
    city,
    district,
    ward,
    bedrooms,
    bathrooms,
    direction,
    legal_status,
    latitude,
    longitude,
  } = req.body;

  const validTypes = ["apartment", "house", "land", "office"];
  const validTx = ["sale", "rent"];

  if (!title || title.trim().length < 5)
    return res.status(400).json({ message: "Tiêu đề phải có ít nhất 5 ký tự" });
  if (!validTypes.includes(type))
    return res.status(400).json({ message: "Loại hình không hợp lệ" });
  if (!validTx.includes(transaction_type))
    return res
      .status(400)
      .json({ message: "Loại giao dịch không hợp lệ (sale | rent)" });
  if (!price || parseFloat(price) <= 0)
    return res.status(400).json({ message: "Giá phải lớn hơn 0" });
  if (!area || parseFloat(area) <= 0)
    return res.status(400).json({ message: "Diện tích phải lớn hơn 0" });
  if (!address || !city)
    return res
      .status(400)
      .json({ message: "Địa chỉ và thành phố không được để trống" });

  try {
    const [result] = await pool.query(
      `INSERT INTO properties
        (owner_id, title, description, type, transaction_type,
         price, area, address, ward, district, city,
         bedrooms, bathrooms, direction, legal_status, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
      [
        req.user.id,
        title,
        description || null,
        type,
        transaction_type,
        parseFloat(price),
        parseFloat(area),
        address,
        ward || null,
        district || null,
        city,
        bedrooms ? parseInt(bedrooms) : null,
        bathrooms ? parseInt(bathrooms) : null,
        direction || null,
        legal_status || null,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
      ],
    );
    res.status(201).json({
      message: "Tạo tin thành công. Tin đang chờ admin duyệt.",
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/property/:id — chi tiết tin (owner/admin, kể cả pending)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.full_name as owner_name, u.phone_number as owner_phone,
       GROUP_CONCAT(pi.url ORDER BY pi.\`order\` SEPARATOR ',') as images
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       LEFT JOIN property_images pi ON p.id = pi.property_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });

    const property = rows[0];

    if (req.user.role !== "admin" && property.owner_id !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền" });
    }

    property.images = property.images ? property.images.split(",") : [];
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PUT /api/property/:id — sửa tin (owner)
router.put("/:id", authMiddleware, async (req, res) => {
  const {
    title,
    description,
    type,
    transaction_type,
    price,
    area,
    address,
    ward,
    district,
    city,
    bedrooms,
    bathrooms,
    direction,
    legal_status,
    latitude,
    longitude,
  } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT owner_id, status FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });
    if (rows[0].status === "sold") {
      return res
        .status(400)
        .json({ message: "Tin đã bán/cho thuê, không thể chỉnh sửa" });
    }

    // THÀNH ĐOẠN NÀY:
    await pool.query(
      `UPDATE properties
   SET title=?, description=?, type=?, transaction_type=?,
       price=?, area=?, address=?, ward=?, district=?, city=?,
       bedrooms=?, bathrooms=?, direction=?, legal_status=?,
       latitude=?, longitude=?,
       status='pending', reject_reason=NULL
   WHERE id=?`,
      [
        title,
        description,
        type,
        transaction_type,
        parseFloat(price),
        parseFloat(area),
        address,
        ward || null,
        district || null,
        city,
        bedrooms ? parseInt(bedrooms) : null,
        bathrooms ? parseInt(bathrooms) : null,
        direction || null,
        legal_status || null,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        req.params.id,
      ],
    );
    res.json({ message: "Cập nhật thành công. Tin đang chờ duyệt lại." });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// DELETE /api/property/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT owner_id FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Không có quyền" });

    const [images] = await pool.query(
      "SELECT url FROM property_images WHERE property_id = ?",
      [req.params.id],
    );

    for (const img of images) {
      try {
        const urlParts = img.url.split("/");
        const folder = urlParts[urlParts.length - 2];
        const filename = urlParts[urlParts.length - 1].split(".")[0];
        await cloudinary.uploader.destroy(`${folder}/${filename}`);
      } catch (e) {
        console.error("Cloudinary delete error:", e.message);
      }
    }

    await pool.query("DELETE FROM properties WHERE id = ?", [req.params.id]);
    res.json({ message: "Xoá thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/property/:id/status — duyệt tin (admin)
router.patch("/:id/status", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Chỉ admin mới được duyệt tin" });

  const { status, reject_reason } = req.body;
  const valid = ["pending", "approved", "rejected", "hidden"];
  if (!valid.includes(status))
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });

  if (status === "rejected" && !reject_reason)
    return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });

  try {
    // Kiểm tra tin tồn tại
    const [rows] = await pool.query("SELECT id FROM properties WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });

    await pool.query(
      "UPDATE properties SET status = ?, reject_reason = ? WHERE id = ?",
      [status, status === "rejected" ? reject_reason : null, req.params.id],
    );
    res.json({ message: "Cập nhật trạng thái thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/property/:id/featured — admin bật/tắt tin nổi bật
router.patch("/:id/featured", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res
      .status(403)
      .json({ message: "Chỉ admin mới được cập nhật tin nổi bật" });

  const { is_featured, featured_until } = req.body;

  if (![0, 1, true, false].includes(is_featured)) {
    return res.status(400).json({ message: "is_featured không hợp lệ" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, status FROM properties WHERE id = ?",
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });

    if (rows[0].status !== "approved")
      return res
        .status(400)
        .json({ message: "Chỉ có thể đặt nổi bật cho tin đã duyệt" });

    await pool.query(
      "UPDATE properties SET is_featured = ?, featured_until = ? WHERE id = ?",
      [is_featured ? 1 : 0, featured_until || null, req.params.id],
    );

    res.json({ message: "Cập nhật tin nổi bật thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/property/:id/hide — Owner tự ẩn tin
router.patch("/:id/hide", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được ẩn tin" });

  try {
    const [rows] = await pool.query(
      "SELECT owner_id, status FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });
    if (rows[0].status !== "approved") {
      return res
        .status(400)
        .json({ message: "Chỉ có thể ẩn tin đang hiển thị" });
    }

    await pool.query("UPDATE properties SET status = 'hidden' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Đã ẩn tin" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/property/:id/sold — Owner đánh dấu đã bán
router.patch("/:id/sold", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được đánh dấu" });

  try {
    const [rows] = await pool.query(
      "SELECT owner_id, status FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });
    if (rows[0].status !== "approved") {
      return res.status(400).json({
        message: "Chỉ có thể đánh dấu đã giao dịch với tin đang hiển thị",
      });
    }

    await pool.query("UPDATE properties SET status = 'sold' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Đã đánh dấu giao dịch thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

router.patch("/:id/unhide", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });
  try {
    const [rows] = await pool.query(
      "SELECT owner_id FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });

    await pool.query(
      "UPDATE properties SET status = 'pending', reject_reason = NULL WHERE id = ? AND status = 'hidden'",
      [req.params.id],
    );
    res.json({ message: "Đã gửi lại tin để chờ duyệt" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/property/:id/images — upload ảnh lên Cloudinary
router.post(
  "/:id/images",
  authMiddleware,
  upload.array("images", 5),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT owner_id FROM properties WHERE id = ?",
        [req.params.id],
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "Không tìm thấy" });
      if (rows[0].owner_id !== req.user.id)
        return res.status(403).json({ message: "Không có quyền" });
      if (!req.files || req.files.length === 0)
        return res
          .status(400)
          .json({ message: "Không có file nào được upload" });

      const images = req.files.map((file, index) => ({
        url: file.path,
        order: index + 1,
      }));

      for (const img of images) {
        await pool.query(
          "INSERT INTO property_images (property_id, url, `order`) VALUES (?, ?, ?)",
          [req.params.id, img.url, img.order],
        );
      }

      res.json({ message: "Upload thành công", count: images.length, images });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Lỗi upload", error: err.message });
    }
  },
);

module.exports = router;
