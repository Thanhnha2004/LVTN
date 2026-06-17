import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import {
  FaListAlt,
  FaComments,
  FaBuilding,
  FaHome,
  FaMapMarkedAlt,
  FaBriefcase,
  FaEdit,
  FaTag,
  FaEye,
  FaTrash,
  FaRedo,
  FaEyeSlash,
} from "react-icons/fa";

const VN = { fontFamily: "'Be Vietnam Pro', Inter, sans-serif" };

function formatPrice(price) {
  if (!price) return "—";
  if (price >= 1_000_000_000)
    return (price / 1_000_000_000).toFixed(1).replace(".0", "") + " Tỷ";
  if (price >= 1_000_000) return (price / 1_000_000).toFixed(0) + " Tr/tháng";
  return price.toLocaleString("vi-VN") + " đ";
}

const STATUS_MAP = {
  active: {
    label: "Đang hiển thị",
    dot: "#0f6e56",
    bg: "#e6f9f0",
    color: "#0f6e56",
  },
  approved: {
    label: "Đang hiển thị",
    dot: "#0f6e56",
    bg: "#e6f9f0",
    color: "#0f6e56",
  },
  pending: {
    label: "Đợi duyệt",
    dot: "#ba7517",
    bg: "#faeeda",
    color: "#854f0b",
  },
  rejected: {
    label: "Bị từ chối",
    dot: "#a32d2d",
    bg: "#fcebeb",
    color: "#a32d2d",
  },
  sold: { label: "Đã bán", dot: "#888", bg: "#f3f3f3", color: "#5f5e5e" },
  hidden: { label: "Đã ẩn", dot: "#888", bg: "#f3f3f3", color: "#5f5e5e" },
};

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hiển thị" },
  { key: "pending", label: "Đợi duyệt" },
  { key: "sold", label: "Đã bán" },
  { key: "rejected", label: "Ẩn / Từ chối" },
];

const SIDEBAR = [
  {
    to: "/owner/dashboard",
    icon: <FaListAlt size={16} />,
    label: "Tin đã đăng",
    active: true,
  },
  {
    to: "/owner/contacts",
    icon: <FaComments size={16} />,
    label: "Liên hệ",
  },
];

function StatusBadge({ status, rejectReason }) {
  const s = STATUS_MAP[status] || STATUS_MAP.hidden;
  return (
    <div>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          fontWeight: 500,
          padding: "3px 9px",
          borderRadius: 20,
          background: s.bg,
          color: s.color,
          ...VN,
        }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: s.dot,
            display: "inline-block",
          }}
        />
        {s.label}
      </span>
      {status === "rejected" && rejectReason && (
        <div
          style={{
            fontSize: 10,
            color: "#a32d2d",
            fontStyle: "italic",
            marginTop: 3,
            ...VN,
          }}>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, subColor = "#5f5e5e" }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #E8E8E8",
        borderRadius: 12,
        padding: "14px 18px",
        ...VN,
      }}>
      <div style={{ fontSize: 12, color: "#757575", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: "#1a1c1c",
          lineHeight: 1,
        }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: subColor, marginTop: 5 }}>{sub}</div>
      )}
    </div>
  );
}

function Thumb({ src, status }) {
  const grayscale =
    status === "rejected" || status === "hidden" || status === "sold";
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{
          width: 56,
          height: 42,
          objectFit: "cover",
          borderRadius: 6,
          flexShrink: 0,
          filter: grayscale ? "grayscale(0.6)" : "none",
        }}
      />
    );
  }
  const iconMap = {
    apartment: <FaBuilding />,
    house: <FaHome />,
    land: <FaMapMarkedAlt />,
    office: <FaBriefcase />,
  };
  return (
    <div
      style={{
        width: 56,
        height: 42,
        borderRadius: 6,
        background: "#f3f3f3",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        filter: grayscale ? "grayscale(0.5)" : "none",
      }}>
      {iconMap[status] || <FaHome />}
    </div>
  );
}

export default function OwnerDashboard() {
  const [properties, setProperties] = useState([]);
  const [ownerStats, setOwnerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const navigate = useNavigate();
  const [rejectModal, setRejectModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [listRes, statsRes] = await Promise.all([
          api.get("/api/property/owner/list"),
          api.get("/api/property/owner/stats"),
        ]);
        setProperties(
          Array.isArray(listRes.data) ? listRes.data : listRes.data.data || [],
        );
        setOwnerStats(statsRes.data);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Xác nhận xoá tin này?")) return;
    try {
      await api.delete(`/api/property/${id}`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleHide = async (id) => {
    try {
      await api.patch(`/api/property/${id}/hide`);
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "hidden" } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSold = async (id) => {
    if (!window.confirm("Đánh dấu tin này là đã bán?")) return;
    try {
      await api.patch(`/api/property/${id}/sold`);
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "sold" } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnhide = async (id) => {
    try {
      await api.patch(`/api/property/${id}/unhide`);
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "pending" } : p)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const total = properties.length;
  const active = properties.filter(
    (p) => p.status === "active" || p.status === "approved",
  ).length;
  const pending = properties.filter((p) => p.status === "pending").length;
  const views =
    ownerStats?.overview?.total_views ??
    properties.reduce((s, p) => s + (p.views || 0), 0);
  const contacts =
    ownerStats?.overview?.total_contacts ??
    properties.reduce((s, p) => s + (p.contact_count || 0), 0);
  const unread = properties.reduce((s, p) => s + (p.unread_contacts || 0), 0);

  const tabCount = (key) => {
    if (key === "all") return total;
    if (key === "rejected")
      return properties.filter(
        (p) => p.status === "rejected" || p.status === "hidden",
      ).length;
    if (key === "active")
      return properties.filter(
        (p) => p.status === "active" || p.status === "approved",
      ).length;
    return properties.filter((p) => p.status === key).length;
  };

  const filtered = properties
    .filter((p) => {
      if (activeTab === "all") return true;
      if (activeTab === "rejected")
        return p.status === "rejected" || p.status === "hidden";
      if (activeTab === "active")
        return p.status === "active" || p.status === "approved";
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

  const dimmed = (status) =>
    status === "sold" || status === "hidden" || status === "rejected";

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
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}>
            <StatCard label="Tổng tin đăng" value={total} subColor="#0f6e56" />
            <StatCard
              label="Đang hiển thị"
              value={<span style={{ color: "#0f6e56" }}>{active}</span>}
              sub={
                pending > 0
                  ? `${pending} tin đang đợi duyệt`
                  : "Không có tin chờ"
              }
            />
            <StatCard
              label="Tổng lượt xem"
              value={views.toLocaleString("vi-VN")}
              sub="Tất cả các tin"
            />
            <StatCard
              label="Liên hệ / chuyển đổi"
              value={contacts.toLocaleString("vi-VN")}
              sub={`Tỷ lệ ${ownerStats?.overview?.conversion_rate ?? 0}%`}
              subColor="#0f6e56"
            />
          </div>

          {/* Table card */}
          <div
            style={{
              background: "#fff",
              border: "0.5px solid #E8E8E8",
              borderRadius: 12,
              overflow: "hidden",
            }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "0.5px solid #E8E8E8",
              }}>
              <div>
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#1a1c1c",
                    margin: 0,
                    ...VN,
                  }}>
                  Quản lý tin đăng
                </h1>
                <p
                  style={{
                    fontSize: 13,
                    color: "#757575",
                    margin: "3px 0 0",
                    ...VN,
                  }}>
                  Theo dõi trạng thái và hiệu quả của các bất động sản đang rao
                  bán / cho thuê.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ position: "relative" }}>
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
                  <input
                    type="text"
                    placeholder="Tìm kiếm tin đăng..."
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
                      width: 200,
                      outline: "none",
                      background: "#fff",
                      color: "#1a1c1c",
                      ...VN,
                    }}
                  />
                </div>
                <Link
                  to="/owner/create"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#b51b17",
                    color: "#fff",
                    padding: "0 16px",
                    height: 36,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    ...VN,
                  }}>
                  + Đăng tin mới
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "0.5px solid #E8E8E8",
                overflowX: "auto",
                padding: "0 8px",
              }}>
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
                    style={{
                      padding: "10px 14px",
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
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      ...VN,
                    }}>
                    {tab.label}
                    <span
                      style={{
                        fontSize: 11,
                        padding: "1px 7px",
                        borderRadius: 20,
                        background: isActive ? "#b51b17" : "#eeeeee",
                        color: isActive ? "#fff" : "#5f5e5e",
                      }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div className="spinner-border text-danger" />
              </div>
            ) : paginated.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", ...VN }}>
                <div style={{ fontSize: 42, color: "#b51b17" }}>
                  <FaListAlt />
                </div>
                <h6 style={{ fontWeight: 600, marginTop: 12 }}>
                  Không có tin đăng nào
                </h6>
                <p style={{ fontSize: 13, color: "#757575" }}>
                  {search
                    ? "Thử tìm với từ khoá khác."
                    : "Hãy đăng tin đầu tiên của bạn!"}
                </p>
                {!search && (
                  <Link
                    to="/owner/create"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      padding: "8px 20px",
                      background: "#b51b17",
                      color: "#fff",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 500,
                      ...VN,
                    }}>
                    + Đăng tin mới
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9f9f9" }}>
                      {[
                        "Tin đăng",
                        "Trạng thái",
                        "Giá bán",
                        "Liên hệ",
                        "Hành động",
                      ].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 16px",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#757575",
                            textAlign: i === 4 ? "right" : "left",
                            borderBottom: "0.5px solid #E8E8E8",
                            whiteSpace: "nowrap",
                            ...VN,
                          }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((p) => (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: "0.5px solid #E8E8E8",
                          opacity: dimmed(p.status) ? 0.72 : 1,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#fafafa")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "")
                        }>
                        {/* Tin đăng */}
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}>
                            <Thumb src={p.thumbnail} status={p.type} />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color:
                                    p.status === "rejected" ||
                                    p.status === "hidden"
                                      ? "#757575"
                                      : "#1a1c1c",
                                  maxWidth: 260,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  ...VN,
                                }}>
                                {p.title}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#757575",
                                  marginTop: 2,
                                  ...VN,
                                }}>
                                {p.area}m² &middot; {p.city}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Trạng thái */}
                        <td style={{ padding: "12px 16px" }}>
                          <StatusBadge
                            status={p.status}
                            rejectReason={p.reject_reason}
                          />
                        </td>

                        {/* Giá */}
                        <td style={{ padding: "12px 16px", ...VN }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color:
                                p.status === "sold" ||
                                p.status === "hidden" ||
                                p.status === "rejected"
                                  ? "#757575"
                                  : "#b51b17",
                            }}>
                            {formatPrice(p.price)}
                          </span>
                        </td>

                        {/* Liên hệ */}
                        <td style={{ padding: "12px 16px" }}>
                          {p.contact_count > 0 ? (
                            <span
                              style={{
                                fontSize: 13,
                                color: "#5f5e5e",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                ...VN,
                              }}>
                              <FaComments />
                              {p.contact_count} liên hệ
                            </span>
                          ) : (
                            <span
                              style={{ fontSize: 13, color: "#aaa", ...VN }}>
                              —
                            </span>
                          )}
                        </td>

                        {/* Hành động */}
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              justifyContent: "flex-end",
                            }}>
                            {p.status !== "sold" && p.status !== "rejected" && (
                              <Link
                                to={`/owner/edit/${p.id}`}
                                title="Chỉnh sửa"
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: "0.5px solid #E8E8E8",
                                  background: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 14,
                                  textDecoration: "none",
                                  color: "#5f5e5e",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#b51b17";
                                  e.currentTarget.style.borderColor = "#b51b17";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#5f5e5e";
                                  e.currentTarget.style.borderColor = "#E8E8E8";
                                }}>
                                <FaEdit />
                              </Link>
                            )}

                            {(p.status === "active" ||
                              p.status === "approved") && (
                              <>
                                <button
                                  onClick={() => handleSold(p.id)}
                                  title="Đánh dấu đã bán"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 6,
                                    border: "0.5px solid #E8E8E8",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#5f5e5e",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "#faeeda";
                                    e.currentTarget.style.borderColor =
                                      "#ba7517";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fff";
                                    e.currentTarget.style.borderColor =
                                      "#E8E8E8";
                                  }}>
                                  <FaTag />
                                </button>
                                <button
                                  onClick={() => handleHide(p.id)}
                                  title="Ẩn tin"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 6,
                                    border: "0.5px solid #E8E8E8",
                                    background: "#fff",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#5f5e5e",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "#f3f3f3";
                                    e.currentTarget.style.borderColor = "#aaa";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fff";
                                    e.currentTarget.style.borderColor =
                                      "#E8E8E8";
                                  }}>
                                  <FaEyeSlash />
                                </button>
                              </>
                            )}

                            {/* NÚT HIỆN LẠI khi đang ẩn */}
                            {p.status === "hidden" && (
                              <button
                                onClick={() => handleUnhide(p.id)}
                                title="Hiện lại"
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: "0.5px solid #E8E8E8",
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#5f5e5e",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#e6f9f0";
                                  e.currentTarget.style.borderColor = "#0f6e56";
                                  e.currentTarget.style.color = "#0f6e56";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#fff";
                                  e.currentTarget.style.borderColor = "#E8E8E8";
                                  e.currentTarget.style.color = "#5f5e5e";
                                }}>
                                <FaEye />
                              </button>
                            )}

                            {/* XEM LÝ DO khi bị từ chối */}
                            {p.status === "rejected" && p.reject_reason && (
                              <button
                                onClick={() => setRejectModal(p)}
                                style={{
                                  height: 30,
                                  padding: "0 10px",
                                  borderRadius: 6,
                                  border: "0.5px solid #f09595",
                                  background: "#fcebeb",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  color: "#a32d2d",
                                  whiteSpace: "nowrap",
                                  ...VN,
                                }}>
                                Xem lý do
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(p.id)}
                              title="Xoá"
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 6,
                                border: "0.5px solid #E8E8E8",
                                background: "#fff",
                                cursor: "pointer",
                                fontSize: 14,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#5f5e5e",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fcebeb";
                                e.currentTarget.style.borderColor = "#f09595";
                                e.currentTarget.style.color = "#a32d2d";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                                e.currentTarget.style.borderColor = "#E8E8E8";
                                e.currentTarget.style.color = "#5f5e5e";
                              }}>
                              <FaTrash />
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
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 16px",
                  borderTop: "0.5px solid #E8E8E8",
                  background: "#fafafa",
                }}>
                <span style={{ fontSize: 12, color: "#757575", ...VN }}>
                  Hiển thị {(page - 1) * PER_PAGE + 1}–
                  {Math.min(page * PER_PAGE, filtered.length)} trong{" "}
                  {filtered.length} tin
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    style={{
                      width: 28,
                      height: 28,
                      border: "0.5px solid #E8E8E8",
                      borderRadius: 6,
                      background: "#fff",
                      cursor: page === 1 ? "not-allowed" : "pointer",
                      fontSize: 13,
                      opacity: page === 1 ? 0.4 : 1,
                    }}>
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (n) => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: "0.5px solid #dee2e6",
                          background: page === n ? "#b51b17" : "#fff",
                          color: page === n ? "#fff" : "#1a1c1c",
                          fontWeight: page === n ? 600 : 400,
                          fontSize: 12,
                          cursor: "pointer",
                          ...VN,
                        }}>
                        {n}
                      </button>
                    ),
                  )}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    style={{
                      width: 28,
                      height: 28,
                      border: "0.5px solid #E8E8E8",
                      borderRadius: 6,
                      background: "#fff",
                      cursor: page === totalPages ? "not-allowed" : "pointer",
                      fontSize: 13,
                      opacity: page === totalPages ? 0.4 : 1,
                    }}>
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        {rejectModal && (
          <div
            onClick={() => setRejectModal(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                borderRadius: 14,
                width: "100%",
                maxWidth: 440,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                overflow: "hidden",
                ...VN,
              }}>
              {/* Header */}
              <div
                style={{
                  background: "#fcebeb",
                  padding: "18px 20px",
                  borderBottom: "0.5px solid #f09595",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#a32d2d",
                      }}>
                      Tin đăng bị từ chối
                    </div>

                  </div>
                </div>
                <button
                  onClick={() => setRejectModal(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    color: "#a32d2d",
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: 0,
                    flexShrink: 0,
                  }}>
                  ×
                </button>
              </div>

              {/* Tên tin */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "0.5px solid #E8E8E8",
                  background: "#fafafa",
                }}>
                <div
                  style={{ fontSize: 11, color: "#757575", marginBottom: 3 }}>
                  Tin đăng
                </div>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#1a1c1c" }}>
                  {rejectModal.title}
                </div>
                <div style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>
                  {rejectModal.area}m² · {rejectModal.city}
                </div>
              </div>

              {/* Lý do */}
              <div style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#757575",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                  }}>
                  Lý do từ chối
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#a32d2d",
                    lineHeight: 1.6,
                    background: "#fcebeb",
                    border: "0.5px solid #f09595",
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}>
                  {rejectModal.reject_reason}
                </div>
              </div>
            </div>
          </div>
        )}
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
