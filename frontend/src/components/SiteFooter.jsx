import { Link } from "react-router-dom";

const COLUMNS = [
  {
    title: "KHÁM PHÁ",
    links: ["Mua bán nhà đất", "Cho thuê căn hộ", "Dự án mới"],
  },
  {
    title: "HỖ TRỢ",
    links: ["Về chúng tôi", "Liên hệ quảng cáo", "Hướng dẫn đăng tin"],
  },
  {
    title: "PHÁP LÝ",
    links: ["Chính sách bảo mật", "Điều khoản sử dụng"],
  },
];

export default function SiteFooter() {
  return (
    <footer style={{ background: "#e2e2e2", borderTop: "1px solid #E8E8E8" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }}>
          <div>
            <Link to="/" style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 18, color: "#b51b17", textDecoration: "none", display: "block", marginBottom: 16 }}>
              Bất Động Sản
            </Link>
            <p style={{ color: "#656464", fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
              Hệ thống kết nối bất động sản hàng đầu Việt Nam, cung cấp thông tin chính xác, minh bạch và nhanh chóng cho người dùng.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 style={{ fontSize: 12, fontWeight: 600, color: "#1a1c1c", marginBottom: 20, letterSpacing: "0.08em" }}>
                {column.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {column.links.map((label) => (
                  <li key={label}>
                    <a href="#" style={{ color: "#656464", fontSize: 14, textDecoration: "none" }}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 24, borderTop: "1px solid #E8E8E8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "#656464", fontSize: 13, margin: 0 }}>
            © 2026 Nền tảng Bất Động Sản LVTN. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>
    </footer>
  );
}
