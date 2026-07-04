import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import UiIcon from "../../components/UiIcon";
import {
  CITIES,
  DIRECTIONS,
  LEGAL_OPTIONS,
  PROPERTY_TYPES,
  formatInputPrice as formatPrice,
} from "../../shared/property";
import { inputStyle, labelStyle } from "../../shared/formStyles";
import { useToast } from "../../components/ToastProvider";

const STEPS = [
  { id: 1, label: "Thông tin cơ bản"},
  { id: 2, label: "Địa chỉ"},
  { id: 3, label: "Chi tiết"},
  { id: 4, label: "Hình ảnh"},
  { id: 5, label: "Xác nhận"},
];


const sectionTitle = (icon, text) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <h2
      style={{
        fontFamily: "Manrope, sans-serif",
        fontSize: 18,
        fontWeight: 700,
        color: "#1a1c1c",
        margin: 0,
      }}>
      {text}
    </h2>
  </div>
);

export default function CreateProperty() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileRef = useRef();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newPropertyId, setNewPropertyId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    transaction_type: "sale",
    type: "",
    price: "",
    area: "",
    address: "",
    city: "",
    district: "",
    ward: "",
    bedrooms: "",
    bathrooms: "",
    direction: "",
    legal_status: "",
    latitude: "",
    longitude: "",
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleGenerateDescription = async () => {
    setError("");
    setGeneratingDescription(true);
    try {
      const res = await api.post("/api/property/ai-description", form);
      setForm((f) => ({ ...f, description: res.data.description || "" }));
      showToast("Đã tạo gợi ý mô tả tin đăng.");
    } catch (err) {
      const message =
        err.response?.data?.message || "Không thể tạo mô tả, vui lòng thử lại.";
      setError(message);
      showToast(message, "error");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const focusStyle = (e) => (e.target.style.borderColor = "#b51b17");
  const blurStyle = (e) => (e.target.style.borderColor = "#E8E8E8");

  const renderDescriptionField = () => (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>
          Mô tả chi tiết <span style={{ color: "#b51b17" }}>*</span>
        </label>
        <button
          type="button"
          onClick={handleGenerateDescription}
          disabled={generatingDescription}
          style={{
            border: "1px solid #b51b17",
            background: generatingDescription ? "#f7d6d2" : "#fff",
            color: "#b51b17",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: generatingDescription ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
          <UiIcon name="edit" size={14} />
          {generatingDescription ? "Đang tạo..." : "Gợi ý mô tả"}
        </button>
      </div>
      <textarea
        rows={5}
        placeholder="Mô tả đặc điểm nổi bật, vị trí, tiện ích, pháp lý..."
        value={form.description}
        onChange={set("description")}
        style={{
          ...inputStyle,
          resize: "vertical",
          lineHeight: 1.6,
        }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
    </div>
  );

  const validateStep = () => {
    setError("");
    if (step === 1) {
      if (!form.title || form.title.trim().length < 5)
        return (
          setError("Tiêu đề phải có ít nhất 5 ký tự") ||
          showToast("Tiêu đề phải có ít nhất 5 ký tự", "error") ||
          false
        );
      if (!form.type)
        return (
          setError("Vui lòng chọn loại hình bất động sản") ||
          showToast("Vui lòng chọn loại hình bất động sản", "error") ||
          false
        );
      if (!form.price || parseFloat(form.price) <= 0)
        return (
          setError("Vui lòng nhập giá hợp lệ") ||
          showToast("Vui lòng nhập giá hợp lệ", "error") ||
          false
        );
      if (!form.area || parseFloat(form.area) <= 0)
        return (
          setError("Vui lòng nhập diện tích hợp lệ") ||
          showToast("Vui lòng nhập diện tích hợp lệ", "error") ||
          false
        );
    }
    if (step === 2) {
      if (!form.address.trim())
        return (
          setError("Vui lòng nhập địa chỉ") ||
          showToast("Vui lòng nhập địa chỉ", "error") ||
          false
        );
      if (!form.city)
        return (
          setError("Vui lòng chọn tỉnh/thành phố") ||
          showToast("Vui lòng chọn tỉnh/thành phố", "error") ||
          false
        );
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFiles = (files) => {
    const arr = Array.from(files).slice(0, 5);
    setImages(arr);
    setImagePreviews(arr.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.description || form.description.trim().length < 20) {
      setError("Mô tả phải có ít nhất 20 ký tự");
      showToast("Mô tả phải có ít nhất 20 ký tự", "error");
      return;
    }
    setLoading(true);
    try {
      // 1. Create property
      const res = await api.post("/api/property", {
        title: form.title,
        description: form.description,
        type: form.type,
        transaction_type: form.transaction_type,
        price: parseFloat(form.price),
        area: parseFloat(form.area),
        address: form.address,
        city: form.city,
        district: form.district || undefined,
        ward: form.ward || undefined,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
        direction: form.direction || undefined,
        legal_status: form.legal_status || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      });

      const propId = res.data.id;
      setNewPropertyId(propId);

      // 2. Upload images if any
      if (images.length > 0) {
        const fd = new FormData();
        images.forEach((f) => fd.append("images", f));
        await api.post(`/api/property/${propId}/images`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setSuccess(true);
      showToast("Đăng tin thành công. Tin đang chờ admin duyệt.");
    } catch (err) {
      const message =
        err.response?.data?.message || "Đăng tin thất bại, vui lòng thử lại.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  if (success) {
    return (
      <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
        <Navbar />
        <div
          style={{
            maxWidth: 560,
            margin: "80px auto",
            padding: "0 24px",
            textAlign: "center",
          }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E8E8E8",
              borderRadius: 16,
              padding: "48px 40px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}>
            <div style={{ color: "#18753c", marginBottom: 20 }}><UiIcon name="success" size={64} /></div>
            <h2
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: 24,
                fontWeight: 700,
                color: "#1a1c1c",
                marginBottom: 12,
              }}>
              Đăng tin thành công!
            </h2>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 15,
                color: "#757575",
                lineHeight: 1.7,
                marginBottom: 8,
              }}>
              Tin đăng của bạn đã được gửi và đang chờ quản trị viên duyệt.
            </p>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                color: "#00A550",
                fontWeight: 600,
                marginBottom: 32,
              }}>
              ✓ Thường mất 24–48 giờ để được phê duyệt
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => navigate("/owner/dashboard")}
                style={{
                  background: "#b51b17",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}>
                Xem quản lý tin
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setStep(1);
                  setForm({
                    title: "",
                    description: "",
                    transaction_type: "sale",
                    type: "",
                    price: "",
                    area: "",
                    address: "",
                    city: "",
                    district: "",
                    ward: "",
                    bedrooms: "",
                    bathrooms: "",
                    direction: "",
                    legal_status: "",
                    latitude: "",
                    longitude: "",
                  });
                  setImages([]);
                  setImagePreviews([]);
                }}
                style={{
                  background: "#fff",
                  color: "#1a1c1c",
                  border: "1.5px solid #E8E8E8",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}>
                Đăng tin mới
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f9f9f9",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
      }}>
      <Navbar />
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 40px 0" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a
            href="/owner/dashboard"
            style={{ fontSize: 13, color: "#757575", textDecoration: "none" }}>
            Bất động sản của tôi
          </a>
          <span style={{ fontSize: 13, color: "#bbb" }}>›</span>
          <span style={{ fontSize: 13, color: "#b51b17", fontWeight: 600 }}>
            Đăng tin
          </span>
        </nav>
      </div>
      <div
        style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: "#1a1c1c",
              margin: "0 0 6px",
            }}>
            Đăng tin rao bán / cho thuê
          </h1>
          <p style={{ fontSize: 15, color: "#757575", margin: 0 }}>
            Hoàn thành quy trình 5 bước để bất động sản của bạn tiếp cận hàng
            triệu khách hàng.
          </p>
        </div>

        {/* Stepper */}
        <div style={{ position: "relative", marginBottom: 40, maxWidth: 760 }}>
          {/* Background track */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              right: 20,
              height: 2,
              background: "#E8E8E8",
              zIndex: 0,
            }}
          />
          {/* Progress fill */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              height: 2,
              background: "#b51b17",
              zIndex: 1,
              width: `calc(${progressPct}% * (100% - 40px) / 100)`,
              transition: "width 0.4s ease",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              position: "relative",
              zIndex: 2,
            }}>
            {STEPS.map((s) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: done
                        ? "#b51b17"
                        : active
                          ? "#b51b17"
                          : "#fff",
                      border:
                        done || active
                          ? "2px solid #b51b17"
                          : "2px solid #E8E8E8",
                      color: done || active ? "#fff" : "#8f706b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Manrope, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      boxShadow: active
                        ? "0 0 0 4px rgba(181,27,23,0.15)"
                        : "none",
                      transition: "all 0.25s ease",
                    }}>
                    {done ? "✓" : s.id}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: active ? 700 : 400,
                      color: active || done ? "#b51b17" : "#8f706b",
                      whiteSpace: "nowrap",
                    }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: 32,
            alignItems: "start",
          }}>
          {/* Left: Form card */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #E8E8E8",
              borderRadius: 12,
              padding: "32px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
            {/* Error */}
            {error && (
              <div
                style={{
                  background: "#fef2f0",
                  border: "1px solid #fccac3",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                <UiIcon name="alert" size={18} />
                <span
                  style={{ fontSize: 13, color: "#b51b17", fontWeight: 500 }}>
                  {error}
                </span>
              </div>
            )}

            {/* ── STEP 1: Thông tin cơ bản ── */}
            {step === 1 && (
              <div>
                {sectionTitle("Thông tin cơ bản")}

                {/* Transaction type tabs */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>
                    Hình thức giao dịch{" "}
                    <span style={{ color: "#b51b17" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { value: "sale", label: "Bán" },
                      { value: "rent", label: "Cho thuê" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, transaction_type: t.value }))
                        }
                        style={{
                          flex: 1,
                          padding: "11px 0",
                          border: `2px solid ${form.transaction_type === t.value ? "#b51b17" : "#E8E8E8"}`,
                          borderRadius: 8,
                          background:
                            form.transaction_type === t.value
                              ? "#fef2f0"
                              : "#fff",
                          color:
                            form.transaction_type === t.value
                              ? "#b51b17"
                              : "#5f5e5e",
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property type */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>
                    Loại bất động sản{" "}
                    <span style={{ color: "#b51b17" }}>*</span>
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}>
                    {PROPERTY_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, type: t.value }))
                        }
                        style={{
                          padding: "14px 12px",
                          border: `2px solid ${form.type === t.value ? "#b51b17" : "#E8E8E8"}`,
                          borderRadius: 8,
                          background:
                            form.type === t.value ? "#fef2f0" : "#fff",
                          color: form.type === t.value ? "#b51b17" : "#1a1c1c",
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 500,
                          fontSize: 14,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          transition: "all 0.15s",
                        }}>
                        <span style={{ fontSize: 20 }}>{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    Tiêu đề tin đăng <span style={{ color: "#b51b17" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Bán căn hộ chung cư Vinhomes Central Park 2PN, view sông"
                    value={form.title}
                    onChange={set("title")}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                  <p style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
                    Tối thiểu 5 ký tự.
                  </p>
                </div>

                {/* Price + Area */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 8,
                  }}>
                  <div>
                    <label style={labelStyle}>
                      Mức giá (VNĐ) <span style={{ color: "#b51b17" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="0"
                        value={form.price}
                        onChange={set("price")}
                        style={{ ...inputStyle, paddingRight: 44 }}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        min="0"
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 11,
                          color: "#8f706b",
                          fontWeight: 600,
                        }}>
                        VNĐ
                      </span>
                    </div>
                    {form.price && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#b51b17",
                          marginTop: 4,
                          fontWeight: 600,
                        }}>
                        ≈ {formatPrice(form.price)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Diện tích (m²) <span style={{ color: "#b51b17" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="0"
                        value={form.area}
                        onChange={set("area")}
                        style={{ ...inputStyle, paddingRight: 36 }}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        min="0"
                      />
                      <span
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: 11,
                          color: "#8f706b",
                          fontWeight: 600,
                        }}>
                        m²
                      </span>
                    </div>
                    {form.price && form.area && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#757575",
                          marginTop: 4,
                        }}>
                        ≈{" "}
                        {formatPrice(
                          parseFloat(form.price) / parseFloat(form.area),
                        )}
                        /m²
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Địa chỉ ── */}
            {step === 2 && (
              <div>
                {sectionTitle("Địa chỉ bất động sản")}

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>
                    Tỉnh / Thành phố <span style={{ color: "#b51b17" }}>*</span>
                  </label>
                  <select
                    value={form.city}
                    onChange={set("city")}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}>
                    <option value="">-- Chọn tỉnh/thành phố --</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 20,
                  }}>
                  <div>
                    <label style={labelStyle}>Quận / Huyện</label>
                    <input
                      type="text"
                      placeholder="VD: Bình Thạnh"
                      value={form.district}
                      onChange={set("district")}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phường / Xã</label>
                    <input
                      type="text"
                      placeholder="VD: Phường 22"
                      value={form.ward}
                      onChange={set("ward")}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>
                    Địa chỉ cụ thể <span style={{ color: "#b51b17" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 208 Nguyễn Xí, Bình Thạnh"
                    value={form.address}
                    onChange={set("address")}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>

                {/* Map placeholder */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>
                    Vị trí trên bản đồ{" "}
                    <span
                      style={{
                        fontSize: 12,
                        color: "#757575",
                        fontWeight: 400,
                      }}>
                      (tuỳ chọn)
                    </span>
                  </label>
                  <div
                    style={{
                      background: "#f3f3f3",
                      border: "1.5px dashed #E8E8E8",
                      borderRadius: 8,
                      height: 180,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 8,
                      color: "#8f706b",
                      cursor: "pointer",
                    }}>
                    <UiIcon name="map" size={32} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      Nhấn để chọn vị trí trên bản đồ
                    </span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>
                      Giúp người mua tìm kiếm dễ hơn
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}>
                  <div>
                    <label style={labelStyle}>Vĩ độ (Latitude)</label>
                    <input
                      type="number"
                      placeholder="VD: 10.7769"
                      value={form.latitude}
                      onChange={set("latitude")}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                      step="any"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Kinh độ (Longitude)</label>
                    <input
                      type="number"
                      placeholder="VD: 106.7009"
                      value={form.longitude}
                      onChange={set("longitude")}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                      step="any"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Chi tiết ── */}
            {step === 3 && (
              <div>
                {sectionTitle("Thông tin chi tiết")}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 20,
                  }}>
                  <div>
                    <label style={labelStyle}>Số phòng ngủ</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2, 3, 4, "5+"].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              bedrooms: String(n === "5+" ? 5 : n),
                            }))
                          }
                          style={{
                            flex: 1,
                            padding: "9px 0",
                            border: `1.5px solid ${form.bedrooms === String(n === "5+" ? 5 : n) ? "#b51b17" : "#E8E8E8"}`,
                            borderRadius: 6,
                            background:
                              form.bedrooms === String(n === "5+" ? 5 : n)
                                ? "#fef2f0"
                                : "#fff",
                            color:
                              form.bedrooms === String(n === "5+" ? 5 : n)
                                ? "#b51b17"
                                : "#5f5e5e",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Số phòng tắm</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2, 3, 4, "5+"].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              bathrooms: String(n === "5+" ? 5 : n),
                            }))
                          }
                          style={{
                            flex: 1,
                            padding: "9px 0",
                            border: `1.5px solid ${form.bathrooms === String(n === "5+" ? 5 : n) ? "#b51b17" : "#E8E8E8"}`,
                            borderRadius: 6,
                            background:
                              form.bathrooms === String(n === "5+" ? 5 : n)
                                ? "#fef2f0"
                                : "#fff",
                            color:
                              form.bathrooms === String(n === "5+" ? 5 : n)
                                ? "#b51b17"
                                : "#5f5e5e",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 20,
                  }}>
                  <div>
                    <label style={labelStyle}>Hướng nhà</label>
                    <select
                      value={form.direction}
                      onChange={set("direction")}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}>
                      <option value="">-- Chọn hướng --</option>
                      {DIRECTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Tình trạng pháp lý</label>
                    <select
                      value={form.legal_status}
                      onChange={set("legal_status")}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}>
                      <option value="">-- Chọn pháp lý --</option>
                      {LEGAL_OPTIONS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Summary of entered data */}
                <div
                  style={{
                    background: "#f9f9f9",
                    border: "1px solid #E8E8E8",
                    borderRadius: 8,
                    padding: 16,
                    marginTop: 8,
                  }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#8f706b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 12,
                    }}>
                    Tóm tắt thông tin đã nhập
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}>
                    {[
                      [
                        "Giao dịch",
                        form.transaction_type === "sale" ? "Bán" : "Cho thuê",
                      ],
                      [
                        "Loại hình",
                        PROPERTY_TYPES.find((t) => t.value === form.type)
                          ?.label || "—",
                      ],
                      ["Giá", formatPrice(form.price) || "—"],
                      ["Diện tích", form.area ? `${form.area} m²` : "—"],
                      ["Thành phố", form.city || "—"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 0",
                          borderBottom: "1px solid #f0f0f0",
                        }}>
                        <span style={{ fontSize: 13, color: "#757575" }}>
                          {k}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1a1c1c",
                          }}>
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Hình ảnh ── */}
            {step === 4 && (
              <div>
                {sectionTitle("Hình ảnh bất động sản")}

                <p
                  style={{
                    fontSize: 14,
                    color: "#757575",
                    marginBottom: 20,
                    lineHeight: 1.6,
                  }}>
                  Ảnh chất lượng cao giúp tăng{" "}
                  <strong style={{ color: "#b51b17" }}>300%</strong> lượt click
                  so với ảnh mờ hoặc ảnh phối cảnh. Tối đa 8 ảnh định dạng JPG,
                  PNG, WEBP.
                </p>

                {/* Upload zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }}
                  style={{
                    border: "2px dashed #e4beb9",
                    borderRadius: 10,
                    background: "#fef9f9",
                    padding: "40px 24px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                    marginBottom: 24,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#b51b17")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#e4beb9")
                  }>
                  <div style={{ marginBottom: 12 }}><UiIcon name="camera" size={40} /></div>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#1a1c1c",
                      marginBottom: 4,
                    }}>
                    Kéo ảnh vào đây hoặc nhấn để chọn
                  </p>
                  <p style={{ fontSize: 13, color: "#8f706b" }}>
                    JPG, PNG, WEBP — Tối đa 8 ảnh
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>

                {/* Previews */}
                {imagePreviews.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1a1c1c",
                        marginBottom: 12,
                      }}>
                      {imagePreviews.length} ảnh đã chọn:
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 10,
                      }}>
                      {imagePreviews.map((src, i) => (
                        <div
                          key={i}
                          style={{
                            position: "relative",
                            borderRadius: 8,
                            overflow: "hidden",
                            aspectRatio: "4/3",
                          }}>
                          <img
                            src={src}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          {i === 0 && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                background: "#b51b17",
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: 700,
                                textAlign: "center",
                                padding: "3px 0",
                              }}>
                              ẢNH CHÍNH
                            </div>
                          )}
                          <button
                            onClick={() => removeImage(i)}
                            style={{
                              position: "absolute",
                              top: i === 0 ? 22 : 4,
                              right: 4,
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: "rgba(0,0,0,0.6)",
                              border: "none",
                              color: "#fff",
                              fontSize: 12,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imagePreviews.length === 0 && (
                  <div
                    style={{
                      background: "#fff8e1",
                      border: "1px solid #ffe082",
                      borderRadius: 8,
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                    <UiIcon name="alert" size={18} />
                    <span style={{ fontSize: 13, color: "#795548" }}>
                      Bạn có thể bỏ qua bước này và thêm ảnh sau trong phần quản
                      lý tin.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 5: Xác nhận ── */}
            {step === 5 && (
              <div>
                {sectionTitle("Xác nhận và đăng tin")}

                <div style={{ marginBottom: 24 }}>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#757575",
                      lineHeight: 1.7,
                      marginBottom: 20,
                    }}>
                    Vui lòng kiểm tra lại toàn bộ thông tin trước khi đăng tin.
                    Sau khi đăng, tin sẽ được gửi tới quản trị viên để duyệt.
                  </p>

                  {renderDescriptionField()}

                  {/* Summary card */}
                  <div
                    style={{
                      border: "1px solid #E8E8E8",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}>
                    <div
                      style={{
                        background: "#f9f9f9",
                        padding: "12px 20px",
                        borderBottom: "1px solid #E8E8E8",
                      }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1a1c1c",
                          margin: 0,
                        }}>
                        Thông tin tin đăng
                      </p>
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      {[
                        ["Tiêu đề", form.title],
                        [
                          "Giao dịch",
                          form.transaction_type === "sale" ? "Bán" : "Cho thuê",
                        ],
                        [
                          "Loại hình",
                          PROPERTY_TYPES.find((t) => t.value === form.type)
                            ?.label || "—",
                        ],
                        ["Giá", formatPrice(form.price) || "—"],
                        ["Diện tích", form.area ? `${form.area} m²` : "—"],
                        [
                          "Địa chỉ",
                          [form.address, form.ward, form.district, form.city]
                            .filter(Boolean)
                            .join(", ") || "—",
                        ],
                        ["Phòng ngủ", form.bedrooms || "—"],
                        ["Phòng tắm", form.bathrooms || "—"],
                        [
                          "Hướng nhà",
                          DIRECTIONS.find((d) => d.value === form.direction)
                            ?.label || "—",
                        ],
                        [
                          "Pháp lý",
                          LEGAL_OPTIONS.find(
                            (l) => l.value === form.legal_status,
                          )?.label || "—",
                        ],
                        [
                          "Số ảnh",
                          imagePreviews.length > 0
                            ? `${imagePreviews.length} ảnh`
                            : "Chưa có ảnh",
                        ],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderBottom: "1px solid #f3f3f3",
                          }}>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#757575",
                              minWidth: 120,
                            }}>
                            {k}
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#1a1c1c",
                              textAlign: "right",
                              maxWidth: 300,
                              wordBreak: "break-word",
                            }}>
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #bce9ff",
                    borderRadius: 8,
                    padding: "14px 16px",
                    marginBottom: 20,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#004d64",
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                    Bằng cách nhấn "Đăng tin", bạn đồng ý với{" "}
                    <a
                      href="/terms"
                      style={{ color: "#006480", fontWeight: 600 }}>
                      Điều khoản sử dụng
                    </a>{" "}
                    và xác nhận rằng thông tin trên là chính xác và đầy đủ.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 32,
                paddingTop: 24,
                borderTop: "1px solid #f3f3f3",
              }}>
              {step > 1 ? (
                <button
                  onClick={prevStep}
                  style={{
                    background: "#fff",
                    color: "#5f5e5e",
                    border: "1.5px solid #E8E8E8",
                    borderRadius: 8,
                    padding: "11px 24px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                  ← Quay lại
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  onClick={nextStep}
                  style={{
                    background: "#b51b17",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 32px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                  Tiếp tục →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    background: loading ? "#ccc" : "#b51b17",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 32px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                  {loading ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: 14,
                          height: 14,
                          border: "2px solid rgba(255,255,255,0.4)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Đang đăng tin...
                    </>
                  ) : (
                    "Đăng tin ngay"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right: Tips sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Tips card */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 12,
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}>
                <h3
                  style={{
                    fontFamily: "Manrope, sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#1a1c1c",
                    margin: 0,
                  }}>
                  Mẹo đăng tin hiệu quả
                </h3>
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                {[
                  {
                    text: "Tiêu đề có từ khoá quan trọng (Quận, Phường, Dự án) giúp khách hàng tìm thấy nhanh hơn.",
                  },
                  {
                    text: "Ảnh thật, rõ nét, chụp vào ban ngày sẽ tăng 300% lượt click.",
                  },
                  {
                    text: "Mô tả chi tiết tình trạng pháp lý và tiện ích xung quanh giúp xây dựng lòng tin.",
                  },
                  {
                    text: "Ghi rõ mức giá thực tế, không ghi 'Thỏa thuận' nếu có thể.",
                  },
                ].map((tip, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                      {tip.icon}
                    </span>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#5b403c",
                        lineHeight: 1.6,
                        margin: 0,
                      }}>
                      {tip.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support card */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 12,
                padding: "20px",
              }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  marginBottom: 12,
                }}>
                Hỗ trợ đăng tin
              </p>
              <div
                style={{
                  background: "#fef2f0",
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}>
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#8f706b",
                      margin: "0 0 2px",
                    }}>
                    Hotline 24/7
                  </p>
                  <p
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#b51b17",
                      margin: 0,
                      fontFamily: "Manrope, sans-serif",
                    }}>
                    1900 1234
                  </p>
                </div>
              </div>
            </div>

            {/* Step guide */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E8E8E8",
                borderRadius: 12,
                padding: "20px",
              }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  marginBottom: 14,
                }}>
                Quy trình đăng tin
              </p>
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: step >= s.id ? "#b51b17" : "#e2e2e2",
                      color: step >= s.id ? "#fff" : "#8f706b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                    {step > s.id ? "✓" : s.id}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color:
                        step === s.id
                          ? "#b51b17"
                          : step > s.id
                            ? "#00A550"
                            : "#8f706b",
                      fontWeight: step === s.id ? 700 : 400,
                      paddingTop: 3,
                    }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
