import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const VN = { fontFamily: "'Be Vietnam Pro', Inter, sans-serif" };

const LEAD_STATUS = [
  { value: "new", label: "Mới" },
  { value: "contacted", label: "Đã liên hệ" },
  { value: "scheduled", label: "Đã hẹn xem" },
  { value: "closed", label: "Đã chốt" },
  { value: "cancelled", label: "Đã hủy" },
];

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const SIDEBAR = [
  { to: "/owner/dashboard", icon: "📋", label: "Tin đã đăng" },
  { to: "/owner/contacts", icon: "💬", label: "Liên hệ", active: true },
  { to: "/profile", icon: "👤", label: "Thông tin cá nhân" },
];

// ── Reply Box ──────────────────────────────────────────────
function ReplyBox({ contactId, onSent, onCancel }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      await api.patch(`/api/contact/${contactId}/reply`, { owner_reply: text });
      onSent(contactId, text);
    } catch (err) {
      setError(err.response?.data?.message || "Gửi thất bại, thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: "0.5px solid #E8E8E8",
      }}>
      {error && (
        <div
          style={{
            fontSize: 12,
            color: "#a32d2d",
            marginBottom: 8,
            padding: "6px 12px",
            background: "#fcebeb",
            borderRadius: 6,
          }}>
          {error}
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Nhập nội dung phản hồi của bạn..."
        rows={4}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 10,
          border: "0.5px solid #E8E8E8",
          fontSize: 14,
          resize: "none",
          outline: "none",
          background: "#fff",
          color: "#1a1c1c",
          boxSizing: "border-box",
          ...VN,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#b51b17")}
        onBlur={(e) => (e.target.style.borderColor = "#E8E8E8")}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 10,
        }}>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 16px",
            border: "0.5px solid #E8E8E8",
            borderRadius: 8,
            background: "#fff",
            fontSize: 13,
            color: "#5f5e5e",
            cursor: "pointer",
            ...VN,
          }}>
          Hủy
        </button>
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          style={{
            padding: "7px 20px",
            border: "none",
            borderRadius: 8,
            background: sending || !text.trim() ? "#ccc" : "#b51b17",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: sending || !text.trim() ? "not-allowed" : "pointer",
            ...VN,
          }}>
          {sending ? "Đang gửi..." : "Gửi phản hồi"}
        </button>
      </div>
    </div>
  );
}

// ── Contact Card ───────────────────────────────────────────
function ContactCard({ contact, onReplied, onLeadUpdated }) {
  const [open, setOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState(contact.lead_status || "new");
  const [ownerNote, setOwnerNote] = useState(contact.owner_note || "");
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadError, setLeadError] = useState("");
  const isPending = contact.status === "pending";

  const bgColor = isPending ? "#ffdad5" : "#e4e2e1";
  const textColor = isPending ? "#410001" : "#5f5e5e";

  const saveLead = async () => {
    setLeadSaving(true);
    setLeadError("");
    try {
      await api.patch(`/api/contact/${contact.id}/lead`, {
        lead_status: leadStatus,
        owner_note: ownerNote,
      });
      onLeadUpdated(contact.id, leadStatus, ownerNote);
    } catch (err) {
      setLeadError(err.response?.data?.message || "Không thể cập nhật lead.");
    } finally {
      setLeadSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #E8E8E8",
        borderRadius: 12,
        padding: "20px 24px 20px 28px",
        display: "flex",
        gap: 18,
        position: "relative",
        transition: "box-shadow .15s",
        boxShadow: isPending ? "0 1px 6px rgba(181,27,23,.07)" : "none",
      }}
      onMouseEnter={(e) => {
        if (isPending)
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)";
      }}
      onMouseLeave={(e) =>
        (e.currentTarget.style.boxShadow = isPending
          ? "0 1px 6px rgba(181,27,23,.07)"
          : "none")
      }>
      {/* left accent */}
      {isPending && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 4,
            height: "100%",
            background: "#b51b17",
            borderRadius: "12px 0 0 12px",
          }}
        />
      )}

      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          flexShrink: 0,
          background: isPending ? "#ffdad5" : "#e4e2e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 15,
          color: isPending ? "#410001" : "#5f5e5e",
        }}>
        {initials(contact.buyer_name)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 6,
          }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1a1c1c",
              margin: 0,
              ...VN,
            }}>
            {contact.buyer_name}
          </h3>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: 20,
              background: bgColor,
              color: textColor,
              whiteSpace: "nowrap",
            }}>
            {isPending ? "Chưa phản hồi" : "Đã phản hồi"}
          </span>
        </div>

        {/* Property link */}
        <p
          style={{
            fontSize: 14,
            color: "#5b403c",
            margin: "0 0 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}>
          Quan tâm:&nbsp;
          <Link
            to={`/property/${contact.property_id}`}
            style={{
              color: "#b51b17",
              textDecoration: "none",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.target.style.textDecoration = "none")}>
            {contact.property_title || `Tin #${contact.property_id}`}
          </Link>
        </p>

        {/* Message bubble */}
        <div
          style={{
            background: "#f9f9f9",
            borderLeft: "4px solid #E8E8E8",
            borderRadius: "0 8px 8px 0",
            padding: "12px 16px",
            fontSize: 14,
            color: "#5f5e5e",
            fontStyle: "italic",
            marginBottom: 12,
          }}>
          "{contact.message}"
        </div>

        {/* Owner reply (if replied) */}
        {!isPending && contact.owner_reply && (
          <div
            style={{
              background: "#fff0ef",
              border: "0.5px solid #ffb4aa",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 12,
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#b51b17",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}></span>
            </div>
            <p style={{ fontSize: 14, color: "#1a1c1c", margin: 0, ...VN }}>
              {contact.owner_reply}
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr auto",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
          }}>
          <select
            value={leadStatus}
            onChange={(e) => setLeadStatus(e.target.value)}
            style={{
              height: 36,
              border: "0.5px solid #E8E8E8",
              borderRadius: 8,
              padding: "0 10px",
              fontSize: 13,
              background: "#fff",
              color: "#1a1c1c",
              ...VN,
            }}>
            {LEAD_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            value={ownerNote}
            onChange={(e) => setOwnerNote(e.target.value)}
            placeholder="Ghi chú chăm sóc khách hàng..."
            style={{
              height: 36,
              border: "0.5px solid #E8E8E8",
              borderRadius: 8,
              padding: "0 12px",
              fontSize: 13,
              color: "#1a1c1c",
              ...VN,
            }}
          />
          <button
            onClick={saveLead}
            disabled={leadSaving}
            style={{
              height: 36,
              border: "none",
              borderRadius: 8,
              padding: "0 14px",
              background: leadSaving ? "#ccc" : "#1a1c1c",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: leadSaving ? "not-allowed" : "pointer",
              ...VN,
            }}>
            {leadSaving ? "Đang lưu" : "Lưu lead"}
          </button>
        </div>
        {leadError && (
          <div style={{ fontSize: 12, color: "#a32d2d", marginBottom: 10 }}>
            {leadError}
          </div>
        )}

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}>
          <span
            style={{
              fontSize: 12,
              color: "#757575",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}></span>

          {isPending ? (
            <button
              onClick={() => setOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 20px",
                background: "#b51b17",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                ...VN,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = ".88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              ↩ Phản hồi ngay
            </button>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setOpen((o) => !o)}
                style={{
                  fontSize: 13,
                  color: "#b51b17",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  ...VN,
                }}>
                Chỉnh sửa câu trả lời
              </button>
              <button
                style={{
                  fontSize: 13,
                  color: "#757575",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  ...VN,
                }}></button>
            </div>
          )}
        </div>

        {/* Reply box */}
        {open && (
          <ReplyBox
            contactId={contact.id}
            onSent={(id, text) => {
              setOpen(false);
              onReplied(id, text);
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function OwnerContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/contact/owner", {
          params: { limit: 100 },
        });
        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        setContacts(data);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleReplied = (id, text) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "replied",
              owner_reply: text,
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    );
  };

  const handleLeadUpdated = (id, lead_status, owner_note) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, lead_status, owner_note } : c)),
    );
  };

  const total = contacts.length;
  const pending = contacts.filter((c) => c.status === "pending").length;
  const replied = contacts.filter((c) => c.status === "replied").length;
  const scheduled = contacts.filter((c) => c.lead_status === "scheduled").length;
  const closed = contacts.filter((c) => c.lead_status === "closed").length;

  const tabCount = { all: total, pending, replied };

  const filtered = contacts
    .filter((c) => {
      if (activeTab === "pending") return c.status === "pending";
      if (activeTab === "replied") return c.status === "replied";
      if (activeTab === "scheduled") return c.lead_status === "scheduled";
      if (activeTab === "closed") return c.lead_status === "closed";
      return true;
    })
    .filter(
      (c) =>
        search === "" ||
        c.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.property_title?.toLowerCase().includes(search.toLowerCase()) ||
        c.message?.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "newest"
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at),
    );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const TABS = [
    { key: "all", label: `Tất cả (${total})` },
    { key: "pending", label: `Chưa phản hồi (${pending})` },
    { key: "replied", label: `Đã phản hồi (${replied})` },
    { key: "scheduled", label: `Đã hẹn (${scheduled})` },
    { key: "closed", label: `Đã chốt (${closed})` },
  ];

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh", ...VN }}>
      <Navbar />

      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 56px)",
          maxWidth: 1280,
          margin: "0 auto",
        }}>
        {/* ── Main ── */}
        <main style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}>
          {/* Page header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  margin: 0,
                }}>
                Quản lý liên hệ
              </h1>
              <p style={{ fontSize: 13, color: "#757575", margin: "4px 0 0" }}>
                Phản hồi nhanh để tăng cơ hội giao dịch thành công.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    color: "#aaa",
                  }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    paddingLeft: 32,
                    paddingRight: 12,
                    height: 36,
                    border: "0.5px solid #E8E8E8",
                    borderRadius: 8,
                    fontSize: 13,
                    width: 180,
                    outline: "none",
                    background: "#fff",
                    color: "#1a1c1c",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "0.5px solid #E8E8E8",
              marginBottom: 20,
              gap: 0,
            }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                  style={{
                    padding: "10px 18px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#b51b17" : "#5f5e5e",
                    borderBottom: isActive
                      ? "2px solid #b51b17"
                      : "2px solid transparent",
                    whiteSpace: "nowrap",
                  }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div className="spinner-border text-danger" />
            </div>
          ) : paginated.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "#757575",
              }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
              <h5 style={{ fontWeight: 600, color: "#1a1c1c" }}>
                {search ? "Không tìm thấy kết quả" : "Chưa có liên hệ nào"}
              </h5>
              <p style={{ fontSize: 13 }}>
                {search
                  ? "Thử từ khoá khác."
                  : "Khi có khách hàng liên hệ, bạn sẽ thấy ở đây."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {paginated.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  onReplied={handleReplied}
                  onLeadUpdated={handleLeadUpdated}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 28,
                paddingTop: 20,
                borderTop: "0.5px solid #E8E8E8",
              }}>
              <span style={{ fontSize: 13, color: "#757575" }}>
                Hiển thị {(page - 1) * PER_PAGE + 1}–
                {Math.min(page * PER_PAGE, filtered.length)} trong{" "}
                {filtered.length} liên hệ
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{
                    width: 36,
                    height: 36,
                    border: "0.5px solid #E8E8E8",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.4 : 1,
                    fontSize: 16,
                  }}>
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border:
                          "0.5px solid " + (page === n ? "#b51b17" : "#E8E8E8"),
                        background: page === n ? "#b51b17" : "#fff",
                        color: page === n ? "#fff" : "#1a1c1c",
                        fontWeight: page === n ? 600 : 400,
                        fontSize: 13,
                        cursor: "pointer",
                      }}>
                      {n}
                    </button>
                  ),
                )}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{
                    width: 36,
                    height: 36,
                    border: "0.5px solid #E8E8E8",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    opacity: page === totalPages ? 0.4 : 1,
                    fontSize: 16,
                  }}>
                  ›
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── FOOTER ── */}
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
                  fontFamily: "Manrope",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#b51b17",
                  textDecoration: "none",
                  display: "block",
                  marginBottom: 16,
                }}>
                Bất Động Sản
              </Link>
              <p
                style={{
                  color: "#656464",
                  fontSize: 14,
                  lineHeight: 1.7,
                  maxWidth: 280,
                }}>
                Hệ thống kết nối bất động sản hàng đầu Việt Nam, cung cấp thông
                tin chính xác, minh bạch và nhanh chóng cho người dùng.
              </p>
            </div>
            {[
              {
                title: "KHÁM PHÁ",
                links: ["Mua bán nhà đất", "Cho thuê căn hộ", "Dự án mới"],
              },
              {
                title: "HỖ TRỢ",
                links: [
                  "Về chúng tôi",
                  "Liên hệ quảng cáo",
                  "Hướng dẫn đăng tin",
                ],
              },
              {
                title: "PHÁP LÝ",
                links: ["Chính sách bảo mật", "Điều khoản sử dụng"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1a1c1c",
                    marginBottom: 20,
                    letterSpacing: "0.08em",
                  }}>
                  {col.title}
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
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        style={{
                          color: "#656464",
                          fontSize: 14,
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#b51b17")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#656464")
                        }>
                        {l}
                      </a>
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
              © 2024 Hệ thống Bất Động Sản Chuyên Nghiệp. All rights reserved.
            </p>


          </div>
        </div>
      </footer>
    </div>
  );
}
