const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const crypto = require("crypto");
const router = express.Router();
const { upload, cloudinary } = require("../cloudinary");

const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE || "D68FF5DQ",
  hashSecret:
    process.env.VNPAY_HASH_SECRET || "5WMMD8V438TL6J50GB9M5ENV9BNW43DN",
  paymentUrl:
    process.env.VNPAY_PAYMENT_URL ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl:
    process.env.VNPAY_RETURN_URL ||
    "https://lvtn-bds.vercel.app/payment/vnpay-return",
  ipnUrl:
    process.env.VNPAY_IPN_URL ||
    "http://localhost:3000/api/property/vnpay-ipn",
};

async function addStatusHistory(propertyId, oldStatus, newStatus, actorId, note) {
  await pool.query(
    `INSERT INTO property_status_history
      (property_id, old_status, new_status, actor_id, note)
     VALUES (?, ?, ?, ?, ?)`,
    [propertyId, oldStatus || null, newStatus, actorId || null, note || null],
  );
}

async function createNotification(userId, type, title, message, link) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, link)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message || null, link || null],
  );
}

function generatePaymentCode() {
  return `VIP-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days));
  return result;
}

function getFeaturedStartDate(featuredUntil) {
  const now = new Date();
  if (featuredUntil && new Date(featuredUntil) > now) return new Date(featuredUntil);
  return now;
}

function formatVnpayDate(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return (
    parts.year +
    parts.month +
    parts.day +
    parts.hour +
    parts.minute +
    parts.second
  );
}

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = obj[key];
      return sorted;
    }, {});
}

function encodeVnpayValue(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, "+");
}

function buildVnpayQuery(params) {
  return Object.entries(sortObject(params))
    .map(([key, value]) => `${key}=${encodeVnpayValue(value)}`)
    .join("&");
}

function createVnpayPaymentUrl({ orderId, amount, orderInfo, ipAddr }) {
  const now = new Date();
  const expireDate = new Date(now.getTime() + 30 * 60 * 1000);

  let params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "billpayment",
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expireDate),
  };

  const signData = buildVnpayQuery(params);
  const secureHash = crypto
    .createHmac("sha512", VNPAY_CONFIG.hashSecret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return `${VNPAY_CONFIG.paymentUrl}?${signData}&vnp_SecureHash=${secureHash}`;
}

function verifyVnpayReturn(query) {
  const params = { ...query };
  const secureHash = params.vnp_SecureHash;
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const signData = buildVnpayQuery(params);
  const signed = crypto
    .createHmac("sha512", VNPAY_CONFIG.hashSecret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return secureHash === signed;
}

function getPropertyTypeLabel(type) {
  return (
    {
      apartment: "căn hộ",
      house: "nhà phố",
      land: "đất nền",
      office: "văn phòng",
    }[type] || "bất động sản"
  );
}

function getTransactionLabel(transactionType) {
  return transactionType === "rent" ? "cho thuê" : "bán";
}

function getDirectionLabel(direction) {
  return (
    {
      north: "Bắc",
      south: "Nam",
      east: "Đông",
      west: "Tây",
      northeast: "Đông Bắc",
      northwest: "Tây Bắc",
      southeast: "Đông Nam",
      southwest: "Tây Nam",
    }[direction] || ""
  );
}

function getLegalLabel(legalStatus) {
  return (
    {
      pink_book: "sổ hồng",
      red_book: "sổ đỏ",
      contract: "hợp đồng mua bán",
      waiting: "đang chờ sổ",
    }[legalStatus] || ""
  );
}

function formatPriceText(price, transactionType) {
  const value = Number(price);
  if (!value || value <= 0) return "";

  const suffix = transactionType === "rent" ? "/tháng" : "";
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(value % 1000000000 === 0 ? 0 : 1)} tỷ${suffix}`;
  }
  if (value >= 1000000) {
    return `${Math.round(value / 1000000)} triệu${suffix}`;
  }
  return `${value.toLocaleString("vi-VN")} đồng${suffix}`;
}

function buildAiDescription(data) {
  const typeLabel = getPropertyTypeLabel(data.type);
  const transactionLabel = getTransactionLabel(data.transaction_type);
  const priceText = formatPriceText(data.price, data.transaction_type);
  const address = [data.address, data.ward, data.district, data.city]
    .filter(Boolean)
    .join(", ");
  const details = [];

  if (data.area) details.push(`diện tích ${data.area} m2`);
  if (data.bedrooms) details.push(`${data.bedrooms} phòng ngủ`);
  if (data.bathrooms) details.push(`${data.bathrooms} phòng tắm`);

  const direction = getDirectionLabel(data.direction);
  if (direction) details.push(`hướng ${direction}`);

  const legal = getLegalLabel(data.legal_status);
  if (legal) details.push(`pháp lý ${legal}`);

  const lines = [
    `${data.title || `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} ${transactionLabel}`} là lựa chọn phù hợp cho khách hàng đang tìm kiếm ${typeLabel} ${transactionLabel} tại khu vực ${data.city || "trung tâm"}.`,
  ];

  if (address) {
    lines.push(
      `Bất động sản tọa lạc tại ${address}, thuận tiện di chuyển và phù hợp để ở, đầu tư hoặc khai thác cho thuê.`,
    );
  }

  if (details.length > 0) {
    lines.push(`Thông tin nổi bật gồm ${details.join(", ")}.`);
  }

  if (priceText) {
    lines.push(
      `Mức giá ${priceText} được đưa ra rõ ràng, giúp khách hàng dễ dàng cân nhắc theo nhu cầu tài chính.`,
    );
  }

  lines.push(
    "Chủ sở hữu sẵn sàng trao đổi thêm thông tin, hỗ trợ khách xem bất động sản và thương lượng trực tiếp khi có nhu cầu.",
  );

  return lines.join("\n\n");
}

// POST /api/property/ai-description — gợi ý mô tả tin đăng cho Owner
router.post("/ai-description", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Chỉ owner mới được dùng tính năng này" });
  }

  const { title, type, transaction_type, price, area, address, city } = req.body;

  if (!title && !type && !price && !area && !address && !city) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập một số thông tin tin đăng trước khi tạo mô tả" });
  }

  res.json({ description: buildAiDescription(req.body) });
});

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
    await addStatusHistory(
      result.insertId,
      null,
      "pending",
      req.user.id,
      "Owner tạo tin đăng",
    );
    res.status(201).json({
      message: "Tạo tin thành công. Tin đang chờ admin duyệt.",
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/property/featured-packages — danh sách gói nổi bật
router.get("/featured-packages", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được xem gói nổi bật" });

  try {
    const [packages] = await pool.query(
      `SELECT id, name, description, price, duration_days, priority
       FROM featured_packages
       WHERE is_active = 1
       ORDER BY priority ASC, price ASC`,
    );
    res.json(packages);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/property/owner/featured-orders — lịch sử mua gói của Owner
router.get("/owner/featured-orders", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    const [orders] = await pool.query(
      `SELECT fo.*, fp.name AS package_name, fp.duration_days, p.title AS property_title
       FROM featured_orders fo
       JOIN featured_packages fp ON fo.package_id = fp.id
       JOIN properties p ON fo.property_id = p.id
       WHERE fo.owner_id = ?
       ORDER BY fo.created_at DESC
       LIMIT 20`,
      [req.user.id],
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/property/:id/featured-orders — tạo đơn thanh toán gói nổi bật
router.post("/:id/featured-orders", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được mua gói nổi bật" });

  const packageId = parseInt(req.body.package_id, 10);
  const paymentMethod = req.body.payment_method || "vnpay";

  if (!packageId) {
    return res.status(400).json({ message: "Vui lòng chọn gói nổi bật" });
  }
  if (!["demo_online", "bank_transfer", "vnpay"].includes(paymentMethod)) {
    return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
  }

  try {
    const [[property]] = await pool.query(
      `SELECT id, owner_id, title, status
       FROM properties
       WHERE id = ?`,
      [req.params.id],
    );

    if (!property)
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });
    if (property.owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền mua gói cho tin này" });
    if (property.status !== "approved")
      return res.status(400).json({ message: "Chỉ tin đã được duyệt mới có thể mua gói nổi bật" });

    const [[pkg]] = await pool.query(
      `SELECT id, name, price, duration_days
       FROM featured_packages
       WHERE id = ? AND is_active = 1`,
      [packageId],
    );

    if (!pkg) return res.status(404).json({ message: "Không tìm thấy gói nổi bật" });

    const paymentCode = generatePaymentCode();
    const [result] = await pool.query(
      `INSERT INTO featured_orders
        (property_id, owner_id, package_id, amount, payment_method, status, payment_code)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [property.id, req.user.id, pkg.id, pkg.price, paymentMethod, paymentCode],
    );

    const order = {
      id: result.insertId,
      property_id: property.id,
      property_title: property.title,
      package_id: pkg.id,
      package_name: pkg.name,
      amount: pkg.price,
      duration_days: pkg.duration_days,
      payment_method: paymentMethod,
      status: "pending",
      payment_code: paymentCode,
    };

    const paymentUrl =
      paymentMethod === "vnpay"
        ? createVnpayPaymentUrl({
            orderId: result.insertId,
            amount: pkg.price,
            orderInfo: `Thanh toan goi noi bat ${pkg.name} cho tin ${property.id}`,
            ipAddr:
              req.headers["x-forwarded-for"]?.split(",")[0] ||
              req.socket.remoteAddress ||
              "127.0.0.1",
          })
        : null;

    res.status(201).json({
      message: "Đã tạo đơn thanh toán gói nổi bật",
      order,
      payment_url: paymentUrl,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/property/featured-orders/:orderId/pay — xác nhận thanh toán mô phỏng
router.post("/featured-orders/:orderId/pay", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền thanh toán đơn này" });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[order]] = await connection.query(
      `SELECT fo.*, fp.name AS package_name, fp.duration_days, p.title AS property_title,
              p.featured_until, p.owner_id, p.status AS property_status
       FROM featured_orders fo
       JOIN featured_packages fp ON fo.package_id = fp.id
       JOIN properties p ON fo.property_id = p.id
       WHERE fo.id = ? AND fo.owner_id = ?
       FOR UPDATE`,
      [req.params.orderId, req.user.id],
    );

    if (!order) {
      await connection.rollback();
      return res.status(404).json({ message: "Không tìm thấy đơn thanh toán" });
    }
    if (order.status !== "pending") {
      await connection.rollback();
      return res.status(400).json({ message: "Đơn thanh toán này đã được xử lý" });
    }
    if (order.property_status !== "approved") {
      await connection.rollback();
      return res.status(400).json({ message: "Tin không còn ở trạng thái được duyệt" });
    }

    const startDate = getFeaturedStartDate(order.featured_until);
    const endDate = addDays(startDate, order.duration_days);

    await connection.query(
      `UPDATE featured_orders
       SET status = 'paid', paid_at = NOW(), featured_start_at = ?, featured_end_at = ?
       WHERE id = ?`,
      [startDate, endDate, order.id],
    );

    await connection.query(
      `UPDATE properties
       SET is_featured = 1, featured_until = ?
       WHERE id = ?`,
      [endDate, order.property_id],
    );

    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES (?, 'featured_paid', 'Thanh toán gói nổi bật thành công', ?, '/owner/dashboard')`,
      [
        req.user.id,
        `Tin "${order.property_title}" đã được kích hoạt gói ${order.package_name} đến ${endDate.toLocaleDateString("vi-VN")}.`,
      ],
    );

    await connection.commit();

    res.json({
      message: "Thanh toán thành công. Tin đã được kích hoạt nổi bật.",
      property_id: order.property_id,
      featured_until: endDate,
      order_id: order.id,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    connection.release();
  }
});

// GET /api/property/vnpay-return — xác thực kết quả thanh toán VNPay sandbox
router.get("/vnpay-return", async (req, res) => {
  if (!verifyVnpayReturn(req.query)) {
    return res.status(400).json({
      success: false,
      message: "Chữ ký VNPay không hợp lệ",
    });
  }

  const orderId = parseInt(req.query.vnp_TxnRef, 10);
  const responseCode = req.query.vnp_ResponseCode;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: "Mã đơn thanh toán không hợp lệ",
    });
  }

  if (responseCode !== "00") {
    return res.json({
      success: false,
      message: "Thanh toán VNPay không thành công",
      response_code: responseCode,
      order_id: orderId,
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[order]] = await connection.query(
      `SELECT fo.*, fp.name AS package_name, fp.duration_days, p.title AS property_title,
              p.featured_until, p.status AS property_status
       FROM featured_orders fo
       JOIN featured_packages fp ON fo.package_id = fp.id
       JOIN properties p ON fo.property_id = p.id
       WHERE fo.id = ?
       FOR UPDATE`,
      [orderId],
    );

    if (!order) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thanh toán",
      });
    }

    if (order.status === "paid") {
      await connection.commit();
      return res.json({
        success: true,
        message: "Đơn thanh toán đã được xử lý trước đó",
        order_id: order.id,
        property_id: order.property_id,
        featured_until: order.featured_end_at,
      });
    }

    if (order.status !== "pending" || order.payment_method !== "vnpay") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Đơn thanh toán không hợp lệ",
      });
    }

    if (order.property_status !== "approved") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tin không còn ở trạng thái được duyệt",
      });
    }

    const startDate = getFeaturedStartDate(order.featured_until);
    const endDate = addDays(startDate, order.duration_days);

    await connection.query(
      `UPDATE featured_orders
       SET status = 'paid', paid_at = NOW(), featured_start_at = ?, featured_end_at = ?
       WHERE id = ?`,
      [startDate, endDate, order.id],
    );

    await connection.query(
      `UPDATE properties
       SET is_featured = 1, featured_until = ?
       WHERE id = ?`,
      [endDate, order.property_id],
    );

    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES (?, 'featured_paid', 'Thanh toán VNPay thành công', ?, '/owner/dashboard')`,
      [
        order.owner_id,
        `Tin "${order.property_title}" đã được kích hoạt gói ${order.package_name} đến ${endDate.toLocaleDateString("vi-VN")}.`,
      ],
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Thanh toán VNPay thành công. Tin đã được kích hoạt nổi bật.",
      order_id: order.id,
      property_id: order.property_id,
      featured_until: endDate,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

// GET /api/property/vnpay-ipn — VNPay gọi server-to-server để cập nhật trạng thái
router.get("/vnpay-ipn", async (req, res) => {
  if (!verifyVnpayReturn(req.query)) {
    return res.json({ RspCode: "97", Message: "Invalid signature" });
  }

  const orderId = parseInt(req.query.vnp_TxnRef, 10);
  const responseCode = req.query.vnp_ResponseCode;
  const paidAmount = Number(req.query.vnp_Amount || 0) / 100;

  if (!orderId) {
    return res.json({ RspCode: "01", Message: "Order not found" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[order]] = await connection.query(
      `SELECT fo.*, fp.name AS package_name, fp.duration_days, p.title AS property_title,
              p.featured_until, p.status AS property_status
       FROM featured_orders fo
       JOIN featured_packages fp ON fo.package_id = fp.id
       JOIN properties p ON fo.property_id = p.id
       WHERE fo.id = ?
       FOR UPDATE`,
      [orderId],
    );

    if (!order) {
      await connection.rollback();
      return res.json({ RspCode: "01", Message: "Order not found" });
    }

    if (Number(order.amount) !== paidAmount) {
      await connection.rollback();
      return res.json({ RspCode: "04", Message: "Invalid amount" });
    }

    if (order.status === "paid") {
      await connection.commit();
      return res.json({ RspCode: "02", Message: "Order already confirmed" });
    }

    if (responseCode !== "00") {
      await connection.query(
        `UPDATE featured_orders SET status = 'failed' WHERE id = ?`,
        [order.id],
      );
      await connection.commit();
      return res.json({ RspCode: "00", Message: "Confirm failed payment" });
    }

    if (order.property_status !== "approved") {
      await connection.rollback();
      return res.json({ RspCode: "99", Message: "Invalid property status" });
    }

    const startDate = getFeaturedStartDate(order.featured_until);
    const endDate = addDays(startDate, order.duration_days);

    await connection.query(
      `UPDATE featured_orders
       SET status = 'paid', paid_at = NOW(), featured_start_at = ?, featured_end_at = ?
       WHERE id = ?`,
      [startDate, endDate, order.id],
    );

    await connection.query(
      `UPDATE properties SET is_featured = 1, featured_until = ? WHERE id = ?`,
      [endDate, order.property_id],
    );

    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES (?, 'featured_paid', 'Thanh toán VNPay thành công', ?, '/owner/dashboard')`,
      [
        order.owner_id,
        `Tin "${order.property_title}" đã được kích hoạt gói ${order.package_name} đến ${endDate.toLocaleDateString("vi-VN")}.`,
      ],
    );

    await connection.commit();
    res.json({ RspCode: "00", Message: "Confirm success" });
  } catch (err) {
    await connection.rollback();
    res.json({ RspCode: "99", Message: "Unknown error" });
  } finally {
    connection.release();
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
       status='pending', reject_reason=NULL,
       rejected_at=NULL, hidden_at=NULL
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
    await addStatusHistory(
      req.params.id,
      rows[0].status,
      "pending",
      req.user.id,
      rows[0].status === "rejected"
        ? "Owner chỉnh sửa tin bị từ chối và gửi duyệt lại"
        : "Owner cập nhật tin và gửi duyệt lại",
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
    const [rows] = await pool.query(
      "SELECT id, owner_id, title, status FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });
    const property = rows[0];
    const reason = status === "rejected" ? reject_reason.trim() : null;

    await pool.query(
      `UPDATE properties
       SET status = ?,
           reject_reason = ?,
           approved_at = IF(? = 'approved', NOW(), approved_at),
           rejected_at = IF(? = 'rejected', NOW(), rejected_at),
           hidden_at = IF(? = 'hidden', NOW(), hidden_at)
       WHERE id = ?`,
      [status, reason, status, status, status, req.params.id],
    );

    await addStatusHistory(
      req.params.id,
      property.status,
      status,
      req.user.id,
      status === "rejected"
        ? reason
        : status === "approved"
          ? "Admin duyệt tin đăng"
          : "Admin ẩn tin đăng",
    );

    if (status === "approved") {
      await createNotification(
        property.owner_id,
        "property_approved",
        "Tin đăng đã được duyệt",
        `Tin "${property.title}" đã được admin duyệt và đang hiển thị công khai.`,
        "/owner/dashboard",
      );
    }

    if (status === "rejected") {
      await createNotification(
        property.owner_id,
        "property_rejected",
        "Tin đăng bị từ chối",
        `Tin "${property.title}" bị từ chối. Lý do: ${reason}`,
        "/owner/dashboard",
      );
    }

    if (status === "hidden") {
      await createNotification(
        property.owner_id,
        "property_hidden",
        "Tin đăng đã bị ẩn",
        `Tin "${property.title}" đã bị admin ẩn khỏi hệ thống.`,
        "/owner/dashboard",
      );
    }

    res.json({ message: "Cập nhật trạng thái thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/property/:id/history — lịch sử trạng thái của tin
router.get("/:id/history", authMiddleware, async (req, res) => {
  try {
    const [props] = await pool.query(
      "SELECT id, owner_id FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (props.length === 0)
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });
    if (req.user.role !== "admin" && props[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });

    const [history] = await pool.query(
      `SELECT h.*, u.full_name AS actor_name, u.role AS actor_role
       FROM property_status_history h
       LEFT JOIN users u ON h.actor_id = u.id
       WHERE h.property_id = ?
       ORDER BY h.created_at DESC`,
      [req.params.id],
    );
    res.json(history);
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

    await pool.query(
      "UPDATE properties SET status = 'hidden', hidden_at = NOW() WHERE id = ?",
      [req.params.id],
    );
    await addStatusHistory(
      req.params.id,
      rows[0].status,
      "hidden",
      req.user.id,
      "Owner ẩn tin đăng",
    );
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

    await pool.query(
      "UPDATE properties SET status = 'sold', sold_at = NOW() WHERE id = ?",
      [req.params.id],
    );
    await addStatusHistory(
      req.params.id,
      rows[0].status,
      "sold",
      req.user.id,
      "Owner đánh dấu đã giao dịch",
    );
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
      "SELECT owner_id, status FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy" });
    if (rows[0].owner_id !== req.user.id)
      return res.status(403).json({ message: "Không có quyền" });

    await pool.query(
      "UPDATE properties SET status = 'pending', reject_reason = NULL, hidden_at = NULL WHERE id = ? AND status = 'hidden'",
      [req.params.id],
    );
    await addStatusHistory(
      req.params.id,
      rows[0].status,
      "pending",
      req.user.id,
      "Owner gửi lại tin để chờ duyệt",
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
