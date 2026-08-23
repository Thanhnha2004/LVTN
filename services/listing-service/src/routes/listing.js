const express = require("express");
const pool = require("../db");
const router = express.Router();

function normalizeKeyword(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getFloorKeywordIntent(keyword) {
  const normalized = normalizeKeyword(keyword);
  const match = normalized.match(/\b(\d{1,2})\s*(tầng|tang|lầu|lau)\b/i);
  if (!match) return null;

  const floor = Number(match[1]);
  if (!Number.isInteger(floor) || floor <= 0) return null;

  return {
    raw: match[0],
    patterns: [
      `%${floor} tầng%`,
      `%${floor} tang%`,
      `%${floor} lầu%`,
      `%${floor} lau%`,
      `%${floor}tầng%`,
      `%${floor}tang%`,
      `%${floor}lầu%`,
      `%${floor}lau%`,
    ],
  };
}

function addLooseKeywordCondition(conditions, params, token) {
  conditions.push(
    "(p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ? OR p.city LIKE ? OR p.district LIKE ? OR p.ward LIKE ?)",
  );
  const kw = `%${token}%`;
  params.push(kw, kw, kw, kw, kw, kw);
}

// GET /api/listing/category-counts - số tin đã duyệt theo loại bất động sản
// Public API: dem so tin approved theo type de trang chu hien thi so luong thuc te theo danh muc.
router.get("/category-counts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT type, COUNT(*) AS total
       FROM properties
       WHERE status = 'approved'
       GROUP BY type`,
    );

    const counts = rows.reduce((acc, row) => {
      acc[row.type] = Number(row.total) || 0;
      return acc;
    }, {});

    res.json({ data: counts });
  } catch (err) {
    console.error("Listing category counts error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

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
      featured_only,
      keyword,
      bbox,
      sort = "newest",
      page = 1,
      limit = 10,
    } = req.query;

    // Listing cong khai chi duoc hien thi tin da duoc admin duyet.
    // Cac dieu kien loc ben duoi se duoc them dong vao mang conditions.
    let conditions = ["p.status = 'approved'"];
    let params = [];

    // --- Phân loại ---
    if (type) {
      const validTypes = ["apartment", "house", "land", "office"];
      if (!validTypes.includes(type))
        return res.status(400).json({ message: "Loại hình không hợp lệ" });
      // Chi chap nhan type trong danh sach co dinh de tranh filter sai nghiep vu.
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
      // Gia va dien tich duoc parse sang number truoc khi dua vao query de tranh gia tri khong hop le.
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
    if (featured_only === "1") {
      conditions.push("p.featured_until > NOW()");
    }

    // --- Từ khoá (tìm trong title, description, address) ---
    if (keyword && keyword.trim()) {
      const normalizedKeyword = normalizeKeyword(keyword);
      const floorIntent = getFloorKeywordIntent(normalizedKeyword);

      if (floorIntent) {
        // Cum "2 tang/2 lau" phai khop dung cum, tranh token "2" khop voi 2PN
        // va token "tang" khop voi cac tin o tang 18.
        conditions.push(
          `(${floorIntent.patterns
            .map(() => "(p.title LIKE ? OR p.description LIKE ?)")
            .join(" OR ")})`,
        );
        floorIntent.patterns.forEach((pattern) => params.push(pattern, pattern));
      }

      const remainingKeyword = floorIntent
        ? normalizedKeyword.replace(floorIntent.raw, " ")
        : normalizedKeyword;
      const tokens = remainingKeyword.split(/\s+/).filter(Boolean).slice(0, 8);
      tokens.forEach((token) => addLooseKeywordCondition(conditions, params, token));
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
      // bbox dung cho che do ban do: chi lay tin co toa do nam trong khung hien tai.
      const [latMin, lngMin, latMax, lngMax] = parts;
      conditions.push("p.latitude BETWEEN ? AND ?");
      conditions.push("p.longitude BETWEEN ? AND ?");
      params.push(latMin, latMax, lngMin, lngMax);
    }

    // --- Sắp xếp ---
    // Tin noi bat duoc uu tien theo nhom, sau do xoay thu tu theo ngay de cong bang
    // khi nhieu owner cung mua goi noi bat. Tin thuong van sap xep theo lua chon cua user.
    const featuredOrder =
      "CASE WHEN r.featured_until > NOW() AND r.owner_featured_rank <= 2 THEN 1 ELSE 0 END DESC, CASE WHEN r.featured_until > NOW() THEN 1 ELSE 0 END DESC, CASE WHEN r.featured_until > NOW() THEN MOD(CRC32(CONCAT(r.id, CURDATE())), 100000) ELSE NULL END ASC";
    const sortMap = {
      newest: `${featuredOrder}, r.created_at DESC`,
      oldest: `${featuredOrder}, r.created_at ASC`,
      price_asc: `${featuredOrder}, r.price ASC, r.created_at DESC`,
      price_desc: `${featuredOrder}, r.price DESC, r.created_at DESC`,
      area_asc: `${featuredOrder}, r.area ASC`,
      area_desc: `${featuredOrder}, r.area DESC`,
    };
    const orderBy = sortMap[sort] || sortMap.newest;

    // --- Phân trang ---
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10)); // tối đa 50
    const offset = (pageNum - 1) * limitNum;

    // Noi cac dieu kien bang AND de tao menh de WHERE cuoi cung.
    // Gia tri nguoi dung nam trong params, khong noi truc tiep vao SQL.
    const where = conditions.join(" AND ");

    // --- Query danh sách ---
    // Query danh sach dung parameter binding (?) de tranh noi chuoi gia tri nguoi dung vao SQL.
    const [rows] = await pool.query(
      `SELECT r.*
       FROM (
         SELECT
           p.id, p.title, p.type, p.transaction_type,
           p.price, p.area, p.bedrooms, p.bathrooms,
           p.address, p.ward, p.district, p.city,
           p.latitude, p.longitude,
           p.direction, p.legal_status,
           p.status,
           p.owner_id,
           p.featured_until,
           p.created_at,
           u.full_name AS owner_name,
           ROW_NUMBER() OVER (
             PARTITION BY p.owner_id, CASE WHEN p.featured_until > NOW() THEN 1 ELSE 0 END
             ORDER BY MOD(CRC32(CONCAT(p.id, CURDATE())), 100000), p.created_at DESC
           ) AS owner_featured_rank,
           (SELECT pi.url
            FROM property_images pi
            WHERE pi.property_id = p.id
            ORDER BY pi.\`order\`
            LIMIT 1) AS thumbnail
         FROM properties p
         JOIN users u ON p.owner_id = u.id
         WHERE ${where}
       ) r
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset],
    );

    // --- Query tổng số ---
    // Query tong so record rieng de frontend tinh so trang phan trang.
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

// GET /api/listing/owners/:id - ho so cong khai cua nguoi ban
// Public API: tong hop uy tin owner tu du lieu san co va danh sach tin dang da duyet.
router.get("/owners/:id", async (req, res) => {
  const ownerId = Number(req.params.id);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return res.status(400).json({ message: "ID nguoi ban khong hop le" });
  }

  try {
    const [owners] = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email_verified,
         u.created_at,
         COUNT(p.id) AS total_properties,
         SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) AS approved_properties,
         SUM(CASE WHEN p.status = 'sold' THEN 1 ELSE 0 END) AS sold_properties,
         SUM(CASE WHEN p.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_properties,
         SUM(CASE WHEN p.status = 'hidden' THEN 1 ELSE 0 END) AS hidden_properties,
         COALESCE(SUM(p.view_count), 0) AS total_views,
         (SELECT COUNT(*)
          FROM contacts c
          JOIN properties cp ON cp.id = c.property_id
          WHERE cp.owner_id = u.id) AS total_contacts,
         (SELECT COUNT(*)
          FROM contacts c
          JOIN properties cp ON cp.id = c.property_id
          WHERE cp.owner_id = u.id AND c.status = 'replied') AS replied_contacts
       FROM users u
       LEFT JOIN properties p ON p.owner_id = u.id
       WHERE u.id = ? AND u.role = 'owner' AND u.status = 'active'
       GROUP BY u.id`,
      [ownerId],
    );

    if (owners.length === 0) {
      return res.status(404).json({ message: "Khong tim thay nguoi ban" });
    }

    const [properties] = await pool.query(
      `SELECT
         p.id, p.title, p.type, p.transaction_type,
         p.price, p.area, p.bedrooms, p.bathrooms,
         p.address, p.ward, p.district, p.city,
         p.featured_until, p.created_at, p.view_count,
         (SELECT pi.url
          FROM property_images pi
          WHERE pi.property_id = p.id
          ORDER BY pi.\`order\`
          LIMIT 1) AS thumbnail
       FROM properties p
       WHERE p.owner_id = ? AND p.status = 'approved'
       ORDER BY
         CASE WHEN p.featured_until > NOW() THEN 1 ELSE 0 END DESC,
         CASE WHEN p.featured_until > NOW() THEN MOD(CRC32(CONCAT(p.id, CURDATE())), 100000) ELSE NULL END ASC,
         p.created_at DESC
       LIMIT 12`,
      [ownerId],
    );

    res.json({ owner: owners[0], properties });
  } catch (err) {
    console.error("Owner public profile error:", err);
    res.status(500).json({ message: "Loi server", error: err.message });
  }
});

// GET /api/listing/:id — chi tiết tin (public)
// Tự động tăng view_count trực tiếp trên bảng properties
// Public API: xem chi tiet mot tin approved, gom anh thanh mang images va tang view_count.
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.*,
         u.full_name  AS owner_name,
         u.email      AS owner_email,
         u.phone_number AS owner_phone,
         u.email_verified AS owner_email_verified,
         (SELECT COUNT(*)
          FROM properties op
          WHERE op.owner_id = p.owner_id AND op.status = 'approved') AS owner_approved_properties,
         (SELECT COUNT(*)
          FROM properties op
          WHERE op.owner_id = p.owner_id AND op.status = 'sold') AS owner_sold_properties,
         (SELECT COUNT(*)
         FROM properties op
         WHERE op.owner_id = p.owner_id AND op.status = 'rejected') AS owner_rejected_properties,
         (SELECT COUNT(*)
          FROM properties op
          WHERE op.owner_id = p.owner_id AND op.status = 'hidden') AS owner_hidden_properties,
         (SELECT COALESCE(SUM(op.view_count), 0)
          FROM properties op
          WHERE op.owner_id = p.owner_id) AS owner_total_views,
         (SELECT COUNT(*)
          FROM contacts c
          JOIN properties cp ON cp.id = c.property_id
          WHERE cp.owner_id = p.owner_id) AS owner_total_contacts,
         (SELECT COUNT(*)
          FROM contacts c
          JOIN properties cp ON cp.id = c.property_id
          WHERE cp.owner_id = p.owner_id AND c.status = 'replied') AS owner_replied_contacts,
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
    // GROUP_CONCAT tra ve chuoi URL ngan cach bang dau phay, frontend can mang nen split lai.
    property.images = property.images ? property.images.split(",") : [];

    // Tang view_count khong can chan response; neu tracking loi thi chi log, khong lam hong trang chi tiet.
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

// GET /api/listing/:id/price-estimate — định giá tham khảo từ tin tương đồng
router.get("/:id/price-estimate", async (req, res) => {
  try {
    const [base] = await pool.query(
      `SELECT id, type, transaction_type, city, district, price, area
       FROM properties
       WHERE id = ? AND status = 'approved'`,
      [req.params.id],
    );
    if (base.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });

    const property = base[0];
    const comparableStrategies = [
      {
        label: "Cùng quận/huyện, cùng loại và diện tích gần nhau",
        cityPattern: `%${property.city}%`,
        districtOnly: true,
        areaMin: Number(property.area) * 0.7,
        areaMax: Number(property.area) * 1.3,
      },
      {
        label: "Cùng thành phố, cùng loại và diện tích gần nhau",
        cityPattern: `%${property.city}%`,
        districtOnly: false,
        areaMin: Number(property.area) * 0.7,
        areaMax: Number(property.area) * 1.3,
      },
      {
        label: "Cùng thành phố, cùng loại và diện tích mở rộng",
        cityPattern: `%${property.city}%`,
        districtOnly: false,
        areaMin: Number(property.area) * 0.5,
        areaMax: Number(property.area) * 1.5,
      },
      {
        label: "Cùng loại giao dịch, diện tích mở rộng trên toàn hệ thống",
        cityPattern: "%%",
        districtOnly: false,
        areaMin: Number(property.area) * 0.5,
        areaMax: Number(property.area) * 1.5,
      },
    ];

    let comparables = [];
    let strategyUsed = comparableStrategies[0];

    for (const strategy of comparableStrategies) {
      const [rows] = await pool.query(
        `SELECT id, title, price, area, district, city,
              ROUND(price / NULLIF(area, 0), 0) AS unit_price
       FROM properties
       WHERE status = 'approved'
         AND id <> ?
         AND type = ?
         AND transaction_type = ?
         AND city LIKE ?
         ${strategy.districtOnly ? "AND district = ?" : ""}
         AND area BETWEEN ? AND ?
       ORDER BY
         CASE WHEN district = ? THEN 0 ELSE 1 END,
         ABS(price - ?)
       LIMIT 8`,
        [
          property.id,
          property.type,
          property.transaction_type,
          strategy.cityPattern,
          ...(strategy.districtOnly ? [property.district] : []),
          strategy.areaMin,
          strategy.areaMax,
          property.district,
          property.price,
        ],
      );

      comparables = rows;
      strategyUsed = strategy;
      if (rows.length >= 3) break;
    }

    const enoughForRange = comparables.length >= 2;
    if (!enoughForRange) {
      return res.json({
        property_price: Number(property.price),
        property_unit_price: Math.round(Number(property.price) / Number(property.area)),
        sample_size: comparables.length,
        confidence: "low",
        basis: strategyUsed.label,
        message:
          "Chưa đủ tin tương đồng để đưa ra khoảng giá đáng tin cậy.",
        comparables,
      });
    }

    const unitPrices = comparables
      .map((item) => Number(item.unit_price || 0))
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
    const avgUnitPrice = Math.round(
      unitPrices.reduce((sum, value) => sum + value, 0) / unitPrices.length,
    );
    const lowUnitPrice = unitPrices[Math.floor(unitPrices.length * 0.25)];
    const highUnitPrice = unitPrices[Math.ceil(unitPrices.length * 0.75) - 1];
    const estimatedLow = Math.round(lowUnitPrice * Number(property.area));
    const estimatedHigh = Math.round(highUnitPrice * Number(property.area));
    const currentUnitPrice = Math.round(
      Number(property.price) / Number(property.area),
    );
    const position =
      currentUnitPrice < lowUnitPrice
        ? "below_market"
        : currentUnitPrice > highUnitPrice
          ? "above_market"
          : "within_market";

    res.json({
      property_price: Number(property.price),
      property_unit_price: currentUnitPrice,
      sample_size: comparables.length,
      confidence: comparables.length >= 5 ? "medium" : "low",
      basis: strategyUsed.label,
      average_unit_price: avgUnitPrice,
      estimated_range: {
        low: estimatedLow,
        high: estimatedHigh,
      },
      position,
      comparables,
    });
  } catch (err) {
    console.error("Price estimate error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/listing/:id/similar — gợi ý tin tương tự
// Cùng type + transaction_type + city, loại trừ tin hiện tại
// Public API: goi y toi da 6 tin tuong tu dua tren type, transaction_type, city va khoang gia +-50%.
router.get("/:id/similar", async (req, res) => {
  try {
    // Lấy thông tin tin hiện tại
    const [base] = await pool.query(
      `SELECT type, transaction_type, city, price
       FROM properties
       WHERE id = ? AND status = 'approved'`,
      [req.params.id],
    );
    if (base.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });

    // Tin hien tai lam moc de lay cac tieu chi tim tin tuong tu.
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
