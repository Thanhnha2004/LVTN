import { createContext, useContext, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);

  const confirm = ({
    title = "Xác nhận thao tác",
    message = "Bạn có chắc muốn thực hiện thao tác này?",
    confirmText = "Xác nhận",
    cancelText = "Hủy",
    danger = false,
  }) =>
    new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        confirmText,
        cancelText,
        danger,
        resolve,
      });
    });

  const close = (value) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            background: "rgba(0,0,0,.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}>
          <div
            style={{
              width: "min(420px, 100%)",
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 18px 50px rgba(0,0,0,.22)",
              overflow: "hidden",
              fontFamily: "'Be Vietnam Pro', Inter, sans-serif",
            }}>
            <div style={{ padding: "22px 24px 12px" }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: confirmState.danger ? "#9f1d1d" : "#1a1c1c",
                  marginBottom: 8,
                }}>
                {confirmState.title}
              </div>
              <div style={{ fontSize: 14, color: "#5f5e5e", lineHeight: 1.6 }}>
                {confirmState.message}
              </div>
            </div>
            <div
              style={{
                padding: "14px 24px 22px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}>
              <button
                type="button"
                onClick={() => close(false)}
                style={{
                  height: 38,
                  padding: "0 18px",
                  borderRadius: 8,
                  border: "1px solid #d9d9d9",
                  background: "#fff",
                  color: "#4b5563",
                  fontWeight: 600,
                  cursor: "pointer",
                }}>
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                style={{
                  height: 38,
                  padding: "0 18px",
                  borderRadius: 8,
                  border: "none",
                  background: confirmState.danger ? "#b51b17" : "#1a1c1c",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    return { confirm: async () => window.confirm("Xác nhận thao tác?") };
  }
  return context;
}
