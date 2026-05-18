const express = require("express");
const pool = require("../db");
const router = express.Router();

// GET /api/listing — tìm kiếm + lọc + phân trang
router.get("/", async (req, res) => {
  try {
    const {
      type, // apartment, house, land, office
      transaction_type, // sale, rent
      city,
      min_price,
      max_price,
      min_area,
      max_area,
      keyword,
      page = 1,
      limit = 10,
    } = req.query;

    let conditions = ["p.status = 'approved'"];
    let params = [];

    if (type) {
      conditions.push("p.type = ?");
      params.push(type);
    }
    if (transaction_type) {
      conditions.push("p.transaction_type = ?");
      params.push(transaction_type);
    }
    if (city) {
      conditions.push("p.city LIKE ?");
      params.push(`%${city}%`);
    }
    if (min_price) {
      conditions.push("p.price >= ?");
      params.push(min_price);
    }
    if (max_price) {
      conditions.push("p.price <= ?");
      params.push(max_price);
    }
    if (min_area) {
      conditions.push("p.area >= ?");
      params.push(min_area);
    }
    if (max_area) {
      conditions.push("p.area <= ?");
      params.push(max_area);
    }
    if (keyword) {
      conditions.push(
        "(p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ?)",
      );
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const where = conditions.join(" AND ");
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await pool.query(
      `
      SELECT p.*, u.full_name as owner_name,
        (SELECT pi.url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.order LIMIT 1) as thumbnail
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      WHERE ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, parseInt(limit), offset],
    );

    const [[{ total }]] = await pool.query(
      `
      SELECT COUNT(*) as total FROM properties p WHERE ${where}
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

// GET /api/listing/:id — chi tiết tin (public)
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT p.*, u.full_name as owner_name, u.email as owner_email,
        GROUP_CONCAT(pi.url ORDER BY pi.order SEPARATOR ',') as images
      FROM properties p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN property_images pi ON p.id = pi.property_id
      WHERE p.id = ? AND p.status = 'approved'
      GROUP BY p.id
    `,
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });

    const property = rows[0];
    property.images = property.images ? property.images.split(",") : [];
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
