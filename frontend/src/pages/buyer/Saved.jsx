import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

function formatPrice(price) {
  if (price >= 1000000000) return (price / 1000000000).toFixed(1) + " tỷ";
  if (price >= 1000000) return (price / 1000000).toFixed(0) + " triệu";
  return price.toLocaleString() + " đ";
}

export default function Saved() {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/api/contact/saved");
        setSaved(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleUnsave = async (propertyId) => {
    try {
      await api.delete(`/api/contact/saved/${propertyId}`);
      setSaved((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <Navbar />

      <div className="container py-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h5 className="fw-bold mb-0">Tin đã lưu</h5>
          <span className="badge bg-secondary">{saved.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-secondary" />
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: 64 }}>🤍</div>
            <h5 className="text-muted mt-3">Chưa có tin nào được lưu</h5>
            <p className="text-muted small">
              Nhấn vào biểu tượng ❤️ trên tin đăng để lưu lại
            </p>
            <Link to="/" className="btn btn-danger mt-2">
              Tìm kiếm BĐS
            </Link>
          </div>
        ) : (
          <div className="row g-3">
            {saved.map((p) => (
              <div key={p.id} className="col-md-6 col-lg-4">
                <div
                  className="card border-0 shadow-sm h-100"
                  style={{ borderRadius: 12, overflow: "hidden" }}>
                  {/* Ảnh */}
                  <div
                    style={{
                      height: 180,
                      background: "#eee",
                      position: "relative",
                      overflow: "hidden",
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
                      <div className="d-flex align-items-center justify-content-center h-100">
                        <span style={{ fontSize: 48 }}>🏠</span>
                      </div>
                    )}
                    <span
                      className="badge position-absolute top-0 start-0 m-2"
                      style={{
                        background:
                          p.transaction_type === "sale" ? "#e74c3c" : "#2980b9",
                        borderRadius: 6,
                      }}>
                      {p.transaction_type === "sale" ? "Bán" : "Cho thuê"}
                    </span>
                    {/* Nút bỏ lưu */}
                    <button
                      onClick={() => handleUnsave(p.id)}
                      className="btn btn-sm position-absolute top-0 end-0 m-2"
                      style={{
                        background: "rgba(255,255,255,0.9)",
                        borderRadius: 8,
                        border: "none",
                        padding: "4px 8px",
                      }}
                      title="Bỏ lưu">
                      ❤️
                    </button>
                  </div>

                  <div className="card-body p-3">
                    <h6
                      className="fw-bold mb-1"
                      style={{
                        fontSize: 14,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                      {p.title}
                    </h6>
                    <p
                      className="text-danger fw-bold mb-1"
                      style={{ fontSize: 15 }}>
                      {formatPrice(p.price)}
                    </p>
                    <p className="text-muted mb-3" style={{ fontSize: 12 }}>
                      📐 {p.area} m² · 📍 {p.city}
                    </p>
                    <div className="d-flex gap-2">
                      <Link
                        to={`/property/${p.id}`}
                        className="btn btn-sm flex-grow-1 text-white"
                        style={{
                          background: "#2c5364",
                          borderRadius: 8,
                          border: "none",
                          fontSize: 13,
                        }}>
                        Xem chi tiết
                      </Link>
                      <button
                        onClick={() => handleUnsave(p.id)}
                        className="btn btn-sm btn-outline-secondary"
                        style={{ borderRadius: 8, fontSize: 13 }}>
                        Bỏ lưu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-4 mt-4 border-top bg-white">
        <p className="text-muted small mb-0">© 2026 BDS Platform</p>
      </footer>
    </div>
  );
}
