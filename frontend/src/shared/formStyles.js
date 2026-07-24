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
  transition: "border-color 0.16s ease, box-shadow 0.16s ease",
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
  event.target.style.boxShadow = "0 0 0 4px rgba(181, 27, 23, 0.14)";
};

export const blurInput = (event) => {
  event.target.style.borderColor = "#E8E8E8";
  event.target.style.boxShadow = "none";
};
