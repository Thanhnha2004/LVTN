import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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
import {
  blurInput,
  focusInput,
  inputStyle,
  labelStyle,
} from "../../shared/formStyles";
import { useToast } from "../../components/ToastProvider";

// ─── Constants ────────────────────────────────────────────────────────────────
const VN = { fontFamily: "'Be Vietnam Pro', Inter, sans-serif" };


// ─── SectionCard ──────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #E8E8E8",
        borderRadius: 12,
        padding: "24px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        marginBottom: 20,
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "0.5px solid #E8E8E8",
          paddingBottom: 14,
          marginBottom: 20,
        }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3
          style={{
            fontFamily: "Manrope, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#1a1c1c",
            margin: 0,
          }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ─── ImageCard ────────────────────────────────────────────────────────────────
function ImageCard({ url, isFirst, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 10,
        overflow: "hidden",
        aspectRatio: "4/3",
        border: "0.5px solid #E8E8E8",
      }}>
      <img
        src={url}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      {isFirst && (
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
      {hovered && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <button
            onClick={onDelete}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#b51b17",
            }}>
            <UiIcon name="trash" size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EditProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileRef = useRef();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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

  // ── Fetch property data ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/property/${id}`);
        const p = res.data;
        setForm({
          title: p.title || "",
          description: p.description || "",
          transaction_type: p.transaction_type || "sale",
          type: p.type || "",
          price: p.price ? String(p.price) : "",
          area: p.area ? String(p.area) : "",
          address: p.address || "",
          city: p.city || "",
          district: p.district || "",
          ward: p.ward || "",
          bedrooms: p.bedrooms ? String(p.bedrooms) : "",
          bathrooms: p.bathrooms ? String(p.bathrooms) : "",
          direction: p.direction || "",
          legal_status: p.legal_status || "",
          latitude: p.latitude ? String(p.latitude) : "",
          longitude: p.longitude ? String(p.longitude) : "",
        });
        setExistingImages(p.images || []);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
        else {
          setError("Không thể tải thông tin bất động sản.");
          showToast("Không thể tải thông tin bất động sản", "error");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Handle new file selection ─────────────────────────────────────────────
  const handleFiles = (files) => {
    const arr = Array.from(files).slice(0, 5 - existingImages.length);
    setNewFiles(arr);
    setNewPreviews(arr.map((f) => URL.createObjectURL(f)));
  };

  const removeNewFile = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.title || form.title.trim().length < 5)
      return "Tiêu đề phải có ít nhất 5 ký tự";
    if (!form.description || form.description.trim().length < 20)
      return "Mô tả phải có ít nhất 20 ký tự";
    if (!form.type) return "Vui lòng chọn loại hình bất động sản";
    if (!form.price || parseFloat(form.price) <= 0)
      return "Vui lòng nhập giá hợp lệ";
    if (!form.area || parseFloat(form.area) <= 0)
      return "Vui lòng nhập diện tích hợp lệ";
    if (!form.address.trim()) return "Vui lòng nhập địa chỉ";
    if (!form.city) return "Vui lòng chọn tỉnh/thành phố";
    return null;
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      showToast(err, "error");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await api.put(`/api/property/${id}`, {
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

      // Upload new images if any
      if (newFiles.length > 0) {
        setUploadingImages(true);
        const fd = new FormData();
        newFiles.forEach((f) => fd.append("images", f));
        await api.post(`/api/property/${id}/images`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUploadingImages(false);
      }

      setSuccess(true);
      showToast("Cập nhật tin thành công. Tin đang chờ duyệt lại.");
    } catch (err) {
      const message =
        err.response?.data?.message || "Lưu thất bại, vui lòng thử lại.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: "#f9f9f9", minHeight: "100vh", ...VN }}>
        <Navbar />
        <div style={{ maxWidth: 900, margin: "48px auto", padding: "0 24px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 12,
                height: 180,
                marginBottom: 20,
                border: "0.5px solid #E8E8E8",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:.7}50%{opacity:.3}}`}</style>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ background: "#f9f9f9", minHeight: "100vh", ...VN }}>
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
              border: "0.5px solid #E8E8E8",
              borderRadius: 16,
              padding: "48px 40px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}>
            <h2
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#1a1c1c",
                marginBottom: 10,
              }}>
              Cập nhật thành công!
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#757575",
                lineHeight: 1.7,
                marginBottom: 28,
              }}>
              Thông tin bất động sản đã được cập nhật. Tin đang chờ Admin duyệt
              lại trước khi hiển thị công khai.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => navigate("/owner/dashboard")}
                style={{
                  background: "#b51b17",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "11px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...VN,
                }}>
                Về quản lý tin
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setNewFiles([]);
                  setNewPreviews([]);
                }}
                style={{
                  background: "#fff",
                  color: "#1a1c1c",
                  border: "1.5px solid #E8E8E8",
                  borderRadius: 8,
                  padding: "11px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...VN,
                }}>
                Tiếp tục chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalImages = existingImages.length + newPreviews.length;

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh", ...VN }}>
      <Navbar />

      <div
        style={{ maxWidth: 980, margin: "0 auto", padding: "32px 28px 64px" }}>
        {/* ── Page header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 12,
          }}>
          <div>
            <nav
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}>
              <Link
                to="/owner/dashboard"
                style={{
                  fontSize: 13,
                  color: "#757575",
                  textDecoration: "none",
                }}>
                Bất động sản của tôi
              </Link>
              <span style={{ fontSize: 13, color: "#bbb" }}>›</span>
              <span style={{ fontSize: 13, color: "#b51b17", fontWeight: 600 }}>
                Chỉnh sửa tin đăng
              </span>
            </nav>
            <h1
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#1a1c1c",
                margin: 0,
              }}>
              Chỉnh sửa tin đăng
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => navigate("/owner/dashboard")}
              style={{
                padding: "10px 22px",
                border: "1.5px solid #E8E8E8",
                borderRadius: 8,
                background: "#fff",
                fontSize: 14,
                fontWeight: 500,
                color: "#5f5e5e",
                cursor: "pointer",
                ...VN,
              }}>
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 28px",
                border: "none",
                borderRadius: 8,
                background: saving ? "#ccc" : "#b51b17",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                ...VN,
              }}>
              {saving ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 13,
                      height: 13,
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin .7s linear infinite",
                    }}
                  />
                  {uploadingImages ? "Đang tải ảnh..." : "Đang lưu..."}
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div
            style={{
              background: "#fef2f0",
              border: "1px solid #fccac3",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
            <UiIcon name="alert" size={18} />
            <span style={{ fontSize: 13, color: "#b51b17", fontWeight: 500 }}>
              {error}
            </span>
            <button
              onClick={() => setError("")}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                color: "#b51b17",
              }}>
              ✕
            </button>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: 20,
            alignItems: "start",
          }}>
          {/* ── Left column ── */}
          <div>
            {/* Section 1: Basic info */}
            <SectionCard title="Thông tin cơ bản">
              {/* Transaction type */}
              <div style={{ marginBottom: 20 }}>
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
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  Loại bất động sản <span style={{ color: "#b51b17" }}>*</span>
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
                      onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                      style={{
                        padding: "12px",
                        border: `2px solid ${form.type === t.value ? "#b51b17" : "#E8E8E8"}`,
                        borderRadius: 8,
                        background: form.type === t.value ? "#fef2f0" : "#fff",
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
                      <span style={{ fontSize: 18 }}>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Tiêu đề tin đăng <span style={{ color: "#b51b17" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Bán căn hộ Vinhomes Grand Park 2PN full nội thất"
                  value={form.title}
                  onChange={set("title")}
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
                <p
                  style={{
                    fontSize: 11,
                    color: form.title.length < 5 ? "#b51b17" : "#757575",
                    marginTop: 4,
                  }}>
                  {form.title.length} ký tự (tối thiểu 5, tối đa 99)
                </p>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Mô tả chi tiết <span style={{ color: "#b51b17" }}>*</span>
                </label>
                <textarea
                  rows={6}
                  placeholder="Mô tả đặc điểm nổi bật, vị trí, tiện ích, tình trạng pháp lý..."
                  value={form.description}
                  onChange={set("description")}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
              </div>

              {/* Price + Area */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}>
                <div>
                  <label style={labelStyle}>
                    Giá (VNĐ) <span style={{ color: "#b51b17" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      value={form.price}
                      onChange={set("price")}
                      placeholder="0"
                      min="0"
                      style={{ ...inputStyle, paddingRight: 44 }}
                      onFocus={focusInput}
                      onBlur={blurInput}
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
                      value={form.area}
                      onChange={set("area")}
                      placeholder="0"
                      min="0"
                      style={{ ...inputStyle, paddingRight: 36 }}
                      onFocus={focusInput}
                      onBlur={blurInput}
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
                  {form.price && form.area && parseFloat(form.area) > 0 && (
                    <p style={{ fontSize: 12, color: "#757575", marginTop: 4 }}>
                      ≈{" "}
                      {formatPrice(
                        parseFloat(form.price) / parseFloat(form.area),
                      )}
                      /m²
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Details */}
            <SectionCard title="Thông tin chi tiết">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  marginBottom: 20,
                }}>
                {/* Bedrooms */}
                <div>
                  <label style={labelStyle}>Số phòng ngủ</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4, "5+"].map((n) => {
                      const val = String(n === "5+" ? 5 : n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, bedrooms: val }))
                          }
                          style={{
                            flex: 1,
                            padding: "9px 0",
                            border: `1.5px solid ${form.bedrooms === val ? "#b51b17" : "#E8E8E8"}`,
                            borderRadius: 6,
                            background:
                              form.bedrooms === val ? "#fef2f0" : "#fff",
                            color:
                              form.bedrooms === val ? "#b51b17" : "#5f5e5e",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}>
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bathrooms */}
                <div>
                  <label style={labelStyle}>Số phòng tắm</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4, "5+"].map((n) => {
                      const val = String(n === "5+" ? 5 : n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, bathrooms: val }))
                          }
                          style={{
                            flex: 1,
                            padding: "9px 0",
                            border: `1.5px solid ${form.bathrooms === val ? "#b51b17" : "#E8E8E8"}`,
                            borderRadius: 6,
                            background:
                              form.bathrooms === val ? "#fef2f0" : "#fff",
                            color:
                              form.bathrooms === val ? "#b51b17" : "#5f5e5e",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}>
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direction */}
                <div>
                  <label style={labelStyle}>Hướng nhà</label>
                  <select
                    value={form.direction}
                    onChange={set("direction")}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={focusInput}
                    onBlur={blurInput}>
                    <option value="">-- Chọn hướng --</option>
                    {DIRECTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Legal */}
                <div>
                  <label style={labelStyle}>Tình trạng pháp lý</label>
                  <select
                    value={form.legal_status}
                    onChange={set("legal_status")}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={focusInput}
                    onBlur={blurInput}>
                    <option value="">-- Chọn pháp lý --</option>
                    {LEGAL_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SectionCard>

            {/* Section 3: Location */}
            <SectionCard title="Địa chỉ & Vị trí">
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Tỉnh / Thành phố <span style={{ color: "#b51b17" }}>*</span>
                </label>
                <select
                  value={form.city}
                  onChange={set("city")}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={focusInput}
                  onBlur={blurInput}>
                  <option value="">-- Chọn --</option>
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
                  marginBottom: 18,
                }}>
                <div>
                  <label style={labelStyle}>Quận / Huyện</label>
                  <input
                    type="text"
                    placeholder="VD: Bình Thạnh"
                    value={form.district}
                    onChange={set("district")}
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
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
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>
                  Địa chỉ cụ thể <span style={{ color: "#b51b17" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: 208 Nguyễn Xí, Bình Thạnh"
                  value={form.address}
                  onChange={set("address")}
                  style={inputStyle}
                  onFocus={focusInput}
                  onBlur={blurInput}
                />
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
                    placeholder="VD: 10.8384"
                    value={form.latitude}
                    onChange={set("latitude")}
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                    step="any"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Kinh độ (Longitude)</label>
                  <input
                    type="number"
                    placeholder="VD: 106.8341"
                    value={form.longitude}
                    onChange={set("longitude")}
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                    step="any"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 4: Images */}
            <SectionCard title={`Hình ảnh (${totalImages}/5)`}>
              {/* Existing images */}
              {existingImages.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#757575",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 10,
                    }}>
                    Ảnh hiện tại
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 10,
                    }}>
                    {existingImages.map((url, i) => (
                      <ImageCard
                        key={url}
                        url={url}
                        isFirst={i === 0}
                        onDelete={() =>
                          setExistingImages((prev) =>
                            prev.filter((u) => u !== url),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* New previews */}
              {newPreviews.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#757575",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 10,
                    }}>
                    Ảnh mới ({newPreviews.length})
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 10,
                    }}>
                    {newPreviews.map((src, i) => (
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          borderRadius: 10,
                          overflow: "hidden",
                          aspectRatio: "4/3",
                          border: "1.5px dashed #b51b17",
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
                        <button
                          onClick={() => removeNewFile(i)}
                          style={{
                            position: "absolute",
                            top: 4,
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

              {/* Upload zone */}
              {totalImages < 5 && (
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
                    padding: "28px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#b51b17")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#e4beb9")
                  }>
                  <div style={{ marginBottom: 8 }}><UiIcon name="camera" size={32} /></div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1a1c1c",
                      margin: "0 0 4px",
                    }}>
                    Kéo ảnh vào đây hoặc nhấn để chọn
                  </p>
                  <p style={{ fontSize: 12, color: "#8f706b", margin: 0 }}>
                    JPG, PNG, WEBP — còn {5 - totalImages} ảnh
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
              )}

              {totalImages === 0 && (
                <div
                  style={{
                    background: "#fff8e1",
                    border: "1px solid #ffe082",
                    borderRadius: 8,
                    padding: "12px 16px",
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                  <UiIcon name="alert" size={18} />
                  <span style={{ fontSize: 13, color: "#795548" }}>
                    Tin không có ảnh sẽ ít được chú ý hơn.
                  </span>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Right sidebar ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "sticky",
              top: 80,
            }}>
            {/* Quick summary */}
            <div
              style={{
                background: "#fff",
                border: "0.5px solid #E8E8E8",
                borderRadius: 12,
                padding: "18px",
              }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 14,
                }}>
                Tóm tắt
              </p>
              {[
                [
                  "Loại hình",
                  PROPERTY_TYPES.find((t) => t.value === form.type)?.label ||
                    "—",
                ],
                [
                  "Giao dịch",
                  form.transaction_type === "sale" ? "Bán" : "Cho thuê",
                ],
                ["Giá", formatPrice(form.price) || "—"],
                ["Diện tích", form.area ? `${form.area} m²` : "—"],
                ["Thành phố", form.city || "—"],
                ["Phòng ngủ", form.bedrooms || "—"],
                ["Ảnh", `${totalImages}/5`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: "0.5px solid #f3f3f3",
                  }}>
                  <span style={{ fontSize: 12, color: "#757575" }}>{k}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1a1c1c",
                      textAlign: "right",
                      maxWidth: 140,
                      wordBreak: "break-word",
                    }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {/* Save button (sticky) */}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%",
                padding: "13px 0",
                background: saving ? "#ccc" : "#b51b17",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                ...VN,
              }}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>

            {/* Cancel */}
            <button
              onClick={() => navigate("/owner/dashboard")}
              style={{
                width: "100%",
                padding: "11px 0",
                background: "#fff",
                color: "#5f5e5e",
                border: "1.5px solid #E8E8E8",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                ...VN,
              }}>
              Hủy bỏ
            </button>
          </div>
        </div>

        {/* ── Bottom action bar (mobile) ── */}
        <div
          style={{
            display: "none",
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff",
            borderTop: "0.5px solid #E8E8E8",
            padding: "12px 16px",
            gap: 10,
          }}
          className="mobile-actions">
          <button
            onClick={() => navigate("/owner/dashboard")}
            style={{
              flex: 1,
              padding: "13px 0",
              border: "1.5px solid #E8E8E8",
              borderRadius: 8,
              background: "#fff",
              fontSize: 14,
              fontWeight: 500,
              color: "#5f5e5e",
              cursor: "pointer",
            }}>
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: "13px 0",
              background: "#b51b17",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .mobile-actions { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
