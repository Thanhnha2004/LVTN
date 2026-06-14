import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

function formatPrice(price) {
  if (price >= 1000000000) return (price / 1000000000).toFixed(1) + " Tỷ";
  if (price >= 1000000) return (price / 1000000).toFixed(0) + " Triệu";
  return price.toLocaleString() + " đ";
}

function SavedCard({ property, onUnsave }) {
  const [removing, setRemoving] = useState(false);

  const handleUnsave = async () => {
    setRemoving(true);
    await onUnsave(property.id);
  };

  const typeLabel =
    property.type === "apartment"
      ? "Căn hộ"
      : property.type === "house"
        ? "Nhà phố"
        : property.type === "land"
          ? "Đất nền"
          : "Văn phòng";

  return (
    <div
      className="card border h-100"
      style={{
        borderRadius: 12,
        overflow: "hidden",
        opacity: removing ? 0.5 : 1,
        pointerEvents: removing ? "none" : "auto",
        transition: "box-shadow 0.2s",
      }}>
      {/* Ảnh */}
      <div
        style={{
          position: "relative",
          height: 180,
          background: "#eee",
          overflow: "hidden",
        }}>
        {property.thumbnail ? (
          <img
            src={property.thumbnail}
            alt={property.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            className="d-flex align-items-center justify-content-center h-100"
            style={{ fontSize: 48 }}>
            🏠
          </div>
        )}

        {/* Badges */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            gap: 6,
          }}>
          <span
            className="badge text-white"
            style={{
              background:
                property.transaction_type === "sale" ? "#b51b17" : "#006480",
              fontSize: 11,
              fontWeight: 600,
            }}>
            {property.transaction_type === "sale" ? "Bán" : "Cho thuê"}
          </span>
          {property.type && (
            <span
              className="badge text-white"
              style={{ background: "rgba(26,28,28,0.7)", fontSize: 11 }}>
              {typeLabel}
            </span>
          )}
        </div>

        {/* Unsave button */}
        <button
          onClick={handleUnsave}
          className="btn btn-light btn-sm d-flex align-items-center justify-content-center rounded-circle shadow-sm"
          title="Bỏ lưu"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            padding: 0,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#b51b17">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      {/* Nội dung */}
      <div className="card-body p-3 d-flex flex-column">
        <h6
          className="fw-semibold mb-1"
          style={{ fontSize: 13, color: "#1a1c1c", lineHeight: 1.4 }}>
          {property.title}
        </h6>

        <p className="fw-bold mb-2" style={{ color: "#b51b17", fontSize: 15 }}>
          {formatPrice(property.price)}
          {property.transaction_type === "rent" && (
            <span
              className="text-muted fw-normal ms-1"
              style={{ fontSize: 11 }}>
              /tháng
            </span>
          )}
        </p>

        <div className="d-flex gap-3 text-muted mb-2" style={{ fontSize: 12 }}>
          <span>🏠 {property.area} m²</span>
          <span>📍 {property.city}</span>
        </div>

        {property.saved_at && (
          <p className="text-muted mb-2" style={{ fontSize: 11 }}>
            Đã lưu: {new Date(property.saved_at).toLocaleDateString("vi-VN")}
          </p>
        )}

        <div className="d-flex gap-2 pt-2 border-top mt-auto">
          <Link
            to={`/property/${property.id}`}
            className="btn btn-sm text-white flex-grow-1 text-center"
            style={{ background: "#b51b17", fontSize: 12, borderRadius: 8 }}>
            Xem chi tiết
          </Link>
          <button
            onClick={handleUnsave}
            className="btn btn-sm btn-outline-secondary"
            style={{ fontSize: 12, borderRadius: 8 }}>
            Bỏ lưu
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Saved() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await api.get("/api/contact/saved");
        setSaved(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  const handleUnsave = async (propertyId) => {
    try {
      await api.delete(`/api/contact/saved/${propertyId}`);
      setSaved((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      console.error(err);
    }
  };

  const counts = {
    all: saved.length,
    sale: saved.filter((p) => p.transaction_type === "sale").length,
    rent: saved.filter((p) => p.transaction_type === "rent").length,
  };

  const filtered = saved
    .filter((p) => filter === "all" || p.transaction_type === filter)
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.saved_at) - new Date(a.saved_at);
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });

  const tabs = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "sale", label: "Mua bán", count: counts.sale },
    { key: "rent", label: "Cho thuê", count: counts.rent },
  ];

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
                  {
                    to: "/saved",
                    icon: "♥",
                    label: "Tin đã lưu",
                    active: true,
                  },
                  { to: "/my-contacts", icon: "✉", label: "Yêu cầu liên hệ" },
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
              Tin đã lưu
            </h4>
            <p className="text-muted mb-4" style={{ fontSize: 13 }}>
              Xem và quản lý các bất động sản bạn đang quan tâm.
            </p>

            {/* Toolbar */}
            <div
              className="card border mb-4"
              style={{ borderRadius: 12, overflow: "hidden" }}>
              {/* Tabs */}
              <div className="d-flex border-bottom">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className="btn btn-link text-decoration-none px-4 py-3 d-flex align-items-center gap-2"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: filter === tab.key ? "#b51b17" : "#757575",
                      borderBottom:
                        filter === tab.key
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
                          filter === tab.key ? "rgba(181,27,23,0.1)" : "#eee",
                        color: filter === tab.key ? "#b51b17" : "#757575",
                      }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Sort bar */}
              <div
                className="d-flex justify-content-between align-items-center px-4 py-2"
                style={{ background: "#f9f9f9" }}>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {loading ? "Đang tải..." : `${filtered.length} bất động sản`}
                </span>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    Sắp xếp:
                  </span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="form-select form-select-sm border-0 bg-transparent fw-medium"
                    style={{ fontSize: 12, width: "auto", cursor: "pointer" }}>
                    <option value="newest">Mới nhất</option>
                    <option value="price_asc">Giá tăng dần</option>
                    <option value="price_desc">Giá giảm dần</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="row g-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="col-md-4">
                    <div
                      className="card border placeholder-glow"
                      style={{ borderRadius: 12, overflow: "hidden" }}>
                      <div className="placeholder" style={{ height: 180 }} />
                      <div className="card-body">
                        <p className="placeholder col-8 mb-2" />
                        <p className="placeholder col-5 mb-2" />
                        <p className="placeholder col-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-3" style={{ fontSize: 56 }}>
                  ❤️
                </div>
                <h5 className="fw-bold mb-2">
                  {filter !== "all"
                    ? "Không có tin nào trong mục này"
                    : "Bạn chưa lưu tin nào"}
                </h5>
                <p
                  className="text-muted mb-4"
                  style={{
                    fontSize: 13,
                    maxWidth: 280,
                    margin: "0 auto 1rem",
                  }}>
                  {filter !== "all"
                    ? "Hãy thử đổi bộ lọc khác để xem thêm tin."
                    : "Nhấn vào biểu tượng ❤️ trên tin đăng để lưu lại bất động sản bạn quan tâm."}
                </p>
                <Link
                  to="/"
                  className="btn text-white px-4"
                  style={{ background: "#b51b17", borderRadius: 10 }}>
                  Khám phá bất động sản
                </Link>
              </div>
            ) : (
              <div className="row g-3">
                {filtered.map((p) => (
                  <div key={p.id} className="col-sm-6 col-lg-4">
                    <SavedCard property={p} onUnsave={handleUnsave} />
                  </div>
                ))}
              </div>
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
