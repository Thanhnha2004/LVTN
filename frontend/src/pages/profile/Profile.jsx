// src/pages/profile/Profile.jsx

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

export default function Profile() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");

  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab === "saved") {
      setActiveTab("saved");
    } else if (tab === "contacts") {
      setActiveTab("contacts");
    } else {
      setActiveTab("profile");
    }
    fetchData();
  }, [searchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const profileRes = await api.get("/api/auth/me");

      const userData = profileRes.data;
      setUser(userData);

      const requests = [api.get("/api/contact/saved")];

      // chỉ buyer mới gọi contact/buyer
      if (userData.role === "buyer") {
        requests.push(api.get("/api/contact/buyer"));
      }

      const results = await Promise.all(requests);

      setSaved(results[0].data || []);

      setContacts(
        userData.role === "buyer"
          ? results[1]?.data?.data || results[1]?.data || []
          : [], // owner không có contacts
      );
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        console.log("Fetch error:", err.response?.status, err.message);
      }
    }
  };

  if (!user) return null;

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      <Navbar />

      <div className="container py-4" style={{ maxWidth: 1200 }}>
        <div className="row g-4">
          {/* Sidebar */}
          <div className="col-md-3">
            <div
              className="card border p-3"
              style={{
                borderRadius: 12,
                position: "sticky",
                top: 70,
              }}>
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

                <p
                  className="mb-0"
                  style={{
                    fontSize: 13,
                    color: "#5b403c",
                  }}>
                  Người mua / Chủ sở hữu
                </p>
              </div>

              <nav className="d-flex flex-column gap-1">
                <Link
                  to="/profile"
                  className="btn text-start"
                  style={{
                    background:
                      activeTab === "profile" ? "#b51b17" : "transparent",
                    color: activeTab === "profile" ? "#fff" : "#5b403c",
                  }}>
                  👤 Hồ sơ
                </Link>

                <Link
                  to="/profile?tab=saved"
                  className="btn text-start"
                  style={{
                    background:
                      activeTab === "saved" ? "#b51b17" : "transparent",
                    color: activeTab === "saved" ? "#fff" : "#5b403c",
                  }}>
                  ♥ Tin đã lưu ({saved.length})
                </Link>

                {user?.role === "buyer" && (
                  <Link
                    to="/profile?tab=contacts"
                    className="btn text-start"
                    style={{
                      background:
                        activeTab === "contacts" ? "#b51b17" : "transparent",
                      color: activeTab === "contacts" ? "#fff" : "#5b403c",
                    }}>
                    ✉ Yêu cầu liên hệ ({contacts.length})
                  </Link>
                )}
              </nav>
            </div>
          </div>

          {/* Main */}
          <div className="col-md-9">
            {/* Header */}
            <div className="card border p-4 mb-4" style={{ borderRadius: 12 }}>
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{
                    width: 90,
                    height: 90,
                    fontSize: 36,
                  }}>
                  👤
                </div>

                <div className="flex-grow-1">
                  <h4 className="fw-bold mb-1">{user.full_name}</h4>

                  <p className="text-muted mb-0">{user.email}</p>
                </div>

                <button
                  className="btn text-white"
                  style={{ background: "#b51b17" }}>
                  Chỉnh sửa
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div
                  className="card border text-center p-4"
                  style={{ borderRadius: 12 }}>
                  <h3 className="fw-bold mb-1">{saved.length}</h3>

                  <small className="text-muted">Tin đã lưu</small>
                </div>
              </div>

              <div className="col-md-4">
                <div
                  className="card border text-center p-4"
                  style={{ borderRadius: 12 }}>
                  <h3 className="fw-bold mb-1">{contacts.length}</h3>

                  <small className="text-muted">Yêu cầu liên hệ</small>
                </div>
              </div>

              <div className="col-md-4">
                <div
                  className="card border text-center p-4"
                  style={{ borderRadius: 12 }}>
                  <h3 className="fw-bold mb-1">
                    {user.created_properties || 0}
                  </h3>

                  <small className="text-muted">Tin đã đăng</small>
                </div>
              </div>
            </div>

            {/* Form */}
            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="card border p-4" style={{ borderRadius: 12 }}>
                <h5 className="fw-semibold mb-4">Thông tin tài khoản</h5>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Họ và tên</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user.full_name || ""}
                      readOnly
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user.phone || ""}
                      readOnly
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={user.email || ""}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SAVED */}
            {activeTab === "saved" && (
              <div className="card border p-4" style={{ borderRadius: 12 }}>
                <h5 className="fw-bold mb-4">❤️ Tin đã lưu ({saved.length})</h5>

                {saved.length === 0 ? (
                  <div className="text-center py-5">
                    <h6>Chưa có tin đã lưu</h6>
                  </div>
                ) : (
                  <div className="row g-3">
                    {saved.map((item) => (
                      <div key={item.id} className="col-md-4">
                        <div
                          className="card h-100 border"
                          style={{ borderRadius: 12 }}>
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              style={{
                                height: 180,
                                objectFit: "cover",
                                borderTopLeftRadius: 12,
                                borderTopRightRadius: 12,
                              }}
                            />
                          ) : (
                            <div
                              className="d-flex align-items-center justify-content-center"
                              style={{
                                height: 180,
                                background: "#eee",
                                fontSize: 40,
                              }}>
                              🏠
                            </div>
                          )}

                          <div className="card-body">
                            <h6
                              className="fw-semibold"
                              style={{
                                minHeight: 45,
                                fontSize: 14,
                              }}>
                              {item.title}
                            </h6>

                            <p
                              className="fw-bold mb-3"
                              style={{ color: "#b51b17" }}>
                              {Number(item.price).toLocaleString()} đ
                            </p>

                            <Link
                              to={`/property/${item.id}`}
                              className="btn btn-danger btn-sm w-100">
                              Xem chi tiết
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONTACTS */}
            {activeTab === "contacts" && (
              <div className="card border p-4" style={{ borderRadius: 12 }}>
                <h5 className="fw-bold mb-4">
                  ✉ Yêu cầu liên hệ ({contacts.length})
                </h5>

                {contacts.length === 0 ? (
                  <div className="text-center py-5">
                    <h6>Chưa có yêu cầu liên hệ</h6>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Bất động sản</th>
                          <th>Trạng thái</th>
                          <th>Ngày gửi</th>
                          <th></th>
                        </tr>
                      </thead>

                      <tbody>
                        {contacts.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <div className="fw-semibold">
                                {c.property_title}
                              </div>
                            </td>

                            <td>
                              <span
                                className={`badge ${
                                  c.status === "replied"
                                    ? "bg-success"
                                    : "bg-warning text-dark"
                                }`}>
                                {c.status === "replied"
                                  ? "Đã phản hồi"
                                  : "Đang chờ"}
                              </span>
                            </td>

                            <td>
                              {new Date(c.created_at).toLocaleDateString(
                                "vi-VN",
                              )}
                            </td>

                            <td>
                              <Link
                                to={`/property/${c.property_id}`}
                                className="btn btn-sm btn-outline-danger">
                                Xem
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
