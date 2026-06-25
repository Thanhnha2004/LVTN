import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function formatNotifyTime(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}

function NotificationDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const loadCount = async () => {
    try {
      const res = await api.get("/api/notifications/unread-count");
      setUnread(Number(res.data?.count || 0));
    } catch {
      setUnread(0);
    }
  };

  const loadItems = async () => {
    try {
      const res = await api.get("/api/notifications");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadCount();
  }, [user]);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) await loadItems();
  };

  const handleOpenItem = async (item) => {
    try {
      await api.patch(`/api/notifications/${item.id}/read`);
      setUnread((prev) => Math.max(prev - (item.is_read ? 0 : 1), 0));
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: 1 } : n)),
      );
    } catch {
      // Vẫn cho người dùng mở trang liên quan nếu đánh dấu đọc lỗi.
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const markAllRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // Không chặn giao diện nếu request lỗi.
    }
  };

  return (
    <li className="nav-item" style={{ position: "relative" }}>
      <button
        className="nav-link text-dark px-2 border-0 bg-transparent"
        type="button"
        onClick={toggleOpen}
        style={{ fontSize: 14, position: "relative", cursor: "pointer" }}>
        Thông báo
        {unread > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: 10 }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
          />
          <div
            className="shadow bg-white border"
            style={{
              position: "absolute",
              right: 0,
              top: "110%",
              zIndex: 1000,
              width: 360,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: 12,
              overflow: "hidden",
            }}>
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
              <div className="fw-semibold" style={{ fontSize: 14 }}>
                Thông báo
              </div>
              {items.some((item) => !item.is_read) && (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={markAllRead}>
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {items.length === 0 ? (
                <div className="text-center text-muted py-4 small">
                  Chưa có thông báo
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-100 text-start border-0 border-bottom px-3 py-3"
                    onClick={() => handleOpenItem(item)}
                    style={{
                      background: item.is_read ? "#fff" : "#fff8f8",
                      cursor: "pointer",
                    }}>
                    <div className="d-flex justify-content-between gap-2">
                      <div
                        className="fw-semibold"
                        style={{ fontSize: 13, color: "#1f2937" }}>
                        {item.title}
                      </div>
                      {!item.is_read && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#b51b17",
                            flexShrink: 0,
                            marginTop: 5,
                          }}
                        />
                      )}
                    </div>
                    {item.message && (
                      <div
                        className="text-muted mt-1"
                        style={{ fontSize: 12, lineHeight: 1.45 }}>
                        {item.message}
                      </div>
                    )}
                    <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                      {formatNotifyTime(item.created_at)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </li>
  );
}

function UserDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="nav-item" style={{ position: "relative" }}>
      <button
        className="nav-link d-flex align-items-center gap-2 border-0 bg-transparent"
        style={{ fontSize: 14, cursor: "pointer" }}
        onClick={() => setOpen(!open)}>
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white"
          style={{
            width: 30,
            height: 30,
            background: "#2c5364",
            fontSize: 13,
            fontWeight: "bold",
          }}>
          {user.full_name?.charAt(0).toUpperCase()}
        </div>
        <span className="d-none d-md-inline">{user.full_name}</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
          />
          <ul
            className="dropdown-menu show shadow"
            style={{
              position: "absolute",
              right: 0,
              top: "110%",
              borderRadius: 10,
              zIndex: 1000,
              minWidth: 180,
            }}>
            <li>
              <div className="px-3 py-2 border-bottom">
                <div className="fw-semibold small">{user.full_name}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {user.role}
                </div>
              </div>
            </li>
            <li>
              <Link
                className="dropdown-item small"
                to="/profile"
                onClick={() => setOpen(false)}>
                Thông tin cá nhân
              </Link>
            </li>
            <li>
              <Link
                className="dropdown-item small"
                to="/profile?tab=password"
                onClick={() => setOpen(false)}>
                Đổi mật khẩu
              </Link>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button
                className="dropdown-item small text-danger"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}>
                Đăng xuất
              </button>
            </li>
          </ul>
        </>
      )}
    </li>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      className="navbar navbar-expand-lg bg-white border-bottom shadow-sm px-3"
      style={{ minHeight: 56, position: "sticky", top: 0, zIndex: 1030 }}>
      {/* Logo */}
      <Link
        className="navbar-brand d-flex align-items-center gap-2 me-4"
        to="/">
        <div style={{ lineHeight: 1.1 }}>
          <div className="fw-bold text-danger" style={{ fontSize: 14 }}>
            BDS Platform
          </div>
          <div className="text-muted" style={{ fontSize: 10 }}>
            Bất động sản trực tuyến
          </div>
        </div>
      </Link>

      <button
        className="navbar-toggler border-0"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navMain">
        <span className="navbar-toggler-icon" />
      </button>

      <div className="collapse navbar-collapse" id="navMain">
        {/* Menu loại hình — luôn hiện */}
        <ul className="navbar-nav me-auto gap-1">
          {[
            { label: "Căn hộ", type: "apartment" },
            { label: "Nhà phố", type: "house" },
            { label: "Đất nền", type: "land" },
            { label: "Văn phòng", type: "office" },
          ].map((item) => (
            <li key={item.label} className="nav-item">
              <Link
                className="nav-link text-dark fw-medium px-2"
                style={{ fontSize: 14, whiteSpace: "nowrap" }}
                to={`/search?type=${item.type}`}>
                {item.label}
              </Link>
            </li>
          ))}

          {user?.role === "owner" && (
            <>
              <li className="nav-item">
                <Link
                  className="nav-link text-dark fw-medium px-2"
                  style={{ fontSize: 14 }}
                  to="/owner/dashboard">
                  Quản lý tin
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link text-dark fw-medium px-2"
                  style={{ fontSize: 14 }}
                  to="/owner/contacts">
                  Liên hệ
                </Link>
              </li>
            </>
          )}

          {user?.role === "admin" && (
            <>
              <li className="nav-item">
                <Link
                  className="nav-link text-dark fw-medium px-2"
                  style={{ fontSize: 14 }}
                  to="/admin/dashboard">
                  Dashboard
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Right side */}
        <ul className="navbar-nav align-items-center gap-2">
          {user?.role === "buyer" && (
            <li className="nav-item">
              <Link
                className="nav-link text-dark px-2"
                to="/profile?tab=saved"
                title="Tin đã lưu">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  viewBox="0 0 16 16">
                  <path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z" />
                </svg>
              </Link>
            </li>
          )}

          {user?.role === "buyer" && (
            <li className="nav-item">
              <Link
                className="nav-link text-dark px-2"
                to="/profile?tab=contacts"
                style={{ fontSize: 14 }}>
                Liên hệ của tôi
              </Link>
            </li>
          )}

          {!user ? (
            <>
              <li className="nav-item">
                <Link
                  className="nav-link text-dark fw-medium px-2"
                  style={{ fontSize: 14 }}
                  to="/login">
                  Đăng nhập
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link text-dark fw-medium px-2"
                  style={{ fontSize: 14 }}
                  to="/register">
                  Đăng ký
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="btn btn-danger btn-sm text-white px-3"
                  style={{ borderRadius: 6, fontSize: 14 }}
                  to="/register">
                  Đăng tin
                </Link>
              </li>
            </>
          ) : (
            <>
              <NotificationDropdown user={user} />
              {user.role === "owner" && (
                <li className="nav-item">
                  <Link
                    className="btn btn-danger btn-sm text-white px-3"
                    style={{ borderRadius: 6, fontSize: 14 }}
                    to="/owner/create">
                    + Đăng tin
                  </Link>
                </li>
              )}
              <UserDropdown user={user} onLogout={handleLogout} />
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
