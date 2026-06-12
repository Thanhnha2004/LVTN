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
        (SELECT pi.url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.order LIMIT 1) as thumbnail,
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

// POST /api/property — tạo tin (owner)
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được đăng tin" });

  const { title, description, type, price, area, address, city } = req.body;

  const validTypes = ["apartment", "house", "land", "office"];
  const validTx = ["sale", "rent"];
  if (!title || title.trim().length < 5)
    return res.status(400).json({ message: "Tiêu đề phải có ít nhất 5 ký tự" });
  if (!validTypes.includes(type))
    return res.status(400).json({ message: "Loại hình không hợp lệ" });
  if (!validTx.includes(transaction_type))
    return res.status(400).json({ message: "Loại giao dịch không hợp lệ" });
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
      "INSERT INTO properties (owner_id, title, description, type, price, area, address, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.user.id, title, description, type, price, area, address, city],
    );
    res
      .status(201)
      .json({ message: "Tạo tin thành công", id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/property/:id
router.get("/:id", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, u.full_name as owner_name,
     GROUP_CONCAT(pi.url ORDER BY pi.order) as images
     FROM properties p
     JOIN users u ON p.owner_id = u.id
     LEFT JOIN property_images pi ON p.id = pi.property_id
     WHERE p.id = ?
     GROUP BY p.id`,
    [req.params.id],
  );
  if (rows.length === 0)
    return res.status(404).json({ message: "Không tìm thấy" });
  res.json(rows[0]);
});

// PUT /api/property/:id — sửa tin (owner)
router.put("/:id", authMiddleware, async (req, res) => {
  const { title, description, type, price, area, address, city } = req.body;
  const [rows] = await pool.query(
    "SELECT owner_id FROM properties WHERE id = ?",
    [req.params.id],
  );
  if (rows.length === 0)
    return res.status(404).json({ message: "Không tìm thấy" });
  if (rows[0].owner_id !== req.user.id)
    return res.status(403).json({ message: "Không có quyền" });

  await pool.query(
    "UPDATE properties SET title=?, description=?, type=?, price=?, area=?, address=?, city=? WHERE id=?",
    [title, description, type, price, area, address, city, req.params.id],
  );
  res.json({ message: "Cập nhật thành công" });
});

// DELETE /api/property/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT owner_id FROM properties WHERE id = ?",
    [req.params.id],
  );
  if (rows.length === 0)
    return res.status(404).json({ message: "Không tìm thấy" });
  if (rows[0].owner_id !== req.user.id && req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    // Lấy danh sách ảnh trước khi xóa
    const [images] = await pool.query(
      "SELECT url FROM property_images WHERE property_id = ?",
      [req.params.id],
    );

    // Xóa ảnh trên Cloudinary
    const { cloudinary } = require("../cloudinary");
    for (const img of images) {
      try {
        const urlParts = img.url.split("/");
        const folder = urlParts[urlParts.length - 2];
        const filename = urlParts[urlParts.length - 1].split(".")[0];
        const publicId = `${folder}/${filename}`;
        await cloudinary.uploader.destroy(publicId);
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

  const { status } = req.body;
  const valid = ["approved", "rejected", "hidden"];
  if (!valid.includes(status))
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });

  await pool.query("UPDATE properties SET status = ? WHERE id = ?", [
    status,
    req.params.id,
  ]);
  res.json({ message: "Cập nhật trạng thái thành công" });
});

// PATCH /api/property/:id/hide — Owner tự ẩn tin của mình
router.patch("/:id/hide", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được ẩn tin" });

  try {
    const [rows] = await pool.query(
      "SELECT owner_id FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });

    await pool.query("UPDATE properties SET status = 'hidden' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Đã ẩn tin" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// PATCH /api/property/:id/sold — Owner đánh dấu đã giao dịch
router.patch("/:id/sold", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được đánh dấu" });

  try {
    const [rows] = await pool.query(
      "SELECT owner_id FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });

    await pool.query("UPDATE properties SET status = 'sold' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Đã đánh dấu giao dịch thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/property/:id/images — upload ảnh
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
        return res.status(400).json({ message: "Không có file" });

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
      res
        .status(500)
        .json({ message: "Lỗi upload", error: err.message, stack: err.stack });
    }
  },
);

// PATCH /api/property/:id/resubmit — Owner submit lại tin bị rejected
router.patch("/:id/resubmit", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    const [rows] = await pool.query(
      "SELECT owner_id, status FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });
    if (rows[0].status !== "rejected")
      return res
        .status(400)
        .json({ message: "Chỉ có thể nộp lại tin bị từ chối" });

    await pool.query("UPDATE properties SET status = 'pending' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ message: "Đã nộp lại, chờ Admin duyệt" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
