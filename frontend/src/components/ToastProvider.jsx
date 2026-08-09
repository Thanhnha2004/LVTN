import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 72,
          right: 20,
          zIndex: 3000,
          display: "grid",
          gap: 10,
          width: "min(360px, calc(100vw - 32px))",
        }}>
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          return (
            <div
              key={toast.id}
              style={{
                background: "#fff",
                border: `1px solid ${isError ? "#f3b4b4" : "#b7dfc7"}`,
                borderLeft: `4px solid ${isError ? "#b51b17" : "#0f6e56"}`,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                color: isError ? "#7f1d1d" : "#164b35",
                fontFamily: "'Be Vietnam Pro', Inter, sans-serif",
                fontSize: 13,
                lineHeight: 1.5,
              }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {isError ? "Thao tác thất bại" : "Thao tác thành công"}
                </div>
                <div>{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "inherit",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0,
                }}>
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// The hook intentionally shares this module with its provider so every caller
// uses the exact same context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: () => {} };
  }
  return context;
}
