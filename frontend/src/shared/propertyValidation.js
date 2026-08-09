const VALID_TYPES = new Set(["apartment", "house", "land", "office"]);
const VALID_TRANSACTIONS = new Set(["sale", "rent"]);
const VALID_DIRECTIONS = new Set([
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
]);
const VALID_LEGAL_STATUSES = new Set(["sohong", "sokhongdo", "dangchoso", "other"]);
const ROOM_REQUIRED_TYPES = new Set(["apartment", "house"]);

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ");
const isBlank = (value) => normalizeText(value).length === 0;
const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
};
const toInteger = (value) => {
  const number = toNumber(value);
  if (number === null) return null;
  return Number.isInteger(number) ? number : NaN;
};

export function buildPropertyPayload(form) {
  return {
    title: normalizeText(form.title),
    description: normalizeText(form.description),
    type: form.type || "",
    transaction_type: form.transaction_type || "",
    price: toNumber(form.price),
    area: toNumber(form.area),
    address: normalizeText(form.address),
    city: normalizeText(form.city),
    district: normalizeText(form.district),
    ward: normalizeText(form.ward),
    bedrooms: toInteger(form.bedrooms),
    bathrooms: toInteger(form.bathrooms),
    direction: form.direction || "",
    legal_status: form.legal_status || "",
    latitude: toNumber(form.latitude),
    longitude: toNumber(form.longitude),
  };
}

export function validatePropertyForm(form, options = {}) {
  const step = options.step || null;
  const values = buildPropertyPayload(form);
  const checkAll = step === null || step === undefined;
  const shouldValidateDescription = checkAll || options.includeDescription;

  if (checkAll || step === 1) {
    if (values.title.length < 10)
      return { ok: false, message: "Tiêu đề phải có ít nhất 10 ký tự." };
    if (values.title.length > 180)
      return { ok: false, message: "Tiêu đề không được vượt quá 180 ký tự." };
    if (shouldValidateDescription && values.description.length < 30)
      return { ok: false, message: "Mô tả phải có ít nhất 30 ký tự." };
    if (shouldValidateDescription && values.description.length > 3000)
      return { ok: false, message: "Mô tả không được vượt quá 3000 ký tự." };
    if (!VALID_TYPES.has(values.type))
      return { ok: false, message: "Vui lòng chọn loại hình bất động sản hợp lệ." };
    if (!VALID_TRANSACTIONS.has(values.transaction_type))
      return { ok: false, message: "Vui lòng chọn loại giao dịch hợp lệ." };
    if (!Number.isFinite(values.price) || values.price <= 0)
      return { ok: false, message: "Giá phải là số hợp lệ và lớn hơn 0." };
    if (values.transaction_type === "sale" && values.price < 100000000)
      return { ok: false, message: "Giá bán phải từ 100 triệu đồng trở lên." };
    if (values.transaction_type === "rent" && values.price < 500000)
      return { ok: false, message: "Giá thuê phải từ 500 nghìn đồng/tháng trở lên." };
    if (values.price > 10000000000000)
      return { ok: false, message: "Giá nhập quá lớn, vui lòng kiểm tra lại." };
    if (!Number.isFinite(values.area) || values.area < 5)
      return { ok: false, message: "Diện tích phải từ 5 m² trở lên." };
    if (values.area > 100000)
      return { ok: false, message: "Diện tích nhập quá lớn, vui lòng kiểm tra lại." };
  }

  if (checkAll || step === 2) {
    if (values.address.length < 5)
      return { ok: false, message: "Địa chỉ phải có ít nhất 5 ký tự." };
    if (isBlank(values.city))
      return { ok: false, message: "Vui lòng chọn tỉnh/thành phố." };
    if (isBlank(values.district))
      return { ok: false, message: "Vui lòng chọn quận/huyện." };
    const hasLat = values.latitude !== null;
    const hasLng = values.longitude !== null;
    if (hasLat !== hasLng)
      return { ok: false, message: "Vui lòng nhập đủ cả vĩ độ và kinh độ." };
    if (
      hasLat &&
      (!Number.isFinite(values.latitude) ||
        !Number.isFinite(values.longitude) ||
        values.latitude < 8 ||
        values.latitude > 24 ||
        values.longitude < 102 ||
        values.longitude > 110)
    ) {
      return {
        ok: false,
        message: "Tọa độ không hợp lệ. Vĩ độ/kinh độ cần nằm trong phạm vi Việt Nam.",
      };
    }
  }

  if (checkAll || step === 3) {
    if (values.direction && !VALID_DIRECTIONS.has(values.direction))
      return { ok: false, message: "Hướng nhà không hợp lệ." };
    if (values.legal_status && !VALID_LEGAL_STATUSES.has(values.legal_status))
      return { ok: false, message: "Pháp lý không hợp lệ." };
    for (const [key, label] of [
      ["bedrooms", "Số phòng ngủ"],
      ["bathrooms", "Số phòng tắm"],
    ]) {
      const value = values[key];
      if (value !== null && (!Number.isInteger(value) || value < 0 || value > 50)) {
        return { ok: false, message: `${label} phải là số nguyên từ 0 đến 50.` };
      }
    }
    if (ROOM_REQUIRED_TYPES.has(values.type)) {
      if (!values.bedrooms || values.bedrooms < 1)
        return { ok: false, message: "Căn hộ/nhà ở cần có ít nhất 1 phòng ngủ." };
      if (!values.bathrooms || values.bathrooms < 1)
        return { ok: false, message: "Căn hộ/nhà ở cần có ít nhất 1 phòng tắm." };
    }
  }

  return { ok: true, values };
}
