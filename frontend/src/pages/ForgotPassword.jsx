import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/ToastProvider";

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  border: "1.5px solid #E5E5E5",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const showError = (text) => {
    setError(text);
    showToast(text, "error");
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("Email không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      const text = res.data.message || "Đã gửi mã OTP về email";
      setMessage(text);
      setStep(2);
      showToast(text);
    } catch (err) {
      showError(err.response?.data?.message || "Không thể gửi mã OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(otp)) {
      showError("Mã OTP phải gồm đúng 6 chữ số");
      return;
    }

    if (newPassword.length < 6) {
      showError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Xác nhận mật khẩu không khớp");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/reset-password", {
        email,
        otp,
        new_password: newPassword,
      });
      showToast(res.data.message || "Đặt lại mật khẩu thành công");
      navigate("/login", {
        replace: true,
        state: { message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập." },
      });
    } catch (err) {
      showError(err.response?.data?.message || "Không thể đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f5f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'Be Vietnam Pro', Inter, sans-serif",
      }}>
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 18,
          border: "1px solid #eadfda",
          boxShadow: "0 16px 50px rgba(80,45,35,.12)",
          padding: 30,
        }}>
        <div style={{ marginBottom: 22 }}>
          <Link
            to="/login"
            style={{
              color: "#8a4f44",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}>
            Quay lại đăng nhập
          </Link>
          <h1
            style={{
              margin: "18px 0 8px",
              fontSize: 26,
              fontWeight: 800,
              color: "#1f1b1a",
            }}>
            Quên mật khẩu
          </h1>
          <p style={{ margin: 0, color: "#6b5c58", fontSize: 14, lineHeight: 1.6 }}>
            {step === 1
              ? "Nhập email tài khoản để nhận mã OTP đặt lại mật khẩu."
              : "Nhập mã OTP trong email và mật khẩu mới của bạn."}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fff0ef",
              color: "#9f1d1d",
              border: "1px solid #f3b4b4",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              marginBottom: 14,
            }}>
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: "#f1f8f4",
              color: "#164b35",
              border: "1px solid #b7dfc7",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              marginBottom: 14,
            }}>
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@bds.com"
              style={inputStyle}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 46,
                border: "none",
                borderRadius: 10,
                background: loading ? "#ccc" : "#b51b17",
                color: "#fff",
                fontWeight: 800,
                marginTop: 18,
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Đang gửi..." : "Gửi mã OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Mã OTP
            </label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Nhập 6 chữ số"
              inputMode="numeric"
              style={{ ...inputStyle, letterSpacing: 5, textAlign: "center" }}
              required
            />

            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginTop: 14,
                marginBottom: 8,
              }}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              style={inputStyle}
              required
            />

            <label
              style={{
                display: "block",
                fontWeight: 700,
                marginTop: 14,
                marginBottom: 8,
              }}>
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              style={inputStyle}
              required
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 46,
                border: "none",
                borderRadius: 10,
                background: loading ? "#ccc" : "#b51b17",
                color: "#fff",
                fontWeight: 800,
                marginTop: 18,
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: "#b51b17",
                fontWeight: 700,
                marginTop: 14,
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              Gửi lại mã OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
