// ─── CONFIG ────────────────────────────────────────────────
export const API = "http://localhost:3000";

// ─── DESIGN TOKENS ─────────────────────────────────────────
export const C = {
  primary: "#b51b17",
  onPrimary: "#ffffff",
  surface: "#f9f9f9",
  surfaceContainer: "#eeeeee",
  surfaceContainerLow: "#f3f3f3",
  surfaceContainerHigh: "#e8e8e8",
  surfaceContainerLowest: "#ffffff",
  onSurface: "#1a1c1c",
  secondary: "#5f5e5e",
  onSecondaryFixed: "#1b1c1c",
  onSecondaryFixedVariant: "#474747",
  borderSubtle: "#E8E8E8",
  textMuted: "#757575",
  statusSuccess: "#00A550",
  statusInfo: "#007AFF",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  amber: "#b45309",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
  tertiaryFixed: "#bce9ff",
  onTertiaryFixedVariant: "#004d64",
};

export const font = {
  headline: "'Manrope', sans-serif",
  body: "'Inter', sans-serif",
};

// ─── HELPERS ───────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem("token");
}

export async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

export function formatPrice(p) {
  if (!p) return "—";
  if (p >= 1e9) return (p / 1e9).toFixed(1).replace(".0", "") + " Tỷ";
  if (p >= 1e6) return (p / 1e6).toFixed(0) + " Tr";
  return p.toLocaleString("vi-VN") + " đ";
}

export function timeAgo(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(d).toLocaleDateString("vi-VN");
}

// ─── STYLE HELPERS ──────────────────────────────────────────
export const tdStyle = {
  padding: "12px 16px",
  fontSize: 13,
  verticalAlign: "middle",
};

export const selectStyle = {
  padding: "7px 10px",
  border: `1px solid ${C.borderSubtle}`,
  borderRadius: 8,
  fontSize: 13,
  color: C.onSurface,
  background: C.surfaceContainerLowest,
  outline: "none",
  cursor: "pointer",
};

export function paginationBtn(active, disabled) {
  return {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: `1px solid ${active ? C.primary : C.borderSubtle}`,
    background: active ? C.primary : C.surfaceContainerLowest,
    color: active ? "#fff" : disabled ? C.textMuted : C.onSurface,
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontFamily: font.body,
  };
}
