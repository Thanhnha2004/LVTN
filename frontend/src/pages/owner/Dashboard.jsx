import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const VN_FONT = { fontFamily: "'Be Vietnam Pro', Inter, sans-serif" };

function formatPrice(price) {
  if (!price) return "—";
  if (price >= 1000000000) return (price / 1000000000).toFixed(1) + " Tỷ";
  if (price >= 1000000) return (price / 1000000).toFixed(0) + " Tr/tháng";
  return price.toLocaleString() + " đ";
}

function StatusBadge({ status, rejectReason }) {
  const map = {
    active: { label: "Đang hiển thị", bg: "#e6f9f0", color: "#00A550" },
    pending: { label: "Đang đợi duyệt", bg: "#fff8e1", color: "#f59e0b" },
    rejected: { label: "Bị từ chối", bg: "#ffdad6", color: "#93000a" },
    sold: { label: "Đã bán", bg: "#f3f3f3", color: "#5f5e5e" },
    hidden: { label: "Đã ẩn", bg: "#f3f3f3", color: "#5f5e5e" },
  };
  const s = map[status] || map.hidden;
  return (
    <div>
      <span
        className="badge"
        style={{
          background: s.bg,
          color: s.color,
          fontWeight: 600,
          fontSize: 12,
          ...VN_FONT,
        }}>
        {s.label}
      </span>
      {status === "rejected" && rejectReason && (
        <div
          style={{ fontSize: 11, color: "#93000a", marginTop: 2, ...VN_FONT }}>
          {rejectReason}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, subColor }) {
  return (
    <div className="card border h-100" style={{ borderRadius: 10 }}>
      <div className="card-body p-3">
        <div className="text-muted mb-1" style={{ fontSize: 13, ...VN_FONT }}>
          {label}
        </div>
        <div
          className="fw-bold"
          style={{ fontSize: 28, color: "#1a1c1c", ...VN_FONT }}>
          {value}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 12,
              color: subColor || "#5f5e5e",
              marginTop: 2,
              ...VN_FONT,
            }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

const SIDEBAR_ITEMS = [
  { to: "/owner/dashboard", icon: "📋", label: "Tin đã đăng", active: true },
  { to: "/saved", icon: "♥", label: "Tin đã lưu" },
  { to: "/profile", icon: "👤", label: "Thông tin cá nhân" },
  { to: "/appointments", icon: "📅", label: "Lịch hẹn" },
];

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hiển thị" },
  { key: "pending", label: "Đang đợi duyệt" },
  { key: "sold", label: "Đã bán" },
  { key: "rejected", label: "Đã ẩn/Từ chối" },
];

export default function OwnerDashboard() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/api/properties/owner");
        setProperties(Array.isArray(res.data) ? res.data : res.data.data || []);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Xác nhận xoá tin này?")) return;
    try {
      await api.delete(`/api/properties/${id}`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRepost = async (id) => {
    try {
      await api.post(`/api/properties/${id}/repost`);
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "pending" } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Stats
  const total = properties.length;
  const active = properties.filter((p) => p.status === "active").length;
  const pending = properties.filter((p) => p.status === "pending").length;
  const views = properties.reduce((s, p) => s + (p.views || 0), 0);
  const contacts = properties.reduce((s, p) => s + (p.contact_count || 0), 0);
  const unread = properties.reduce((s, p) => s + (p.unread_contacts || 0), 0);

  // Filter + search
  const filtered = properties
    .filter((p) => {
      if (activeTab === "all") return true;
      if (activeTab === "rejected")
        return p.status === "rejected" || p.status === "hidden";
      return p.status === activeTab;
    })
    .filter(
      (p) =>
        search === "" ||
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.city?.toLowerCase().includes(search.toLowerCase()),
    );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const tabCount = (key) => {
    if (key === "all") return total;
    if (key === "rejected")
      return properties.filter(
        (p) => p.status === "rejected" || p.status === "hidden",
      ).length;
    return properties.filter((p) => p.status === key).length;
  };

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh", ...VN_FONT }}>
      <Navbar />

      <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
        <div className="d-flex" style={{ minHeight: "calc(100vh - 56px)" }}>
          {/* ── Sidebar ── */}
          <aside
            className="bg-white border-end d-none d-md-flex flex-column"
            style={{
              width: 220,
              minHeight: "calc(100vh - 56px)",
              position: "sticky",
              top: 56,
            }}>
            {/* User block */}
            <div className="p-3 border-bottom">
              <div className="d-flex align-items-center gap-2 mb-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: 42,
                    height: 42,
                    background: "#2c5364",
                    fontSize: 16,
                    flexShrink: 0,
                  }}>
                  Q
                </div>
                <div>
                  <div
                    className="fw-semibold"
                    style={{ fontSize: 13, color: "#1a1c1c" }}>
                    Quản lý tài khoản
                  </div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    Người dùng chuyên nghiệp
                  </div>
                </div>
              </div>
              <button
                className="btn btn-sm w-100"
                style={{
                  border: "1.5px solid #b51b17",
                  color: "#b51b17",
                  fontSize: 12,
                  borderRadius: 6,
                }}>
                Nâng cấp môi giới
              </button>
            </div>

            {/* Nav */}
            <nav className="p-2 flex-grow-1">
              {SIDEBAR_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="d-flex align-items-center gap-2 px-3 py-2 mb-1 rounded text-decoration-none fw-medium"
                  style={{
                    fontSize: 13,
                    background: item.active ? "#fdf1f0" : "transparent",
                    color: item.active ? "#b51b17" : "#1a1c1c",
                    borderLeft: item.active
                      ? "3px solid #b51b17"
                      : "3px solid transparent",
                  }}>
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* ── Main ── */}
          <main className="flex-grow-1 p-3 p-md-4">
            {/* Stats row */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <StatCard
                  label="Tổng tin đăng"
                  value={total}
                  sub={`+2 tháng này`}
                  subColor="#00A550"
                />
              </div>
              <div className="col-6 col-md-3">
                <StatCard
                  label="Tin đang hiển thị"
                  value={<span style={{ color: "#00A550" }}>{active}</span>}
                  sub={
                    pending > 0 ? `${pending} tin đang đợi duyệt` : undefined
                  }
                />
              </div>
              <div className="col-6 col-md-3">
                <StatCard
                  label="Tổng lượt xem"
                  value={views.toLocaleString()}
                  sub="Tất cả các tin"
                />
              </div>
              <div className="col-6 col-md-3">
                <StatCard
                  label="Liên hệ mới"
                  value={<span style={{ color: "#b51b17" }}>{contacts}</span>}
                  sub={
                    unread > 0
                      ? `${unread} liên hệ chưa phản hồi`
                      : "Đã phản hồi tất cả"
                  }
                  subColor={unread > 0 ? "#b51b17" : "#00A550"}
                />
              </div>
            </div>

            {/* Table card */}
            <div
              className="card border"
              style={{ borderRadius: 12, overflow: "hidden" }}>
              {/* Table header */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-bottom">
                <div>
                  <h5
                    className="fw-bold mb-0"
                    style={{ fontSize: 20, color: "#1a1c1c", ...VN_FONT }}>
                    Quản lý tin đăng
                  </h5>
                  <p
                    className="text-muted mb-0"
                    style={{ fontSize: 13, ...VN_FONT }}>
                    Theo dõi trạng thái và hiệu quả của các bất động sản đang
                    rao bán/cho thuê.
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Tìm kiếm tin đăng..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      style={{
                        paddingLeft: 32,
                        borderRadius: 8,
                        fontSize: 13,
                        width: 200,
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#aaa",
                        fontSize: 14,
                      }}>
                      🔍
                    </span>
                  </div>
                  <Link
                    to="/owner/create"
                    className="btn btn-sm text-white fw-semibold d-flex align-items-center gap-1"
                    style={{
                      background: "#b51b17",
                      borderRadius: 8,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}>
                    + Đăng tin mới
                  </Link>
                </div>
              </div>

              {/* Tabs */}
              <div
                className="d-flex border-bottom px-2 overflow-auto"
                style={{ gap: 0 }}>
                {TABS.map((tab) => {
                  const count = tabCount(tab.key);
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setPage(1);
                      }}
                      className="btn btn-link text-decoration-none d-flex align-items-center gap-1 px-3 py-2"
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "#b51b17" : "#5f5e5e",
                        borderBottom: isActive
                          ? "2px solid #b51b17"
                          : "2px solid transparent",
                        borderRadius: 0,
                        whiteSpace: "nowrap",
                      }}>
                      {tab.label}
                      <span
                        className="badge"
                        style={{
                          fontSize: 11,
                          background: isActive ? "#b51b17" : "#eeeeee",
                          color: isActive ? "white" : "#5f5e5e",
                        }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Table */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-danger" />
                </div>
              ) : paginated.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: 48 }}>📋</div>
                  <h6 className="fw-bold mt-2" style={VN_FONT}>
                    Không có tin đăng nào
                  </h6>
                  <p
                    className="text-muted"
                    style={{ fontSize: 13, ...VN_FONT }}>
                    {search
                      ? "Thử tìm với từ khoá khác."
                      : "Hãy đăng tin đầu tiên của bạn!"}
                  </p>
                  {!search && (
                    <Link
                      to="/owner/create"
                      className="btn btn-sm text-white"
                      style={{ background: "#b51b17" }}>
                      + Đăng tin mới
                    </Link>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table
                    className="table mb-0 align-middle"
                    style={{ ...VN_FONT }}>
                    <thead style={{ background: "#f9f9f9" }}>
                      <tr>
                        <th
                          className="fw-semibold text-muted border-0 py-2 ps-3"
                          style={{ fontSize: 13, width: "40%" }}>
                          Tin đăng
                        </th>
                        <th
                          className="fw-semibold text-muted border-0 py-2"
                          style={{ fontSize: 13 }}>
                          Trạng thái
                        </th>
                        <th
                          className="fw-semibold text-muted border-0 py-2"
                          style={{ fontSize: 13 }}>
                          Giá bán
                        </th>
                        <th
                          className="fw-semibold text-muted border-0 py-2"
                          style={{ fontSize: 13 }}>
                          Liên hệ
                        </th>
                        <th
                          className="fw-semibold text-muted border-0 py-2 pe-3 text-end"
                          style={{ fontSize: 13 }}>
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((p) => (
                        <tr key={p.id} className="border-top">
                          {/* Tin đăng */}
                          <td className="ps-3 py-3">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                style={{
                                  width: 64,
                                  height: 48,
                                  borderRadius: 6,
                                  overflow: "hidden",
                                  background: "#eee",
                                  flexShrink: 0,
                                }}>
                                {p.thumbnail ? (
                                  <img
                                    src={p.thumbnail}
                                    alt=""
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="d-flex align-items-center justify-content-center h-100"
                                    style={{ fontSize: 20 }}>
                                    🏠
                                  </div>
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  className="fw-semibold text-truncate"
                                  style={{
                                    fontSize: 13,
                                    color: "#1a1c1c",
                                    maxWidth: 280,
                                  }}>
                                  {p.title}
                                </div>
                                <div
                                  className="text-muted"
                                  style={{ fontSize: 12 }}>
                                  {p.area}m² • {p.city}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td>
                            <StatusBadge
                              status={p.status}
                              rejectReason={p.reject_reason}
                            />
                          </td>

                          {/* Giá */}
                          <td
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#1a1c1c",
                            }}>
                            {formatPrice(p.price)}
                          </td>

                          {/* Liên hệ */}
                          <td>
                            {p.contact_count > 0 ? (
                              <span style={{ fontSize: 13, color: "#5f5e5e" }}>
                                💬 {p.contact_count} liên hệ
                              </span>
                            ) : (
                              <span
                                className="text-muted"
                                style={{ fontSize: 13 }}>
                                —
                              </span>
                            )}
                          </td>

                          {/* Hành động */}
                          <td className="pe-3 text-end">
                            <div className="d-flex justify-content-end gap-2 align-items-center">
                              {p.status === "rejected" && (
                                <button
                                  onClick={() => handleRepost(p.id)}
                                  className="btn btn-sm"
                                  style={{
                                    background: "#ffdad6",
                                    color: "#93000a",
                                    fontSize: 12,
                                    borderRadius: 6,
                                  }}>
                                  🔄 Gửi lại
                                </button>
                              )}
                              {/* Sửa */}
                              {p.status !== "sold" && (
                                <Link
                                  to={`/owner/edit/${p.id}`}
                                  className="btn btn-sm btn-light border"
                                  title="Sửa"
                                  style={{
                                    fontSize: 14,
                                    borderRadius: 6,
                                    padding: "4px 8px",
                                  }}>
                                  ✏️
                                </Link>
                              )}
                              {/* Ẩn/Hiện */}
                              {p.status === "active" && (
                                <button
                                  className="btn btn-sm btn-light border"
                                  title="Ẩn tin"
                                  style={{
                                    fontSize: 14,
                                    borderRadius: 6,
                                    padding: "4px 8px",
                                  }}>
                                  🏷️
                                </button>
                              )}
                              {(p.status === "hidden" ||
                                p.status === "sold") && (
                                <button
                                  className="btn btn-sm btn-light border"
                                  title="Hiển thị lại"
                                  style={{
                                    fontSize: 14,
                                    borderRadius: 6,
                                    padding: "4px 8px",
                                  }}>
                                  👁️
                                </button>
                              )}
                              {/* Xoá */}
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="btn btn-sm btn-light border"
                                title="Xoá"
                                style={{
                                  fontSize: 14,
                                  borderRadius: 6,
                                  padding: "4px 8px",
                                }}>
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  className="d-flex justify-content-between align-items-center px-3 py-3 border-top"
                  style={{ background: "#fafafa" }}>
                  <span
                    className="text-muted"
                    style={{ fontSize: 13, ...VN_FONT }}>
                    Hiển thị {(page - 1) * PER_PAGE + 1}–
                    {Math.min(page * PER_PAGE, filtered.length)} trong số{" "}
                    {filtered.length} tin đăng
                  </span>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-light border"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      style={{ borderRadius: 6 }}>
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className="btn btn-sm"
                          style={{
                            borderRadius: 6,
                            background: page === n ? "#b51b17" : "white",
                            color: page === n ? "white" : "#1a1c1c",
                            border: "1px solid #dee2e6",
                            fontWeight: page === n ? 600 : 400,
                            minWidth: 34,
                          }}>
                          {n}
                        </button>
                      ),
                    )}
                    <button
                      className="btn btn-sm btn-light border"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      style={{ borderRadius: 6 }}>
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-top bg-white py-4 mt-4">
        <div
          className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2"
          style={{ maxWidth: 1280 }}>
          <div>
            <span className="fw-bold" style={{ color: "#b51b17", ...VN_FONT }}>
              Bất Động Sản
            </span>
            <p className="text-muted mb-0" style={{ fontSize: 12, ...VN_FONT }}>
              © 2024 Hệ thống Bất Động Sản Chuyên Nghiệp. All rights reserved.
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
                className="text-muted text-decoration-none"
                style={{ fontSize: 13, ...VN_FONT }}>
                {t}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
