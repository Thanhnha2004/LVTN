import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { C, font, getToken, apiFetch } from "./adminShared";
import UsersPage from "./Users";
import PendingPage from "./Pending";

// ─── SHARED COMPONENTS ─────────────────────────────────────

export function Sidebar({ page, setPage }) {
  const nav = [
    { key: "dashboard", label: "Dashboard" },
    { key: "users", label: "Quản lý người dùng" },
    { key: "pending", label: "Duyệt tin đăng" },
  ];

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        background: C.surfaceContainerLow,
        borderRight: `1px solid ${C.borderSubtle}`,
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 56,
        bottom: 0,
        zIndex: 50,
        fontFamily: font.body,
      }}>
      {/* Logo */}
      <div style={{ padding: "24px 24px 16px" }}>
        <div
          style={{
            fontFamily: font.headline,
            fontWeight: 800,
            fontSize: 18,
            color: C.primary,
            letterSpacing: "-0.02em",
          }}>
          Admin Dashboard
        </div>
        <div style={{ fontSize: 12, color: C.secondary, marginTop: 2 }}>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 12px" }}>
        {nav.map((item) => {
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: active ? C.surfaceContainerHigh : "transparent",
                color: active ? C.primary : C.secondary,
                fontWeight: active ? 700 : 400,
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 2,
                borderLeft: active
                  ? `3px solid ${C.primary}`
                  : "3px solid transparent",
                transition: "all 0.15s",
                fontFamily: font.body,
              }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function TopBar({ title, subtitle }) {
  return (
    <header
      style={{
        height: 52,
        background: C.surfaceContainerLowest,
        borderBottom: `1px solid ${C.borderSubtle}`,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
      <div>
        <div
          style={{
            fontFamily: font.headline,
            fontWeight: 700,
            fontSize: 18,
            color: C.onSurface,
          }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: C.textMuted }}>{subtitle}</div>
        )}
      </div>
    </header>
  );
}

export function StatCard({ label, value, sub, subColor, icon, accent }) {
  return (
    <div>
      <div
        style={{
          background: accent ? C.primary : C.surfaceContainerLowest,
          border: accent ? "none" : `1px solid ${C.borderSubtle}`,
          borderRadius: 12,
          padding: "14px 18px",
          fontFamily: font.body,
        }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: accent ? "rgba(255,255,255,0.7)" : C.secondary,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
            {label}
          </div>
          {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: font.headline,
            color: accent ? "#fff" : C.onSurface,
            lineHeight: 1,
          }}>
          {value}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 12,
              color: accent
                ? "rgba(255,255,255,0.75)"
                : subColor || C.textMuted,
              marginTop: 8,
            }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export function Badge({ status }) {
  const map = {
    pending: {
      bg: C.amberBg,
      color: C.amber,
      border: C.amberBorder,
      label: "Chờ duyệt",
    },
    approved: {
      bg: "#e6f9f0",
      color: "#0f6e56",
      border: "#a7f3d0",
      label: "Đã duyệt",
    },
    active: {
      bg: "#e6f9f0",
      color: "#0f6e56",
      border: "#a7f3d0",
      label: "Hoạt động",
    },
    rejected: {
      bg: C.errorContainer,
      color: C.error,
      border: "#fca5a5",
      label: "Từ chối",
    },
    banned: {
      bg: C.errorContainer,
      color: C.error,
      border: "#fca5a5",
      label: "Bị cấm",
    },
    hidden: {
      bg: C.surfaceContainer,
      color: C.secondary,
      border: C.borderSubtle,
      label: "Đã ẩn",
    },
    sold: {
      bg: C.surfaceContainer,
      color: C.secondary,
      border: C.borderSubtle,
      label: "Đã bán",
    },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontSize: 11,
        fontWeight: 600,
      }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.color,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

export function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: type === "error" ? C.error : "#1a1c1c",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 8,
        fontSize: 14,
        fontFamily: font.body,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
      <span>{type === "error" ? "⚠️" : "✓"}</span>
      {msg}
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          marginLeft: 8,
          fontSize: 16,
        }}>
        ×
      </button>
    </div>
  );
}

export function LoadingState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 0",
        color: C.textMuted,
        fontFamily: font.body,
        fontSize: 14,
      }}>
      <span
        style={{
          display: "inline-block",
          width: 20,
          height: 20,
          border: `2px solid ${C.borderSubtle}`,
          borderTopColor: C.primary,
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
          marginRight: 10,
        }}
      />
      Đang tải...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorState({ msg }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 0",
        flexDirection: "column",
        gap: 8,
        color: C.error,
        fontFamily: font.body,
      }}>
      <span style={{ fontSize: 32 }}>⚠️</span>
      <div style={{ fontSize: 14 }}>{msg}</div>
    </div>
  );
}

export function EmptyState({ icon, msg }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 0",
        color: C.textMuted,
        fontFamily: font.body,
      }}>
      <span style={{ fontSize: 40, marginBottom: 12 }}>{icon}</span>
      <div style={{ fontSize: 14 }}>{msg}</div>
    </div>
  );
}

export function Pagination({ page, totalPages, setPage }) {
  const pages = [];
  for (
    let i = Math.max(1, page - 2);
    i <= Math.min(totalPages, page + 2);
    i++
  ) {
    pages.push(i);
  }

  const { paginationBtn } = require("./adminShared");

  return (
    <div
      style={{
        padding: "12px 20px",
        borderTop: `1px solid ${C.borderSubtle}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: C.surfaceContainerLow,
        fontFamily: font.body,
      }}>
      <span style={{ fontSize: 13, color: C.textMuted }}>
        Trang {page} / {totalPages}
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          style={paginationBtn(false, page === 1)}>
          ‹
        </button>
        {pages.map((n) => (
          <button
            key={n}
            onClick={() => setPage(n)}
            style={paginationBtn(n === page, false)}>
            {n}
          </button>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          style={paginationBtn(false, page === totalPages)}>
          ›
        </button>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ─────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (data.user?.role !== "admin") {
        setError("Tài khoản không có quyền admin.");
        return;
      }
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.surfaceContainerLow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: font.body,
      }}>
      <div
        style={{
          background: C.surfaceContainerLowest,
          border: `1px solid ${C.borderSubtle}`,
          borderRadius: 16,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: C.primary,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 16,
            }}>
            🏢
          </div>
          <div
            style={{
              fontFamily: font.headline,
              fontWeight: 800,
              fontSize: 22,
              color: C.onSurface,
            }}>
            Admin Portal
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            PropTech Solutions — Đăng nhập quản trị
          </div>
        </div>

        {error && (
          <div
            style={{
              background: C.errorContainer,
              border: `1px solid #fca5a5`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: C.error,
              marginBottom: 16,
            }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.onSurface,
              display: "block",
              marginBottom: 6,
            }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1.5px solid ${C.borderSubtle}`,
              borderRadius: 8,
              fontSize: 14,
              color: C.onSurface,
              background: "#fff",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: font.body,
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.onSurface,
              display: "block",
              marginBottom: 6,
            }}>
            Mật khẩu
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1.5px solid ${C.borderSubtle}`,
              borderRadius: 8,
              fontSize: 14,
              color: C.onSurface,
              background: "#fff",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: font.body,
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#ccc" : C.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: font.body,
          }}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ─────────────────────────────────────────
function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState msg={error} />;

  const monthly = stats?.monthly_properties || [];
  const maxCount = Math.max(...monthly.map((m) => m.count), 1);

  return (
    <div style={{ padding: "20px 24px", fontFamily: font.body }}>
      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}>
        <StatCard
          label="Tổng người dùng"
          value={stats?.users?.total?.toLocaleString() || "—"}
          sub={`Buyers: ${stats?.users?.buyers?.toLocaleString()} | Owners: ${stats?.users?.owners?.toLocaleString()}`}
        />
        <StatCard
          label="Tổng bất động sản"
          value={stats?.properties?.total?.toLocaleString() || "—"}
          sub={`Đang duyệt: ${stats?.properties?.pending} | Đã duyệt: ${stats?.properties?.approved}`}
        />
        <StatCard
          label="Tin chờ duyệt"
          value={stats?.properties?.pending || "0"}
          sub={
            stats?.properties?.pending > 0 ? "Cần xem xét" : "✓ Đã cập nhật"
          }
          subColor={stats?.properties?.pending > 0 ? C.amber : C.statusSuccess}
        />
        <StatCard
          label="Tổng liên hệ"
          value={stats?.contacts?.total?.toLocaleString() || "—"}
          sub="Người dùng đã liên hệ"
        />
      </div>

      {/* 2-col section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}>
        {/* Chart */}
        <div
          style={{
            background: C.surfaceContainerLowest,
            border: `1px solid ${C.borderSubtle}`,
            borderRadius: 12,
            padding: "16px 20px",
          }}>
          <div
            style={{
              fontFamily: font.headline,
              fontWeight: 700,
              fontSize: 15,
              color: C.onSurface,
              marginBottom: 2,
            }}>
            Tin đăng mới theo tháng
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
            6 tháng gần nhất
          </div>

          {monthly.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: C.textMuted,
                fontSize: 14,
              }}>
              Chưa có dữ liệu
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                height: 120,
                padding: "0 8px",
              }}>
              {monthly.map((m) => {
                const pct = (m.count / maxCount) * 100;
                return (
                  <div
                    key={m.month}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                    }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.primary,
                      }}>
                      {m.count}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(pct, 5)}%`,
                        background: `linear-gradient(to top, ${C.primary}, ${C.primary}bb)`,
                        borderRadius: "4px 4px 0 0",
                        minHeight: 8,
                        transition: "height 0.3s",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        textAlign: "center",
                      }}>
                      {m.month?.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div
          style={{
            background: C.surfaceContainerLowest,
            border: `1px solid ${C.borderSubtle}`,
            borderRadius: 12,
            padding: "16px 20px",
          }}>
          <div
            style={{
              fontFamily: font.headline,
              fontWeight: 700,
              fontSize: 15,
              color: C.onSurface,
              marginBottom: 16,
            }}>
            Phân bổ tin đăng
          </div>
          {[
            {
              label: "Đã duyệt",
              value: stats?.properties?.approved || 0,
              color: C.statusSuccess,
            },
            {
              label: "Chờ duyệt",
              value: stats?.properties?.pending || 0,
              color: C.amber,
            },
            {
              label: "Từ chối",
              value: stats?.properties?.rejected || 0,
              color: C.error,
            },
          ].map((item) => {
            const total = stats?.properties?.total || 1;
            const pct = Math.round((item.value / total) * 100);
            return (
              <div key={item.label} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 13,
                  }}>
                  <span style={{ color: C.onSurface }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color }}>
                    {item.value} ({pct}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: C.surfaceContainerHigh,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: item.color,
                      borderRadius: 4,
                      transition: "width 0.5s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.primary}10, ${C.primary}05)`,
          border: `1px solid ${C.primary}30`,
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
        <div>
          <div
            style={{
              fontFamily: font.headline,
              fontWeight: 700,
              fontSize: 14,
              color: C.primary,
              marginBottom: 2,
            }}>
            {stats?.properties?.pending > 0
              ? `Có ${stats.properties.pending} tin đang chờ duyệt`
              : "Hệ thống hoạt động bình thường"}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted }}>
            {stats?.properties?.pending > 0
              ? "Vui lòng xem xét và duyệt các tin đăng trong tab Duyệt tin đăng."
              : "Tất cả tin đăng đã được xử lý. Không có hành động nào cần thiết."}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ───────────────────────────────────────────────
export default function AdminPortal() {
  const [user, setUser] = useState(() => {
    const token = getToken();
    return token ? { role: "admin" } : null;
  });
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const showToast = (msg, type = "success") => setToast({ msg, type });

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  if (!user) {
    return <LoginPage onLogin={(u) => setUser(u)} />;
  }

  const pageTitle = {
    dashboard: {
      title: "Tổng quan hệ thống",
      subtitle: "Dữ liệu thời gian thực",
    },
    users: {
      title: "Quản lý người dùng",
      subtitle: "Xem xét và quản lý tài khoản",
    },
    pending: {
      title: "Duyệt tin đăng",
      subtitle: "Kiểm duyệt chất lượng bất động sản",
    },
  };

  return (
    <div>
      <Navbar />
      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 56px)",
          background: C.surface,
          fontFamily: font.body,
        }}>
        <Sidebar page={page} setPage={setPage} />

        {/* Main content — full width minus sidebar */}
        <div
          style={{
            marginLeft: 240,
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}>
          <TopBar
            title={pageTitle[page]?.title}
            subtitle={pageTitle[page]?.subtitle}
          />
          <main style={{ flex: 1 }}>
            {page === "dashboard" && <DashboardPage />}
            {page === "users" && <UsersPage showToast={showToast} />}
            {page === "pending" && <PendingPage showToast={showToast} />}
          </main>
        </div>

        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast({ msg: "", type: "success" })}
        />
      </div>
    </div>
  );
}
