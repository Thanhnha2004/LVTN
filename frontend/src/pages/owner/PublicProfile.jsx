import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import SiteFooter from "../../components/SiteFooter";
import UiIcon from "../../components/UiIcon";
import { TYPE_LABEL, formatPrice } from "../../shared/property";

const VN = { fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif" };

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleDateString("vi-VN");
}

function buildTrust(owner) {
  const approved = Number(owner?.approved_properties || 0);
  const sold = Number(owner?.sold_properties || 0);
  const rejected = Number(owner?.rejected_properties || 0);
  const hidden = Number(owner?.hidden_properties || 0);
  const totalContacts = Number(owner?.total_contacts || 0);
  const repliedContacts = Number(owner?.replied_contacts || 0);
  const totalViews = Number(owner?.total_views || 0);
  const responseRate =
    totalContacts > 0 ? Math.round((repliedContacts / totalContacts) * 100) : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      (Number(owner?.email_verified) ? 20 : 0) +
        Math.min(approved * 4, 20) +
        Math.min(sold * 12, 30) +
        Math.min(responseRate * 0.2, 20) +
        Math.min(Math.floor(totalViews / 20), 10) -
        Math.min(rejected * 8, 24) -
        Math.min(hidden * 12, 36),
    ),
  );

  return {
    score: Math.round(score),
    approved,
    sold,
    rejected,
    hidden,
    totalContacts,
    totalViews,
    responseRate,
    emailVerified: Boolean(Number(owner?.email_verified)),
  };
}

function StatBox({ icon, label, value, tone = "#b51b17" }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ececec",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        ...VN,
      }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${tone}14`,
          color: tone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
        <UiIcon name={icon} size={19} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#757575", marginBottom: 3 }}>
          {label}
        </div>
        <strong style={{ fontSize: 20, color: "#1a1c1c" }}>{value}</strong>
      </div>
    </div>
  );
}

export default function PublicOwnerProfile() {
  const { id } = useParams();
  const [owner, setOwner] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadOwner() {
      try {
        const res = await api.get(`/api/listing/owners/${id}`);
        if (!mounted) return;
        setOwner(res.data.owner);
        setProperties(Array.isArray(res.data.properties) ? res.data.properties : []);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setError(
          err.response?.data?.message ||
            "Không thể tải hồ sơ người bán. Vui lòng thử lại sau.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadOwner();
    return () => {
      mounted = false;
    };
  }, [id]);

  const trust = useMemo(() => buildTrust(owner), [owner]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f8f8" }}>
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
          <div className="spinner-border text-danger" />
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f8f8", ...VN }}>
        <Navbar />
        <main
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "72px 32px",
            textAlign: "center",
          }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "#fff0ef",
              color: "#b51b17",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}>
            <UiIcon name="alert" size={26} />
          </div>
          <h1
            style={{
              fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
              fontSize: 24,
              fontWeight: 850,
              color: "#1a1c1c",
              margin: "0 0 10px",
            }}>
            Chưa tải được hồ sơ người bán
          </h1>
          <p style={{ color: "#5f5e5e", fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>
            {error ||
              "Hồ sơ người bán chưa sẵn sàng hoặc backend chưa được cập nhật."}
          </p>
          <Link
            to="/search"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 170,
              height: 42,
              borderRadius: 8,
              background: "#b51b17",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 750,
            }}>
            Quay lại danh sách tin
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8f8", ...VN }}>
      <Navbar />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 32px 44px" }}>
        <nav style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 18 }}>
          <Link to="/" style={{ color: "#757575", textDecoration: "none" }}>
            Trang chủ
          </Link>
          <span style={{ color: "#aaa" }}>›</span>
          <span style={{ color: "#1a1c1c" }}>Hồ sơ người bán</span>
        </nav>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 12,
            padding: 24,
            marginBottom: 18,
            display: "grid",
            gridTemplateColumns: "1fr 180px",
            gap: 24,
            alignItems: "center",
          }}>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "#2c5364",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
                flexShrink: 0,
              }}>
              {(owner.full_name || "N").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                  fontSize: 26,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  color: "#1a1c1c",
                }}>
                {owner.full_name || "Người bán"}
              </h1>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: trust.emailVerified ? "#e6f9f0" : "#f3f3f3",
                    color: trust.emailVerified ? "#0f6e56" : "#5f5e5e",
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                  <UiIcon name={trust.emailVerified ? "success" : "alert"} size={14} />
                  {trust.emailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                </span>
                <span
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: "#fff4d6",
                    color: "#8a5a00",
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                  Tham gia từ {formatDate(owner.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              justifySelf: "end",
              width: 132,
              height: 132,
              borderRadius: "50%",
              border: "8px solid #e6f9f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f6e56",
            }}>
            <strong style={{ fontSize: 34, lineHeight: 1 }}>{trust.score}</strong>
            <span style={{ fontSize: 12, fontWeight: 700 }}>điểm uy tín</span>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 18,
          }}>
          <StatBox icon="clipboard" label="Tin đã duyệt" value={trust.approved} />
          <StatBox icon="tag" label="Đã giao dịch" value={trust.sold} tone="#0f6e56" />
          <StatBox
            icon="alert"
            label="Tin bị xử lý"
            value={trust.rejected + trust.hidden}
            tone="#ba1a1a"
          />
          <StatBox icon="message" label="Tổng liên hệ" value={trust.totalContacts} tone="#2456a6" />
          <StatBox
            icon="reply"
            label="Tỷ lệ phản hồi"
            value={trust.totalContacts > 0 ? `${trust.responseRate}%` : "Chưa có"}
            tone="#8a5a00"
          />
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 12,
            padding: 22,
            marginBottom: 18,
          }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 16,
            }}>
            <div>
              <h2
                style={{
                  fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                }}>
                Tin đang hiển thị
              </h2>
              <p style={{ margin: "4px 0 0", color: "#757575", fontSize: 13 }}>
                Các tin đã qua kiểm duyệt và đang công khai trên hệ thống.
              </p>
            </div>
          </div>

          {properties.length === 0 ? (
            <div
              style={{
                padding: "34px 0",
                textAlign: "center",
                color: "#757575",
                fontSize: 14,
              }}>
              Người bán hiện chưa có tin đang hiển thị.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}>
              {properties.map((item) => (
                <Link
                  key={item.id}
                  to={`/property/${item.id}`}
                  style={{ color: "inherit", textDecoration: "none" }}>
                  <article
                    style={{
                      border: "1px solid #ececec",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "#fff",
                      height: "100%",
                    }}>
                    <div
                      style={{
                        height: 172,
                        background: "#ececec",
                        position: "relative",
                        overflow: "hidden",
                      }}>
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#aaa",
                          }}>
                          <UiIcon name="home" size={44} />
                        </div>
                      )}
                      {item.featured_until && new Date(item.featured_until) > new Date() && (
                        <span
                          style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            background: "#d97706",
                            color: "#fff",
                            padding: "4px 8px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 800,
                          }}>
                          Nổi bật
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 14 }}>
                      <strong style={{ color: "#b51b17", fontSize: 18 }}>
                        {formatPrice(item.price)}
                      </strong>
                      <h3
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          lineHeight: 1.45,
                          margin: "8px 0",
                          color: "#1a1c1c",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}>
                        {item.title}
                      </h3>
                      <div style={{ color: "#757575", fontSize: 12, lineHeight: 1.6 }}>
                        <div>{TYPE_LABEL[item.type] || item.type}</div>
                        <div>
                          {item.area}m² · {item.district}, {item.city}
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
