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
import UiIcon from "../../components/UiIcon";
import { useToast } from "../../components/ToastProvider";
import { useConfirm } from "../../components/ConfirmProvider";

export default function PendingPage({ showToast }) {
  const { showToast: globalToast } = useToast();
  const { confirm } = useConfirm();
  const notify = showToast || globalToast;
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
      notify(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const openDetail = async (prop) => {
    setDetailModal(prop);
    setDetailLoading(true);
    try {
      const data = await apiFetch(`/api/property/${prop.id}`);
      setDetailModal({ ...prop, ...data });
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const getValidationItems = (prop) => [
    { label: "Tiêu đề rõ ràng", ok: Boolean(prop?.title && prop.title.length >= 5) },
    { label: "Có mô tả bất động sản", ok: Boolean(prop?.description) },
    { label: "Giá và diện tích hợp lệ", ok: Number(prop?.price) > 0 && Number(prop?.area) > 0 },
    { label: "Có địa chỉ / thành phố", ok: Boolean(prop?.address && prop?.city) },
    { label: "Có thông tin pháp lý", ok: Boolean(prop?.legal_status) },
    { label: "Có ảnh bất động sản", ok: Array.isArray(prop?.images) ? prop.images.length > 0 : Boolean(prop?.thumbnail) },
    { label: "Có tọa độ bản đồ", ok: Boolean(prop?.latitude && prop?.longitude) },
  ];


  const handleStatus = async (id, status, reason) => {
    const statusText = {
      approved: "duyệt tin",
      rejected: "từ chối tin",
      hidden: "ẩn tin",
      pending: "chuyển về chờ duyệt",
    }[status];
    const ok = await confirm({
      title: `Xác nhận ${statusText}?`,
      message:
        status === "rejected"
          ? "Tin sẽ bị từ chối và Owner sẽ nhìn thấy lý do từ chối."
          : status === "approved"
            ? "Tin sẽ được hiển thị công khai cho Buyer."
            : "Trạng thái tin đăng sẽ được cập nhật trong hệ thống.",
      confirmText:
        status === "approved"
          ? "Duyệt tin"
          : status === "rejected"
            ? "Từ chối"
            : "Xác nhận",
      danger: status === "rejected" || status === "hidden",
    });
    if (!ok) return;

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`/api/property/${id}/status`, {
        method: "PATCH",
        body: { status, ...(reason ? { reject_reason: reason } : {}) },
      });
      setProperties((prev) => prev.filter((p) => p.id !== id));
      notify(
        status === "approved" ? "✓ Đã duyệt tin đăng" : "✓ Đã từ chối tin đăng",
      );
      setRejectModal(null);
      setDetailModal(null);
      setRejectReason("");
    } catch (e) {
      notify(e.message, "error");
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
                          <UiIcon name="location" size={12} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                          {prop.city} · ID #{prop.id}
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
                        <button
                          onClick={() => openDetail(prop)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: `1px solid ${C.borderSubtle}`,
                            background: C.surfaceContainerHigh,
                            color: C.onSurface,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: font.body,
                          }}>
                          Xem kiểm tra
                        </button>
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

      {/* Detail Modal */}
      {detailModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setDetailModal(null)}>
          <div
            style={{
              background: C.surfaceContainerLowest,
              borderRadius: 12,
              width: "100%",
              maxWidth: 920,
              maxHeight: "90vh",
              overflow: "auto",
              fontFamily: font.body,
            }}
            onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: "22px 26px",
                borderBottom: `1px solid ${C.borderSubtle}`,
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
              }}>
              <div>
                <div
                  style={{
                    fontFamily: font.headline,
                    fontWeight: 800,
                    fontSize: 20,
                    color: C.onSurface,
                  }}>
                  Kiểm tra tin trước khi duyệt
                </div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
                  ID #{detailModal.id} · {detailModal.owner_name || "Owner"}
                </div>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${C.borderSubtle}`,
                  background: C.surfaceContainerHigh,
                  cursor: "pointer",
                  fontSize: 18,
                }}>
                ×
              </button>
            </div>

            {detailLoading ? (
              <LoadingState />
            ) : (
              <div style={{ padding: 26 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "280px 1fr",
                    gap: 24,
                    alignItems: "start",
                  }}>
                  <div>
                    {(Array.isArray(detailModal.images) && detailModal.images[0]) || detailModal.thumbnail ? (
                      <img
                        src={(Array.isArray(detailModal.images) && detailModal.images[0]) || detailModal.thumbnail}
                        alt={detailModal.title}
                        style={{
                          width: "100%",
                          height: 190,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: `1px solid ${C.borderSubtle}`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: 190,
                          borderRadius: 10,
                          border: `1px dashed ${C.borderSubtle}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.textMuted,
                          background: C.surfaceContainerLow,
                        }}>
                        Chưa có ảnh
                      </div>
                    )}
                    <div style={{ marginTop: 16 }}>
                      <Badge status={detailModal.status} />
                    </div>
                  </div>

                  <div>
                    <h3 style={{ margin: "0 0 10px", fontSize: 20, color: C.onSurface }}>
                      {detailModal.title}
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 12,
                        marginBottom: 18,
                      }}>
                      {[
                        ["Giá", formatPrice(detailModal.price)],
                        ["Diện tích", detailModal.area ? `${detailModal.area} m²` : "Chưa có"],
                        ["Loại hình", detailModal.type || "Chưa có"],
                        ["Giao dịch", detailModal.transaction_type === "sale" ? "Bán" : "Cho thuê"],
                        ["Pháp lý", detailModal.legal_status || "Chưa có"],
                        ["Vị trí", [detailModal.address, detailModal.ward, detailModal.district, detailModal.city].filter(Boolean).join(", ") || "Chưa có"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          style={{
                            padding: "10px 12px",
                            background: C.surfaceContainerLow,
                            borderRadius: 8,
                          }}>
                          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.onSurface }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        border: `1px solid ${C.borderSubtle}`,
                        marginBottom: 18,
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                        Mô tả tin đăng
                      </div>
                      <div style={{ fontSize: 13, color: C.secondary, lineHeight: 1.6 }}>
                        {detailModal.description || "Chưa có mô tả"}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: C.surfaceContainerLow,
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                        Checklist hợp lệ trước khi duyệt
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                        {getValidationItems(detailModal).map((item) => (
                          <div
                            key={item.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13,
                              color: item.ok ? "#0f6e56" : C.error,
                              fontWeight: 600,
                            }}>
                            <span>{item.ok ? "✓" : "!"}</span>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {detailModal.status === "pending" && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 22,
                      paddingTop: 18,
                      borderTop: `1px solid ${C.borderSubtle}`,
                    }}>
                    <button
                      onClick={() => {
                        setRejectModal(detailModal);
                        setDetailModal(null);
                      }}
                      style={{
                        padding: "9px 18px",
                        borderRadius: 8,
                        border: `1px solid ${C.error}30`,
                        background: C.errorContainer,
                        color: C.error,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: font.body,
                      }}>
                      Từ chối
                    </button>
                    <button
                      disabled={actionLoading[detailModal.id]}
                      onClick={() => handleStatus(detailModal.id, "approved")}
                      style={{
                        padding: "9px 18px",
                        borderRadius: 8,
                        border: "none",
                        background: "#0f6e56",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: "pointer",
                        fontFamily: font.body,
                      }}>
                      {actionLoading[detailModal.id] ? "..." : "Duyệt tin"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
