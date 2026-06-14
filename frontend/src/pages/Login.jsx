import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", form);
      login(res.data.token, res.data.user);
      const role = res.data.user.role;
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "owner") navigate("/owner/dashboard");
      else navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Be Vietnam Pro', sans-serif",
        background: "#F7F6F3",
      }}>
      {/* Left Panel — Visual */}
      <div
        style={{
          flex: "0 0 52%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "56px 60px",
          background: "#1A1A1A",
        }}>
        {/* Background image overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.35,
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, #0D0D0D 40%, transparent 100%)",
          }}
        />

        {/* Logo top-left */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 2,
          }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "#C8402A",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9.5L12 3l9 6.5V21H3V9.5Z"
                fill="white"
                fillOpacity="0.9"
              />
            </svg>
          </div>
          <span
            style={{
              color: "white",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: "-0.3px",
            }}>
            Bất Động Sản
          </span>
        </div>

        {/* Bottom content */}
        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Tag line */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(200, 64, 42, 0.18)",
              border: "1px solid rgba(200, 64, 42, 0.4)",
              borderRadius: 20,
              padding: "5px 14px",
              marginBottom: 20,
            }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#C8402A",
              }}
            />
            <span
              style={{
                color: "#E8A89A",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
              Nền tảng bất động sản chuyên nghiệp
            </span>
          </div>

          <h1
            style={{
              color: "white",
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.15,
              margin: "0 0 16px",
              letterSpacing: "-1px",
            }}>
            Nơi khởi đầu
            <br />
            <span style={{ color: "#C8402A" }}>của sự thịnh vượng</span>
          </h1>

          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 15,
              lineHeight: 1.7,
              margin: "0 0 36px",
              maxWidth: 400,
            }}>
            Khám phá hàng nghìn bất động sản uy tín từ căn hộ cao cấp đến đất
            nền tiềm năng trên khắp Việt Nam.
          </p>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 40 }}>
            {[
              { num: "12K+", label: "Tin đăng" },
              { num: "98%", label: "Khách hài lòng" },
              { num: "63", label: "Tỉnh thành" },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    color: "white",
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: "-0.5px",
                  }}>
                  {s.num}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 12,
                    marginTop: 2,
                  }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 60px",
        }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#111",
                margin: "0 0 8px",
                letterSpacing: "-0.6px",
              }}>
              Chào mừng trở lại
            </h2>
            <p style={{ color: "#888", fontSize: 14, margin: 0 }}>
              Đăng nhập để tiếp tục quản lý danh mục của bạn.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#FEF2F0",
                border: "1px solid #FCCAC3",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#C8402A" fillOpacity="0.15" />
                <path
                  d="M8 5v3m0 2h.01"
                  stroke="#C8402A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ fontSize: 13, color: "#C8402A", fontWeight: 500 }}>
                {error}
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email or Phone */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#333",
                  marginBottom: 7,
                }}>
                Số điện thoại hoặc Email
              </label>
              <div style={{ position: "relative" }}>
                <svg
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none">
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    stroke="#999"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="#999"
                    strokeWidth="1.7"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="name@email.com hoặc 09xx"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "13px 14px 13px 42px",
                    border: "1.5px solid #E5E5E5",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "#111",
                    background: "white",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#C8402A")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E5E5")}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 7,
                }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>
                  Mật khẩu
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 12,
                    color: "#C8402A",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}>
                  Quên mật khẩu?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <svg
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none">
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    stroke="#999"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    stroke="#999"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "13px 44px 13px 42px",
                    border: "1.5px solid #E5E5E5",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "#111",
                    background: "white",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#C8402A")}
                  onBlur={(e) => (e.target.style.borderColor = "#E5E5E5")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "#999",
                  }}>
                  {showPass ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke="#999"
                        strokeWidth="1.7"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="#999"
                        strokeWidth="1.7"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
                        stroke="#999"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 24,
              }}>
              <input
                type="checkbox"
                id="remember"
                style={{ accentColor: "#C8402A", width: 15, height: 15 }}
              />
              <label htmlFor="remember" style={{ fontSize: 13, color: "#666" }}>
                Ghi nhớ đăng nhập
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "#999" : "#C8402A",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s",
                letterSpacing: "-0.1px",
              }}>
              {loading ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ animation: "spin 1s linear infinite" }}>
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="3"
                    />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập <span style={{ fontSize: 18 }}>→</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0",
            }}>
            <div style={{ flex: 1, height: 1, background: "#E8E8E8" }} />
            <div style={{ flex: 1, height: 1, background: "#E8E8E8" }} />
          </div>

          {/* Sign up link */}
          <p
            style={{
              textAlign: "center",
              marginTop: 28,
              fontSize: 13,
              color: "#888",
            }}>
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              style={{
                color: "#C8402A",
                fontWeight: 700,
                textDecoration: "none",
              }}>
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #C0C0C0; }
      `}</style>
    </div>
  );
}
