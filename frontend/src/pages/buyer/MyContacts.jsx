import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

function formatPrice(price) {
  if (!price) return "—";
  if (price >= 1000000000) return (price / 1000000000).toFixed(1) + " Tỷ";
  if (price >= 1000000) return (price / 1000000).toFixed(0) + " Triệu";
  return price.toLocaleString() + " đ";
}

function StatusBadge({ status }) {
  if (status === "replied") {
    return (
      <span
        className="badge"
        style={{
          background: "rgba(0,165,80,0.1)",
          color: "#00A550",
          fontSize: 11,
          fontWeight: 700,
        }}>
        ✓ ĐÃ PHẢN HỒI
      </span>
    );
  }
  return (
    <span
      className="badge"
      style={{
        background: "#ffdad6",
        color: "#93000a",
        fontSize: 11,
        fontWeight: 700,
      }}>
      ⏱ ĐANG CHỜ
    </span>
  );
}

function ContactCard({ contact }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card mb-3 border"
      style={{ borderRadius: 12, overflow: "hidden" }}>
      <div className="row g-0">
        {/* Ảnh */}
        <div
          className="col-md-2"
          style={{ minHeight: 130, background: "#eee" }}>
          {contact.thumbnail ? (
            <img
              src={contact.thumbnail}
              alt={contact.property_title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                minHeight: 130,
              }}
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center h-100"
              style={{ fontSize: 36, minHeight: 130 }}>
              🏠
            </div>
          )}
        </div>

        {/* Nội dung */}
        <div className="col-md-10">
          <div className="card-body p-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <Link
                  to={`/property/${contact.property_id}`}
                  className="fw-semibold text-decoration-none"
                  style={{ color: "#1a1c1c", fontSize: 14 }}>
                  {contact.property_title}
                </Link>
                <p className="text-muted mb-0 mt-1" style={{ fontSize: 12 }}>
                  📍 {contact.city}
                </p>
              </div>
              <div className="text-end ms-3">
                <div
                  className="fw-bold mb-1"
                  style={{ color: "#b51b17", fontSize: 14 }}>
                  {formatPrice(contact.price)}
                </div>
                <StatusBadge status={contact.status} />
              </div>
            </div>

            {/* Tin nhắn của bạn */}
            <div
              className="rounded p-3 mb-2"
              style={{
                background: "#f3f3f3",
                borderLeft: "3px solid #e4beb9",
              }}>
              <p
                className="text-muted fw-semibold mb-1"
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}>
                Tin nhắn của bạn:
              </p>
              <p className="mb-0" style={{ fontSize: 13, color: "#1a1c1c" }}>
                "
                {expanded || (contact.message?.length || 0) <= 100
                  ? contact.message
                  : contact.message?.slice(0, 100) + "..."}
                "
              </p>
              {(contact.message?.length || 0) > 100 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="btn btn-link btn-sm p-0 mt-1"
                  style={{ color: "#b51b17", fontSize: 12 }}>
                  {expanded ? "Thu gọn" : "Xem thêm"}
                </button>
              )}
            </div>

            {/* Phản hồi chủ nhà */}
            {contact.owner_reply ? (
              <div
                className="rounded p-3 mb-3"
                style={{
                  background: "rgba(0,100,128,0.05)",
                  borderLeft: "3px solid #006480",
                }}>
                <p
                  className="fw-bold mb-1"
                  style={{
                    fontSize: 10,
                    color: "#006480",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}>
                  Phản hồi từ chủ nhà:
                </p>
                <p className="mb-0" style={{ fontSize: 13, color: "#1a1c1c" }}>
                  "{contact.owner_reply}"
                </p>
              </div>
            ) : (
              <div
                className="rounded p-3 mb-3 d-flex align-items-center gap-2"
                style={{
                  background: "rgba(186,26,26,0.04)",
                  borderLeft: "3px solid #ffdad6",
                }}>
                <span style={{ color: "#93000a" }}>⏱</span>
                <p className="mb-0" style={{ fontSize: 12, color: "#93000a" }}>
                  Đang chờ chủ nhà phản hồi...
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="d-flex justify-content-between align-items-center pt-2 border-top">
              <span className="text-muted" style={{ fontSize: 12 }}>
                Ngày gửi:{" "}
                {new Date(contact.created_at).toLocaleDateString("vi-VN")}
              </span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: 12 }}>
                  Xóa
                </button>
                <Link
                  to={`/property/${contact.property_id}`}
                  className="btn btn-sm text-white"
                  style={{ background: "#b51b17", fontSize: 12 }}>
                  Xem chi tiết
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await api.get("/api/contact/buyer");
        setContacts(Array.isArray(res.data) ? res.data : res.data.data || []);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const tabs = [
    { key: "all", label: "Tất cả", count: contacts.length },
    {
      key: "pending",
      label: "Đang chờ",
      count: contacts.filter((c) => c.status === "pending").length,
    },
    {
      key: "replied",
      label: "Đã phản hồi",
      count: contacts.filter((c) => c.status === "replied").length,
    },
  ];

  const filtered =
    activeTab === "all"
      ? contacts
      : contacts.filter((c) => c.status === activeTab);

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      <Navbar />

      <div className="container py-4" style={{ maxWidth: 1200 }}>
        <div className="row g-4">
          {/* Sidebar */}
          <div className="col-md-3">
            <div
              className="card border p-3"
              style={{ borderRadius: 12, position: "sticky", top: 70 }}>
              <div className="pb-3 mb-3 border-bottom">
                <p
                  className="text-muted fw-semibold mb-1"
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}>
                  Quản lý cá nhân
                </p>
                <p className="mb-0" style={{ fontSize: 13, color: "#5b403c" }}>
                  Người mua/Chủ sở hữu
                </p>
              </div>
              <nav className="d-flex flex-column gap-1">
                {[
                  { to: "/", icon: "≡", label: "Tổng quan" },
                  { to: "/saved", icon: "♥", label: "Tin đã lưu" },
                  {
                    to: "/my-contacts",
                    icon: "✉",
                    label: "Yêu cầu liên hệ",
                    active: true,
                  },
                  { to: "/appointments", icon: "📅", label: "Lịch hẹn" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="d-flex align-items-center gap-2 px-3 py-2 rounded text-decoration-none fw-medium"
                    style={{
                      fontSize: 13,
                      background: item.active ? "#b51b17" : "transparent",
                      color: item.active ? "white" : "#5b403c",
                    }}>
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Main */}
          <div className="col-md-9">
            <h4 className="fw-bold mb-1" style={{ color: "#1a1c1c" }}>
              Yêu cầu liên hệ
            </h4>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>
              Theo dõi và quản lý các yêu cầu tư vấn bất động sản của bạn.
            </p>

            {/* Tabs */}
            <div
              className="card border mb-4"
              style={{ borderRadius: 12, overflow: "hidden" }}>
              <div className="d-flex border-bottom">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="btn btn-link text-decoration-none px-4 py-3 d-flex align-items-center gap-2"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: activeTab === tab.key ? "#b51b17" : "#757575",
                      borderBottom:
                        activeTab === tab.key
                          ? "2px solid #b51b17"
                          : "2px solid transparent",
                      borderRadius: 0,
                    }}>
                    {tab.label}
                    <span
                      className="badge"
                      style={{
                        fontSize: 11,
                        background:
                          activeTab === tab.key
                            ? "rgba(181,27,23,0.1)"
                            : "#eee",
                        color: activeTab === tab.key ? "#b51b17" : "#757575",
                      }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Stats strip */}
              {!loading && contacts.length > 0 && (
                <div
                  className="px-4 py-2 d-flex gap-4"
                  style={{ background: "#f9f9f9" }}>
                  <span style={{ fontSize: 12, color: "#757575" }}>
                    <strong style={{ color: "#1a1c1c" }}>
                      {contacts.filter((c) => c.status === "pending").length}
                    </strong>{" "}
                    đang chờ phản hồi
                  </span>
                  <span style={{ fontSize: 12, color: "#757575" }}>
                    <strong style={{ color: "#1a1c1c" }}>
                      {contacts.filter((c) => c.status === "replied").length}
                    </strong>{" "}
                    đã nhận phản hồi
                  </span>
                </div>
              )}
            </div>

            {/* Danh sách */}
            {loading ? (
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-danger" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3" style={{ fontSize: 48 }}>
                  ✉️
                </div>
                <h5 className="fw-bold mb-2">
                  {activeTab !== "all"
                    ? "Không có yêu cầu nào trong mục này"
                    : "Bạn chưa có yêu cầu nào"}
                </h5>
                <p className="text-muted mb-4" style={{ fontSize: 13 }}>
                  Hãy tìm kiếm bất động sản ưng ý và gửi yêu cầu tư vấn cho chủ
                  sở hữu.
                </p>
                <Link
                  to="/"
                  className="btn text-white px-4"
                  style={{ background: "#b51b17", borderRadius: 10 }}>
                  Khám phá ngay
                </Link>
              </div>
            ) : (
              filtered.map((c) => <ContactCard key={c.id} contact={c} />)
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-top bg-white py-4 mt-5">
        <div
          className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3"
          style={{ maxWidth: 1200 }}>
          <div>
            <span className="fw-bold" style={{ color: "#b51b17" }}>
              Batdongsan Pro
            </span>
            <p className="text-muted mb-0 mt-1" style={{ fontSize: 11 }}>
              © 2024 Batdongsan Pro. All rights reserved.
            </p>
          </div>
          <div className="d-flex gap-4">
            {[
              "Về chúng tôi",
              "Điều khoản",
              "Chính sách bảo mật",
              "Liên hệ",
            ].map((t) => (
              <a
                key={t}
                href="#"
                className="text-muted text-decoration-underline"
                style={{ fontSize: 12 }}>
                {t}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
