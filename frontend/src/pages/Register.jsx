import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

const STEPS = ["Thông tin", "Mật khẩu", "Vai trò"];

function FeatureIcon({ name, color = "currentColor", size = 18 }) {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L9.1 10.8a16 16 0 0 0 4.1 4.1l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    building: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 10h1M14 10h1M9 14h1M14 14h1M10 21v-4h4v4" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: "",
    role: "buyer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleNext = () => {
    setError("");
    if (step === 0) {
      if (!form.full_name || form.full_name.trim().length < 2)
        return setError("Họ tên phải có ít nhất 2 ký tự");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return setError("Email không hợp lệ");
    }
    if (step === 1) {
      if (form.password.length < 6)
        return setError("Mật khẩu phải có ít nhất 6 ký tự");
      if (form.password !== form.confirm_password)
        return setError("Mật khẩu xác nhận không khớp");
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!agreed) return setError("Bạn cần đồng ý với điều khoản sử dụng");
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        full_name: form.full_name,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        role: form.role,
      });
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`, {
        state: {
          message:
            "Đăng ký thành công. Vui lòng nhập mã OTP đã được gửi đến email để kích hoạt tài khoản.",
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
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
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    marginBottom: 7,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: "#F7F6F3",
      }}>
      {/* Left Panel */}
      <div
        style={{
          flex: "0 0 52%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "56px 60px",
          background: "#0F1A13",
        }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, #0A1409 45%, transparent 100%)",
          }}
        />

        {/* Logo */}
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

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(100, 180, 80, 0.15)",
              border: "1px solid rgba(100, 180, 80, 0.35)",
              borderRadius: 20,
              padding: "5px 14px",
              marginBottom: 20,
            }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#5CB85C",
              }}
            />
            <span
              style={{
                color: "#90D890",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
              Tham gia miễn phí hôm nay
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
            Khám phá
            <br />
            <span style={{ color: "#7DC87D" }}>ngôi nhà mơ ước</span>
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 15,
              lineHeight: 1.7,
              margin: "0 0 36px",
              maxWidth: 400,
            }}>
            Tham gia cộng đồng bất động sản hàng đầu để nhận thông tin mới nhất
            và ưu đãi độc quyền.
          </p>

          {/* Benefits list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "home", text: "Tiếp cận 12,000+ bất động sản" },
              { icon: "bell", text: "Nhận thông báo tin mới tức thì" },
              { icon: "phone", text: "Kết nối trực tiếp với chủ nhà" },
              { icon: "shield", text: "Uy tín & Bảo mật thông tin" },
            ].map((b) => (
              <div
                key={b.text}
                style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}>
                  <FeatureIcon name={b.icon} color="#A8D9A8" size={17} />
                </div>
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
                  {b.text}
                </span>
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
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#111",
                margin: "0 0 8px",
                letterSpacing: "-0.6px",
              }}>
              Tạo tài khoản mới
            </h2>
            <p style={{ color: "#888", fontSize: 14, margin: 0 }}>
              Vui lòng điền thông tin bên dưới để bắt đầu.
            </p>
          </div>

          {/* Step indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 32,
              gap: 0,
            }}>
            {STEPS.map((label, i) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                  }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background:
                        i < step
                          ? "#C8402A"
                          : i === step
                            ? "#C8402A"
                            : "#E8E8E8",
                      color: i <= step ? "white" : "#AAA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      transition: "all 0.2s",
                      border:
                        i === step
                          ? "2px solid #C8402A"
                          : "2px solid transparent",
                      boxShadow:
                        i === step ? "0 0 0 3px rgba(200,64,42,0.15)" : "none",
                    }}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      fontWeight: i === step ? 700 : 400,
                      color: i <= step ? "#C8402A" : "#AAA",
                    }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      height: 2,
                      flex: 1,
                      marginBottom: 18,
                      background: i < step ? "#C8402A" : "#E8E8E8",
                      transition: "background 0.3s",
                    }}
                  />
                )}
              </div>
            ))}
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

          {/* STEP 0: Basic info */}
          {step === 0 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Họ và tên</label>
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
                    placeholder="Nguyễn Văn A"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#C8402A")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E5E5")}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Số điện thoại</label>
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
                        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.07h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"
                        stroke="#999"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={form.phone_number}
                      onChange={(e) =>
                        setForm({ ...form, phone_number: e.target.value })
                      }
                      style={{ ...inputStyle }}
                      onFocus={(e) => (e.target.style.borderColor = "#C8402A")}
                      onBlur={(e) => (e.target.style.borderColor = "#E5E5E5")}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Email</label>
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
                      d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                      stroke="#999"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <polyline
                      points="22,6 12,13 2,6"
                      stroke="#999"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type="email"
                    placeholder="email@vi-du.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#C8402A")}
                    onBlur={(e) => (e.target.style.borderColor = "#E5E5E5")}
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#C8402A",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "-0.1px",
                }}>
                Tiếp theo →
              </button>
            </div>
          )}

          {/* STEP 1: Password */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Mật khẩu</label>
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
                    placeholder="Tối thiểu 6 ký tự"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    style={{ ...inputStyle, paddingRight: 44 }}
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
                      color: "#999",
                    }}>
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
                  </button>
                </div>
                {/* Password strength */}
                {form.password && (
                  <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 3,
                          background:
                            form.password.length >= i * 4
                              ? form.password.length >= 10
                                ? "#5CB85C"
                                : "#E8A800"
                              : "#E8E8E8",
                          transition: "background 0.2s",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Nhập lại mật khẩu</label>
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
                      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                      stroke="#999"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirm_password}
                    onChange={(e) =>
                      setForm({ ...form, confirm_password: e.target.value })
                    }
                    style={{
                      ...inputStyle,
                      paddingRight: 44,
                      borderColor:
                        form.confirm_password &&
                        form.confirm_password !== form.password
                          ? "#C8402A"
                          : "#E5E5E5",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C8402A")}
                    onBlur={(e) =>
                      (e.target.style.borderColor =
                        form.confirm_password &&
                        form.confirm_password !== form.password
                          ? "#C8402A"
                          : "#E5E5E5")
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#999",
                    }}>
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
                  </button>
                </div>
                {form.confirm_password &&
                  form.confirm_password !== form.password && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#C8402A",
                        margin: "6px 0 0",
                        fontWeight: 500,
                      }}>
                      Mật khẩu không khớp
                    </p>
                  )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setStep(0)}
                  style={{
                    flex: "0 0 100px",
                    padding: "14px",
                    background: "white",
                    color: "#555",
                    border: "1.5px solid #E5E5E5",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}>
                  ← Quay lại
                </button>
                <button
                  onClick={handleNext}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "#C8402A",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}>
                  Tiếp theo →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Role */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 14, color: "#666", marginBottom: 18 }}>
                Bạn muốn làm gì trên nền tảng?
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 24,
                }}>
                {[
                  {
                    value: "buyer",
                    title: "Tìm Bất Động Sản",
                    subtitle: "Mua hoặc thuê nhà, đất, văn phòng",
                    icon: "search",
                    color: "#2563EB",
                    bg: "#EFF6FF",
                    border: "#BFDBFE",
                  },
                  {
                    value: "owner",
                    title: "Đăng Tin BĐS",
                    subtitle: "Bán hoặc cho thuê bất động sản của bạn",
                    icon: "building",
                    color: "#C8402A",
                    bg: "#FEF2F0",
                    border: "#FCCAC3",
                  },
                ].map((r) => (
                  <div
                    key={r.value}
                    onClick={() => setForm({ ...form, role: r.value })}
                    style={{
                      padding: "18px 20px",
                      border: `2px solid ${form.role === r.value ? r.color : "#E5E5E5"}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      background: form.role === r.value ? r.bg : "white",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      transition: "all 0.15s",
                    }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: form.role === r.value ? r.color : "#F0F0F0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        transition: "background 0.15s",
                      }}>
                      <FeatureIcon
                        name={r.icon}
                        color={form.role === r.value ? "white" : "#666"}
                        size={22}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#111",
                        }}>
                        {r.title}
                      </div>
                      <div
                        style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                        {r.subtitle}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${form.role === r.value ? r.color : "#CCC"}`,
                        background:
                          form.role === r.value ? r.color : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                        flexShrink: 0,
                      }}>
                      {form.role === r.value && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none">
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Terms */}
              <div
                onClick={() => setAgreed(!agreed)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                  marginBottom: 20,
                }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    flexShrink: 0,
                    marginTop: 1,
                    border: `2px solid ${agreed ? "#C8402A" : "#CCC"}`,
                    background: agreed ? "#C8402A" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                  {agreed && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "#666",
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                  Tôi đồng ý với{" "}
                  <Link
                    to="/terms"
                    style={{
                      color: "#C8402A",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                    onClick={(e) => e.stopPropagation()}>
                    Điều khoản sử dụng
                  </Link>{" "}
                  và{" "}
                  <Link
                    to="/privacy"
                    style={{
                      color: "#C8402A",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                    onClick={(e) => e.stopPropagation()}>
                    Chính sách bảo mật
                  </Link>{" "}
                  của Bất Động Sản.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: "0 0 100px",
                    padding: "14px",
                    background: "white",
                    color: "#555",
                    border: "1.5px solid #E5E5E5",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}>
                  ← Quay lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    flex: 1,
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
                  }}>
                  {loading ? "Đang đăng ký..." : "Đăng ký →"}
                </button>
              </div>
            </div>
          )}

          {/* Social signup */}
          {step === 0 && (
            <>
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
            </>
          )}

          <p
            style={{
              textAlign: "center",
              marginTop: 28,
              fontSize: 13,
              color: "#888",
            }}>
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              style={{
                color: "#C8402A",
                fontWeight: 700,
                textDecoration: "none",
              }}>
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>

      <style>{`input::placeholder { color: #C0C0C0; }`}</style>
    </div>
  );
}
