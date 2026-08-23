import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import SiteFooter from "../../components/SiteFooter";
import UiIcon from "../../components/UiIcon";

const VN = { fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif" };

const POLICY_GROUPS = [
  {
    title: "Thông tin bắt buộc",
    icon: "clipboard",
    items: [
      "Tiêu đề phải mô tả đúng bất động sản, từ 10 đến 180 ký tự.",
      "Mô tả phải có tối thiểu 30 ký tự, nêu rõ vị trí, diện tích, tình trạng và điểm nổi bật.",
      "Phải chọn đúng loại hình, hình thức giao dịch, pháp lý và số phòng nếu có.",
      "Địa chỉ cần đủ tỉnh/thành phố, quận/huyện, phường/xã và địa chỉ chi tiết.",
    ],
  },
  {
    title: "Giá, diện tích và vị trí",
    icon: "location",
    items: [
      "Tin bán phải có giá tối thiểu 100 triệu đồng, tin cho thuê tối thiểu 500 nghìn đồng.",
      "Diện tích phải hợp lý, tối thiểu 5m² và không vượt quá 100.000m².",
      "Tọa độ bản đồ phải nằm trong phạm vi Việt Nam để người mua xem được vị trí chính xác.",
      "Giá, diện tích và địa chỉ không được mâu thuẫn với nội dung mô tả.",
    ],
  },
  {
    title: "Hình ảnh và nội dung",
    icon: "image",
    items: [
      "Tin phải có ít nhất một hình ảnh rõ ràng của bất động sản hoặc khu vực liên quan.",
      "Không dùng ảnh mờ, ảnh không liên quan, ảnh quảng cáo hoặc ảnh vi phạm bản quyền.",
      "Không chèn số điện thoại, email, đường dẫn ngoài hoặc nội dung lôi kéo trong phần mô tả.",
      "Không đăng nội dung sai sự thật, trùng lặp, gây hiểu nhầm hoặc vi phạm pháp luật.",
    ],
  },
  {
    title: "Nguyên tắc kiểm duyệt",
    icon: "shield",
    items: [
      "Admin kiểm tra tính đầy đủ, tính hợp lý và mức độ minh bạch trước khi duyệt.",
      "Tin đạt yêu cầu được chuyển sang trạng thái đang hiển thị và xuất hiện ở trang tìm kiếm.",
      "Tin chưa đạt yêu cầu sẽ bị từ chối kèm lý do để owner chỉnh sửa và gửi duyệt lại.",
      "Tin đã duyệt vẫn có thể bị ẩn nếu phát hiện thông tin không đúng hoặc có phản ánh vi phạm.",
    ],
  },
  {
    title: "Nghiệp vụ nâng cao",
    icon: "chart",
    items: [
      "Tin có giá/m² lệch mạnh so với nhóm tin tương đồng sẽ được admin kiểm tra kỹ trước khi duyệt.",
      "Owner có nhiều tin bị xử lý sẽ bị giảm hạn mức tin chờ duyệt và bị hạn chế mua gói nổi bật.",
      "Tin nổi bật được ưu tiên hiển thị nhưng hệ thống phân bổ theo owner để tránh một người chiếm toàn bộ vị trí đầu.",
      "Nếu owner sửa tin đang nổi bật, thời gian chờ admin duyệt lại được bù vào hạn nổi bật khi tin được duyệt lại.",
    ],
  },
];

export default function PostingPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8", ...VN }}>
      <Navbar />
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 32px 48px" }}>
        <nav style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 18 }}>
          <Link to="/" style={{ color: "#757575", textDecoration: "none" }}>
            Trang chủ
          </Link>
          <span style={{ color: "#aaa" }}>›</span>
          <span style={{ color: "#1a1c1c" }}>Chính sách đăng tin</span>
        </nav>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 12,
            padding: 28,
            marginBottom: 18,
          }}>
          <div style={{ maxWidth: 760 }}>
            <h1
              style={{
                fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                fontSize: 30,
                fontWeight: 850,
                color: "#1a1c1c",
                margin: "0 0 10px",
              }}>
              Chính sách đăng tin và kiểm duyệt
            </h1>
            <p style={{ color: "#5f5e5e", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
              Quy định này giúp tin đăng minh bạch hơn, giảm tin rác và hỗ trợ
              admin có cơ sở rõ ràng khi duyệt hoặc từ chối bất động sản.
            </p>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
            marginBottom: 18,
          }}>
          {POLICY_GROUPS.map((group) => (
            <article
              key={group.title}
              style={{
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 12,
                padding: 22,
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "#fff0ef",
                    color: "#b51b17",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <UiIcon name={group.icon} size={18} />
                </div>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "#1a1c1c",
                    margin: 0,
                  }}>
                  {group.title}
                </h2>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#5f5e5e", lineHeight: 1.75 }}>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
