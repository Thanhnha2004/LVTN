export const PROPERTY_TYPES = [
  { value: "apartment", label: "Căn hộ chung cư" },
  { value: "house", label: "Nhà phố / Biệt thự" },
  { value: "land", label: "Đất nền" },
  { value: "office", label: "Văn phòng" },
];

export const DIRECTIONS = [
  { value: "north", label: "Bắc" },
  { value: "south", label: "Nam" },
  { value: "east", label: "Đông" },
  { value: "west", label: "Tây" },
  { value: "northeast", label: "Đông Bắc" },
  { value: "northwest", label: "Tây Bắc" },
  { value: "southeast", label: "Đông Nam" },
  { value: "southwest", label: "Tây Nam" },
];

export const LEGAL_OPTIONS = [
  { value: "sohong", label: "Sổ hồng" },
  { value: "sokhongdo", label: "Sổ đỏ" },
  { value: "dangchoso", label: "Đang chờ sổ" },
  { value: "other", label: "Khác" },
];

export const TYPE_LABEL = Object.fromEntries(
  PROPERTY_TYPES.map(({ value, label }) => [value, label]),
);
export const DIRECTION_LABEL = Object.fromEntries(
  DIRECTIONS.map(({ value, label }) => [value, label]),
);
export const LEGAL_LABEL = Object.fromEntries(
  LEGAL_OPTIONS.map(({ value, label }) => [value, label]),
);

export function formatInputPrice(value) {
  const number = Number.parseFloat(value);
  if (!number || Number.isNaN(number)) return "";
  if (number >= 1_000_000_000)
    return `${(number / 1_000_000_000).toFixed(2)} tỷ`;
  if (number >= 1_000_000)
    return `${(number / 1_000_000).toFixed(0)} triệu`;
  return `${number.toLocaleString("vi-VN")} đ`;
}

export function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number >= 1_000_000_000)
    return `${(number / 1_000_000_000).toFixed(1).replace(".0", "")} tỷ`;
  if (number >= 1_000_000)
    return `${(number / 1_000_000).toFixed(0)} triệu`;
  return `${number.toLocaleString("vi-VN")} đ`;
}

export function timeAgo(dateValue) {
  const diff = (Date.now() - new Date(dateValue).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(0, Math.floor(diff / 60))} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateValue).toLocaleDateString("vi-VN");
}
