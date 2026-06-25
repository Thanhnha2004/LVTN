import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/ToastProvider";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState(location.state?.message || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Mã OTP phải gồm đúng 6 chữ số.");
      showToast("Mã OTP phải gồm đúng 6 chữ số.", "error");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/verify-email", { email, otp });
      showToast("Xác minh email thành công. Bạn có thể đăng nhập.");
      navigate("/login", {
        replace: true,
        state: { message: "Xác minh email thành công. Bạn có thể đăng nhập." },
      });
    } catch (err) {
      const message =
        err.response?.data?.message || "Xác minh email thất bại.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResending(true);
    try {
      const res = await api.post("/api/auth/send-otp", { email });
      const message = res.data.message || "Đã gửi lại mã OTP.";
      setMessage(message);
      showToast(message);
    } catch (err) {
      const message =
        err.response?.data?.message || "Không thể gửi lại mã OTP.";
      setError(message);
      showToast(message, "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f7f6f3", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <section style={{ width: "100%", maxWidth: 460, padding: 32, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.06)" }}>
        <h1 style={{ margin: "0 0 10px", fontSize: 26, color: "#171717" }}>Xác minh email</h1>
        <p style={{ margin: "0 0 22px", color: "#666", lineHeight: 1.6 }}>
          Mã OTP gồm 6 chữ số đã được gửi đến <strong>{email}</strong>. Bạn cần xác minh email trước khi đăng nhập.
        </p>
        {message && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, background: "#edf8f1", color: "#18753c" }}>{message}</div>}
        {error && <div style={{ padding: 12, marginBottom: 16, borderRadius: 6, background: "#fef2f0", color: "#b42318" }}>{error}</div>}

        <form onSubmit={handleVerify}>
          <label htmlFor="otp" style={{ display: "block", marginBottom: 7, fontWeight: 600 }}>Mã OTP</label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="Nhập 6 chữ số"
            autoFocus
            style={{ width: "100%", padding: 13, border: "1.5px solid #d8d8d8", borderRadius: 7, fontSize: 20, letterSpacing: 6, textAlign: "center", boxSizing: "border-box" }}
          />
          <button type="submit" disabled={loading || !email} style={{ width: "100%", marginTop: 18, padding: 13, border: 0, borderRadius: 7, background: "#c8402a", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Đang xác minh..." : "Xác minh tài khoản"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 14 }}>
          <button type="button" onClick={handleResend} disabled={resending || !email} style={{ border: 0, padding: 0, background: "none", color: "#c8402a", cursor: "pointer" }}>
            {resending ? "Đang gửi..." : "Gửi lại mã OTP"}
          </button>
          <Link to="/login" style={{ color: "#555", textDecoration: "none" }}>Quay lại đăng nhập</Link>
        </div>
      </section>
    </main>
  );
}
