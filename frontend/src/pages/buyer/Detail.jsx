import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import LeafletMap from "../../components/LeafletMap";
import { useAuth } from "../../context/AuthContext";
import UiIcon from "../../components/UiIcon";
import SiteFooter from "../../components/SiteFooter";
import PropertyMeta from "../../components/PropertyMeta";
import { useToast } from "../../components/ToastProvider";
import {
  DIRECTION_LABEL,
  LEGAL_LABEL,
  TYPE_LABEL,
  formatPrice,
} from "../../shared/property";

export default function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const [contact, setContact] = useState({ message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [existingContact, setExistingContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let res;
        if (["owner", "admin"].includes(user?.role)) {
          try {
            res = await api.get(`/api/property/${id}`);
          } catch {
            res = await api.get(`/api/listing/${id}`);
          }
        } else {
          res = await api.get(`/api/listing/${id}`);
        }
        const imgs = res.data.images;
        if (typeof imgs === "string") {
          res.data.images = imgs ? imgs.split(",") : [];
        }
        setProperty(res.data);

        if (user?.role === "buyer") {
          const [savedRes, contactsRes] = await Promise.all([
            api.get("/api/contact/saved"),
            api.get("/api/contact/buyer", { params: { limit: 100 } }),
          ]);
          setSaved(savedRes.data.some((p) => p.id === parseInt(id)));
          const sentContact = (contactsRes.data.data || []).find(
            (item) => Number(item.property_id) === Number(id),
          );
          setExistingContact(sentContact || null);
          setContactSent(!!sentContact);
        }
        if (user?.role === "owner") {
          const contactsRes = await api.get("/api/contact/buyer", {
            params: { limit: 100 },
          });
          const sentContact = (contactsRes.data.data || []).find(
            (item) => Number(item.property_id) === Number(id),
          );
          setExistingContact(sentContact || null);
          setContactSent(!!sentContact);
        }

        if (res.data.status === "approved") {
          try {
            const simRes = await api.get(`/api/listing/${id}/similar`);
            setSimilar(simRes.data.data || []);
          } catch {}
        }
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user?.role]);

  const handleSave = async () => {
    if (!user) return navigate("/login");
    try {
      if (saved) {
        await api.delete(`/api/contact/saved/${id}`);
      } else {
        await api.post("/api/contact/saved", { property_id: id });
      }
      setSaved(!saved);
      showToast(saved ? "Đã bỏ lưu tin quan tâm" : "Đã lưu tin quan tâm");
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể cập nhật tin đã lưu", "error");
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
      setExistingContact({
        property_id: Number(id),
        message: contact.message,
        status: "pending",
        lead_status: "new",
        created_at: new Date().toISOString(),
      });
      setContactSent(true);
      showToast("Đã gửi yêu cầu liên hệ. Người bán sẽ phản hồi trong hệ thống.");
    } catch (err) {
      const message = err.response?.data?.message || "Gửi thất bại";
      setContactError(message);
      showToast(message, "error");
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
    property.featured_until && new Date(property.featured_until) > new Date();
  const canSaveAsBuyer = !user || user.role === "buyer";
  const canManageProperty =
    user?.role === "admin" ||
    (user?.role === "owner" && Number(property.owner_id) === Number(user.id));
  const openImageViewer = (index = 0) => {
    if (images.length === 0) return;
    setActiveImg(Math.max(0, Math.min(index, images.length - 1)));
    setShowAllImages(true);
  };
  const showPrevImage = () =>
    setActiveImg((current) => (current - 1 + images.length) % images.length);
  const showNextImage = () =>
    setActiveImg((current) => (current + 1) % images.length);

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
              onClick={() => openImageViewer(0)}>
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
                  <UiIcon name="home" size={72} style={{ opacity: 0.3 }} />
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
                  onClick={() => openImageViewer(i)}>
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
                        openImageViewer(0);
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

      {showAllImages && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Danh sách hình ảnh bất động sản"
          onClick={() => setShowAllImages(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            color: "#fff",
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderBottom: "1px solid rgba(255,255,255,0.16)",
              fontFamily: "Inter, sans-serif",
            }}>
            <strong style={{ fontSize: 15 }}>
              Ảnh {activeImg + 1}/{images.length}
            </strong>
            <button
              type="button"
              onClick={() => setShowAllImages(false)}
              aria-label="Đóng thư viện ảnh"
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.32)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 22,
                lineHeight: 1,
              }}>
              ×
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: images.length > 1 ? "72px 1fr 72px" : "1fr",
              alignItems: "center",
              gap: 16,
              padding: "24px",
            }}>
            {images.length > 1 && (
              <button
                type="button"
                onClick={showPrevImage}
                aria-label="Ảnh trước"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 30,
                  justifySelf: "center",
                }}>
                ‹
              </button>
            )}
            <div
              style={{
                minHeight: 0,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <img
                src={images[activeImg]}
                alt={`Ảnh bất động sản ${activeImg + 1}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: 8,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
                }}
              />
            </div>
            {images.length > 1 && (
              <button
                type="button"
                onClick={showNextImage}
                aria-label="Ảnh tiếp theo"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 30,
                  justifySelf: "center",
                }}>
                ›
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                padding: "14px 24px 20px",
                borderTop: "1px solid rgba(255,255,255,0.16)",
              }}>
              {images.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setActiveImg(index)}
                  aria-label={`Xem ảnh ${index + 1}`}
                  style={{
                    flex: "0 0 92px",
                    height: 68,
                    borderRadius: 6,
                    border:
                      activeImg === index
                        ? "3px solid #fff"
                        : "1px solid rgba(255,255,255,0.28)",
                    padding: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "transparent",
                  }}>
                  <img
                    src={src}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
              {canSaveAsBuyer && (
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
                  <UiIcon name="heart" size={17} fill={saved ? "#b51b17" : "none"} />
                  {saved ? "Đã lưu" : "Lưu tin"}
                </button>
              )}
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
              <UiIcon name="location" size={17} />
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
                    icon: "area",
                    label: "Diện tích",
                    value: `${property.area} m²`,
                  },
                  {
                    icon: "tag",
                    label: "Loại hình",
                    value: TYPE_LABEL[property.type] || property.type,
                  },
                  ...(property.bedrooms != null
                    ? [
                        {
                          icon: "bed",
                          label: "Phòng ngủ",
                          value: `${property.bedrooms} PN`,
                        },
                      ]
                    : []),
                  ...(property.bathrooms != null
                    ? [
                        {
                          icon: "bath",
                          label: "Phòng tắm",
                          value: `${property.bathrooms} WC`,
                        },
                      ]
                    : []),
                  ...(property.direction
                    ? [
                        {
                          icon: "compass",
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
                          icon: "clipboard",
                          label: "Pháp lý",
                          value:
                            LEGAL_LABEL[property.legal_status] ||
                            property.legal_status,
                        },
                      ]
                    : []),
                  {
                    icon: "calendar",
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
                        <UiIcon name={item.icon} size={20} />
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
            {/* Contact form */}
            {canManageProperty ? (
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
                    marginBottom: 10,
                  }}>
                  Chế độ quản lý
                </h3>
                <p
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: "#757575",
                    lineHeight: 1.6,
                    marginBottom: 16,
                  }}>
                  Bạn đang xem chi tiết tin đăng bằng quyền quản lý.
                </p>
                {user?.role === "owner" && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <Link
                      to="/owner/dashboard"
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: "#b51b17",
                        color: "#fff",
                        padding: "12px 0",
                        borderRadius: 8,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}>
                      Quay lại quản lý tin
                    </Link>
                    {property.status !== "sold" && (
                      <Link
                        to={`/owner/edit/${property.id}`}
                        style={{
                          display: "block",
                          textAlign: "center",
                          background: "#fff",
                          color: "#b51b17",
                          padding: "10px 0",
                          borderRadius: 8,
                          border: "1px solid #b51b17",
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}>
                        Chỉnh sửa tin đăng
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : (
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
                <div style={{ padding: "6px 0 2px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: "#e6f9f0",
                      border: "1px solid #b9dfd3",
                      marginBottom: 14,
                    }}>
                    <UiIcon name="success" size={30} color="#0f6e56" />
                    <div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#0f6e56",
                          margin: "0 0 4px",
                        }}>
                        Bạn đã gửi yêu cầu liên hệ
                      </p>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          color: "#3f5f55",
                          margin: 0,
                          lineHeight: 1.55,
                        }}>
                        Người bán đã nhận được thông tin. Bạn có thể theo dõi
                        phản hồi trong mục yêu cầu liên hệ.
                      </p>
                    </div>
                  </div>

                  {existingContact?.message && (
                    <div
                      style={{
                        background: "#f9f9f9",
                        borderLeft: "4px solid #E8E8E8",
                        borderRadius: "0 8px 8px 0",
                        padding: "12px 14px",
                        marginBottom: 12,
                      }}>
                      <div
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#757575",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          marginBottom: 6,
                        }}>
                        Nội dung đã gửi
                      </div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 14,
                          color: "#5f5e5e",
                          fontStyle: "italic",
                          margin: 0,
                          lineHeight: 1.6,
                        }}>
                        "{existingContact.message}"
                      </p>
                    </div>
                  )}

                  {existingContact?.owner_reply && (
                    <div
                      style={{
                        background: "#fff0ef",
                        border: "1px solid #ffb4aa",
                        borderRadius: 10,
                        padding: "12px 14px",
                        marginBottom: 12,
                      }}>
                      <div
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#b51b17",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          marginBottom: 6,
                        }}>
                        Phản hồi từ người bán
                      </div>
                      <p
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 14,
                          color: "#1a1c1c",
                          margin: 0,
                          lineHeight: 1.6,
                        }}>
                        {existingContact.owner_reply}
                      </p>
                    </div>
                  )}

                  <Link
                    to="/profile?tab=contacts"
                    style={{
                      display: "block",
                      textAlign: "center",
                      background: "#1a1c1c",
                      color: "#fff",
                      padding: "11px 0",
                      borderRadius: 8,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}>
                    Xem yêu cầu đã gửi
                  </Link>
                </div>
              ) : !user ? (
                <div>
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 14,
                      color: "#5f5e5e",
                      lineHeight: 1.6,
                      marginBottom: 14,
                    }}>
                    Đăng nhập để hệ thống tự dùng thông tin tài khoản của bạn
                    khi gửi yêu cầu liên hệ.
                  </p>
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

                  <div
                    style={{
                      background: "#f9f9f9",
                      border: "1px solid #E8E8E8",
                      borderRadius: 10,
                      padding: "12px 14px",
                      marginBottom: 12,
                    }}>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#757575",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                        marginBottom: 8,
                      }}>
                      Thông tin người gửi
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1a1c1c",
                        marginBottom: 4,
                      }}>
                      {user.full_name || "Người dùng"}
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        color: "#5f5e5e",
                      }}>
                      {user.email || "Chưa cập nhật email"}
                    </div>
                  </div>

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
                </form>
              )}
              </div>
            )}

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
                          <UiIcon name="home" size={40} style={{ opacity: 0.4 }} />
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
                        <PropertyMeta property={p} showLocation />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

