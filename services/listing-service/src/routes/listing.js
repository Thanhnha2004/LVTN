const express = require("express");
const pool = require("../db");
const router = express.Router();

// GET /api/listing — tìm kiếm + lọc nâng cao + phân trang
// Query params được hỗ trợ:
//   Lọc cơ bản:   type, transaction_type, city, district, ward
//   Lọc giá/dt:   min_price, max_price, min_area, max_area
//   Lọc chi tiết: bedrooms, direction, legal_status
//   Tìm kiếm:     keyword
//   Bản đồ:       bbox=lat_min,lng_min,lat_max,lng_max
//   Sắp xếp:      sort=newest|price_asc|price_desc|area_asc|area_desc
//   Phân trang:   page, limit
// ============================================================
router.get("/", async (req, res) => {
  try {
    const {
      type,
      transaction_type,
      city,
      district,
      ward,
      min_price,
      max_price,
      min_area,
      max_area,
      bedrooms,
      direction,
      legal_status,
      keyword,
      bbox,
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    let conditions = ["p.status = 'approved'"];
    let params = [];

    // --- Phân loại ---
    if (type) {
      const validTypes = ["apartment", "house", "land", "office"];
      if (!validTypes.includes(type))
        return res.status(400).json({ message: "Loại hình không hợp lệ" });
      conditions.push("p.type = ?");
      params.push(type);
    }

    if (transaction_type) {
      const validTx = ["sale", "rent"];
      if (!validTx.includes(transaction_type))
        return res.status(400).json({ message: "Loại giao dịch không hợp lệ" });
      conditions.push("p.transaction_type = ?");
      params.push(transaction_type);
    }

    // --- Địa chỉ 3 cấp ---
    if (city) {
      conditions.push("p.city LIKE ?");
      params.push(`%${city}%`);
    }
    if (district) {
      conditions.push("p.district LIKE ?");
      params.push(`%${district}%`);
    }
    if (ward) {
      conditions.push("p.ward LIKE ?");
      params.push(`%${ward}%`);
    }

    // --- Khoảng giá ---
    if (min_price) {
      const v = parseFloat(min_price);
      if (isNaN(v) || v < 0)
        return res.status(400).json({ message: "min_price không hợp lệ" });
      conditions.push("p.price >= ?");
      params.push(v);
    }
    if (max_price) {
      const v = parseFloat(max_price);
      if (isNaN(v) || v < 0)
        return res.status(400).json({ message: "max_price không hợp lệ" });
      conditions.push("p.price <= ?");
      params.push(v);
    }

    // --- Khoảng diện tích ---
    if (min_area) {
      const v = parseFloat(min_area);
      if (isNaN(v) || v < 0)
        return res.status(400).json({ message: "min_area không hợp lệ" });
      conditions.push("p.area >= ?");
      params.push(v);
    }
    if (max_area) {
      const v = parseFloat(max_area);
      if (isNaN(v) || v < 0)
        return res.status(400).json({ message: "max_area không hợp lệ" });
      conditions.push("p.area <= ?");
      params.push(v);
    }

    // --- Lọc chi tiết ---
    if (bedrooms) {
      const v = parseInt(bedrooms);
      if (isNaN(v) || v < 0)
        return res.status(400).json({ message: "bedrooms không hợp lệ" });
      conditions.push("p.bedrooms = ?");
      params.push(v);
    }
    if (direction) {
      const validDir = [
        "north",
        "south",
        "east",
        "west",
        "northeast",
        "northwest",
        "southeast",
        "southwest",
      ];
      if (!validDir.includes(direction))
        return res.status(400).json({ message: "direction không hợp lệ" });
      conditions.push("p.direction = ?");
      params.push(direction);
    }
    if (legal_status) {
      const validLegal = ["sohong", "sokhongdo", "dangchoso", "other"];
      if (!validLegal.includes(legal_status))
        return res.status(400).json({ message: "legal_status không hợp lệ" });
      conditions.push("p.legal_status = ?");
      params.push(legal_status);
    }

    // --- Từ khoá (tìm trong title, description, address) ---
    if (keyword && keyword.trim()) {
      conditions.push(
        "(p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ? OR p.district LIKE ? OR p.ward LIKE ?)",
      );
      const kw = `%${keyword.trim()}%`;
      params.push(kw, kw, kw, kw, kw);
    }

    // --- Bounding box cho bản đồ ---
    // bbox=lat_min,lng_min,lat_max,lng_max
    if (bbox) {
      const parts = bbox.split(",").map(Number);
      if (parts.length !== 4 || parts.some(isNaN))
        return res.status(400).json({
          message:
            "bbox không hợp lệ. Định dạng: lat_min,lng_min,lat_max,lng_max",
        });
      const [latMin, lngMin, latMax, lngMax] = parts;
      conditions.push("p.latitude BETWEEN ? AND ?");
      conditions.push("p.longitude BETWEEN ? AND ?");
      params.push(latMin, latMax, lngMin, lngMax);
    }

    // --- Sắp xếp ---
    const sortMap = {
      newest: "active_featured DESC, p.created_at DESC",
      oldest: "active_featured DESC, p.created_at ASC",
      price_asc: "active_featured DESC, p.price ASC",
      price_desc: "active_featured DESC, p.price DESC",
      area_asc: "active_featured DESC, p.area ASC",
      area_desc: "active_featured DESC, p.area DESC",
    };
    const orderBy = sortMap[sort] || sortMap.newest;

    // --- Phân trang ---
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10)); // tối đa 50
    const offset = (pageNum - 1) * limitNum;

    const where = conditions.join(" AND ");

    // --- Query danh sách ---
    const [rows] = await pool.query(
      `SELECT
         p.id, p.title, p.type, p.transaction_type,
         p.price, p.area, p.bedrooms, p.bathrooms,
         p.address, p.ward, p.district, p.city,
         p.latitude, p.longitude,
         p.direction, p.legal_status,
         p.status, p.is_featured, p.featured_until, p.created_at,
CASE
  WHEN p.is_featured = 1 AND (p.featured_until IS NULL OR p.featured_until > NOW())
  THEN 1 ELSE 0
END AS active_featured,
         u.full_name AS owner_name,
         (SELECT pi.url
          FROM property_images pi
          WHERE pi.property_id = p.id
          ORDER BY pi.\`order\`
          LIMIT 1) AS thumbnail
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset],
    );

    // --- Query tổng số ---
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM properties p WHERE ${where}`,
      params,
    );

    res.json({
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
      // Trả về filter đang áp dụng để frontend dễ hiển thị
      filters: {
        type,
        transaction_type,
        city,
        district,
        ward,
        bedrooms,
        direction,
        legal_status,
        sort,
      },
    });
  } catch (err) {
    console.error("Listing search error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/listing/:id — chi tiết tin (public)
// Tự động tăng view_count trực tiếp trên bảng properties
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.*,
         u.full_name  AS owner_name,
         u.email      AS owner_email,
         u.phone_number AS owner_phone,
         (
           SELECT GROUP_CONCAT(pi.url ORDER BY pi.\`order\` SEPARATOR ',')
           FROM property_images pi
           WHERE pi.property_id = p.id
         ) AS images
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ? AND p.status = 'approved'`,
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });

    const property = rows[0];
    property.images = property.images ? property.images.split(",") : [];

    pool
      .query("UPDATE properties SET view_count = view_count + 1 WHERE id = ?", [
        req.params.id,
      ])
      .catch((err) => console.error("View tracking error:", err.message));

    res.json(property);
  } catch (err) {
    console.error("Listing detail error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/listing/:id/similar — gợi ý tin tương tự
// Cùng type + transaction_type + city, loại trừ tin hiện tại
router.get("/:id/similar", async (req, res) => {
  try {
    // Lấy thông tin tin hiện tại
    const [base] = await pool.query(
      "SELECT type, transaction_type, city, price FROM properties WHERE id = ? AND status = 'approved'",
      [req.params.id],
    );
    if (base.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });

    const { type, transaction_type, city, price } = base[0];

    // Tìm tin cùng loại, cùng thành phố, giá ±50%, tối đa 6 tin
    const [rows] = await pool.query(
      `SELECT
         p.id, p.title, p.type, p.transaction_type,
         p.price, p.area, p.bedrooms,
         p.address, p.district, p.city,
         p.created_at,
         u.full_name AS owner_name,
         (SELECT pi.url
          FROM property_images pi
          WHERE pi.property_id = p.id
          ORDER BY pi.\`order\`
          LIMIT 1) AS thumbnail
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.status = 'approved'
         AND p.id != ?
         AND p.type = ?
         AND p.transaction_type = ?
         AND p.city LIKE ?
         AND p.price BETWEEN ? AND ?
       ORDER BY p.created_at DESC
       LIMIT 6`,
      [
        req.params.id,
        type,
        transaction_type,
        `%${city}%`,
        price * 0.5,
        price * 1.5,
      ],
    );

    res.json({ data: rows });
  } catch (err) {
    console.error("Similar listing error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
