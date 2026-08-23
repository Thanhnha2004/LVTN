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

function parsePositiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function addStatusHistory(
  propertyId,
  oldStatus,
  newStatus,
  actorId,
  note,
  database = pool,
) {
  // Moi lan status cua property thay doi se ghi vao bang history de truy vet ai da thao tac.
  await database.query(
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
const MAX_PENDING_PROPERTIES_PER_OWNER = 10;
const LIMITED_PENDING_PROPERTIES_PER_OWNER = 3;
const MAX_PROCESSED_VIOLATIONS_FOR_POSTING = 5;
const MAX_PROCESSED_VIOLATIONS_FOR_FEATURED = 3;
const MIN_REJECT_REASON_LENGTH = 20;
const FEATURED_PENDING_TIMEOUT_MINUTES = 30;
const MAX_IMAGES_PER_UPLOAD = 5;
const MAX_IMAGES_PER_PROPERTY = 5;
const REPORT_REASONS = {
  wrong_info: "Thông tin sai",
  fake_images: "Hình ảnh không đúng",
  duplicate: "Tin trùng",
  scam: "Nghi ngờ lừa đảo",
  unavailable: "Bất động sản không còn giao dịch",
  other: "Khác",
};
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

async function getOwnerProcessedViolationCount(ownerId, database = pool) {
  const [[{ violation_count }]] = await database.query(
    `SELECT COUNT(*) AS violation_count
     FROM property_status_history h
     JOIN properties p ON p.id = h.property_id
     WHERE p.owner_id = ?
       AND h.new_status IN ('rejected', 'hidden')
       AND h.note NOT LIKE 'Owner %'`,
    [ownerId],
  );
  return Number(violation_count || 0);
}

function buildPropertyQualityItems(property) {
  const images = Array.isArray(property.images)
    ? property.images
    : property.images
      ? String(property.images).split(",").filter(Boolean)
      : [];
  const description = normalizeText(property.description);
  const hasExternalContact =
    /(?:\+?84|0)\d{8,10}|[^\s@]+@[^\s@]+\.[^\s@]+|https?:\/\//i.test(
      description,
    );

  return [
    {
      key: "title",
      label: "Tiêu đề rõ ràng",
      ok: property.title?.trim?.().length >= 10 && property.title.length <= 180,
      weight: 12,
    },
    {
      key: "description",
      label: "Mô tả đủ thông tin",
      ok: description.length >= 30 && description.length <= 3000,
      weight: 14,
    },
    {
      key: "price",
      label: "Giá đạt ngưỡng nghiệp vụ",
      ok:
        property.transaction_type === "sale"
          ? Number(property.price) >= 100000000
          : Number(property.price) >= 500000,
      weight: 12,
    },
    {
      key: "area",
      label: "Diện tích hợp lý",
      ok: Number(property.area) >= 5 && Number(property.area) <= 100000,
      weight: 10,
    },
    {
      key: "address",
      label: "Địa chỉ đủ cấp",
      ok: Boolean(
        property.city &&
          property.district &&
          property.address?.trim?.().length >= 5,
      ),
      weight: 14,
    },
    {
      key: "legal",
      label: "Có pháp lý",
      ok: VALID_LEGAL_STATUSES.includes(property.legal_status),
      weight: 10,
    },
    {
      key: "images",
      label: "Có hình ảnh",
      ok: images.length > 0 || Boolean(property.thumbnail),
      weight: 10,
    },
    {
      key: "location",
      label: "Tọa độ hợp lệ",
      ok:
        Number(property.latitude) >= 8 &&
        Number(property.latitude) <= 24 &&
        Number(property.longitude) >= 102 &&
        Number(property.longitude) <= 110,
      weight: 10,
    },
    {
      key: "contact",
      label: "Không chèn liên hệ ngoài",
      ok: !hasExternalContact,
      weight: 8,
    },
  ];
}

async function buildAdminReviewInsights(property) {
  const qualityItems = buildPropertyQualityItems(property);
  const score = qualityItems.reduce(
    (sum, item) => sum + (item.ok ? item.weight : 0),
    0,
  );
  const failedItems = qualityItems.filter((item) => !item.ok);

  const area = Number(property.area || 0);
  const strategies = [
    {
      label: "Cung thanh pho va dien tich gan nhau",
      cityPattern: `%${property.city || ""}%`,
      areaMin: area * 0.5,
      areaMax: area * 1.5,
    },
    {
      label: "Cung thanh pho va dien tich mo rong",
      cityPattern: `%${property.city || ""}%`,
      areaMin: area * 0.25,
      areaMax: area * 2.5,
    },
    {
      label: "Cung loai bat dong san tren toan he thong",
      cityPattern: "%%",
      areaMin: 0,
      areaMax: 100000000,
    },
  ];

  let comparables = [];
  let strategyUsed = strategies[0];
  for (const strategy of strategies) {
    const [rows] = await pool.query(
      `SELECT price, area, district, city,
              ROUND(price / NULLIF(area, 0), 0) AS unit_price
       FROM properties
       WHERE status = 'approved'
         AND id <> ?
         AND type = ?
         AND transaction_type = ?
         AND city LIKE ?
         AND area BETWEEN ? AND ?
       ORDER BY
         CASE WHEN district = ? THEN 0 ELSE 1 END,
         CASE WHEN city LIKE ? THEN 0 ELSE 1 END,
         ABS(area - ?),
         ABS(price - ?)
       LIMIT 12`,
      [
        property.id,
        property.type,
        property.transaction_type,
        strategy.cityPattern,
        strategy.areaMin,
        strategy.areaMax,
        property.district || "",
        `%${property.city || ""}%`,
        area,
        property.price || 0,
      ],
    );
    comparables = rows;
    strategyUsed = strategy;
    if (rows.length >= 3) break;
  }

  let priceRisk = {
    level: "unknown",
    label: "Chưa đủ dữ liệu so sánh giá",
    sample_size: comparables.length,
    basis: strategyUsed.label,
  };

  const unitPrices = comparables
    .map((item) => Number(item.unit_price || 0))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  if (unitPrices.length >= 3 && Number(property.area) > 0) {
    const currentUnitPrice = Math.round(
      Number(property.price) / Number(property.area),
    );
    const lowUnitPrice = unitPrices[Math.floor(unitPrices.length * 0.25)];
    const highUnitPrice = unitPrices[Math.ceil(unitPrices.length * 0.75) - 1];
    const lowTolerance = lowUnitPrice * 0.75;
    const highTolerance = highUnitPrice * 1.35;
    const position =
      currentUnitPrice < lowTolerance
        ? "too_low"
        : currentUnitPrice > highTolerance
          ? "too_high"
          : "normal";
    priceRisk = {
      level: position === "normal" ? "normal" : "warning",
      position,
      label:
        position === "too_low"
          ? "Giá thấp bất thường so với tin tương đồng"
          : position === "too_high"
            ? "Giá cao bất thường so với tin tương đồng"
            : "Giá nằm trong vùng tham khảo",
      sample_size: unitPrices.length,
      basis: strategyUsed.label,
      current_unit_price: currentUnitPrice,
      reference_unit_price: {
        low: Math.round(lowUnitPrice),
        high: Math.round(highUnitPrice),
      },
    };
  }

  return {
    quality_score: score,
    quality_level: score >= 85 ? "good" : score >= 65 ? "watch" : "risk",
    failed_items: failedItems.map(({ key, label }) => ({ key, label })),
    price_risk: priceRisk,
  };
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

  if (
    typeof secureHash !== "string" ||
    !/^[a-fA-F0-9]{128}$/.test(secureHash)
  ) {
    return false;
  }

  const receivedHash = Buffer.from(secureHash.toLowerCase(), "hex");
  const expectedHash = Buffer.from(signed, "hex");
  return (
    receivedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(receivedHash, expectedHash)
  );
}

// GET /api/property/owner/list — danh sách tin của Owner
// Owner API: lay danh sach tin cua owner hien tai, co loc theo status va phan trang.
// Moi tin tra them thumbnail dau tien va so luong lien he de hien thi dashboard.
router.get("/owner/list", authMiddleware, async (req, res) => {
  if (req.user.role !== "owner")
    return res.status(403).json({ message: "Không có quyền" });

  const { status } = req.query;
  const requestedPage = Number(req.query.page);
  const requestedLimit = Number(req.query.limit);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 1_000_000)
      : 1;
  const limit =
    Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 10;
  const offset = (page - 1) * limit;

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
      [...params, limit, offset],
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM properties p WHERE ${where}`,
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

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const fail = async (status, payload) => {
      await connection.rollback();
      return res.status(status).json(payload);
    };

    // Serialize create requests of one owner so duplicate and pending quota
    // checks remain true until the insert is committed.
    const [[owner]] = await connection.query(
      "SELECT id FROM users WHERE id = ? FOR UPDATE",
      [req.user.id],
    );
    if (!owner) {
      return fail(401, { message: "Tài khoản không còn tồn tại" });
    }

    const [duplicateRows] = await connection.query(
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
      return fail(409, {
        message:
          "Tin đăng này đã tồn tại. Vui lòng chỉnh sửa tin cũ hoặc thay đổi thông tin nếu đây là bất động sản khác.",
        existing_id: duplicateRows[0].id,
      });
    }

    const [[{ pending_count }]] = await connection.query(
      "SELECT COUNT(*) AS pending_count FROM properties WHERE owner_id = ? AND status = 'pending'",
      [req.user.id],
    );
    const violationCount = await getOwnerProcessedViolationCount(
      req.user.id,
      connection,
    );
    if (violationCount >= MAX_PROCESSED_VIOLATIONS_FOR_POSTING) {
      return fail(400, {
        message:
          "Tai khoan co nhieu tin bi admin xu ly. Vui long cai thien cac tin hien co hoac lien he admin truoc khi dang them tin moi.",
      });
    }
    const pendingLimit =
      violationCount >= MAX_PROCESSED_VIOLATIONS_FOR_FEATURED
        ? LIMITED_PENDING_PROPERTIES_PER_OWNER
        : MAX_PENDING_PROPERTIES_PER_OWNER;
    if (Number(pending_count || 0) >= pendingLimit) {
      return fail(400, {
        message: `Bạn đang có ${pendingLimit} tin chờ duyệt. Vui lòng chờ admin xử lý trước khi đăng thêm.`,
      });
    }

    // Insert property khong set approved ngay; default status trong DB la pending.
    const [result] = await connection.query(
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
      connection,
    );
    await connection.commit();
    return res.status(201).json({
      message: "Tạo tin thành công. Tin đang chờ admin duyệt.",
      id: result.insertId,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    if (connection) connection.release();
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
    const now = Date.now();
    const ordersWithPaymentUrl = orders.map((order) => {
      const isPending =
        order.status === "pending" &&
        new Date(order.created_at).getTime() >=
          now - FEATURED_PENDING_TIMEOUT_MINUTES * 60 * 1000;
      return {
        ...order,
        payment_url: isPending
          ? createVnpayPaymentUrl({
              orderId: order.id,
              amount: order.amount,
              orderInfo: `Thanh toan goi noi bat ${order.package_name} cho tin ${order.property_id}`,
            })
          : null,
      };
    });
    res.json(ordersWithPaymentUrl);
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

  const propertyId = parsePositiveId(req.params.id);
  const packageId = parsePositiveId(req.body.package_id);
  const paymentMethod = req.body.payment_method || "vnpay";

  if (!propertyId) {
    return res.status(400).json({ message: "Mã tin đăng không hợp lệ" });
  }
  if (!packageId) {
    return res.status(400).json({ message: "Vui lòng chọn gói nổi bật" });
  }
  if (paymentMethod !== "vnpay") {
    return res
      .status(400)
      .json({ message: "Phương thức thanh toán không hợp lệ" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const fail = async (status, payload) => {
      await connection.rollback();
      return res.status(status).json(payload);
    };

    // Khoa owner truoc de serialize moi yeu cau tao don cua cung mot owner.
    // Nho do gioi han tong tin noi bat va check pending khong bi race condition.
    const [[owner]] = await connection.query(
      "SELECT id FROM users WHERE id = ? FOR UPDATE",
      [req.user.id],
    );
    if (!owner) {
      return fail(401, { message: "Tài khoản không còn tồn tại" });
    }

    const [[property]] = await connection.query(
      `SELECT id, owner_id, title, status, featured_until
       FROM properties
       WHERE id = ?
       FOR UPDATE`,
      [propertyId],
    );

    if (!property)
      return fail(404, { message: "Không tìm thấy tin đăng" });
    if (property.owner_id !== req.user.id)
      return fail(403, { message: "Không có quyền mua gói cho tin này" });
    if (property.status !== "approved")
      return fail(400, {
        message: "Chỉ tin đã được duyệt mới có thể mua gói nổi bật",
      });

    const violationCount = await getOwnerProcessedViolationCount(
      req.user.id,
      connection,
    );
    if (violationCount >= MAX_PROCESSED_VIOLATIONS_FOR_FEATURED) {
      return fail(400, {
        message:
          "Tài khoản có nhiều tin bị xử lý. Vui lòng cải thiện chất lượng tin trước khi mua gói nổi bật.",
      });
    }

    await connection.query(
      `UPDATE featured_orders
       SET status = 'failed'
       WHERE property_id = ?
         AND owner_id = ?
         AND status = 'pending'
         AND created_at < DATE_SUB(NOW(), INTERVAL ${FEATURED_PENDING_TIMEOUT_MINUTES} MINUTE)`,
      [property.id, req.user.id],
    );

    const isRenewingActiveFeatured =
      property.featured_until && new Date(property.featured_until) > new Date();
    if (!isRenewingActiveFeatured) {
      const [[{ active_featured_count }]] = await connection.query(
        `SELECT COUNT(*) AS active_featured_count
         FROM properties
         WHERE owner_id = ?
           AND status = 'approved'
           AND featured_until > NOW()`,
        [req.user.id],
      );
      if (Number(active_featured_count) >= MAX_ACTIVE_FEATURED_PER_OWNER) {
        return fail(400, {
          message: `Mỗi owner chỉ được có tối đa ${MAX_ACTIVE_FEATURED_PER_OWNER} tin nổi bật đang chạy. Vui lòng chờ gói cũ hết hạn hoặc gia hạn tin đang nổi bật.`,
        });
      }
    }

    const [[{ pending_order_count }]] = await connection.query(
      `SELECT COUNT(*) AS pending_order_count
       FROM featured_orders
       WHERE property_id = ?
         AND owner_id = ?
         AND status = 'pending'
         AND created_at >= DATE_SUB(NOW(), INTERVAL ${FEATURED_PENDING_TIMEOUT_MINUTES} MINUTE)`,
      [property.id, req.user.id],
    );
    if (Number(pending_order_count) > 0) {
      return fail(400, {
        message:
          `Tin này đang có đơn thanh toán gói nổi bật chưa hoàn tất. Vui lòng thanh toán hoặc đợi đơn hết hạn sau ${FEATURED_PENDING_TIMEOUT_MINUTES} phút trước khi tạo đơn mới.`,
      });
    }

    const [[pkg]] = await connection.query(
      `SELECT id, name, price, duration_days
       FROM featured_packages
       WHERE id = ? AND is_active = 1`,
      [packageId],
    );

    if (!pkg)
      return fail(404, { message: "Không tìm thấy gói nổi bật" });

    // paymentCode la ma noi bo de owner/admin doi chieu don thanh toan.
    const paymentCode = generatePaymentCode();
    const [result] = await connection.query(
      `INSERT INTO featured_orders
        (property_id, owner_id, package_id, amount, payment_method, status, payment_code)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [property.id, req.user.id, pkg.id, pkg.price, paymentMethod, paymentCode],
    );

    const [[createdOrder]] = await connection.query(
      "SELECT created_at FROM featured_orders WHERE id = ?",
      [result.insertId],
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
      created_at: createdOrder?.created_at || new Date(),
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

    await connection.commit();
    return res.status(201).json({
      message: "Đã tạo đơn thanh toán gói nổi bật",
      order,
      payment_url: paymentUrl,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

async function processVnpayCallback(query) {
  let connection;
  try {
    if (!verifyVnpayReturn(query)) {
      return {
        httpStatus: 400,
        ipnCode: "97",
        body: { success: false, message: "Chữ ký VNPay không hợp lệ" },
      };
    }

    const vnpayConfig = getVnpayConfig();
    if (String(query.vnp_TmnCode || "") !== vnpayConfig.tmnCode) {
      return {
        httpStatus: 400,
        ipnCode: "97",
        body: { success: false, message: "Mã website VNPay không hợp lệ" },
      };
    }

    const transactionRef = String(query.vnp_TxnRef || "");
    const callbackAmountText = String(query.vnp_Amount || "");
    if (!/^\d+$/.test(transactionRef) || Number(transactionRef) <= 0) {
      return {
        httpStatus: 400,
        ipnCode: "01",
        body: { success: false, message: "Mã đơn thanh toán không hợp lệ" },
      };
    }
    if (!/^\d+$/.test(callbackAmountText)) {
      return {
        httpStatus: 400,
        ipnCode: "04",
        body: { success: false, message: "Số tiền thanh toán không hợp lệ" },
      };
    }
    const orderId = Number(transactionRef);

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

    if (!order) {
      await connection.rollback();
      return {
        httpStatus: 404,
        ipnCode: "01",
        body: { success: false, message: "Không tìm thấy đơn thanh toán" },
      };
    }

    const expectedAmount = Math.round(Number(order.amount) * 100);
    const callbackAmount = Number(callbackAmountText);
    if (
      !Number.isSafeInteger(expectedAmount) ||
      !Number.isSafeInteger(callbackAmount) ||
      callbackAmount !== expectedAmount
    ) {
      await connection.rollback();
      return {
        httpStatus: 400,
        ipnCode: "04",
        body: {
          success: false,
          message: "Số tiền thanh toán không khớp với đơn hàng",
          order_id: order.id,
        },
      };
    }

    if (order.status === "paid") {
      await connection.commit();
      return {
        httpStatus: 200,
        ipnCode: "02",
        body: {
          success: true,
          idempotent: true,
          message: "Đơn thanh toán đã được xử lý trước đó",
          order_id: order.id,
          property_id: order.property_id,
          featured_until: order.featured_end_at,
        },
      };
    }

    if (order.status !== "pending" || order.payment_method !== "vnpay") {
      await connection.rollback();
      return {
        httpStatus: 400,
        ipnCode: "02",
        body: { success: false, message: "Đơn thanh toán không hợp lệ" },
      };
    }

    const responseCode = String(query.vnp_ResponseCode || "");
    const transactionStatus = String(query.vnp_TransactionStatus || "");
    if (responseCode !== "00" || transactionStatus !== "00") {
      await connection.query(
        "UPDATE featured_orders SET status = 'failed' WHERE id = ? AND status = 'pending'",
        [order.id],
      );
      await connection.commit();
      return {
        httpStatus: 200,
        ipnCode: "00",
        body: {
          success: false,
          message: "Thanh toán VNPay không thành công",
          response_code: responseCode,
          transaction_status: transactionStatus,
          order_id: order.id,
        },
      };
    }

    if (
      new Date(order.created_at) <
      new Date(Date.now() - FEATURED_PENDING_TIMEOUT_MINUTES * 60 * 1000)
    ) {
      await connection.query(
        "UPDATE featured_orders SET status = 'failed' WHERE id = ? AND status = 'pending'",
        [order.id],
      );
      await connection.commit();
      return {
        httpStatus: 400,
        ipnCode: "02",
        body: {
          success: false,
          message: "Đơn thanh toán đã quá hạn xử lý. Vui lòng tạo đơn mới.",
          order_id: order.id,
        },
      };
    }

    if (order.property_status !== "approved") {
      await connection.rollback();
      return {
        httpStatus: 409,
        ipnCode: "02",
        body: {
          success: false,
          message: "Tin không còn ở trạng thái được duyệt",
        },
      };
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

    return {
      httpStatus: 200,
      ipnCode: "00",
      body: {
        success: true,
        message:
          "Thanh toán VNPay thành công. Tin đã được kích hoạt nổi bật.",
        order_id: order.id,
        property_id: order.property_id,
        featured_until: endDate,
      },
    };
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// Return URL phục vụ trình duyệt; IPN bên dưới dùng cùng quy trình
// xử lý để callback đồng thời vẫn idempotent và không cộng hạn hai lần.
router.get("/vnpay-return", async (req, res) => {
  try {
    const result = await processVnpayCallback(req.query);
    return res.status(result.httpStatus).json(result.body);
  } catch (err) {
    console.error("VNPay return error:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// URL này cần được khai báo làm IPN URL trong cổng VNPay.
// VNPay yêu cầu phản hồi RspCode kể cả khi callback không hợp lệ.
router.get("/vnpay-ipn", async (req, res) => {
  try {
    const result = await processVnpayCallback(req.query);
    return res.json({
      RspCode: result.ipnCode,
      Message:
        result.ipnCode === "00" ? "Confirm Success" : result.body.message,
    });
  } catch (err) {
    console.error("VNPay IPN error:", err.message);
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
});

// GET /api/property/admin/reports — admin xem cac tin bi nguoi dung bao cao.
// Khong tao bang moi: lay cac su kien report da ghi trong property_status_history.
router.get("/admin/reports", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Không có quyền" });

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  const propertyId = req.query.property_id
    ? parsePositiveId(req.query.property_id)
    : null;

  if (req.query.property_id && !propertyId) {
    return res.status(400).json({ message: "Mã tin không hợp lệ" });
  }

  const reportWhere = "h.note LIKE 'Người dùng báo cáo tin:%'";
  const params = propertyId ? [propertyId] : [];
  const propertyFilter = propertyId ? " AND h.property_id = ?" : "";

  try {
    if (propertyId) {
      const [reports] = await pool.query(
        `SELECT h.id, h.property_id, h.actor_id, h.note, h.created_at,
                u.full_name AS reporter_name, u.email AS reporter_email, u.role AS reporter_role
         FROM property_status_history h
         LEFT JOIN users u ON u.id = h.actor_id
         WHERE ${reportWhere}${propertyFilter}
         ORDER BY h.created_at DESC`,
        params,
      );
      return res.json({ data: reports });
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM (
         SELECT h.property_id
         FROM property_status_history h
         WHERE ${reportWhere}
         GROUP BY h.property_id
       ) reported_properties`,
    );

    const [rows] = await pool.query(
      `SELECT
         p.id, p.title, p.status, p.price, p.type, p.transaction_type,
         p.city, p.district, p.created_at, p.owner_id,
         owner.full_name AS owner_name, owner.email AS owner_email,
         COUNT(h.id) AS report_count,
         CASE
           WHEN COUNT(h.id) >= 5 THEN 'critical'
           WHEN COUNT(h.id) >= 3 THEN 'high'
           WHEN COUNT(h.id) >= 1 THEN 'watch'
           ELSE 'none'
         END AS report_level,
         MAX(h.created_at) AS latest_report_at,
         SUBSTRING_INDEX(
           GROUP_CONCAT(h.note ORDER BY h.created_at DESC SEPARATOR '|||'),
           '|||',
           1
         ) AS latest_report_note,
         SUBSTRING_INDEX(
           GROUP_CONCAT(COALESCE(reporter.full_name, 'Người dùng') ORDER BY h.created_at DESC SEPARATOR '|||'),
           '|||',
           1
         ) AS latest_reporter_name
       FROM property_status_history h
       JOIN properties p ON p.id = h.property_id
       JOIN users owner ON owner.id = p.owner_id
       LEFT JOIN users reporter ON reporter.id = h.actor_id
       WHERE ${reportWhere}
       GROUP BY p.id
       ORDER BY latest_report_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server", error: err.message });
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
    if (req.user.role === "admin") {
      property.review_insights = await buildAdminReviewInsights(property);
    }
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

    const [duplicateRows] = await pool.query(
      `SELECT id, status FROM properties
       WHERE owner_id = ?
         AND id <> ?
         AND LOWER(title) = LOWER(?)
         AND type = ?
         AND transaction_type = ?
         AND city = ?
         AND district <=> ?
         AND address = ?
         AND ABS(price - ?) <= GREATEST(? * 0.02, 1000000)
         AND ABS(area - ?) <= GREATEST(? * 0.02, 1)
         AND status <> 'sold'
       LIMIT 1`,
      [
        req.user.id,
        req.params.id,
        property.title,
        property.type,
        property.transaction_type,
        property.city,
        property.district || null,
        property.address,
        property.price,
        property.price,
        property.area,
        property.area,
      ],
    );
    if (duplicateRows.length > 0) {
      return res.status(409).json({
        message:
          "Tin chỉnh sửa có dấu hiệu trùng với một tin khác đang tồn tại. Vui lòng cập nhật tin cũ hoặc thay đổi thông tin cho rõ ràng.",
        existing_id: duplicateRows[0].id,
      });
    }

    // Moi lan owner sua tin, status ve pending va xoa ly do tu choi cu de admin duyet lai ban moi.
    // Neu tin dang co goi noi bat da thanh toan, giu featured_until de khi duyet lai van con quyen loi neu chua het han.
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
    await pool.query(
      "UPDATE featured_orders SET status = 'cancelled' WHERE property_id = ? AND status = 'pending'",
      [req.params.id],
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

  const reason = ["rejected", "hidden"].includes(status)
    ? normalizeText(reject_reason)
    : null;
  if (["rejected", "hidden"].includes(status) && !reason) {
    return res.status(400).json({
      message:
        status === "hidden"
          ? "Vui lòng nhập lý do ẩn tin"
          : "Vui lòng nhập lý do từ chối",
    });
  }
  if (
    ["rejected", "hidden"].includes(status) &&
    (reason.length < MIN_REJECT_REASON_LENGTH || isWeakRejectReason(reason))
  ) {
    return res.status(400).json({
      message:
        status === "hidden"
          ? "Lý do ẩn tin cần cụ thể hơn, nêu rõ vấn đề để owner có thể kiểm tra và chỉnh sửa."
          : "Lý do từ chối cần cụ thể hơn, nêu rõ tiêu chí chưa đạt để owner có thể sửa tin.",
    });
  }

  try {
    // Kiểm tra tin tồn tại
    const [rows] = await pool.query(
      "SELECT id, owner_id, title, status, featured_until FROM properties WHERE id = ?",
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
           hidden_at = IF(? = 'hidden', NOW(), hidden_at),
           featured_until = IF(? IN ('rejected', 'hidden'), NULL, featured_until)
       WHERE id = ?`,
      [status, reason, status, status, status, status, req.params.id],
    );

    if (
      status === "approved" &&
      property.status === "pending" &&
      property.featured_until
    ) {
      const [pauseRows] = await pool.query(
        `SELECT created_at
         FROM property_status_history
         WHERE property_id = ?
           AND old_status = 'approved'
           AND new_status = 'pending'
           AND actor_id = ?
           AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
         ORDER BY created_at DESC
         LIMIT 1`,
        [req.params.id, property.owner_id],
      );

      const pauseStartedAt = pauseRows[0]?.created_at;
      if (
        pauseStartedAt &&
        new Date(property.featured_until) > new Date(pauseStartedAt)
      ) {
        const [[{ paused_minutes }]] = await pool.query(
          "SELECT GREATEST(0, TIMESTAMPDIFF(MINUTE, ?, NOW())) AS paused_minutes",
          [pauseStartedAt],
        );
        if (Number(paused_minutes || 0) > 0) {
          await pool.query(
            `UPDATE properties
             SET featured_until = DATE_ADD(featured_until, INTERVAL ? MINUTE)
             WHERE id = ?`,
            [Number(paused_minutes), req.params.id],
          );
          await addStatusHistory(
            req.params.id,
            "approved",
            "approved",
            req.user.id,
            `Admin duyet lai va bu ${Number(paused_minutes)} phut goi noi bat do tin cho kiem duyet`,
          );
        }
      }
    }

    if (["rejected", "hidden"].includes(status)) {
      await pool.query(
        "UPDATE featured_orders SET status = 'cancelled' WHERE property_id = ? AND status = 'pending'",
        [req.params.id],
      );
    }

    await addStatusHistory(
      req.params.id,
      property.status,
      status,
      req.user.id,
      status === "rejected"
        ? reason
        : status === "approved"
          ? "Admin duyệt tin đăng"
          : reason,
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

    // Admin can xem day du actor de xu ly bao cao. Owner khong duoc nhan su kien
    // report hoac actor_id cua nguoi report, tranh lo danh tinh nguoi phan anh.
    const isAdmin = req.user.role === "admin";
    const historySql = isAdmin
      ? `SELECT h.*, u.full_name AS actor_name, u.role AS actor_role
         FROM property_status_history h
         LEFT JOIN users u ON h.actor_id = u.id
         WHERE h.property_id = ?
         ORDER BY h.created_at DESC`
      : `SELECT h.id, h.property_id, h.old_status, h.new_status, h.note,
                h.created_at,
                CASE WHEN u.role = 'admin' THEN u.full_name ELSE NULL END AS actor_name,
                CASE WHEN u.role = 'admin' THEN u.role ELSE NULL END AS actor_role
         FROM property_status_history h
         LEFT JOIN users u ON h.actor_id = u.id
         WHERE h.property_id = ?
           AND (h.note IS NULL OR h.note NOT LIKE ?)
         ORDER BY h.created_at DESC`;
    const historyParams = isAdmin
      ? [req.params.id]
      : [req.params.id, "Người dùng báo cáo tin:%"];
    const [history] = await pool.query(historySql, historyParams);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// POST /api/property/:id/report — người dùng báo cáo tin xấu
// Không tạo bảng mới: ghi sự kiện báo cáo vào property_status_history để admin/owner truy vết.
router.post("/:id/report", authMiddleware, async (req, res) => {
  if (!["buyer", "owner"].includes(req.user.role)) {
    return res.status(403).json({ message: "Không có quyền báo cáo tin" });
  }

  const reason = String(req.body.reason || "").trim();
  const propertyId = parsePositiveId(req.params.id);
  const message = normalizeText(req.body.message);
  if (!propertyId) {
    return res.status(400).json({ message: "Mã tin đăng không hợp lệ" });
  }
  if (!REPORT_REASONS[reason]) {
    return res.status(400).json({ message: "Lý do báo cáo không hợp lệ" });
  }
  if (message.length < 10) {
    return res
      .status(400)
      .json({ message: "Nội dung báo cáo phải có ít nhất 10 ký tự" });
  }
  if (message.length > 500) {
    return res
      .status(400)
      .json({ message: "Nội dung báo cáo không được vượt quá 500 ký tự" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    // Khoa property de hai request dong thoi cua cung reporter khong the
    // cung vuot qua buoc kiem tra duplicate roi chen hai report.
    const [rows] = await connection.query(
      "SELECT id, owner_id, status FROM properties WHERE id = ? FOR UPDATE",
      [propertyId],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });
    }
    const property = rows[0];
    if (Number(property.owner_id) === Number(req.user.id)) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Bạn không thể báo cáo tin của chính mình" });
    }
    if (property.status !== "approved") {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Chỉ có thể báo cáo tin đang hiển thị" });
    }

    const [existingReports] = await connection.query(
      `SELECT id
       FROM property_status_history
       WHERE property_id = ?
         AND actor_id = ?
         AND note LIKE 'Người dùng báo cáo tin:%'
       LIMIT 1`,
      [propertyId, req.user.id],
    );
    if (existingReports.length > 0) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Bạn đã báo cáo tin này rồi. Admin sẽ xem xét báo cáo đã gửi." });
    }

    await addStatusHistory(
      propertyId,
      property.status,
      property.status,
      req.user.id,
      `Người dùng báo cáo tin: ${REPORT_REASONS[reason]}. ${message}`,
      connection,
    );

    await connection.commit();
    return res.status(201).json({
      message:
        "Đã ghi nhận báo cáo. Admin sẽ xem xét trong lịch sử kiểm tra tin.",
    });
  } catch (err) {
    if (connection) await connection.rollback();
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    if (connection) connection.release();
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
      "UPDATE properties SET status = 'hidden', hidden_at = NOW(), featured_until = NULL WHERE id = ?",
      [req.params.id],
    );
    await pool.query(
      "UPDATE featured_orders SET status = 'cancelled' WHERE property_id = ? AND status = 'pending'",
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

    const [[{ contact_count }]] = await pool.query(
      "SELECT COUNT(*) AS contact_count FROM contacts WHERE property_id = ?",
      [req.params.id],
    );
    if (Number(contact_count || 0) === 0) {
      return res.status(400).json({
        message:
          "Chỉ có thể đánh dấu đã giao dịch khi tin đã có ít nhất một liên hệ từ người mua",
      });
    }

    await pool.query(
      "UPDATE properties SET status = 'sold', sold_at = NOW(), featured_until = NULL WHERE id = ?",
      [req.params.id],
    );
    await pool.query(
      "UPDATE featured_orders SET status = 'cancelled' WHERE property_id = ? AND status = 'pending'",
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
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT owner_id, status FROM properties WHERE id = ? FOR UPDATE",
      [req.params.id],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Không tìm thấy" });
    }
    if (rows[0].owner_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ message: "Không có quyền" });
    }
    if (rows[0].status !== "hidden") {
      await connection.rollback();
      return res.status(409).json({
        message: "Chỉ có thể gửi duyệt lại tin đang bị ẩn",
      });
    }

    const [updateResult] = await connection.query(
      "UPDATE properties SET status = 'pending', reject_reason = NULL, hidden_at = NULL WHERE id = ? AND status = 'hidden'",
      [req.params.id],
    );
    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return res.status(409).json({
        message: "Trạng thái tin đã thay đổi, vui lòng tải lại trang",
      });
    }
    await addStatusHistory(
      req.params.id,
      rows[0].status,
      "pending",
      req.user.id,
      "Owner gửi lại tin để chờ duyệt",
      connection,
    );
    await connection.commit();
    return res.json({ message: "Đã gửi lại tin để chờ duyệt" });
  } catch (err) {
    if (connection) await connection.rollback();
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

function getUploadedImagePublicId(file) {
  if (file?.filename) return file.filename;
  if (!file?.path) return null;
  try {
    const filename = new URL(file.path).pathname.split("/").pop();
    if (!filename) return null;
    return `bds-platform/${filename.replace(/\.[^.]+$/, "")}`;
  } catch {
    return null;
  }
}

async function cleanupUploadedImages(files) {
  const publicIds = (files || [])
    .map(getUploadedImagePublicId)
    .filter(Boolean);
  await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)),
  );
}

async function authorizePropertyImageUpload(req, res, next) {
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Chỉ owner mới được tải ảnh" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT p.owner_id, p.status, COUNT(pi.id) AS image_count
       FROM properties p
       LEFT JOIN property_images pi ON pi.property_id = p.id
       WHERE p.id = ?
       GROUP BY p.id, p.owner_id, p.status`,
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tin đăng" });
    }
    if (rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền" });
    }
    if (rows[0].status === "sold") {
      return res.status(400).json({ message: "Không thể thêm ảnh cho tin đã giao dịch" });
    }
    if (Number(rows[0].image_count) >= MAX_IMAGES_PER_PROPERTY) {
      return res.status(400).json({
        message: `Mỗi tin chỉ được có tối đa ${MAX_IMAGES_PER_PROPERTY} ảnh`,
      });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ message: "Lỗi kiểm tra quyền tải ảnh" });
  }
}

const receivePropertyImages = upload.array("images", MAX_IMAGES_PER_UPLOAD);
function handlePropertyImageUpload(req, res, next) {
  receivePropertyImages(req, res, async (err) => {
    if (!err) return next();

    await cleanupUploadedImages(req.files);
    const isTooLarge = err.code === "LIMIT_FILE_SIZE";
    const messages = {
      LIMIT_FILE_SIZE: "Mỗi ảnh không được vượt quá 5 MB",
      LIMIT_FILE_COUNT: `Mỗi lần chỉ được tải tối đa ${MAX_IMAGES_PER_UPLOAD} ảnh`,
      LIMIT_UNEXPECTED_FILE: "Trường tải ảnh không hợp lệ",
      INVALID_IMAGE_TYPE: "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP",
    };
    return res.status(isTooLarge ? 413 : 400).json({
      message: messages[err.code] || "File ảnh không hợp lệ",
    });
  });
}

// Kiểm tra quyền và quota trước khi middleware gửi file lên Cloudinary.
router.post(
  "/:id/images",
  authMiddleware,
  authorizePropertyImageUpload,
  handlePropertyImageUpload,
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Không có file nào được upload" });
    }

    let connection;
    let committed = false;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [rows] = await connection.query(
        "SELECT owner_id, status FROM properties WHERE id = ? FOR UPDATE",
        [req.params.id],
      );
      if (rows.length === 0) {
        await connection.rollback();
        await cleanupUploadedImages(req.files);
        return res.status(404).json({ message: "Không tìm thấy tin đăng" });
      }
      if (rows[0].owner_id !== req.user.id) {
        await connection.rollback();
        await cleanupUploadedImages(req.files);
        return res.status(403).json({ message: "Không có quyền" });
      }
      if (rows[0].status === "sold") {
        await connection.rollback();
        await cleanupUploadedImages(req.files);
        return res
          .status(400)
          .json({ message: "Không thể thêm ảnh cho tin đã giao dịch" });
      }

      const [[imageStats]] = await connection.query(
        "SELECT COUNT(*) AS image_count, COALESCE(MAX(`order`), 0) AS max_order FROM property_images WHERE property_id = ?",
        [req.params.id],
      );
      const imageCount = Number(imageStats.image_count || 0);
      if (imageCount + req.files.length > MAX_IMAGES_PER_PROPERTY) {
        await connection.rollback();
        await cleanupUploadedImages(req.files);
        return res.status(400).json({
          message: `Mỗi tin chỉ được có tối đa ${MAX_IMAGES_PER_PROPERTY} ảnh`,
        });
      }

      const firstOrder = Number(imageStats.max_order || 0) + 1;
      const images = req.files.map((file, index) => ({
        url: file.path,
        order: firstOrder + index,
      }));
      for (const image of images) {
        await connection.query(
          "INSERT INTO property_images (property_id, url, `order`) VALUES (?, ?, ?)",
          [req.params.id, image.url, image.order],
        );
      }

      const requiresModeration = rows[0].status === "approved";
      if (requiresModeration) {
        const [statusResult] = await connection.query(
          `UPDATE properties
           SET status = 'pending', approved_at = NULL, reject_reason = NULL
           WHERE id = ? AND status = 'approved'`,
          [req.params.id],
        );
        if (statusResult.affectedRows !== 1) {
          throw new Error("Property status changed during image upload");
        }
        await connection.query(
          "UPDATE featured_orders SET status = 'cancelled' WHERE property_id = ? AND status = 'pending'",
          [req.params.id],
        );
        await addStatusHistory(
          req.params.id,
          "approved",
          "pending",
          req.user.id,
          "Owner thêm ảnh và gửi duyệt lại",
          connection,
        );
      }

      await connection.commit();
      committed = true;
      return res.json({
        message: requiresModeration
          ? "Upload thành công. Tin đã chuyển về chờ duyệt."
          : "Upload thành công",
        count: images.length,
        images,
        requires_moderation: requiresModeration,
      });
    } catch (err) {
      if (connection && !committed) await connection.rollback();
      if (!committed) await cleanupUploadedImages(req.files);
      console.error("Upload error:", err.message);
      return res.status(500).json({ message: "Lỗi upload" });
    } finally {
      if (connection) connection.release();
    }
  },
);

module.exports = router;
