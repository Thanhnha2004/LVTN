import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

function formatPrice(price) {
  if (price >= 1000000000) return (price / 1000000000).toFixed(1) + " tỷ";
  if (price >= 1000000) return (price / 1000000).toFixed(0) + " triệu";
  return price.toLocaleString() + " đ";
}

export default function Detail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [saved, setSaved] = useState(false);
  const [contact, setContact] = useState({ message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/api/listing/${id}`);
        const imgs = res.data.images;
        if (typeof imgs === "string") {
          res.data.images = imgs ? imgs.split(",") : [];
        }
        setProperty(res.data);

        // Thêm đoạn này để kiểm tra đã lưu chưa
        if (user?.role === "buyer") {
          const savedRes = await api.get("/api/contact/saved");
          const isSaved = savedRes.data.some((p) => p.id === parseInt(id));
          setSaved(isSaved);
        }
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    fetch();
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

  if (loading)
    return (
      <div>
        <Navbar />
        <div className="text-center py-5">
          <div className="spinner-border" />
        </div>
      </div>
    );

  if (!property) return null;

  const images = Array.isArray(property.images) ? property.images : [];

  const typeLabel = {
    apartment: "Căn hộ",
    house: "Nhà phố",
    land: "Đất nền",
    office: "Văn phòng",
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <Navbar />

      <div className="container py-4">
        {/* Breadcrumb */}
        <nav className="mb-3">
          <ol className="breadcrumb small">
            <li className="breadcrumb-item">
              <Link to="/">Trang chủ</Link>
            </li>
            <li className="breadcrumb-item active">{property.title}</li>
          </ol>
        </nav>

        <div className="row g-4">
          {/* Left */}
          <div className="col-lg-8">
            {/* Ảnh */}
            <div
              className="card border-0 shadow-sm mb-4"
              style={{ borderRadius: 12, overflow: "hidden" }}>
              <div
                style={{
                  height: 420,
                  background: "#eee",
                  position: "relative",
                }}>
                {images.length > 0 ? (
                  <img
                    src={images[activeImg]}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <span style={{ fontSize: 80 }}>🏠</span>
                  </div>
                )}
                <span
                  className="badge position-absolute top-0 start-0 m-3"
                  style={{
                    background:
                      property.transaction_type === "sale"
                        ? "#e74c3c"
                        : "#2980b9",
                    fontSize: 13,
                    padding: "6px 12px",
                    borderRadius: 8,
                  }}>
                  {property.transaction_type === "sale" ? "Bán" : "Cho thuê"}
                </span>
              </div>

              {/* Thumbnail list */}
              {images.length > 1 && (
                <div className="d-flex gap-2 p-3" style={{ overflowX: "auto" }}>
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      onClick={() => setActiveImg(i)}
                      style={{
                        width: 80,
                        height: 60,
                        objectFit: "cover",
                        borderRadius: 8,
                        cursor: "pointer",
                        border:
                          i === activeImg
                            ? "3px solid #2c5364"
                            : "3px solid transparent",
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thông tin */}
            <div
              className="card border-0 shadow-sm p-4 mb-4"
              style={{ borderRadius: 12 }}>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h4 className="fw-bold mb-0" style={{ lineHeight: 1.4 }}>
                  {property.title}
                </h4>
                <button
                  className="btn btn-outline-secondary btn-sm ms-2"
                  onClick={handleSave}
                  style={{ borderRadius: 8, minWidth: 90 }}>
                  {saved ? "❤️ Đã lưu" : "🤍 Lưu tin"}
                </button>
              </div>

              <p className="text-danger fw-bold mb-3" style={{ fontSize: 22 }}>
                {formatPrice(property.price)}
                {property.transaction_type === "rent" && (
                  <span className="text-muted fw-normal fs-6">/tháng</span>
                )}
              </p>

              {/* Thông số */}
              <div className="row g-3 mb-4">
                {[
                  {
                    icon: "📐",
                    label: "Diện tích",
                    value: `${property.area} m²`,
                  },
                  {
                    icon: "🏷️",
                    label: "Loại hình",
                    value: typeLabel[property.type] || property.type,
                  },
                  { icon: "📍", label: "Khu vực", value: property.city },
                  {
                    icon: "🕐",
                    label: "Ngày đăng",
                    value: new Date(property.created_at).toLocaleDateString(
                      "vi-VN",
                    ),
                  },
                ].map((item, i) => (
                  <div key={i} className="col-6 col-md-3">
                    <div
                      className="p-3 rounded text-center"
                      style={{ background: "#f8f9fa" }}>
                      <div style={{ fontSize: 22 }}>{item.icon}</div>
                      <div className="text-muted small">{item.label}</div>
                      <div className="fw-semibold small">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <h6 className="fw-bold mb-2">Địa chỉ</h6>
              <p className="text-muted mb-3">
                📍 {property.address}, {property.city}
              </p>

              <h6 className="fw-bold mb-2">Mô tả</h6>
              <p
                className="text-muted"
                style={{ lineHeight: 1.8, whiteSpace: "pre-line" }}>
                {property.description || "Chưa có mô tả."}
              </p>
            </div>
          </div>

          {/* Right */}
          <div className="col-lg-4">
            {/* Thông tin Owner */}
            <div
              className="card border-0 shadow-sm p-4 mb-4"
              style={{ borderRadius: 12 }}>
              <h6 className="fw-bold mb-3">Thông tin chủ nhà</h6>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{
                    width: 48,
                    height: 48,
                    background: "#2c5364",
                    fontSize: 20,
                  }}>
                  {property.owner_name?.charAt(0)}
                </div>
                <div>
                  <div className="fw-semibold">{property.owner_name}</div>
                  <div className="text-muted small">{property.owner_email}</div>
                </div>
              </div>
            </div>

            {/* Form liên hệ */}
            <div
              className="card border-0 shadow-sm p-4"
              style={{ borderRadius: 12 }}>
              <h6 className="fw-bold mb-3">Gửi yêu cầu liên hệ</h6>

              {contactSent ? (
                <div className="text-center py-3">
                  <div style={{ fontSize: 48 }}>✅</div>
                  <p className="fw-semibold mt-2 mb-1">Đã gửi thành công!</p>
                  <p className="text-muted small">
                    Chủ nhà sẽ phản hồi sớm nhất có thể.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContact}>
                  {contactError && (
                    <div className="alert alert-danger py-2 small">
                      {contactError}
                    </div>
                  )}
                  <div className="mb-3">
                    <textarea
                      className="form-control"
                      rows={4}
                      placeholder="Tôi muốn hỏi thêm về bất động sản này..."
                      required
                      value={contact.message}
                      onChange={(e) => setContact({ message: e.target.value })}
                      style={{ borderRadius: 8, resize: "none" }}
                    />
                  </div>
                  {!user ? (
                    <Link
                      to="/login"
                      className="btn w-100 text-white"
                      style={{
                        background: "#2c5364",
                        borderRadius: 8,
                        border: "none",
                      }}>
                      Đăng nhập để liên hệ
                    </Link>
                  ) : (
                    <button
                      type="submit"
                      className="btn w-100 text-white"
                      disabled={contactLoading}
                      style={{
                        background: "#2c5364",
                        borderRadius: 8,
                        border: "none",
                      }}>
                      {contactLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Đang gửi...
                        </>
                      ) : (
                        "Gửi liên hệ"
                      )}
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 mt-4 border-top bg-white">
        <p className="text-muted small mb-0">© 2026 BDS Platform</p>
      </footer>
    </div>
  );
}
