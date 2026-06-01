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
        background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
      <div style={{ width: 440 }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <h3 className="text-white fw-bold mb-0">BDS Platform</h3>
          <p className="text-white-50 small">
            Nền tảng bất động sản trực tuyến
          </p>
        </div>

        {/* Card */}
        <div className="card border-0 shadow-lg" style={{ borderRadius: 16 }}>
          <div className="card-body p-4">
            <h5 className="fw-bold mb-1">Đăng nhập</h5>
            <p className="text-muted small mb-4">Chào mừng bạn quay lại!</p>

            {error && (
              <div
                className="alert alert-danger py-2 mb-3"
                style={{ borderRadius: 8 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="email@example.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ borderRadius: 8 }}
                />
              </div>

              {/* Mật khẩu */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Mật khẩu</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    className="form-control"
                    placeholder="Nhập mật khẩu"
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    style={{ borderRadius: 8, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      color: "#6c757d",
                    }}>
                    {showPass ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        fill="currentColor"
                        viewBox="0 0 16 16">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        fill="currentColor"
                        viewBox="0 0 16 16">
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755z" />
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829" />
                        <path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709z" />
                        <path d="M13.646 14.354l-12-12 .708-.708 12 12z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="remember"
                  />
                  <label
                    className="form-check-label small text-muted"
                    htmlFor="remember">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="small text-decoration-none"
                  style={{ color: "#2c5364" }}>
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                type="submit"
                className="btn w-100 text-white fw-semibold py-2"
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #203a43, #2c5364)",
                  borderRadius: 10,
                  border: "none",
                }}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </button>
            </form>

            <hr className="my-4" />

            <p className="text-center text-muted small mb-0">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="fw-semibold text-decoration-none"
                style={{ color: "#2c5364" }}>
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white-50 small mt-3">
          © 2026 BDS Platform
        </p>
      </div>
    </div>
  );
}
