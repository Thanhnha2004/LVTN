import { Link } from "react-router-dom";

const COLUMNS = [
  {
    title: "KHÁM PHÁ",
    links: [
      { label: "Mua bán nhà đất", to: "/search?transaction_type=sale" },
      { label: "Cho thuê căn hộ", to: "/search?transaction_type=rent&type=apartment" },
      { label: "Tin nổi bật", to: "/search?featured_only=1" },
    ],
  },
  {
    title: "HỖ TRỢ",
    links: [
      { label: "Hướng dẫn đăng tin", to: "/posting-policy" },
      { label: "Chính sách đăng tin", to: "/posting-policy" },
    ],
  },
  {
    title: "PHÁP LÝ",
    links: [
      { label: "Quy định kiểm duyệt", to: "/posting-policy" },
      { label: "Điều khoản sử dụng", to: "/posting-policy" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer style={{ background: "#e2e2e2", borderTop: "1px solid #E8E8E8" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 40px 32px",
        }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 40,
            marginBottom: 40,
          }}>
          <div>
            <Link
              to="/"
              style={{
                fontFamily: "'Be Vietnam Pro'",
                fontWeight: 700,
                fontSize: 18,
                color: "#b51b17",
                textDecoration: "none",
                display: "block",
                marginBottom: 16,
              }}>
              Bất Động Sản LVTN
            </Link>
            <p
              style={{
                color: "#656464",
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 300,
              }}>
              Nền tảng kết nối người mua và người bán bất động sản với quy trình
              đăng tin, kiểm duyệt, liên hệ và theo dõi hiệu quả minh bạch.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  marginBottom: 20,
                  letterSpacing: "0.08em",
                }}>
                {column.title}
              </h4>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      style={{
                        color: "#656464",
                        fontSize: 14,
                        textDecoration: "none",
                      }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid #E8E8E8",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          <p style={{ color: "#656464", fontSize: 13, margin: 0 }}>
            © 2026 Nền tảng Bất Động Sản LVTN.
          </p>
        </div>
      </div>
    </footer>
  );
}
