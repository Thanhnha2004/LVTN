// src/pages/profile/Profile.jsx

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import UiIcon from "../../components/UiIcon";

export default function Profile() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone_number: "",
  });
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get("tab");

    if (tab === "saved") {
      setActiveTab("saved");
    } else if (tab === "contacts") {
      setActiveTab("contacts");
    } else if (tab === "password") {
      setActiveTab("password");
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

      setFormData({
        full_name: userData.full_name || "",
        phone_number: userData.phone_number || userData.phone || "",
      });

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

  const handleUnsave = async (propertyId) => {
    if (!window.confirm("Bạn muốn bỏ lưu tin này?")) return;

    try {
      await api.delete(`/api/contact/saved/${propertyId}`);

      setSaved((prev) => prev.filter((item) => item.id !== propertyId));
    } catch (err) {
      alert(err.response?.data?.message || "Bỏ lưu thất bại");
    }
  };

  const handleSaveProfile = async () => {
    try {
      const data = new FormData();

      data.append("full_name", formData.full_name);
      data.append("phone_number", formData.phone_number);

      if (avatarFile) {
        data.append("avatar", avatarFile);
      }

      const res = await api.put("/api/auth/me", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUser((prev) => ({
        ...prev,
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        avatar_url: res.data.avatar_url || prev.avatar_url,
      }));

      setEditing(false);
      setAvatarFile(null);

      alert("Cập nhật thành công");
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật thông tin");
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      return alert("Xác nhận mật khẩu không khớp");
    }

    try {
      await api.put("/api/auth/change-password", {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });

      alert("Đổi mật khẩu thành công");

      setPasswordData({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Không thể đổi mật khẩu");
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
                  Hồ sơ
                </Link>

                <Link
                  to="/profile?tab=saved"
                  className="btn text-start"
                  style={{
                    background:
                      activeTab === "saved" ? "#b51b17" : "transparent",
                    color: activeTab === "saved" ? "#fff" : "#5b403c",
                  }}>
                  Tin đã lưu ({saved.length})
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
                    Yêu cầu liên hệ ({contacts.length})
                  </Link>
                )}

                <Link
                  to="/profile?tab=password"
                  className="btn text-start"
                  style={{
                    background:
                      activeTab === "password" ? "#b51b17" : "transparent",
                    color: activeTab === "password" ? "#fff" : "#5b403c",
                  }}>
                  Đổi mật khẩu
                </Link>
              </nav>
            </div>
          </div>

          {/* Main */}
          <div className="col-md-9">
            {/* Header */}
            <div className="card border p-4 mb-4" style={{ borderRadius: 12 }}>
              <div className="d-flex align-items-center gap-3">
                {/* Avatar với hover camera */}
                <div
                  className="rounded-circle overflow-hidden border position-relative"
                  style={{
                    width: 90,
                    height: 90,
                    cursor: editing ? "pointer" : "default",
                    flexShrink: 0,
                  }}
                  onClick={() =>
                    editing && document.getElementById("avatarInput").click()
                  }
                  onMouseEnter={(e) => {
                    if (editing)
                      e.currentTarget.querySelector(
                        ".avatar-overlay",
                      ).style.opacity = 1;
                  }}
                  onMouseLeave={(e) => {
                    if (editing)
                      e.currentTarget.querySelector(
                        ".avatar-overlay",
                      ).style.opacity = 0;
                  }}>
                  <img
                    src={
                      avatarFile
                        ? URL.createObjectURL(avatarFile)
                        : user.avatar_url ||
                          "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                    }
                    alt="avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  {/* Overlay camera */}
                  {editing && (
                    <div
                      className="avatar-overlay position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
                      style={{
                        background: "rgba(0,0,0,0.45)",
                        opacity: 0,
                        transition: "opacity 0.2s ease",
                      }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        fill="white"
                        viewBox="0 0 16 16">
                        <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z" />
                        <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5m0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
                      </svg>
                      <span
                        style={{ color: "white", fontSize: 10, marginTop: 3 }}>
                        Đổi ảnh
                      </span>
                    </div>
                  )}
                </div>

                {/* Input file ẩn */}
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) setAvatarFile(e.target.files[0]);
                  }}
                />

                <div className="flex-grow-1">
                  <h4 className="fw-bold mb-1">{user.full_name}</h4>

                  <p className="text-muted mb-0">{user.email}</p>
                </div>

                {editing ? (
                  <button
                    className="btn btn-success"
                    onClick={handleSaveProfile}>
                    Lưu thay đổi
                  </button>
                ) : (
                  <button
                    className="btn text-white"
                    style={{ background: "#b51b17" }}
                    onClick={() => setEditing(true)}>
                    Chỉnh sửa
                  </button>
                )}
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
                      value={formData.full_name}
                      readOnly={!editing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          full_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone_number}
                      readOnly={!editing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone_number: e.target.value,
                        })
                      }
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
                <h5 className="fw-bold mb-4"><UiIcon name="heart" size={19} style={{ verticalAlign: "-3px", marginRight: 6 }} />Tin đã lưu ({saved.length})</h5>

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
                              <UiIcon name="home" size={40} color="#888" />
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

                            <div className="d-grid gap-2">
                              <Link
                                to={`/property/${item.id}`}
                                className="btn btn-danger btn-sm">
                                Xem chi tiết
                              </Link>

                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => handleUnsave(item.id)}>
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
            )}

            {/* CONTACTS */}
            {activeTab === "contacts" && (
              <div className="card border p-4" style={{ borderRadius: 12 }}>
                <h5 className="fw-bold mb-4">
                  <UiIcon name="message" size={19} style={{ verticalAlign: "-3px", marginRight: 6 }} />
                  Yêu cầu liên hệ ({contacts.length})
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
                          <th>Phản hồi của Owner</th>
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

                            <td style={{ minWidth: 260 }}>
                              {c.status === "replied" && c.owner_reply ? (
                                <div
                                  style={{
                                    background: "#f1f8f4",
                                    border: "1px solid #cfe9d8",
                                    borderRadius: 10,
                                    padding: "10px 12px",
                                    color: "#24563a",
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                  }}>
                                  <div className="fw-semibold mb-1">
                                    Owner đã phản hồi:
                                  </div>
                                  <div>{c.owner_reply}</div>
                                </div>
                              ) : (
                                <span className="text-muted small">
                                  Chưa có phản hồi
                                </span>
                              )}
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

            {activeTab === "password" && (
              <div className="card border p-4" style={{ borderRadius: 12 }}>
                <h5 className="fw-bold mb-4">Đổi mật khẩu</h5>

                <div className="mb-3">
                  <label className="form-label">Mật khẩu hiện tại</label>

                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.old_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        old_password: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Mật khẩu mới</label>

                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        new_password: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Xác nhận mật khẩu mới</label>

                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirm_password: e.target.value,
                      })
                    }
                  />
                </div>

                <button
                  className="btn text-white"
                  style={{ background: "#b51b17" }}
                  onClick={handleChangePassword}>
                  Cập nhật mật khẩu
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
