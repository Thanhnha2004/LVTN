const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");
const crypto = require("crypto");
const router = express.Router();
const { upload, cloudinary } = require("../cloudinary");

const VNPAY_REQUIRED_ENV = [
  "VNPAY_TMN_CODE",
  "VNPAY_HASH_SECRET",
  "VNPAY_PAYMENT_URL",
  "VNPAY_RETURN_URL",
];

function getVnpayConfig() {
  // VNPay config bat buoc lay tu bien moi truong, khong hard-code secret trong source code.
  // Neu thieu config thi bao loi som de tranh tao URL thanh toan sai moi truong.
  const missing = VNPAY_REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const err = new Error(`Thiếu cấu hình VNPay: ${missing.join(", ")}`);
    err.statusCode = 500;
    throw err;
  }

  return {
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    paymentUrl: process.env.VNPAY_PAYMENT_URL,
    returnUrl: process.env.VNPAY_RETURN_URL,
  };
}

async function addStatusHistory(
  propertyId,
  oldStatus,
  newStatus,
  actorId,
  note,
) {
  // Moi lan status cua property thay doi se ghi vao bang history de truy vet ai da thao tac.
  await pool.query(
    `INSERT INTO property_status_history
      (property_id, old_status, new_status, actor_id, note)
     VALUES (?, ?, ?, ?, ?)`,
    [propertyId, oldStatus || null, newStatus, actorId || null, note || null],
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
  // Neu tin dang van con han noi bat, goi moi se duoc noi tiep sau ngay het han cu.
  // Neu da het han hoac chua tung noi bat, goi moi bat dau tu hien tai.
  const now = new Date();
  if (featuredUntil && new Date(featuredUntil) > now)
    return new Date(featuredUntil);
  return now;
}

const VALID_PROPERTY_TYPES = ["apartment", "house", "land", "office"];
const VALID_TRANSACTION_TYPES = ["sale", "rent"];
const VALID_DIRECTIONS = [
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
];
const VALID_LEGAL_STATUSES = ["sohong", "sokhongdo", "dangchoso", "other"];
const ROOM_REQUIRED_TYPES = ["apartment", "house"];
const MAX_ACTIVE_FEATURED_PER_OWNER = 5;
const MIN_REJECT_REASON_LENGTH = 20;
const ADMIN_STATUS_TRANSITIONS = {
  pending: ["approved", "rejected", "hidden"],
  approved: ["hidden", "rejected"],
  rejected: ["pending", "hidden"],
  hidden: ["pending"],
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isWeakRejectReason(reason) {
  const normalized = normalizeText(reason).toLowerCase();
  return [
    "không hợp lệ",
    "khong hop le",
    "sai",
    "thiếu thông tin",
    "thieu thong tin",
    "không đạt",
    "khong dat",
  ].includes(normalized);
}

function canAdminChangeStatus(from, to) {
  if (from === to) return false;
  return (ADMIN_STATUS_TRANSITIONS[from] || []).includes(to);
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function optionalInteger(value) {
  const number = optionalNumber(value);
  if (number === null) return null;
  return Number.isInteger(number) ? number : NaN;
}

function validatePropertyInput(body) {
  const values = {
    title: normalizeText(body.title),
    description: normalizeText(body.description),
    type: body.type || "",
    transaction_type: body.transaction_type || "",
    price: Number(body.price),
    area: Number(body.area),
    address: normalizeText(body.address),
    city: normalizeText(body.city),
    district: normalizeText(body.district),
    ward: normalizeText(body.ward),
    bedrooms: optionalInteger(body.bedrooms),
    bathrooms: optionalInteger(body.bathrooms),
    direction: body.direction || "",
    legal_status: body.legal_status || "",
    latitude: optionalNumber(body.latitude),
    longitude: optionalNumber(body.longitude),
  };

  if (values.title.length < 10)
    return { error: "Tiêu đề phải có ít nhất 10 ký tự" };
  if (values.title.length > 180)
    return { error: "Tiêu đề không được vượt quá 180 ký tự" };
  if (values.description.length < 30)
    return { error: "Mô tả phải có ít nhất 30 ký tự" };
  if (values.description.length > 3000)
    return { error: "Mô tả không được vượt quá 3000 ký tự" };
  if (!VALID_PROPERTY_TYPES.includes(values.type))
    return { error: "Loại hình không hợp lệ" };
  if (!VALID_TRANSACTION_TYPES.includes(values.transaction_type))
    return { error: "Loại giao dịch không hợp lệ (sale | rent)" };
  if (!Number.isFinite(values.price) || values.price <= 0)
    return { error: "Giá phải là số hợp lệ và lớn hơn 0" };
  if (values.transaction_type === "sale" && values.price < 100000000)
    return { error: "Giá bán phải từ 100 triệu đồng trở lên" };
  if (values.transaction_type === "rent" && values.price < 500000)
    return { error: "Giá thuê phải từ 500 nghìn đồng/tháng trở lên" };
  if (values.price > 10000000000000)
    return { error: "Giá nhập quá lớn, vui lòng kiểm tra lại" };
  if (!Number.isFinite(values.area) || values.area < 5)
    return { error: "Diện tích phải từ 5 m² trở lên" };
  if (values.area > 100000)
    return { error: "Diện tích nhập quá lớn, vui lòng kiểm tra lại" };
  if (values.address.length < 5)
    return { error: "Địa chỉ phải có ít nhất 5 ký tự" };
  if (!values.city) return { error: "Thành phố không được để trống" };
  if (!values.district) return { error: "Quận/huyện không được để trống" };
  if (values.direction && !VALID_DIRECTIONS.includes(values.direction))
    return { error: "Hướng nhà không hợp lệ" };
  if (!values.legal_status) return { error: "Vui lòng chọn tình trạng pháp lý" };
  if (!VALID_LEGAL_STATUSES.includes(values.legal_status))
    return { error: "Pháp lý không hợp lệ" };
  for (const [key, label] of [
    ["bedrooms", "Số phòng ngủ"],
    ["bathrooms", "Số phòng tắm"],
  ]) {
    const value = values[key];
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 50))
      return { error: `${label} phải là số nguyên từ 0 đến 50` };
  }
  if (ROOM_REQUIRED_TYPES.includes(values.type)) {
    if (!values.bedrooms || values.bedrooms < 1)
      return { error: "Căn hộ/nhà ở cần có ít nhất 1 phòng ngủ" };
    if (!values.bathrooms || values.bathrooms < 1)
      return { error: "Căn hộ/nhà ở cần có ít nhất 1 phòng tắm" };
  }

  const hasLatitude = values.latitude !== null;
  const hasLongitude = values.longitude !== null;
  if (hasLatitude !== hasLongitude)
    return { error: "Vui lòng nhập đủ cả vĩ độ và kinh độ" };
  if (
    hasLatitude &&
    (!Number.isFinite(values.latitude) ||
      !Number.isFinite(values.longitude) ||
      values.latitude < 8 ||
      values.latitude > 24 ||
      values.longitude < 102 ||
      values.longitude > 110)
  ) {
    return {
      error:
        "Tọa độ không hợp lệ. Vĩ độ/kinh độ cần nằm trong phạm vi Việt Nam",
    };
  }

  return { values };
}

function formatVnpayDate(date) {
  // VNPay yeu cau ngay gio theo format yyyyMMddHHmmss va mui gio Viet Nam.
  // Dung Intl.DateTimeFormat de tranh sai ngay khi server chay o timezone khac.
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
  // VNPay yeu cau params duoc sap xep theo ten key truoc khi ky hash.
  // Neu thu tu key khac nhau thi secure hash se khong khop.
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
  // Chuoi query nay vua dung de ky hash vua dua len payment URL.
  // encodeVnpayValue giu cach encode phu hop voi quy uoc VNPay.
  return Object.entries(sortObject(params))
    .map(([key, value]) => `${key}=${encodeVnpayValue(value)}`)
    .join("&");
}

function createVnpayPaymentUrl({ orderId, amount, orderInfo, ipAddr }) {
  // Tao URL thanh toan VNPay bang cach sap xep params va ky HMAC SHA512.
  // Chu ky giup VNPay xac minh request khong bi thay doi tren duong truyen.
  const vnpayConfig = getVnpayConfig();
  const now = new Date();
  const expireDate = new Date(now.getTime() + 30 * 60 * 1000);

  let params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: vnpayConfig.tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "billpayment",
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: vnpayConfig.returnUrl,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: formatVnpayDate(now),
    vnp_ExpireDate: formatVnpayDate(expireDate),
  };

  // signData la chuoi params da sap xep; day la du lieu goc de ky HMAC SHA512.
  const signData = buildVnpayQuery(params);
  const secureHash = crypto
    .createHmac("sha512", vnpayConfig.hashSecret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return `${vnpayConfig.paymentUrl}?${signData}&vnp_SecureHash=${secureHash}`;
}

function verifyVnpayReturn(query) {
  // Xac thuc du lieu VNPay tra ve bang cach tinh lai secure hash va so sanh voi vnp_SecureHash.
  const vnpayConfig = getVnpayConfig();
  const params = { ...query };
  const secureHash = params.vnp_SecureHash;
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  // Xoa secure hash ra khoi query, sap xep lai phan con lai roi tinh hash de doi chieu.
  const signData = buildVnpayQuery(params);
  const signed = crypto
    .createHmac("sha512", vnpayConfig.hashSecret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  return secureHash === signed;
}

// GET /api/property/owner/list — danh sách tin của Owner
// Owner API: lay danh sach tin cua owner hien tai, co loc theo status va phan trang.
// Moi tin tra them thumbnail dau tien va so luong lien he de hien thi dashboard.
router.get("/owner/list", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  const { status, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Luon rang buoc owner_id = req.user.id de owner khong xem duoc tin cua nguoi khac.
  let conditions = ["p.owner_id = ?"];
  let params = [req.user.id];

  if (status) {
    conditions.push("p.status = ?");
    params.push(status);
  }

  const where = conditions.join(" AND ");

  try {
    // Subquery thumbnail lay anh dau tien; subquery contact_count dem lead theo tung tin.
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
// Owner API: dashboard tong quan cua owner gom so tin theo status, tong view, tong contact va conversion rate.
router.get("/owner/stats", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    // Dung SUM(CASE WHEN ...) de gom nhieu thong ke theo status trong mot query.
    const [[overview]] = await pool.query(
      `SELECT
        COUNT(p.id)                                            AS total_properties,
        SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) AS active_count,
        SUM(CASE WHEN p.status = 'pending'  THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN p.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
        SUM(CASE WHEN p.status = 'sold'     THEN 1 ELSE 0 END) AS sold_count,
        SUM(CASE WHEN p.status = 'hidden'   THEN 1 ELSE 0 END) AS hidden_count,
        COALESCE(SUM(p.view_count), 0)                         AS total_views,
        (SELECT COUNT(*)
         FROM contacts c
         JOIN properties cp ON c.property_id = cp.id
         WHERE cp.owner_id = ?)                                AS total_contacts
      FROM properties p
      WHERE p.owner_id = ?`,
      [req.user.id, req.user.id],
    );

    // Top 5 tin được xem nhiều nhất
    const [topProperties] = await pool.query(
      `SELECT
        p.id, p.title, p.status, p.price, p.city, p.district,
        p.view_count,
        (SELECT pi.url FROM property_images pi
         WHERE pi.property_id = p.id ORDER BY pi.\`order\` LIMIT 1) AS thumbnail
      FROM properties p
      WHERE p.owner_id = ?
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

    const viewsByDay = [];

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

    // Conversion rate cho biet bao nhieu phan tram luot xem chuyen thanh lien he.
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
// Owner API: thong ke rieng mot tin, chi owner cua tin moi duoc xem.
// Tra ve view_count, tong contact, contact gan nhat va thong ke lead_status.
router.get("/owner/stats/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  try {
    // Kiểm tra tin thuộc owner này không
    // Kiem tra property_id va owner_id cung luc de dam bao owner chi xem thong ke tin cua minh.
    const [rows] = await pool.query(
      "SELECT id, title, status, price, area, city, district, view_count, created_at FROM properties WHERE id = ? AND owner_id = ?",
      [req.params.id, req.user.id],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "Không tìm thấy hoặc không có quyền" });

    const property = rows[0];

    const viewsByDay = [];
    const total_views = property.view_count || 0;
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
// Owner API: tao tin bat dong san moi.
// Tin moi luon co y nghia la pending de admin kiem duyet truoc khi public tren listing-service.
router.post("/", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Chỉ owner mới được đăng tin" });

  const validation = validatePropertyInput(req.body);
  if (validation.error)
    return res.status(400).json({ message: validation.error });
  const property = validation.values;

  try {
    const [duplicateRows] = await pool.query(
      `SELECT id, status FROM properties
       WHERE owner_id = ?
         AND LOWER(TRIM(title)) = LOWER(TRIM(?))
         AND LOWER(TRIM(address)) = LOWER(TRIM(?))
         AND type = ?
         AND transaction_type = ?
         AND status <> 'sold'
       LIMIT 1`,
      [
        req.user.id,
        property.title,
        property.address,
        property.type,
        property.transaction_type,
      ],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        message:
          "Tin đăng này đã tồn tại. Vui lòng chỉnh sửa tin cũ hoặc thay đổi thông tin nếu đây là bất động sản khác.",
        existing_id: duplicateRows[0].id,
      });
    }

    // Insert property khong set approved ngay; default status trong DB la pending.
    const [result] = await pool.query(
      `INSERT INTO properties
        (owner_id, title, description, type, transaction_type,
         price, area, address, ward, district, city,
         bedrooms, bathrooms, direction, legal_status, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        property.title,
        property.description,
        property.type,
        property.transaction_type,
        property.price,
        property.area,
        property.address,
        property.ward || null,
        property.district || null,
        property.city,
        property.bedrooms,
        property.bathrooms,
        property.direction || null,
        property.legal_status || null,
        property.latitude,
        property.longitude,
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
// Owner API: lay cac goi noi bat dang active de owner chon mua.
router.get("/featured-packages", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res
      .status(403)
      .json({ message: "Chỉ owner mới được xem gói nổi bật" });

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
// Owner API: xem lich su don mua goi noi bat cua owner hien tai.
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
// Owner API: tao don thanh toan goi noi bat cho mot tin approved.
// Don duoc tao status pending, sau do backend tra payment_url de frontend chuyen sang VNPay.
router.post("/:id/featured-orders", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res
      .status(403)
      .json({ message: "Chỉ owner mới được mua gói nổi bật" });

  const packageId = parseInt(req.body.package_id, 10);
  const paymentMethod = req.body.payment_method || "vnpay";

  if (!packageId) {
    return res.status(400).json({ message: "Vui lòng chọn gói nổi bật" });
  }
  if (paymentMethod !== "vnpay") {
    return res
      .status(400)
      .json({ message: "Phương thức thanh toán không hợp lệ" });
  }

  try {
    // Kiem tra property truoc khi tao don: phai ton tai, thuoc owner hien tai va da approved.
    const [[property]] = await pool.query(
      `SELECT id, owner_id, title, status, featured_until
       FROM properties
       WHERE id = ?`,
      [req.params.id],
    );

    if (!property)
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });
    if (property.owner_id !== req.user.id)
      return res
        .status(403)
        .json({ message: "Không có quyền mua gói cho tin này" });
    if (property.status !== "approved")
      return res
        .status(400)
        .json({ message: "Chỉ tin đã được duyệt mới có thể mua gói nổi bật" });

    const isRenewingActiveFeatured =
      property.featured_until && new Date(property.featured_until) > new Date();
    if (!isRenewingActiveFeatured) {
      const [[{ active_featured_count }]] = await pool.query(
        `SELECT COUNT(*) AS active_featured_count
         FROM properties
         WHERE owner_id = ?
           AND status = 'approved'
           AND featured_until > NOW()`,
        [req.user.id],
      );
      if (Number(active_featured_count) >= MAX_ACTIVE_FEATURED_PER_OWNER) {
        return res.status(400).json({
          message: `Mỗi owner chỉ được có tối đa ${MAX_ACTIVE_FEATURED_PER_OWNER} tin nổi bật đang chạy. Vui lòng chờ gói cũ hết hạn hoặc gia hạn tin đang nổi bật.`,
        });
      }
    }

    const [[{ pending_order_count }]] = await pool.query(
      `SELECT COUNT(*) AS pending_order_count
       FROM featured_orders
       WHERE property_id = ?
         AND owner_id = ?
         AND status = 'pending'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
      [property.id, req.user.id],
    );
    if (Number(pending_order_count) > 0) {
      return res.status(400).json({
        message:
          "Tin này đang có đơn thanh toán gói nổi bật chưa hoàn tất. Vui lòng thanh toán hoặc đợi đơn hết hạn trước khi tạo đơn mới.",
      });
    }

    const [[pkg]] = await pool.query(
      `SELECT id, name, price, duration_days
       FROM featured_packages
       WHERE id = ? AND is_active = 1`,
      [packageId],
    );

    if (!pkg)
      return res.status(404).json({ message: "Không tìm thấy gói nổi bật" });

    // paymentCode la ma noi bo de owner/admin doi chieu don thanh toan.
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

    // Chi VNPay duoc ho tro, nen tra payment_url de frontend redirect nguoi dung sang VNPay Sandbox.
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

// GET /api/property/vnpay-return — xác thực kết quả thanh toán VNPay sandbox
// VNPay return API: VNPay redirect ve day sau khi thanh toan.
// Backend kiem tra chu ky, response code, sau do update featured_orders va properties.featured_until trong transaction.
router.get("/vnpay-return", async (req, res) => {
  let connection;
  try {
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
      await pool.query(
        "UPDATE featured_orders SET status = 'failed' WHERE id = ? AND status = 'pending'",
        [orderId],
      );
      return res.json({
        success: false,
        message: "Thanh toán VNPay không thành công",
        response_code: responseCode,
        order_id: orderId,
      });
    }

    // Dung transaction vi thanh toan can update 2 bang: featured_orders va properties.
    // Neu mot update loi thi rollback de du lieu khong bi lech.
    connection = await pool.getConnection();
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

    // FOR UPDATE khoa dong order trong transaction de tranh VNPay return bi xu ly trung dong thoi.
    if (!order) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thanh toán",
      });
    }

    // Neu user refresh trang return, order co the da paid; tra success idempotent thay vi cong han them lan nua.
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

    // Tinh han featured dua tren featured_until hien tai de mua nhieu goi se duoc cong don thoi gian.
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
       SET featured_until = ?
       WHERE id = ?`,
      [endDate, order.property_id],
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
    if (connection) await connection.rollback();
    res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/property/:id — chi tiết tin (owner/admin, kể cả pending)
// Owner/Admin API: xem chi tiet noi bo cua tin, ke ca tin pending/rejected/hidden.
// Buyer khong dung API nay; buyer xem chi tiet public qua listing-service.
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    // Chi tiet noi bo khong yeu cau status approved, nen can kiem quyen owner/admin that chat.
    const [rows] = await pool.query(
      `SELECT p.*, u.full_name as owner_name, u.email as owner_email,
       u.phone_number as owner_phone, u.email_verified AS owner_email_verified,
       (SELECT COUNT(*)
        FROM properties op
        WHERE op.owner_id = p.owner_id AND op.status = 'approved') AS owner_approved_properties,
       (SELECT COUNT(*)
        FROM properties op
        WHERE op.owner_id = p.owner_id AND op.status = 'sold') AS owner_sold_properties,
       (SELECT COUNT(*)
        FROM properties op
        WHERE op.owner_id = p.owner_id AND op.status = 'rejected') AS owner_rejected_properties,
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
// Owner API: chinh sua tin cua chinh owner.
// Sau khi sua, status quay ve pending de admin duyet lai noi dung moi.
router.put("/:id", authMiddleware, async (req, res) => {
  const validation = validatePropertyInput(req.body);
  if (validation.error)
    return res.status(400).json({ message: validation.error });
  const property = validation.values;

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

    // Moi lan owner sua tin, status ve pending va xoa ly do tu choi cu de admin duyet lai ban moi.
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
        property.title,
        property.description,
        property.type,
        property.transaction_type,
        property.price,
        property.area,
        property.address,
        property.ward || null,
        property.district || null,
        property.city,
        property.bedrooms,
        property.bathrooms,
        property.direction || null,
        property.legal_status || null,
        property.latitude,
        property.longitude,
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
// Owner/Admin API: xoa tin dang.
// Truoc khi xoa database, service co gang xoa cac anh lien quan tren Cloudinary de tranh rac tai nguyen.
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

    // Lay danh sach anh truoc khi xoa property de xoa file tu Cloudinary.
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
// Admin API: cap nhat trang thai tin dang: pending, approved, rejected hoac hidden.
// Neu rejected thi bat buoc co reject_reason; moi thay doi deu ghi property_status_history.
router.patch("/:id/status", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Chỉ admin mới được duyệt tin" });

  const { status, reject_reason } = req.body;
  const valid = ["pending", "approved", "rejected", "hidden"];
  if (!valid.includes(status))
    return res.status(400).json({ message: "Trạng thái không hợp lệ" });

  const reason = status === "rejected" ? normalizeText(reject_reason) : null;
  if (status === "rejected" && !reason)
    return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });
  if (
    status === "rejected" &&
    (reason.length < MIN_REJECT_REASON_LENGTH || isWeakRejectReason(reason))
  ) {
    return res.status(400).json({
      message:
        "Lý do từ chối cần cụ thể hơn, nêu rõ tiêu chí chưa đạt để owner có thể sửa tin.",
    });
  }

  try {
    // Kiểm tra tin tồn tại
    const [rows] = await pool.query(
      "SELECT id, owner_id, title, status FROM properties WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });
    const property = rows[0];
    if (!canAdminChangeStatus(property.status, status)) {
      return res.status(400).json({
        message:
          "Chuyển trạng thái không hợp lệ theo vòng đời tin đăng hiện tại",
      });
    }
    // IF trong SQL giup chi cap nhat timestamp tuong ung voi status moi.
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

    res.json({ message: "Cập nhật trạng thái thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/property/:id/history — lịch sử trạng thái của tin
// Owner/Admin API: xem lich su trang thai cua tin de biet ai duyet, ai tu choi va ly do.
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

    // LEFT JOIN users de van xem duoc history ngay ca khi actor_id null hoac user da bi xoa.
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

// PATCH /api/property/:id/hide — Owner tự ẩn tin
// Owner API: owner tu an tin dang dang approved.
// Tin hidden khong hien thi tren listing public.
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
// Owner API: danh dau tin da giao dich thanh cong, status chuyen sang sold.
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

// Owner API: gui lai tin hidden de cho admin duyet lai.
// Status duoc dua ve pending thay vi approved truc tiep.
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
  // Multer/Cloudinary middleware nhan field images va gioi han toi da 5 file.
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

      // Cloudinary tra file.path la URL public; order giu thu tu anh frontend da upload.
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
