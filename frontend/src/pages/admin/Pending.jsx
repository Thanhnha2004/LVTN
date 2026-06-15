import { useState, useEffect, useCallback } from "react";
import {
  C,
  font,
  apiFetch,
  formatPrice,
  timeAgo,
  tdStyle,
} from "./adminShared";
import {
  StatCard,
  Badge,
  LoadingState,
  EmptyState,
  Pagination,
} from "./Dashboard";

export default function PendingPage({ showToast }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const LIMIT = 8;

  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: tab, page, limit: LIMIT });
      const data = await apiFetch(`/api/admin/properties?${params}`);
      const list = Array.isArray(data) ? data : data.data || [];
      setProperties(list);
      setTotal(data?.pagination?.total || list.length);
      setTotalPages(data?.pagination?.total_pages || 1);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handleStatus = async (id, status, reason) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`/api/property/${id}/status`, {
        method: "PATCH",
        body: { status, ...(reason ? { reject_reason: reason } : {}) },
      });
      setProperties((prev) => prev.filter((p) => p.id !== id));
      showToast(
        status === "approved" ? "✓ Đã duyệt tin đăng" : "✓ Đã từ chối tin đăng",
      );
      setRejectModal(null);
      setRejectReason("");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const tabs = [
    { key: "pending", label: "Chờ duyệt" },
    { key: "approved", label: "Đã duyệt" },
    { key: "rejected", label: "Đã từ chối" },
  ];

  return (
    <div style={{ padding: "32px", fontFamily: font.body }}>
      {/* Header stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}>
        <StatCard
          label="Đang chờ duyệt"
          value={tab === "pending" ? total : "—"}
          sub={tab === "pending" && total > 0 ? "Cần xem xét ngay" : ""}
          subColor={C.amber}
          accent={tab === "pending" && total > 0}
        />
      </div>

      {/* Main card */}
      <div
        style={{
          background: C.surfaceContainerLowest,
          border: `1px solid ${C.borderSubtle}`,
          borderRadius: 12,
          overflow: "hidden",
        }}>
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${C.borderSubtle}`,
            padding: "0 20px",
          }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              style={{
                padding: "14px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? C.primary : C.secondary,
                borderBottom:
                  tab === t.key
                    ? `2px solid ${C.primary}`
                    : "2px solid transparent",
                fontFamily: font.body,
                marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <LoadingState />
        ) : properties.length === 0 ? (
          <EmptyState msg="Không có tin đăng nào" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surfaceContainerLow }}>
                  {[
                    "Tin đăng",
                    "Chủ sở hữu",
                    "Giá / Loại",
                    "Ngày đăng",
                    "Trạng thái",
                    "Hành động",
                  ].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: i === 5 ? "right" : "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.secondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: `1px solid ${C.borderSubtle}`,
                        whiteSpace: "nowrap",
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {properties.map((prop) => (
                  <tr
                    key={prop.id}
                    style={{
                      borderBottom: `1px solid ${C.borderSubtle}`,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.surface)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }>
                    <td style={{ ...tdStyle, maxWidth: 280 }}>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.onSurface,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 260,
                          }}>
                          {prop.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.textMuted,
                            marginTop: 2,
                          }}>
                          📍 {prop.city} · ID #{prop.id}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: C.onSurface,
                        }}>
                        {prop.owner_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        {prop.owner_email}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.primary,
                        }}>
                        {formatPrice(prop.price)}
                      </div>
                      <div style={{ fontSize: 11, color: C.secondary }}>
                        {prop.type} ·{" "}
                        {prop.transaction_type === "sale" ? "Bán" : "Cho thuê"}
                      </div>
                      {prop.price >= 10e9 && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 2,
                            fontSize: 10,
                            background: "#fef3c7",
                            color: "#b45309",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}>
                          PREMIUM
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: C.textMuted }}>
                        {timeAgo(prop.created_at)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <Badge status={prop.status} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}>
                        {prop.status === "pending" && (
                          <>
                            <button
                              disabled={actionLoading[prop.id]}
                              onClick={() => handleStatus(prop.id, "approved")}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 6,
                                border: `1px solid #a7f3d040`,
                                background: "#e6f9f0",
                                color: "#0f6e56",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: font.body,
                              }}>
                              {actionLoading[prop.id] ? "..." : "✓ Duyệt"}
                            </button>
                            <button
                              disabled={actionLoading[prop.id]}
                              onClick={() => setRejectModal(prop)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 6,
                                border: `1px solid ${C.error}30`,
                                background: C.errorContainer,
                                color: C.error,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: font.body,
                              }}>
                              ✕ Từ chối
                            </button>
                          </>
                        )}
                        {prop.status === "approved" && (
                          <button
                            onClick={() => handleStatus(prop.id, "hidden")}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 6,
                              border: `1px solid ${C.borderSubtle}`,
                              background: C.surfaceContainerHigh,
                              color: C.secondary,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: font.body,
                            }}>
                            Ẩn tin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setRejectModal(null)}>
          <div
            style={{
              background: C.surfaceContainerLowest,
              borderRadius: 12,
              padding: "28px",
              width: "100%",
              maxWidth: 460,
              fontFamily: font.body,
            }}
            onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                fontFamily: font.headline,
                fontWeight: 700,
                fontSize: 18,
                color: C.onSurface,
                marginBottom: 8,
              }}>
              Từ chối tin đăng
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
              {rejectModal.title}
            </div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.onSurface,
                display: "block",
                marginBottom: 8,
              }}>
              Lý do từ chối
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối để thông báo cho chủ sở hữu..."
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1.5px solid ${C.borderSubtle}`,
                borderRadius: 8,
                fontSize: 14,
                resize: "vertical",
                outline: "none",
                fontFamily: font.body,
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 16,
                justifyContent: "flex-end",
              }}>
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: `1px solid ${C.borderSubtle}`,
                  background: C.surfaceContainerHigh,
                  color: C.secondary,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: font.body,
                }}>
                Hủy
              </button>
              <button
                disabled={!rejectReason.trim() || actionLoading[rejectModal.id]}
                onClick={() =>
                  handleStatus(rejectModal.id, "rejected", rejectReason)
                }
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: !rejectReason.trim() ? "#ccc" : C.error,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: !rejectReason.trim() ? "not-allowed" : "pointer",
                  fontFamily: font.body,
                }}>
                {actionLoading[rejectModal.id] ? "..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
