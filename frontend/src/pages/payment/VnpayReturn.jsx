import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaCheckCircle, FaSpinner, FaTimesCircle } from "react-icons/fa";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

const VN = { fontFamily: "'Be Vietnam Pro', Inter, sans-serif" };

export default function VnpayReturn() {
  const location = useLocation();
  const { user } = useAuth();
  const [result, setResult] = useState({
    loading: true,
    success: false,
    message: "Đang xác thực kết quả thanh toán VNPay...",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/property/vnpay-return${location.search}`);
        setResult({
          loading: false,
          success: Boolean(res.data.success),
          message: res.data.message || "Đã xử lý kết quả thanh toán",
        });
      } catch (err) {
        setResult({
          loading: false,
          success: false,
          message:
            err.response?.data?.message ||
            "Không thể xác thực kết quả thanh toán VNPay",
        });
      }
    })();
  }, [location.search]);

  const backLink = user?.role === "owner" ? "/owner/dashboard" : "/";
  const backText = user?.role === "owner" ? "Quay về quản lý tin" : "Quay về trang chủ";

  const icon = result.loading ? (
    <FaSpinner className="spinner-border" style={{ border: "none" }} />
  ) : result.success ? (
    <FaCheckCircle />
  ) : (
    <FaTimesCircle />
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f7", ...VN }}>
      <Navbar />
      <div
        style={{
          maxWidth: 520,
          margin: "70px auto",
          background: "#fff",
          border: "0.5px solid #E8E8E8",
          borderRadius: 14,
          padding: 28,
          textAlign: "center",
          boxShadow: "0 8px 26px rgba(0,0,0,0.06)",
        }}>
        <div
          style={{
            fontSize: 48,
            color: result.loading ? "#757575" : result.success ? "#0f6e56" : "#b51b17",
            marginBottom: 14,
          }}>
          {icon}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          {result.loading
            ? "Đang xử lý thanh toán"
            : result.success
              ? "Thanh toán thành công"
              : "Thanh toán không thành công"}
        </h1>
        <p style={{ color: "#5f5e5e", fontSize: 14, lineHeight: 1.6 }}>
          {result.message}
        </p>
        <Link
          to={backLink}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 40,
            padding: "0 18px",
            marginTop: 14,
            borderRadius: 8,
            background: "#b51b17",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14,
          }}>
          {backText}
        </Link>
      </div>
    </div>
  );
}
