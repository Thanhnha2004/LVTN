export const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid #E8E8E8",
  borderRadius: 8,
  fontSize: 14,
  color: "#1a1c1c",
  background: "#fff",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

export const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#1a1c1c",
  marginBottom: 6,
  fontFamily: "Inter, sans-serif",
};

export const focusInput = (event) => {
  event.target.style.borderColor = "#b51b17";
};

export const blurInput = (event) => {
  event.target.style.borderColor = "#E8E8E8";
};
