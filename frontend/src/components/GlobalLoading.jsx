import { useEffect, useState } from "react";

export default function GlobalLoading() {
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleLoading = (event) => {
      setPendingCount(event.detail?.count || 0);
    };

    window.addEventListener("app:loading", handleLoading);
    return () => window.removeEventListener("app:loading", handleLoading);
  }, []);

  useEffect(() => {
    if (pendingCount <= 0) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), 450);
    return () => window.clearTimeout(timer);
  }, [pendingCount]);

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Đang xử lý"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(26, 28, 28, 0.92)",
        color: "#fff",
        boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        pointerEvents: "none",
      }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.35)",
          borderTopColor: "#fff",
          animation: "global-loading-spin 0.75s linear infinite",
        }}
      />
      Đang xử lý...
      <style>
        {`
          @keyframes global-loading-spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
