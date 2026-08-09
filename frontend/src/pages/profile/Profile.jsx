// src/pages/profile/Profile.jsx

import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import UiIcon from "../../components/UiIcon";
import { useToast } from "../../components/ToastProvider";
import { useConfirm } from "../../components/ConfirmProvider";
import { useAuth } from "../../context/AuthContext";

function formatContactDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buyerContactStep(contact) {
  if (contact.status === "replied") {
    return {
      label: "Người bán đã phản hồi",
      bg: "#e6f9f0",
      color: "#0f6e56",
      note: "Bạn có thể kiểm tra thông tin người bán và chủ động hẹn lịch xem thực tế.",
    };
  }
  return {
    label: "Đang chờ người bán phản hồi",
    bg: "#fff4d6",
    color: "#8a5a00",
    note: "Yêu cầu đã được ghi nhận. Khi người bán phản hồi, thông tin liên hệ sẽ hiển thị tại đây.",
  };
}

async function loadAllBuyerContacts() {
  const contacts = [];
  for (let page = 1; ; page += 1) {
    const response = await api.get("/api/contact/buyer", {
      params: { page, limit: 100 },
    });
    const payload = response.data || {};
    contacts.push(...(Array.isArray(payload) ? payload : payload.data || []));
    const totalPages = Math.max(
      1,
      Number(payload.pagination?.total_pages) || 1,
    );
    if (page >= totalPages) return contacts;
  }
}

export default function Profile() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState([]);
  const [contacts, setContacts] = useState([]);
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
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { updateUser } = useAuth();
  const requestedTab = searchParams.get("tab");
  const activeTab =
    ["profile", "password"].includes(requestedTab) ||
    (user?.role === "buyer" && ["saved", "contacts"].includes(requestedTab))
      ? requestedTab
      : "profile";

  const validateProfileForm = () => {
    const fullName = formData.full_name.trim().replace(/\s+/g, " ");
    const phoneNumber = formData.phone_number.trim();
    const nameParts = fullName.split(" ").filter(Boolean);
    const nameRegex = /^[A-Za-zÀ-ỹ\s'.-]+$/;
    const phoneRegex = /^0\d{9}$/;

    if (fullName.length < 4 || nameParts.length < 2) {
      showToast("Họ tên phải có ít nhất 2 từ và tối thiểu 4 ký tự", "error");
      return null;
    }

    if (!nameRegex.test(fullName)) {
      showToast("Họ tên không được chứa số hoặc ký tự đặc biệt không hợp lệ", "error");
      return null;
    }

    if (!phoneRegex.test(phoneNumber)) {
      showToast("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0", "error");
      return null;
    }

    return { fullName, phoneNumber };
  };

  const fetchData = useCallback(async () => {
    try {
      const profileRes = await api.get("/api/auth/me");

      const userData = profileRes.data;
      setUser(userData);
      updateUser(userData);

      setFormData({
        full_name: userData.full_name || "",
        phone_number: userData.phone_number || userData.phone || "",
      });

      if (userData.role === "buyer") {
        const [savedResult, contactsResult] = await Promise.allSettled([
          api.get("/api/contact/saved"),
          loadAllBuyerContacts(),
        ]);

        setSaved(
          savedResult.status === "fulfilled" ? savedResult.value.data || [] : [],
        );
        setContacts(
          contactsResult.status === "fulfilled"
            ? contactsResult.value
            : [],
        );
      } else {
        setSaved([]);
        setContacts([]);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        console.log("Fetch error:", err.response?.status, err.message);
      }
    }
  }, [navigate, updateUser]);

  useEffect(() => {
    // Initial profile hydration is the synchronization performed here; state
    // updates occur after the API request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleUnsave = async (propertyId) => {
    const ok = await confirm({
      title: "Bỏ lưu tin?",
      message: "Tin này sẽ được xóa khỏi danh sách bất động sản đã lưu của bạn.",
      confirmText: "Bỏ lưu",
    });
    if (!ok) return;

    try {
      await api.delete(`/api/contact/saved/${propertyId}`);

      setSaved((prev) => prev.filter((item) => item.id !== propertyId));
      showToast("Đã bỏ lưu tin quan tâm");
    } catch (err) {
      showToast(err.response?.data?.message || "Bỏ lưu thất bại", "error");
    }
  };

  const handleSaveProfile = async () => {
    const validated = validateProfileForm();
    if (!validated) return;

    try {
      const data = new FormData();

      data.append("full_name", validated.fullName);
      data.append("phone_number", validated.phoneNumber);

      if (avatarFile) {
        data.append("avatar", avatarFile);
      }

      const res = await api.put("/api/auth/me", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const nextUser = {
        ...(user || {}),
        full_name: validated.fullName,
        phone_number: validated.phoneNumber,
        avatar_url: res.data.avatar_url || user?.avatar_url,
      };
      setUser((prev) => ({
        ...prev,
        full_name: validated.fullName,
        phone_number: validated.phoneNumber,
        avatar_url: res.data.avatar_url || prev.avatar_url,
      }));
      updateUser(nextUser);
      setFormData({
        full_name: validated.fullName,
        phone_number: validated.phoneNumber,
      });

      setEditing(false);
      setAvatarFile(null);

      showToast("Cập nhật hồ sơ thành công");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Không thể cập nhật thông tin",
        "error",
      );
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      return showToast("Xác nhận mật khẩu không khớp", "error");
    }

    try {
      await api.put("/api/auth/change-password", {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });

      showToast("Đổi mật khẩu thành công");

      setPasswordData({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      showToast(err.response?.data?.message || "Không thể đổi mật khẩu", "error");
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

                {user?.role === "buyer" && (
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
                )}

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
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                      showToast("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP", "error");
                      e.target.value = "";
                      return;
                    }
                    if (file.size > 2 * 1024 * 1024) {
                      showToast("Ảnh đại diện không được vượt quá 2 MB", "error");
                      e.target.value = "";
                      return;
                    }
                    setAvatarFile(file);
                  }}
                />

                <div className="flex-grow-1">
                  <h4 className="fw-bold mb-1">{user.full_name}</h4>

                  <p className="text-muted mb-0">{user.email}</p>
                </div>

                {activeTab === "profile" && (
                  editing ? (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setEditing(false);
                          setAvatarFile(null);
                          setFormData({
                            full_name: user.full_name || "",
                            phone_number: user.phone_number || user.phone || "",
                          });
                        }}>
                        Hủy
                      </button>
                      <button
                        className="btn btn-success"
                        onClick={handleSaveProfile}>
                        Lưu thay đổi
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn text-white"
                      style={{ background: "#b51b17" }}
                      onClick={() => setEditing(true)}>
                      Chỉnh sửa
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Form */}
            {/* PROFILE */}
            {activeTab === "profile" && (
              <div
                className="card p-4"
                style={{
                  borderRadius: 12,
                  border: editing ? "1.5px solid #b51b17" : "1px solid #dee2e6",
                  boxShadow: editing
                    ? "0 10px 28px rgba(181, 27, 23, 0.08)"
                    : "none",
                }}>
                <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
                  <div>
                    <h5 className="fw-semibold mb-1">Thông tin tài khoản</h5>
                    <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                      {editing
                        ? "Bạn đang chỉnh sửa thông tin hồ sơ. Các thay đổi chỉ được lưu khi bấm Lưu thay đổi."
                        : "Thông tin hồ sơ cá nhân của bạn."}
                    </p>
                  </div>

                  {editing && (
                    <span
                      className="badge"
                      style={{
                        background: "#fff1f0",
                        color: "#b51b17",
                        border: "1px solid #ffd4d1",
                        padding: "8px 10px",
                        whiteSpace: "nowrap",
                      }}>
                      Đang chỉnh sửa
                    </span>
                  )}
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Họ và tên</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.full_name}
                      readOnly={!editing}
                      style={{
                        background: editing ? "#fff" : "#f8f9fa",
                        borderColor: editing ? "#b51b17" : "#dee2e6",
                      }}
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
                      style={{
                        background: editing ? "#fff" : "#f8f9fa",
                        borderColor: editing ? "#b51b17" : "#dee2e6",
                      }}
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
                      style={{ background: "#f8f9fa" }}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SAVED */}
            {user?.role === "buyer" && activeTab === "saved" && (
              <div className="card border p-4" style={{ borderRadius: 12 }}>
                <h5 className="fw-bold mb-4">
                  <UiIcon
                    name="heart"
                    size={19}
                    style={{ verticalAlign: "-3px", marginRight: 6 }}
                  />
                  Tin đã lưu ({saved.length})
                </h5>

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
                  <UiIcon
                    name="message"
                    size={19}
                    style={{ verticalAlign: "-3px", marginRight: 6 }}
                  />
                  Yêu cầu liên hệ ({contacts.length})
                </h5>

                {contacts.length === 0 ? (
                  <div className="text-center py-5">
                    <h6>Chưa có yêu cầu liên hệ</h6>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {contacts.map((c) => {
                      const step = buyerContactStep(c);
                      return (
                        <div
                          key={c.id}
                          style={{
                            border: "1px solid #e8e8e8",
                            borderRadius: 12,
                            padding: 16,
                            background: "#fff",
                          }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 14,
                              alignItems: "flex-start",
                              marginBottom: 12,
                            }}>
                            <div>
                              <div
                                className="fw-semibold"
                                style={{ fontSize: 15, marginBottom: 4 }}>
                                {c.property_title}
                              </div>
                              <div className="text-muted" style={{ fontSize: 13 }}>
                                Gửi lúc {formatContactDate(c.created_at)}
                              </div>
                            </div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "5px 10px",
                                borderRadius: 999,
                                background: step.bg,
                                color: step.color,
                                fontSize: 12,
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}>
                              <UiIcon
                                name={c.status === "replied" ? "success" : "message"}
                                size={14}
                              />
                              {step.label}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 12,
                              marginBottom: 12,
                            }}>
                            <div
                              style={{
                                background: "#f9f9f9",
                                borderRadius: 10,
                                padding: "10px 12px",
                              }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#757575",
                                  marginBottom: 5,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}>
                                Nội dung bạn đã gửi
                              </div>
                              <div style={{ fontSize: 13, color: "#5f5e5e", lineHeight: 1.55 }}>
                                {c.message}
                              </div>
                            </div>

                            <div
                              style={{
                                background: c.status === "replied" ? "#e6f9f0" : "#fff8e1",
                                border: `1px solid ${
                                  c.status === "replied" ? "#b9dfd3" : "#f0ce7a"
                                }`,
                                borderRadius: 10,
                                padding: "10px 12px",
                              }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: c.status === "replied" ? "#0f6e56" : "#8a5a00",
                                  marginBottom: 5,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}>
                                Phản hồi từ người bán
                              </div>
                              <div style={{ fontSize: 13, color: "#1a1c1c", lineHeight: 1.55 }}>
                                {c.status === "replied" && c.owner_reply
                                  ? c.owner_reply
                                  : "Chưa có phản hồi"}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              gap: 12,
                              alignItems: "center",
                              borderTop: "1px solid #f1f1f1",
                              paddingTop: 12,
                            }}>
                            <div style={{ fontSize: 13, color: "#5f5e5e", lineHeight: 1.6 }}>
                              <strong style={{ color: "#1a1c1c" }}>
                                Thông tin người bán:
                              </strong>{" "}
                              {c.owner_name || "Chưa cập nhật"}
                              {c.owner_phone && (
                                <>
                                  {" · "}
                                  <a
                                    href={`tel:${c.owner_phone}`}
                                    style={{ color: "#0f6e56", fontWeight: 700 }}>
                                    {c.owner_phone}
                                  </a>
                                </>
                              )}
                              {c.owner_email && (
                                <>
                                  {" · "}
                                  <a
                                    href={`mailto:${c.owner_email}`}
                                    style={{ color: "#0f6e56", fontWeight: 700 }}>
                                    {c.owner_email}
                                  </a>
                                </>
                              )}
                              <div style={{ color: "#757575", marginTop: 4 }}>
                                {step.note}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {c.owner_id && (
                                <Link
                                  to={`/owners/${c.owner_id}`}
                                  className="btn btn-sm btn-outline-secondary">
                                  Hồ sơ người bán
                                </Link>
                              )}
                              <Link
                                to={`/property/${c.property_id}`}
                                className="btn btn-sm btn-outline-danger">
                                Xem tin
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
