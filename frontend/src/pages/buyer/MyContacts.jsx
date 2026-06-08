import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

export default function MyContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/api/contact/buyer");
        setContacts(res.data);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const statusBadge = (status) => {
    if (status === "replied")
      return (
        <span
          className="badge"
          style={{ background: "#27ae60", borderRadius: 6 }}>
          ✅ Đã phản hồi
        </span>
      );
    return (
      <span
        className="badge"
        style={{ background: "#f39c12", borderRadius: 6 }}>
        ⏳ Chờ phản hồi
      </span>
    );
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <Navbar />

      <div className="container py-4">
        <div className="d-flex align-items-center gap-2 mb-4">
          <h5 className="fw-bold mb-0">📩 Liên hệ của tôi</h5>
          <span className="badge bg-secondary">{contacts.length}</span>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-secondary" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: 64 }}>📭</div>
            <h5 className="text-muted mt-3">Chưa có liên hệ nào</h5>
            <p className="text-muted small">
              Tìm BĐS phù hợp và gửi yêu cầu liên hệ đến Owner
            </p>
            <Link to="/" className="btn btn-danger mt-2">
              Tìm kiếm BĐS
            </Link>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="card border-0 shadow-sm p-4"
                style={{ borderRadius: 12 }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <Link
                      to={`/property/${c.property_id}`}
                      className="fw-bold text-decoration-none text-dark"
                      style={{ fontSize: 15 }}>
                      🏠 {c.property_title}
                    </Link>
                    <p className="text-muted small mb-0 mt-1">
                      📍 {c.city} · 💰{" "}
                      {c.price >= 1000000000
                        ? (c.price / 1000000000).toFixed(1) + " tỷ"
                        : (c.price / 1000000).toFixed(0) + " triệu"}
                    </p>
                  </div>
                  <div className="d-flex flex-column align-items-end gap-1">
                    {statusBadge(c.status)}
                    <span className="text-muted" style={{ fontSize: 11 }}>
                      {new Date(c.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>

                {/* Tin nhắn của Buyer */}
                <div
                  className="p-3 rounded mb-3"
                  style={{
                    background: "#f0f4f8",
                    borderLeft: "4px solid #2c5364",
                  }}>
                  <p className="small text-muted mb-1 fw-semibold">
                    Tin nhắn của bạn:
                  </p>
                  <p className="mb-0 small">{c.message}</p>
                </div>

                {/* Phản hồi của Owner */}
                {c.owner_reply ? (
                  <div
                    className="p-3 rounded"
                    style={{
                      background: "#f0fdf4",
                      borderLeft: "4px solid #27ae60",
                    }}>
                    <p className="small text-muted mb-1 fw-semibold">
                      Phản hồi từ Owner:
                    </p>
                    <p className="mb-0 small">{c.owner_reply}</p>
                  </div>
                ) : (
                  <div
                    className="p-3 rounded"
                    style={{
                      background: "#fffbeb",
                      borderLeft: "4px solid #f39c12",
                    }}>
                    <p className="small text-muted mb-0">
                      ⏳ Đang chờ Owner phản hồi...
                    </p>
                  </div>
                )}
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
