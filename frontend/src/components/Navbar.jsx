import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
                to="/change-password"
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
            { label: "Căn hộ", path: "/?type=apartment" },
            { label: "Nhà phố", path: "/?type=house" },
            { label: "Đất nền", path: "/?type=land" },
            { label: "Văn phòng", path: "/?type=office" },
          ].map((item) => (
            <li key={item.label} className="nav-item">
              <Link
                className="nav-link text-dark fw-medium px-2"
                style={{ fontSize: 14, whiteSpace: "nowrap" }}
                to={item.path}>
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
              <li className="nav-item">
                <Link
                  className="nav-link text-dark fw-medium px-2"
                  style={{ fontSize: 14 }}
                  to="/admin/pending">
                  Duyệt tin
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link text-dark fw-medium px-2"
                  style={{ fontSize: 14 }}
                  to="/admin/users">
                  Người dùng
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
                to="/saved"
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
                to="/my-contacts"
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
