import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import UiIcon from "../../components/UiIcon";
import SiteFooter from "../../components/SiteFooter";
import { useToast } from "../../components/ToastProvider";
import { useConfirm } from "../../components/ConfirmProvider";
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
  FaHistory,
  FaStar,
  FaCreditCard,
} from "react-icons/fa";

const VN = { fontFamily: "'Be Vietnam Pro', Inter, sans-serif" };

function formatPrice(price) {
  if (!price) return "—";
  if (price >= 1_000_000_000)
    return (price / 1_000_000_000).toFixed(1).replace(".0", "") + " Tỷ";
  if (price >= 1_000_000) return (price / 1_000_000).toFixed(0) + " Tr/tháng";
  return price.toLocaleString("vi-VN") + " đ";
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("vi-VN") + " đ";
}

function isFeaturedActive(property) {
  return (
    property?.is_featured === 1 &&
    property?.featured_until &&
    new Date(property.featured_until) > new Date()
  );
}

function FeaturedStatusBadge({ property }) {
  if (!isFeaturedActive(property)) return null;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        marginTop: 4,
        padding: "2px 8px",
        borderRadius: 20,
        background: "#e8f1ff",
        color: "#2456a6",
        fontSize: 10,
        fontWeight: 700,
        ...VN,
      }}>
      <FaCreditCard size={10} />
      Đang có gói đến {formatDateTime(property.featured_until)}
    </div>
  );
}

function FeaturedActionButton({ property, onClick }) {
  const active = isFeaturedActive(property);

  return (
    <button
      onClick={() => onClick(property)}
      title={active ? "Gia hạn gói nổi bật" : "Mua gói nổi bật"}
      style={{
        height: 30,
        minWidth: 74,
        padding: "0 9px",
        borderRadius: 6,
        border: active ? "0.5px solid #b9dfd3" : "0.5px solid #f0ce7a",
        background: active ? "#e6f9f0" : "#fff4d6",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        color: active ? "#0f6e56" : "#8a5a00",
        whiteSpace: "nowrap",
        ...VN,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = active ? "#d7f3e7" : "#ffe8a3";
        e.currentTarget.style.borderColor = active ? "#0f6e56" : "#d99a00";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? "#e6f9f0" : "#fff4d6";
        e.currentTarget.style.borderColor = active ? "#b9dfd3" : "#f0ce7a";
      }}>
      {active ? <FaRedo size={12} /> : <FaStar size={12} />}
      {active ? "Gia hạn" : "Mua gói"}
    </button>
  );
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

const HISTORY_STATUS_LABEL = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  hidden: "Đã ẩn",
  sold: "Đã giao dịch",
};

const HIDDEN_HISTORY_NOTES = [
  "Admin duyệt tin đăng",
  "Owner tạo tin đăng",
];

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [rejectModal, setRejectModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [featuredPackages, setFeaturedPackages] = useState([]);
  const [featuredOrders, setFeaturedOrders] = useState([]);
  const [paymentModal, setPaymentModal] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [listRes, statsRes, packagesRes, ordersRes] = await Promise.all([
          api.get("/api/property/owner/list"),
          api.get("/api/property/owner/stats"),
          api.get("/api/property/featured-packages"),
          api.get("/api/property/owner/featured-orders"),
        ]);
        setProperties(
          Array.isArray(listRes.data) ? listRes.data : listRes.data.data || [],
        );
        setOwnerStats(statsRes.data);
        setFeaturedPackages(Array.isArray(packagesRes.data) ? packagesRes.data : []);
        setFeaturedOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: "Xóa tin đăng?",
      message: "Tin đăng sẽ bị xóa khỏi hệ thống và không thể khôi phục.",
      confirmText: "Xóa tin",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/property/${id}`);
      setProperties((prev) => prev.filter((p) => p.id !== id));
      showToast("Đã xoá tin đăng");
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể xoá tin đăng", "error");
    }
  };

  const handleHide = async (id) => {
    const ok = await confirm({
      title: "Ẩn tin đăng?",
      message: "Tin này sẽ không còn hiển thị công khai cho Buyer.",
      confirmText: "Ẩn tin",
    });
    if (!ok) return;
    try {
      await api.patch(`/api/property/${id}/hide`);
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "hidden" } : p)),
      );
      showToast("Đã ẩn tin đăng");
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể ẩn tin đăng", "error");
    }
  };

  const handleSold = async (id) => {
    const ok = await confirm({
      title: "Đánh dấu đã giao dịch?",
      message: "Sau khi đánh dấu đã giao dịch, tin sẽ không thể chỉnh sửa như tin đang hiển thị.",
      confirmText: "Đánh dấu",
    });
    if (!ok) return;
    try {
      await api.patch(`/api/property/${id}/sold`);
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "sold" } : p)),
      );
      showToast("Đã đánh dấu tin là đã giao dịch");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không thể đánh dấu đã giao dịch",
        "error",
      );
    }
  };

  const handleUnhide = async (id) => {
    const ok = await confirm({
      title: "Gửi lại tin để chờ duyệt?",
      message: "Tin sẽ chuyển về trạng thái chờ Admin duyệt trước khi hiển thị lại.",
      confirmText: "Gửi duyệt",
    });
    if (!ok) return;
    try {
      await api.patch(`/api/property/${id}/unhide`);
      setProperties((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "pending", reject_reason: null } : p,
        ),
      );
      showToast("Đã gửi lại tin để chờ duyệt");
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể gửi lại tin", "error");
    }
  };

  const openHistory = async (property) => {
    setHistoryModal(property);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/api/property/${property.id}/history`);
      setHistoryItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast("Không thể tải lịch sử trạng thái", "error");
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openPaymentModal = (property) => {
    setPaymentModal(property);
    setSelectedPackageId(featuredPackages[0]?.id ? String(featuredPackages[0].id) : "");
    setPaymentOrder(null);
    setPaymentUrl("");
  };

  const closePaymentModal = () => {
    setPaymentModal(null);
    setSelectedPackageId("");
    setPaymentOrder(null);
    setPaymentUrl("");
    setPaymentLoading(false);
  };

  const createFeaturedOrder = async () => {
    if (!paymentModal || !selectedPackageId) {
      showToast("Vui lòng chọn gói nổi bật", "error");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await api.post(
        `/api/property/${paymentModal.id}/featured-orders`,
        {
          package_id: Number(selectedPackageId),
          payment_method: "vnpay",
        },
      );
      setPaymentOrder(res.data.order);
      setPaymentUrl(res.data.payment_url || "");
      showToast("Đã tạo đơn thanh toán");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không thể tạo đơn thanh toán",
        "error",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const payFeaturedOrder = async () => {
    if (!paymentOrder || !paymentUrl) return;

    const ok = await confirm({
      title: "Mở VNPay Sandbox?",
      message:
        "Hệ thống sẽ chuyển sang cổng thanh toán VNPay Sandbox. Sau khi thanh toán, VNPay sẽ trả kết quả về hệ thống.",
      confirmText: "Thanh toán VNPay",
    });
    if (!ok) return;

    window.location.href = paymentUrl;
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
                    <UiIcon name="search" size={15} />
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
                              <FeaturedStatusBadge property={p} />
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
                            {p.status !== "sold" && (
                              <Link
                                to={`/owner/edit/${p.id}`}
                                title={
                                  p.status === "rejected"
                                    ? "Chỉnh sửa để gửi duyệt lại"
                                    : "Chỉnh sửa"
                                }
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

                            <button
                              onClick={() => openHistory(p)}
                              title="Xem lịch sử trạng thái"
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
                                e.currentTarget.style.background = "#f3f3f3";
                                e.currentTarget.style.borderColor = "#aaa";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                                e.currentTarget.style.borderColor = "#E8E8E8";
                              }}>
                              <FaHistory />
                            </button>

                            {(p.status === "active" ||
                              p.status === "approved") && (
                              <>
                                <FeaturedActionButton
                                  property={p}
                                  onClick={openPaymentModal}
                                />
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
        {paymentModal && (
          <div
            onClick={closePaymentModal}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.42)",
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
                maxWidth: 560,
                boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
                overflow: "hidden",
                ...VN,
              }}>
              <div
                style={{
                  padding: "18px 20px",
                  borderBottom: "0.5px solid #E8E8E8",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#1a1c1c",
                    }}>
                    {isFeaturedActive(paymentModal) ? (
                      <FaRedo color="#0f6e56" />
                    ) : (
                      <FaStar color="#d99a00" />
                    )}
                    {isFeaturedActive(paymentModal)
                      ? "Gia hạn gói nổi bật"
                      : "Mua gói nổi bật"}
                  </div>
                  <div style={{ fontSize: 13, color: "#757575", marginTop: 4 }}>
                    {paymentModal.title}
                  </div>
                </div>
                <button
                  onClick={closePaymentModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    color: "#5f5e5e",
                    cursor: "pointer",
                    lineHeight: 1,
                  }}>
                  ×
                </button>
              </div>

              <div style={{ padding: 20 }}>
                {isFeaturedActive(paymentModal) && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "#e8f1ff",
                      border: "0.5px solid #b8cff7",
                      color: "#2456a6",
                      fontSize: 13,
                      marginBottom: 14,
                    }}>
                    Tin đang có gói nổi bật đến {formatDateTime(paymentModal.featured_until)}.
                    Chọn gói bên dưới để gia hạn thêm thời gian hiển thị.
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 10,
                    marginBottom: 16,
                  }}>
                  {featuredPackages.map((pkg) => {
                    const selected = String(pkg.id) === selectedPackageId;
                    return (
                      <button
                        key={pkg.id}
                        onClick={() => {
                          setSelectedPackageId(String(pkg.id));
                          setPaymentOrder(null);
                        }}
                        style={{
                          textAlign: "left",
                          border: selected
                            ? "1px solid #b51b17"
                            : "0.5px solid #E8E8E8",
                          background: selected ? "#fff5f5" : "#fff",
                          borderRadius: 10,
                          padding: 12,
                          cursor: "pointer",
                          minHeight: 112,
                          ...VN,
                        }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#1a1c1c",
                            marginBottom: 6,
                          }}>
                          {pkg.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#757575",
                            lineHeight: 1.45,
                            minHeight: 34,
                          }}>
                          {pkg.description}
                        </div>
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#b51b17",
                          }}>
                          {formatCurrency(pkg.price)}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!paymentOrder ? (
                  <button
                    disabled={paymentLoading}
                    onClick={createFeaturedOrder}
                    style={{
                      width: "100%",
                      height: 40,
                      border: "none",
                      borderRadius: 8,
                      background: "#b51b17",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: paymentLoading ? "not-allowed" : "pointer",
                      opacity: paymentLoading ? 0.7 : 1,
                      ...VN,
                    }}>
                    {paymentLoading ? "Đang tạo đơn..." : "Tạo đơn thanh toán"}
                  </button>
                ) : (
                  <div
                    style={{
                      border: "0.5px solid #E8E8E8",
                      borderRadius: 10,
                      padding: 14,
                      background: "#fafafa",
                    }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#1a1c1c",
                        marginBottom: 8,
                      }}>
                      Thông tin thanh toán
                    </div>
                    <div style={{ fontSize: 13, color: "#5f5e5e", lineHeight: 1.8 }}>
                      <div>Mã đơn: <strong>{paymentOrder.payment_code}</strong></div>
                      <div>Gói: <strong>{paymentOrder.package_name}</strong></div>
                      <div>Số tiền: <strong>{formatCurrency(paymentOrder.amount)}</strong></div>
                      <div>Phương thức: VNPay Sandbox</div>
                    </div>
                    <button
                      disabled={paymentLoading || !paymentUrl}
                      onClick={payFeaturedOrder}
                      style={{
                        width: "100%",
                        height: 40,
                        border: "none",
                        borderRadius: 8,
                        background: "#0f6e56",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: paymentLoading ? "not-allowed" : "pointer",
                        opacity: paymentLoading ? 0.7 : 1,
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        ...VN,
                      }}>
                        <FaCreditCard />
                      {paymentLoading ? "Đang xử lý..." : "Thanh toán qua VNPay"}
                    </button>
                  </div>
                )}

                {featuredOrders.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#1a1c1c",
                        marginBottom: 8,
                      }}>
                      Lịch sử mua gói gần đây
                    </div>
                    <div style={{ maxHeight: 150, overflowY: "auto" }}>
                      {featuredOrders.slice(0, 5).map((order) => (
                        <div
                          key={order.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "8px 0",
                            borderTop: "0.5px solid #E8E8E8",
                            fontSize: 12,
                            color: "#5f5e5e",
                          }}>
                          <div>
                            <div style={{ fontWeight: 600, color: "#1a1c1c" }}>
                              {order.property_title}
                            </div>
                            <div>{order.package_name}</div>
                          </div>
                          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <div>{formatCurrency(order.amount)}</div>
                            <div>{order.status === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
                <Link
                  to={`/owner/edit/${rejectModal.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 14,
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: "#b51b17",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                  Chỉnh sửa và gửi duyệt lại
                </Link>
              </div>
            </div>
          </div>
        )}
        {historyModal && (
          <div
            onClick={() => setHistoryModal(null)}
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
                maxWidth: 560,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                overflow: "hidden",
                ...VN,
              }}>
              <div
                style={{
                  padding: "18px 20px",
                  borderBottom: "0.5px solid #E8E8E8",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    Lịch sử trạng thái tin
                  </div>
                  <div style={{ fontSize: 12, color: "#757575", marginTop: 3 }}>
                    {historyModal.title}
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModal(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    color: "#5f5e5e",
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: 0,
                    flexShrink: 0,
                  }}>
                  ×
                </button>
              </div>

              <div style={{ padding: "18px 20px" }}>
                {historyLoading ? (
                  <div style={{ textAlign: "center", padding: "28px 0" }}>
                    Đang tải lịch sử...
                  </div>
                ) : historyItems.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 0",
                      textAlign: "center",
                      color: "#757575",
                      fontSize: 13,
                    }}>
                    Chưa có lịch sử trạng thái
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {historyItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: "0.5px solid #E8E8E8",
                          borderRadius: 10,
                          padding: "12px 14px",
                          background: "#fafafa",
                        }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 6,
                          }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            {HISTORY_STATUS_LABEL[item.old_status] || "Mới"}{" "}
                            → {HISTORY_STATUS_LABEL[item.new_status] || item.new_status}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#757575",
                              whiteSpace: "nowrap",
                            }}>
                            {formatDateTime(item.created_at)}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#5f5e5e" }}>
                          Người thực hiện: {item.actor_name || "Hệ thống"}
                        </div>
                        {item.note && !HIDDEN_HISTORY_NOTES.includes(item.note) && (
                          <div
                            style={{
                              fontSize: 12,
                              color:
                                item.new_status === "rejected"
                                  ? "#a32d2d"
                                  : "#5f5e5e",
                              marginTop: 5,
                              lineHeight: 1.5,
                            }}>
                            {item.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

