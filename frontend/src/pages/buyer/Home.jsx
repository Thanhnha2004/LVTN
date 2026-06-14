import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

// ─── Constants ────────────────────────────────────────────────
const TYPE_OPTIONS = [
  { value: "", label: "Loại nhà đất" },
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà phố" },
  { value: "land", label: "Đất nền" },
  { value: "office", label: "Văn phòng" },
];

const TRANSACTION_OPTIONS = [
  { value: "sale", label: "Mua bán" },
  { value: "rent", label: "Cho thuê" },
  { value: "", label: "Dự án" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Mức giá" },
  { value: "0-1000000000", label: "Dưới 1 tỷ" },
  { value: "1000000000-3000000000", label: "1 – 3 tỷ" },
  { value: "3000000000-5000000000", label: "3 – 5 tỷ" },
  { value: "5000000000-10000000000", label: "5 – 10 tỷ" },
  { value: "10000000000-", label: "Trên 10 tỷ" },
];

const CATEGORIES = [
  {
    value: "apartment",
    label: "Căn hộ",
    count: "1,240 tin đăng",
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80",
  },
  {
    value: "house",
    label: "Biệt thự",
    count: "856 tin đăng",
    img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
  },
  {
    value: "office",
    label: "Văn phòng",
    count: "520 tin đăng",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
  },
  {
    value: "land",
    label: "Đất nền",
    count: "2,100 tin đăng",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
  },
];

// ─── Helpers ──────────────────────────────────────────────────
function formatPrice(price) {
  if (!price && price !== 0) return "—";
  if (price >= 1_000_000_000)
    return (price / 1_000_000_000).toFixed(1).replace(".0", "") + " Tỷ";
  if (price >= 1_000_000) return (price / 1_000_000).toFixed(0) + " Triệu";
  return price.toLocaleString("vi-VN") + " đ";
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

// ─── Property Card ────────────────────────────────────────────
// ─── Property Card ────────────────────────────────────────────
function PropertyCard({ property }) {
  const [saved, setSaved] = useState(false);
  const isRent = property.transaction_type === "rent";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #E8E8E8",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "transform 0.3s, box-shadow 0.3s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
      }}>
      {/* Image */}
      <div
        style={{
          position: "relative",
          height: 192,
          background: "#f3f3f3",
          overflow: "hidden",
        }}>
        {property.thumbnail ? (
          <img
            src={property.thumbnail}
            alt={property.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#eeeeee",
              color: "#bbb",
              fontSize: 48,
            }}>
            🏠
          </div>
        )}

        {/* Badge */}
        <span
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: isRent ? "#006480" : "#b51b17",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 4,
          }}>
          {isRent ? "CHO THUÊ" : "HOT"}
        </span>

        {/* Favourite */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSaved(!saved);
          }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.9)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#b51b17",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}>
          {saved ? "♥" : "♡"}
        </button>
      </div>

      {/* Content */}
      <Link
        to={`/property/${property.id}`}
        style={{
          display: "block",
          padding: 16,
          textDecoration: "none",
          color: "inherit",
        }}>
        <p
          style={{
            color: "#b51b17",
            fontWeight: 700,
            fontSize: 18,
            margin: "0 0 6px",
            lineHeight: 1.2,
          }}>
          {formatPrice(property.price)}
          {isRent && (
            <span style={{ color: "#999", fontWeight: 400, fontSize: 13 }}>
              /tháng
            </span>
          )}
        </p>
        <h3
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: "#1a1c1c",
            margin: "0 0 10px",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 40,
          }}>
          {property.title}
        </h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: "#757575",
            fontSize: 13,
            marginBottom: 12,
          }}>
          <span style={{ marginRight: 4 }}>📍</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
            {property.city}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
          }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              color: "#757575",
              fontSize: 12,
            }}>
            {property.area && <span>📐 {property.area}m²</span>}
            {property.bedrooms && <span>🛏 {property.bedrooms}</span>}
            {property.bathrooms && <span>🚿 {property.bathrooms}</span>}
          </div>
          <span style={{ color: "#aaa", fontSize: 12, whiteSpace: "nowrap" }}>
            {timeAgo(property.created_at)}
          </span>
        </div>
      </Link>
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────
export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("sale");
  const [search, setSearch] = useState({
    keyword: "",
    type: "",
    price: "",
  });

  const [filter, setFilter] = useState({
    transaction_type: "sale",
    type: "",
    keyword: "",
    min_price: "",
    max_price: "",
    page: 1,
    limit: 8,
  });

  const fetchProperties = async (params) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== "" && v !== undefined) query.append(k, v);
      });
      const res = await api.get(`/api/listing?${query}`);
      setProperties(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch {
      // silently fail on home page
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(filter);
  }, [filter]);

  const handleSearch = () => {
    let min_price = "",
      max_price = "";
    if (search.price) {
      const [min, max] = search.price.split("-");
      min_price = min || "";
      max_price = max || "";
    }
    setFilter({
      ...filter,
      transaction_type: activeTab,
      type: search.type,
      keyword: search.keyword,
      min_price,
      max_price,
      page: 1,
    });
  };

  const handleTabChange = (val) => {
    setActiveTab(val);
    setFilter((f) => ({ ...f, transaction_type: val, page: 1 }));
  };

  const handleCategoryClick = (cat) => {
    setFilter((f) => ({ ...f, type: cat.value, page: 1 }));
    window.scrollTo({ top: 600, behavior: "smooth" });
  };

  return (
    <div
      style={{
        background: "#f9f9f9",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        .property-card-hover { box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .property-card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        select { outline: none; }
        input:focus { outline: none; box-shadow: none; }
        .bar-anim { animation: growUp 0.8s ease forwards; }
        @keyframes growUp { from { height: 0; } to { height: var(--h); } }
      `}</style>

      <Navbar />

      {/* ── HERO ── */}
      <section
        style={{
          position: "relative",
          height: 560,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
        {/* BG image */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <img
            alt="Real estate hero"
            src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=85"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.38)",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 860,
            margin: "0 auto",
            padding: "0 16px",
          }}>
          {/* Title */}
          <h1
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#fff",
              textAlign: "center",
              marginBottom: 32,
              letterSpacing: "-0.02em",
              textShadow: "0 2px 16px rgba(0,0,0,0.3)",
            }}>
            Tìm kiếm không gian sống lý tưởng
          </h1>

          {/* Search Card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "16px 16px 16px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            }}>
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                borderBottom: "1px solid #E8E8E8",
                paddingBottom: 12,
                marginBottom: 12,
                overflowX: "auto",
              }}
              className="hide-scrollbar">
              {TRANSACTION_OPTIONS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleTabChange(t.value)}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    transition: "all 0.15s",
                    background:
                      activeTab === t.value ? "#b51b17" : "transparent",
                    color: activeTab === t.value ? "#fff" : "#5b403c",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Inputs Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 8,
              }}>
              {/* Keyword */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  borderRight: "1px solid #E8E8E8",
                  gap: 8,
                }}>
                <span style={{ color: "#757575", fontSize: 18 }}>📍</span>
                <input
                  type="text"
                  placeholder="Thành phố, Quận, Phường..."
                  value={search.keyword}
                  onChange={(e) =>
                    setSearch({ ...search, keyword: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{
                    border: "none",
                    width: "100%",
                    fontSize: 15,
                    padding: "12px 0",
                    background: "transparent",
                    color: "#1a1c1c",
                  }}
                />
              </div>

              {/* Type */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  borderRight: "1px solid #E8E8E8",
                  gap: 8,
                }}>
                <span style={{ color: "#757575", fontSize: 16 }}>🏠</span>
                <select
                  value={search.type}
                  onChange={(e) =>
                    setSearch({ ...search, type: e.target.value })
                  }
                  style={{
                    border: "none",
                    width: "100%",
                    fontSize: 15,
                    padding: "12px 0",
                    background: "transparent",
                    cursor: "pointer",
                    color: search.type ? "#1a1c1c" : "#757575",
                  }}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  gap: 8,
                }}>
                <span style={{ color: "#757575", fontSize: 16 }}>💰</span>
                <select
                  value={search.price}
                  onChange={(e) =>
                    setSearch({ ...search, price: e.target.value })
                  }
                  style={{
                    border: "none",
                    width: "100%",
                    fontSize: 15,
                    padding: "12px 0",
                    background: "transparent",
                    cursor: "pointer",
                    color: search.price ? "#1a1c1c" : "#757575",
                  }}>
                  {PRICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* CTA */}
              <button
                onClick={handleSearch}
                style={{
                  background: "#b51b17",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "0 28px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                🔍 Tìm kiếm
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 32,
          }}>
          <div>
            <h2
              style={{
                fontFamily: "Manrope",
                fontWeight: 700,
                fontSize: 28,
                color: "#1a1c1c",
                margin: 0,
              }}>
              Khám phá theo danh mục
            </h2>
            <p
              style={{
                color: "#757575",
                fontSize: 15,
                marginTop: 8,
                marginBottom: 0,
              }}>
              Dễ dàng tìm thấy loại hình bất động sản bạn đang quan tâm
            </p>
          </div>
          <button
            style={{
              color: "#b51b17",
              fontWeight: 600,
              fontSize: 14,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}>
            Xem tất cả →
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24,
          }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.value}
              onClick={() => handleCategoryClick(cat)}
              style={{ cursor: "pointer" }}>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "1",
                  borderRadius: 20,
                  overflow: "hidden",
                  marginBottom: 12,
                }}>
                <img
                  src={cat.img}
                  alt={cat.label}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.5s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    color: "#fff",
                  }}>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                    {cat.label}
                  </p>
                  <p style={{ fontSize: 12, opacity: 0.8, margin: 0 }}>
                    {cat.count}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED LISTINGS ── */}
      <section style={{ background: "#f3f3f3", padding: "48px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 40,
            }}>
            <h2
              style={{
                fontFamily: "Manrope",
                fontWeight: 700,
                fontSize: 28,
                color: "#1a1c1c",
                margin: 0,
              }}>
              Tin đăng nổi bật
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() =>
                  setFilter((f) => ({
                    ...f,
                    page: Math.max(1, (f.page || 1) - 1),
                  }))
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "1px solid #E8E8E8",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                ‹
              </button>
              <button
                onClick={() =>
                  setFilter((f) => ({ ...f, page: (f.page || 1) + 1 }))
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "1px solid #E8E8E8",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                ›
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "3px solid #E8E8E8",
                  borderTopColor: "#b51b17",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                  margin: "0 auto",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : properties.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 56 }}>🏚️</div>
              <h5 style={{ color: "#757575", marginTop: 12 }}>
                Không tìm thấy bất động sản nào
              </h5>
              <p style={{ color: "#757575", fontSize: 14 }}>
                Thử thay đổi bộ lọc hoặc từ khóa
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 24,
              }}>
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link
              to="/search"
              style={{
                display: "inline-block",
                padding: "12px 36px",
                border: "1.5px solid #b51b17",
                color: "#b51b17",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                background: "#fff",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#b51b17";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.color = "#b51b17";
              }}>
              Xem thêm tin đăng
            </Link>
          </div>
        </div>
      </section>

      {/* ── MARKET TRENDS ── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "5fr 7fr",
            gap: 48,
            alignItems: "center",
          }}>
          {/* Left */}
          <div>
            <span
              style={{
                color: "#b51b17",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.04em",
                display: "block",
                marginBottom: 8,
              }}>
              DỮ LIỆU THỊ TRƯỜNG
            </span>
            <h2
              style={{
                fontFamily: "Manrope",
                fontWeight: 700,
                fontSize: 28,
                color: "#1a1c1c",
                marginBottom: 16,
                lineHeight: 1.3,
              }}>
              Xu hướng giá bất động sản 2024
            </h2>
            <p
              style={{
                color: "#757575",
                fontSize: 15,
                lineHeight: 1.7,
                marginBottom: 28,
              }}>
              Theo dõi biến động giá thị trường tại các khu vực trọng điểm để
              đưa ra quyết định đầu tư thông minh và chính xác nhất.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  icon: "📈",
                  city: "TP. Hồ Chí Minh",
                  pct: "+ 4.2% so với quý trước",
                  color: "#e8f4fe",
                },
                {
                  icon: "📊",
                  city: "Hà Nội",
                  pct: "+ 3.8% so với quý trước",
                  color: "#e8f4f8",
                },
              ].map((item) => (
                <div
                  key={item.city}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px",
                    borderRadius: 12,
                    background: "#fff",
                    border: "1px solid #E8E8E8",
                  }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: item.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}>
                    {item.icon}
                  </div>
                  <div>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1a1c1c",
                        margin: 0,
                      }}>
                      {item.city}
                    </p>
                    <p style={{ color: "#00A550", fontSize: 12, margin: 0 }}>
                      {item.pct}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – Chart */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              border: "1px solid #E8E8E8",
              boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { color: "#b51b17", label: "Chung cư" },
                  { color: "#006480", label: "Đất nền" },
                ].map((l) => (
                  <span
                    key={l.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                    }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: l.color,
                        display: "inline-block",
                      }}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
              <select
                style={{
                  border: "1px solid #E8E8E8",
                  borderRadius: 8,
                  fontSize: 12,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "#1a1c1c",
                }}>
                <option>12 tháng qua</option>
                <option>6 tháng qua</option>
              </select>
            </div>

            {/* Bars */}
            <div
              style={{
                height: 200,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 6,
                borderBottom: "1px solid #E8E8E8",
                borderLeft: "1px solid #E8E8E8",
                paddingBottom: 4,
                paddingLeft: 4,
                paddingRight: 4,
              }}>
              {[40, 45, 50, 48, 55, 60, 65, 72, 80].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: `rgba(181,27,23,${0.2 + i * 0.09})`,
                    borderRadius: "3px 3px 0 0",
                    transition: "all 0.3s",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  title={`${40 + i * 5}tr/m²`}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 10,
                color: "#757575",
                textTransform: "uppercase",
              }}>
              {[
                "Th1",
                "Th2",
                "Th3",
                "Th5",
                "Th7",
                "Th8",
                "Th9",
                "Th11",
                "Th12",
              ].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 64px" }}>
        <div
          style={{
            background: "#d9372d",
            borderRadius: 24,
            padding: "48px 40px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
          {/* Decorative circles */}
          <div
            style={{
              position: "absolute",
              top: -40,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -60,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
            }}
          />

          <h2
            style={{
              fontFamily: "Manrope",
              fontWeight: 700,
              fontSize: 28,
              color: "#fff",
              marginBottom: 12,
              position: "relative",
              zIndex: 1,
            }}>
            Nhận thông tin dự án mới nhất
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.88)",
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 520,
              margin: "0 auto 28px",
              position: "relative",
              zIndex: 1,
            }}>
            Đăng ký để không bỏ lỡ những cơ hội đầu tư và không gian sống mơ ước
            được gửi trực tiếp vào email của bạn.
          </p>
          <form
            style={{
              display: "flex",
              gap: 12,
              maxWidth: 480,
              margin: "0 auto",
              position: "relative",
              zIndex: 1,
            }}
            onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Địa chỉ email của bạn"
              style={{
                flex: 1,
                padding: "14px 20px",
                borderRadius: 12,
                border: "none",
                fontSize: 15,
                color: "#1a1c1c",
              }}
            />
            <button
              type="submit"
              style={{
                background: "#fff",
                color: "#b51b17",
                border: "none",
                borderRadius: 12,
                padding: "14px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              Đăng ký ngay
            </button>
          </form>
        </div>
      </section>

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
            <div style={{ display: "flex", gap: 10 }}>
              {["📘", "🐦"].map((icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#eeeeee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#b51b17")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#eeeeee")
                  }>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
