import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import LeafletMap from "../../components/LeafletMap";
import { useAuth } from "../../context/AuthContext";

function formatPrice(price) {
  if (price >= 1000000000) return (price / 1000000000).toFixed(1) + " tỷ";
  if (price >= 1000000) return (price / 1000000).toFixed(0) + " triệu";
  return price.toLocaleString() + " đ";
}

const TYPE_LABEL = {
  apartment: "Căn hộ",
  house: "Nhà phố",
  land: "Đất nền",
  office: "Văn phòng",
};

const DIRECTION_LABEL = {
  north: "Bắc",
  south: "Nam",
  east: "Đông",
  west: "Tây",
  northeast: "Đông Bắc",
  northwest: "Tây Bắc",
  southeast: "Đông Nam",
  southwest: "Tây Nam",
};

const LEGAL_LABEL = {
  sohong: "Sổ hồng",
  sokhongdo: "Sổ đỏ",
  dangchoso: "Đang chờ sổ",
  other: "Khác",
};

export default function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/api/listing/${id}`);
        const imgs = res.data.images;
        if (typeof imgs === "string") {
          res.data.images = imgs ? imgs.split(",") : [];
        }
        setProperty(res.data);

        if (user?.role === "buyer") {
          const savedRes = await api.get("/api/contact/saved");
          setSaved(savedRes.data.some((p) => p.id === parseInt(id)));
        }

        try {
          const simRes = await api.get(`/api/listing/${id}/similar`);
          setSimilar(simRes.data.data || []);
        } catch {}
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!user) return navigate("/login");
    try {
      if (saved) {
        await api.delete(`/api/contact/saved/${id}`);
      } else {
        await api.post("/api/contact/saved", { property_id: id });
      }
      setSaved(!saved);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContact = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    setContactLoading(true);
    setContactError("");
    try {
      await api.post("/api/contact", {
        property_id: id,
        message: contact.message,
      });
      setContactSent(true);
    } catch (err) {
      setContactError(err.response?.data?.message || "Gửi thất bại");
    } finally {
      setContactLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
        <Navbar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 120,
          }}>
          <div className="spinner-border text-danger" />
        </div>
      </div>
    );
  }

  if (!property) return null;

  const images = Array.isArray(property.images) ? property.images : [];
  const isFeatured =
    property.is_featured &&
    (!property.featured_until || new Date(property.featured_until) > new Date());

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      <Navbar />

      {/* ── BREADCRUMB ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8E8E8" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 40px" }}>
          <nav
            style={{
              fontSize: 13,
              color: "#757575",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}>
            <Link to="/" style={{ color: "#757575", textDecoration: "none" }}>
              Trang chủ
            </Link>
            <span>›</span>
            <span style={{ color: "#757575" }}>{property.city}</span>
            <span>›</span>
            <span
              style={{
                color: "#1a1c1c",
                maxWidth: 300,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
              {property.title}
            </span>
          </nav>
        </div>
      </div>

      {/* ── IMAGE GALLERY ── */}
      <div style={{ background: "#f9f9f9" }}>
        <div
          style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 40px 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 2fr",
              gap: 6,
              borderRadius: 12,
              overflow: "hidden",
            }}>
            {/* Main image */}
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                height: 480,
                cursor: "pointer",
              }}
              onClick={() => setActiveImg(0)}>
              {images[0] ? (
                <img
                  src={images[0]}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#e8e8e8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <span style={{ fontSize: 72, opacity: 0.3 }}>🏠</span>
                </div>
              )}
              {/* Transaction badge */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  background:
                    property.transaction_type === "sale"
                      ? "#b51b17"
                      : "#006480",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 4,
                  fontFamily: "Inter, sans-serif",
                }}>
                {property.transaction_type === "sale" ? "Bán" : "Cho thuê"}
              </div>
              {isFeatured && (
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 88,
                    background: "#d97706",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 4,
                    fontFamily: "Inter, sans-serif",
                  }}>
                  NỔI BẬT
                </div>
              )}
            </div>

            {/* Right column: 2 stacked images */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    flex: 1,
                    cursor: images[i] ? "pointer" : "default",
                  }}
                  onClick={() => images[i] && setActiveImg(i)}>
                  {images[i] ? (
                    <img
                      src={images[i]}
                      alt=""
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
                        background: "#e8e8e8",
                      }}
                    />
                  )}
                  {/* "See more" overlay on last cell */}
                  {i === 2 && images.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllImages(true);
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        border: "none",
                        color: "#fff",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}>
                      <span style={{ fontSize: 28 }}>⊞</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 600,
                        }}>
                        Xem thêm {images.length - 3} ảnh
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 32,
            alignItems: "start",
          }}>
          {/* LEFT COLUMN */}
          <div>
            {/* Title + Save */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 8,
              }}>
              <h1
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  lineHeight: 1.3,
                  margin: 0,
                }}>
                {property.title}
              </h1>
              <button
                onClick={handleSave}
                style={{
                  flexShrink: 0,
                  background: saved ? "#fff0ef" : "#fff",
                  border: `1.5px solid ${saved ? "#b51b17" : "#E8E8E8"}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: saved ? "#b51b17" : "#5f5e5e",
                  transition: "all 0.15s",
                }}>
                {saved ? "❤️" : "🤍"} {saved ? "Đã lưu" : "Lưu tin"}
              </button>
            </div>

            {/* Location */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 20,
                color: "#757575",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
              }}>
              <span>📍</span>
              <span>
                {property.address && `${property.address}, `}
                {property.city}
              </span>
            </div>

            {/* Price + Key stats */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 24,
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 16,
                }}>
                <span
                  style={{
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#b51b17",
                  }}>
                  {formatPrice(property.price)}
                </span>
                {property.transaction_type === "rent" && (
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      color: "#757575",
                    }}>
                    /tháng
                  </span>
                )}
                {property.area && (
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      color: "#757575",
                      marginLeft: 8,
                    }}>
                    · ~{Math.round(property.price / property.area / 1000000)}{" "}
                    triệu/m²
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}>
                {[
                  {
                    icon: "📐",
                    label: "Diện tích",
                    value: `${property.area} m²`,
                  },
                  {
                    icon: "🏷️",
                    label: "Loại hình",
                    value: TYPE_LABEL[property.type] || property.type,
                  },
                  ...(property.bedrooms != null
                    ? [
                        {
                          icon: "🛏️",
                          label: "Phòng ngủ",
                          value: `${property.bedrooms} PN`,
                        },
                      ]
                    : []),
                  ...(property.bathrooms != null
                    ? [
                        {
                          icon: "🚿",
                          label: "Phòng tắm",
                          value: `${property.bathrooms} WC`,
                        },
                      ]
                    : []),
                  ...(property.direction
                    ? [
                        {
                          icon: "🧭",
                          label: "Hướng",
                          value:
                            DIRECTION_LABEL[property.direction] ||
                            property.direction,
                        },
                      ]
                    : []),
                  ...(property.legal_status
                    ? [
                        {
                          icon: "📋",
                          label: "Pháp lý",
                          value:
                            LEGAL_LABEL[property.legal_status] ||
                            property.legal_status,
                        },
                      ]
                    : []),
                  {
                    icon: "🗓️",
                    label: "Ngày đăng",
                    value: new Date(property.created_at).toLocaleDateString(
                      "vi-VN",
                    ),
                  },
                ]
                  .slice(0, 4)
                  .map((item, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#f9f9f9",
                        borderRadius: 8,
                        padding: "12px 14px",
                        textAlign: "center",
                      }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>
                        {item.icon}
                      </div>
                      <div
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          color: "#757575",
                          marginBottom: 2,
                        }}>
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1a1c1c",
                        }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Description */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 12,
                padding: "24px",
                marginBottom: 24,
              }}>
              <h2
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  marginBottom: 16,
                  marginTop: 0,
                }}>
                Thông tin chi tiết
              </h2>

              {/* Full details grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px 24px",
                  marginBottom: 20,
                }}>
                {[
                  {
                    label: "Loại hình",
                    value: TYPE_LABEL[property.type] || property.type,
                  },
                  {
                    label: "Giao dịch",
                    value:
                      property.transaction_type === "sale" ? "Bán" : "Cho thuê",
                  },
                  ...(property.area
                    ? [{ label: "Diện tích", value: `${property.area} m²` }]
                    : []),
                  ...(property.bedrooms != null
                    ? [
                        {
                          label: "Phòng ngủ",
                          value: `${property.bedrooms} phòng ngủ`,
                        },
                      ]
                    : []),
                  ...(property.bathrooms != null
                    ? [
                        {
                          label: "Phòng tắm",
                          value: `${property.bathrooms} phòng tắm`,
                        },
                      ]
                    : []),
                  ...(property.direction
                    ? [
                        {
                          label: "Hướng nhà",
                          value:
                            DIRECTION_LABEL[property.direction] ||
                            property.direction,
                        },
                      ]
                    : []),
                  ...(property.legal_status
                    ? [
                        {
                          label: "Pháp lý",
                          value:
                            LEGAL_LABEL[property.legal_status] ||
                            property.legal_status,
                        },
                      ]
                    : []),
                  { label: "Tỉnh / Thành phố", value: property.city },
                  ...(property.district
                    ? [{ label: "Quận / Huyện", value: property.district }]
                    : []),
                  ...(property.ward
                    ? [{ label: "Phường / Xã", value: property.ward }]
                    : []),
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid #f3f3f3",
                    }}>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        color: "#757575",
                      }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#1a1c1c",
                      }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Description text */}
              {property.description && (
                <>
                  <h3
                    style={{
                      fontFamily: "Manrope, sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#1a1c1c",
                      marginBottom: 12,
                      marginTop: 20,
                    }}>
                    Mô tả
                  </h3>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 15,
                      color: "#5f5e5e",
                      lineHeight: 1.8,
                      whiteSpace: "pre-line",
                      margin: 0,
                    }}>
                    {property.description}
                  </p>
                </>
              )}
            </div>

            {/* Map */}
            {property.latitude && property.longitude && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #E8E8E8",
                  borderRadius: 12,
                  padding: "24px",
                  marginBottom: 24,
                }}>
                <h2
                  style={{
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#1a1c1c",
                    marginBottom: 16,
                    marginTop: 0,
                  }}>
                  Vị trí bất động sản
                </h2>
                <LeafletMap
                  height={280}
                  zoom={15}
                  markers={[
                    {
                      id: property.id,
                      title: property.title,
                      price: property.price,
                      address: `${property.address || ""}, ${property.city || ""}`,
                      latitude: property.latitude,
                      longitude: property.longitude,
                    },
                  ]}
                />
                <a
                  href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    color: "#b51b17",
                    textDecoration: "none",
                    fontWeight: 600,
                    marginTop: 10,
                  }}>
                  Xem trên Google Maps →
                </a>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — STICKY SIDEBAR */}
          <div style={{ position: "sticky", top: 80 }}>
            {/* Agent / Owner card */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 16,
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #b51b17, #d9372d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 20,
                    fontFamily: "Manrope, sans-serif",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                  {property.owner_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Manrope, sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#1a1c1c",
                    }}>
                    {property.owner_name}
                  </div>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "#00A550",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#00A550",
                      }}
                    />
                    Đang hoạt động
                  </div>
                </div>
              </div>

              {/* Call button */}
              <a
                href={`tel:${property.owner_phone || ""}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "#b51b17",
                  color: "#fff",
                  padding: "12px 0",
                  borderRadius: 8,
                  marginBottom: 10,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  letterSpacing: 0.5,
                }}>
                📞{" "}
                {property.owner_phone
                  ? property.owner_phone.replace(/(\d{4})(\d+)/, "$1 ***")
                  : "Xem số điện thoại"}
              </a>

              {/* Request button */}
              <button
                style={{
                  display: "block",
                  width: "100%",
                  background: "#fff",
                  color: "#b51b17",
                  border: "1.5px solid #b51b17",
                  padding: "10px 0",
                  borderRadius: 8,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}>
                Gửi yêu cầu
              </button>
            </div>

            {/* Contact form */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 12,
                padding: "20px 24px",
                marginBottom: 16,
              }}>
              <h3
                style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  marginTop: 0,
                  marginBottom: 16,
                }}>
                Gửi tin nhắn cho người bán
              </h3>

              {contactSent ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1a1c1c",
                      margin: "0 0 4px",
                    }}>
                    Đã gửi thành công!
                  </p>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: "#757575",
                      margin: 0,
                    }}>
                    Người bán sẽ phản hồi sớm nhất có thể.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContact}>
                  {contactError && (
                    <div
                      style={{
                        background: "#ffdad6",
                        color: "#93000a",
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontFamily: "Inter, sans-serif",
                        marginBottom: 12,
                      }}>
                      {contactError}
                    </div>
                  )}

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Họ và tên"
                    style={{ borderRadius: 8, marginBottom: 10, fontSize: 14 }}
                    value={contact.name}
                    onChange={(e) =>
                      setContact({ ...contact, name: e.target.value })
                    }
                  />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email liên hệ"
                    style={{ borderRadius: 8, marginBottom: 10, fontSize: 14 }}
                    value={contact.email}
                    onChange={(e) =>
                      setContact({ ...contact, email: e.target.value })
                    }
                  />
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Tôi quan tâm đến bất động sản này..."
                    required
                    style={{
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 14,
                      resize: "none",
                    }}
                    value={contact.message}
                    onChange={(e) =>
                      setContact({ ...contact, message: e.target.value })
                    }
                  />

                  {!user ? (
                    <Link
                      to="/login"
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: "#1a1c1c",
                        color: "#fff",
                        padding: "12px 0",
                        borderRadius: 8,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}>
                      Đăng nhập để liên hệ
                    </Link>
                  ) : (
                    <button
                      type="submit"
                      disabled={contactLoading}
                      style={{
                        width: "100%",
                        background: "#1a1c1c",
                        color: "#fff",
                        border: "none",
                        padding: "12px 0",
                        borderRadius: 8,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: contactLoading ? "not-allowed" : "pointer",
                      }}>
                      {contactLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Đang gửi...
                        </>
                      ) : (
                        "Gửi tin nhắn"
                      )}
                    </button>
                  )}
                </form>
              )}
            </div>

          </div>
        </div>

        {/* ── SIMILAR PROPERTIES ── */}
        {similar.length > 0 && (
          <section style={{ marginTop: 48 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 20,
              }}>
              <div>
                <h2
                  style={{
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1a1c1c",
                    margin: 0,
                  }}>
                  Bất động sản tương tự
                </h2>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: "#757575",
                    margin: "4px 0 0",
                  }}>
                  Các lựa chọn khác tại khu vực {property.city}
                </p>
              </div>
              <Link
                to="/"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#b51b17",
                  textDecoration: "none",
                }}>
                Xem tất cả →
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}>
              {similar.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to={`/property/${p.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid #E8E8E8",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "";
                    }}>
                    <div
                      style={{
                        height: 170,
                        overflow: "hidden",
                        background: "#eeeeee",
                        position: "relative",
                      }}>
                      {p.thumbnail ? (
                        <img
                          src={p.thumbnail}
                          alt={p.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "#e8e8e8",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                          <span style={{ fontSize: 40, opacity: 0.4 }}>🏠</span>
                        </div>
                      )}
                      <span
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          background:
                            p.transaction_type === "sale"
                              ? "#b51b17"
                              : "#006480",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontFamily: "Inter, sans-serif",
                        }}>
                        {p.transaction_type === "sale" ? "Bán" : "Cho thuê"}
                      </span>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <p
                        style={{
                          fontFamily: "Manrope, sans-serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#b51b17",
                          margin: "0 0 6px",
                        }}>
                        {formatPrice(p.price)}
                      </p>
                      <h4
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1a1c1c",
                          margin: "0 0 8px",
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}>
                        {p.title}
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          fontFamily: "Inter, sans-serif",
                          fontSize: 12,
                          color: "#757575",
                        }}>
                        {p.bedrooms != null && <span>🛏 {p.bedrooms}</span>}
                        {p.area && <span>📐 {p.area}m²</span>}
                        <span>📍 {p.city}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
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
