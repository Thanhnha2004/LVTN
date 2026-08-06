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

const ADMIN_REVIEW_POLICY = [
  {
    title: "1. Tiêu đề và mô tả",
    text: "Tiêu đề phải từ 10 đến 180 ký tự. Mô tả phải từ 30 đến 3000 ký tự, nêu rõ vị trí, tình trạng, tiện ích, pháp lý và điều kiện giao dịch.",
  },
  {
    title: "2. Giá và diện tích",
    text: "Giá bán phải từ 100 triệu đồng trở lên, giá thuê phải từ 500 nghìn đồng/tháng trở lên. Diện tích tối thiểu 5 m², tối đa 100.000 m².",
  },
  {
    title: "3. Địa chỉ và tọa độ",
    text: "Bắt buộc có tỉnh/thành, quận/huyện, phường/xã nếu có dữ liệu, địa chỉ cụ thể tối thiểu 5 ký tự. Tọa độ phải nằm trong phạm vi Việt Nam.",
  },
  {
    title: "4. Pháp lý và hình ảnh",
    text: "Tin cần khai báo pháp lý thuộc một trong các loại: sổ hồng, sổ đỏ, đang chờ sổ hoặc khác. Nên có ít nhất 1 ảnh thật, rõ ràng, đúng bất động sản.",
  },
  {
    title: "5. Nội dung bị từ chối ngay",
    text: "Từ chối nếu mô tả chứa số điện thoại, email, đường dẫn ngoài hệ thống, nội dung sai sự thật, ảnh không liên quan hoặc tin trùng với tin đang hoạt động.",
  },
  {
    title: "6. Giá bất thường",
    text: "Nếu giá/m² lệch mạnh so với nhóm tin tương đồng đã duyệt, admin cần kiểm tra lại mô tả, vị trí, pháp lý hoặc yêu cầu owner bổ sung giải thích.",
  },
  {
    title: "7. Owner vi phạm nhiều lần",
    text: "Owner có nhiều tin bị admin xử lý sẽ bị giảm hạn mức tin chờ duyệt và bị hạn chế mua gói nổi bật cho đến khi cải thiện chất lượng tin.",
  },
];

const REJECT_REASON_TEMPLATES = [
  {
    label: "Thiếu thông tin",
    text: "Tin đăng thiếu thông tin bắt buộc: địa chỉ cụ thể, pháp lý, mô tả tình trạng bất động sản hoặc thông tin vị trí. Vui lòng bổ sung đầy đủ trước khi gửi duyệt lại.",
  },
  {
    label: "Giá/diện tích bất thường",
    text: "Giá hoặc diện tích chưa hợp lý so với loại giao dịch và thông tin mô tả. Vui lòng kiểm tra lại giá, diện tích và bổ sung giải thích nếu đây là trường hợp đặc biệt.",
  },
  {
    label: "Ảnh chưa đạt",
    text: "Hình ảnh chưa đủ rõ hoặc chưa thể hiện đúng bất động sản. Vui lòng tải ảnh thật, rõ ràng, liên quan trực tiếp đến tin đăng.",
  },
  {
    label: "Nội dung vi phạm",
    text: "Mô tả chứa thông tin không được phép như số điện thoại, email, đường dẫn ngoài hệ thống hoặc nội dung quảng cáo không liên quan. Vui lòng chỉnh sửa mô tả theo chính sách đăng tin.",
  },
  {
    label: "Tin trùng",
    text: "Tin có dấu hiệu trùng với tin đang hoạt động về địa chỉ, giá, diện tích hoặc nội dung mô tả. Vui lòng cập nhật tin cũ thay vì tạo tin mới.",
  },
];

const HIDE_REASON_TEMPLATES = [
  {
    label: "Bị báo cáo sai thông tin",
    text: "Tin bị người dùng báo cáo sai thông tin về địa chỉ, giá hoặc tình trạng bất động sản. Cần owner kiểm tra và cập nhật lại trước khi hiển thị.",
  },
  {
    label: "Ảnh không đúng thực tế",
    text: "Tin có hình ảnh không đúng hoặc không thể hiện đúng bất động sản đang giao dịch. Cần owner thay ảnh thật, rõ ràng và liên quan trực tiếp.",
  },
  {
    label: "Nghi vấn giao dịch ngoài",
    text: "Nội dung tin có dấu hiệu dẫn người mua giao dịch ngoài hệ thống hoặc chứa thông tin liên hệ không phù hợp với chính sách.",
  },
  {
    label: "Không còn giao dịch",
    text: "Bất động sản có dấu hiệu đã giao dịch hoặc không còn khả dụng nhưng owner chưa cập nhật trạng thái tin.",
  },
];

const TYPE_LABELS = {
  apartment: "Căn hộ",
  house: "Nhà phố",
  land: "Đất nền",
  office: "Văn phòng",
};

const LEGAL_LABELS = {
  sohong: "Sổ hồng",
  sokhongdo: "Sổ đỏ",
  dangchoso: "Đang chờ sổ",
  other: "Khác",
};

function parseReportNote(note) {
  const text = String(note || "");
  const content = text.replace(/^Người dùng báo cáo tin:\s*/i, "").trim();
  const [reason, ...rest] = content.split(". ");
  return {
    reason: reason || "Báo cáo tin đăng",
    message: rest.join(". ") || content || "Không có nội dung chi tiết",
  };
}

function getReportPolicy(reportCount) {
  const count = Number(reportCount || 0);
  if (count >= 5) {
    return {
      level: "critical",
      label: "Nghiêm trọng",
      action: "Ưu tiên xử lý ngay. Nếu nội dung báo cáo đúng, admin nên ẩn tin để bảo vệ người mua.",
      bg: C.errorContainer,
      border: "#f4b8b8",
      color: C.error,
    };
  }
  if (count >= 3) {
    return {
      level: "high",
      label: "Ưu tiên cao",
      action: "Cần kiểm tra nội dung, hình ảnh, địa chỉ và lịch sử người bán trước khi tiếp tục hiển thị.",
      bg: "#fff4d6",
      border: "#f0ce7a",
      color: "#8a5a00",
    };
  }
  if (count >= 1) {
    return {
      level: "watch",
      label: "Cần xem xét",
      action: "Ghi nhận phản ánh và đối chiếu khi admin kiểm tra tin.",
      bg: "#e8f1ff",
      border: "#b9cdf5",
      color: "#2456a6",
    };
  }
  return {
    level: "none",
    label: "Chưa có báo cáo",
    action: "Tin chưa có phản ánh từ người dùng.",
    bg: C.surfaceContainerLow,
    border: C.borderSubtle,
    color: C.textMuted,
  };
}

function getReviewInsightSummary(insights) {
  if (!insights) return null;
  const qualityScore = Number(insights.quality_score || 0);
  const priceRisk = insights.price_risk || {};
  const problems = [];
  if (qualityScore < 65) {
    problems.push(`Điểm chất lượng thấp (${qualityScore}/100)`);
  } else if (qualityScore < 85) {
    problems.push(`Điểm chất lượng cần xem xét (${qualityScore}/100)`);
  }
  if (priceRisk.level === "warning") {
    problems.push(priceRisk.label || "Giá có dấu hiệu bất thường");
  }
  return problems;
}

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
      const params =
        tab === "reports"
          ? new URLSearchParams({ page, limit: LIMIT })
          : new URLSearchParams({ status: tab, page, limit: LIMIT });
      const data = await apiFetch(
        tab === "reports"
          ? `/api/property/admin/reports?${params}`
          : `/api/admin/properties?${params}`,
      );
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
      const [data, reportsData] = await Promise.all([
        apiFetch(`/api/property/${prop.id}`),
        apiFetch(`/api/property/admin/reports?property_id=${prop.id}`),
      ]);
      setDetailModal({
        ...prop,
        ...data,
        reports: reportsData?.data || [],
      });
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const getValidationItems = (prop) => {
    const images = Array.isArray(prop?.images)
      ? prop.images
      : prop?.images
        ? String(prop.images).split(",").filter(Boolean)
        : [];
    const description = prop?.description || "";
    const hasContactInDescription = /(?:\+?84|0)\d{8,10}|[^\s@]+@[^\s@]+\.[^\s@]+/.test(
      description,
    );

    return [
      {
        label: "Tiêu đề đạt 10-180 ký tự",
        ok: Boolean(
          prop?.title &&
            prop.title.trim().length >= 10 &&
            prop.title.trim().length <= 180,
        ),
      },
      {
        label: "Mô tả đạt 30-3000 ký tự",
        ok: description.trim().length >= 30 && description.trim().length <= 3000,
      },
      {
        label: "Giá đạt ngưỡng tối thiểu theo loại giao dịch",
        ok:
          prop?.transaction_type === "sale"
            ? Number(prop?.price) >= 100000000
            : Number(prop?.price) >= 500000,
      },
      {
        label: "Diện tích từ 5 m² đến 100.000 m²",
        ok: Number(prop?.area) >= 5 && Number(prop?.area) <= 100000,
      },
      {
        label: "Địa chỉ đủ tỉnh/thành, quận/huyện, địa chỉ cụ thể",
        ok: Boolean(
          prop?.city && prop?.district && prop?.address?.trim?.().length >= 5,
        ),
      },
      {
        label: "Pháp lý thuộc danh mục hợp lệ",
        ok: ["sohong", "sokhongdo", "dangchoso", "other"].includes(
          prop?.legal_status,
        ),
      },
      {
        label: "Có ít nhất 1 hình ảnh bất động sản",
        ok: images.length > 0 || Boolean(prop?.thumbnail),
      },
      {
        label: "Tọa độ nằm trong phạm vi Việt Nam",
        ok:
          Number(prop?.latitude) >= 8 &&
          Number(prop?.latitude) <= 24 &&
          Number(prop?.longitude) >= 102 &&
          Number(prop?.longitude) <= 110,
      },
      {
        label: "Mô tả không chèn số điện thoại/email ngoài hệ thống",
        ok: !hasContactInDescription,
      },
    ];
  };

  const handleApproveWithPolicy = async (prop) => {
    const failedItems = getValidationItems(prop).filter((item) => !item.ok);
    const reportPolicy = getReportPolicy(prop?.reports?.length || prop?.report_count);
    const insightProblems = getReviewInsightSummary(prop?.review_insights) || [];
    if (
      failedItems.length > 0 ||
      insightProblems.length > 0 ||
      reportPolicy.level === "high" ||
      reportPolicy.level === "critical"
    ) {
      const ok = await confirm({
        title: "Tin cần kiểm tra kỹ trước khi duyệt",
        message: [
          failedItems.length > 0
            ? `Tiêu chí chưa đạt: ${failedItems.map((item) => item.label).join("; ")}.`
            : "",
          insightProblems.length > 0
            ? `Cảnh báo nghiệp vụ: ${insightProblems.join("; ")}.`
            : "",
          reportPolicy.level !== "none"
            ? `Báo cáo: ${reportPolicy.label}. ${reportPolicy.action}`
            : "",
          "Bạn vẫn muốn duyệt tin?",
        ]
          .filter(Boolean)
          .join(" "),
        confirmText: "Vẫn duyệt",
        danger: true,
      });
      if (!ok) return;
    }
    handleStatus(prop.id, "approved");
  };

  const handleStatus = async (id, status, reason) => {
    const statusText = {
      approved: "duyệt tin",
      rejected: "từ chối tin",
      hidden: "ẩn tin",
      pending: "chuyển về chờ duyệt",
    }[status];
    const confirmMessage = {
      approved: "Tin sẽ được hiển thị công khai cho người mua.",
      rejected: "Tin sẽ bị từ chối và người bán sẽ nhìn thấy lý do từ chối.",
      hidden: "Tin sẽ bị ẩn khỏi danh sách công khai của người mua.",
      pending: "Tin sẽ được chuyển về trạng thái chờ duyệt.",
    }[status];
    const confirmText = {
      approved: "Duyệt tin",
      rejected: "Từ chối",
      hidden: "Ẩn tin",
      pending: "Xác nhận",
    }[status];
    const successMessage = {
      approved: "✓ Đã duyệt tin đăng",
      rejected: "✓ Đã từ chối tin đăng",
      hidden: "✓ Đã ẩn tin đăng",
      pending: "✓ Đã chuyển tin về chờ duyệt",
    }[status];

    const ok = await confirm({
      title: `Xác nhận ${statusText}?`,
      message: confirmMessage,
      confirmText,
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
      notify(successMessage);
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
    { key: "reports", label: "Báo cáo" },
    { key: "approved", label: "Đã duyệt" },
    { key: "rejected", label: "Đã từ chối" },
    { key: "hidden", label: "Đã ẩn" },
  ];
  const activeTab = tabs.find((t) => t.key === tab) || tabs[0];

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
          label={activeTab.label}
          value={total}
          sub={
            tab === "pending" && total > 0
              ? "Cần xem xét ngay"
              : tab === "reports" && total > 0
                ? "Tin được người dùng phản ánh"
                : ""
          }
          subColor={C.amber}
          accent={(tab === "pending" || tab === "reports") && total > 0}
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
          <EmptyState
            msg={
              tab === "reports"
                ? "Chưa có báo cáo tin đăng nào"
                : "Không có tin đăng nào"
            }
          />
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
                        {Number(prop.report_count || 0) > 0 && (
                          (() => {
                            const policy = getReportPolicy(prop.report_count);
                            return (
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  marginTop: 6,
                                  padding: tab === "reports" ? "3px 7px" : "2px 6px",
                                  borderRadius: 999,
                                  background: policy.bg,
                                  color: policy.color,
                                  border: `1px solid ${policy.border}`,
                                  fontSize: tab === "reports" ? 11 : 10,
                                  fontWeight: 800,
                                  width: "fit-content",
                                }}>
                                <UiIcon name="alert" size={tab === "reports" ? 12 : 10} />
                                {Number(prop.report_count || 0)} báo cáo
                                {tab === "reports" ? ` · ${policy.label}` : ""}
                              </div>
                            );
                          })()
                        )}
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
                          GIÁ CAO
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: C.textMuted }}>
                        {tab === "reports"
                          ? timeAgo(prop.latest_report_at)
                          : timeAgo(prop.created_at)}
                      </span>
                      {tab === "reports" && prop.latest_report_note && (
                        <div
                          style={{
                            marginTop: 4,
                            maxWidth: 220,
                            fontSize: 11,
                            color: C.secondary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                          {parseReportNote(prop.latest_report_note).reason}
                        </div>
                      )}
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
                        {prop.status === "approved" && (
                          <button
                            disabled={actionLoading[prop.id]}
                            onClick={() => {
                              setRejectModal({ ...prop, action: "hidden" });
                              setRejectReason("");
                            }}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 6,
                              border: `1px solid ${C.borderSubtle}`,
                              background: C.surfaceContainerHigh,
                              color: C.secondary,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: actionLoading[prop.id]
                                ? "not-allowed"
                                : "pointer",
                              fontFamily: font.body,
                            }}>
                            {actionLoading[prop.id] ? "..." : "Ẩn tin"}
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
            alignItems: "flex-start",
            justifyContent: "center",
            zIndex: 2200,
            padding: "76px 20px 24px",
            overflowY: "auto",
          }}
          onClick={() => setDetailModal(null)}>
          <div
            style={{
              background: C.surfaceContainerLowest,
              borderRadius: 12,
              width: "100%",
              maxWidth: 920,
              maxHeight: "calc(100vh - 100px)",
              overflow: "auto",
              fontFamily: font.body,
              boxShadow: "0 18px 60px rgba(0,0,0,0.22)",
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
                  ID #{detailModal.id} · {detailModal.owner_name || "Người bán"}
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
                    minWidth: 0,
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

                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        margin: "0 0 10px",
                        fontSize: 20,
                        color: C.onSurface,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}>
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
                        ["Loại hình", TYPE_LABELS[detailModal.type] || "Chưa có"],
                        ["Giao dịch", detailModal.transaction_type === "sale" ? "Bán" : "Cho thuê"],
                        ["Pháp lý", LEGAL_LABELS[detailModal.legal_status] || "Chưa có"],
                        ["Vị trí", [detailModal.address, detailModal.ward, detailModal.district, detailModal.city].filter(Boolean).join(", ") || "Chưa có"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          style={{
                            padding: "10px 12px",
                            background: C.surfaceContainerLow,
                            borderRadius: 8,
                            minWidth: 0,
                          }}>
                          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: C.onSurface,
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                            }}>
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
                      <div
                        style={{
                          fontSize: 13,
                          color: C.secondary,
                          lineHeight: 1.6,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}>
                        {detailModal.description || "Chưa có mô tả"}
                      </div>
                    </div>

                    {detailModal.review_insights && (
                      <div
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          border: `1px solid ${
                            detailModal.review_insights.quality_level === "risk" ||
                            detailModal.review_insights.price_risk?.level === "warning"
                              ? "#f0ce7a"
                              : C.borderSubtle
                          }`,
                          background:
                            detailModal.review_insights.quality_level === "risk" ||
                            detailModal.review_insights.price_risk?.level === "warning"
                              ? "#fff8e1"
                              : C.surfaceContainerLow,
                          marginBottom: 18,
                        }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 10,
                          }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.onSurface }}>
                            Đánh giá nghiệp vụ
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 900,
                              color:
                                detailModal.review_insights.quality_score >= 85
                                  ? "#0f6e56"
                                  : detailModal.review_insights.quality_score >= 65
                                    ? "#8a5a00"
                                    : C.error,
                            }}>
                            {detailModal.review_insights.quality_score}/100
                          </span>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 8,
                            marginBottom: 10,
                          }}>
                          <div
                            style={{
                              padding: "9px 11px",
                              borderRadius: 8,
                              background: C.surfaceContainerLowest,
                              border: `1px solid ${C.borderSubtle}`,
                            }}>
                            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>
                              Chất lượng tin
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: C.onSurface }}>
                              {detailModal.review_insights.quality_level === "good"
                                ? "Đạt tốt"
                                : detailModal.review_insights.quality_level === "watch"
                                  ? "Cần xem xét"
                                  : "Rủi ro"}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "9px 11px",
                              borderRadius: 8,
                              background: C.surfaceContainerLowest,
                              border: `1px solid ${C.borderSubtle}`,
                            }}>
                            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>
                              So sánh giá
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color:
                                  detailModal.review_insights.price_risk?.level === "warning"
                                    ? "#8a5a00"
                                    : C.onSurface,
                              }}>
                              {detailModal.review_insights.price_risk?.label ||
                                "Chưa đủ dữ liệu"}
                            </div>
                          </div>
                        </div>
                        {detailModal.review_insights.price_risk?.reference_unit_price && (
                          <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>
                            Giá/m² tin này:{" "}
                            <strong>
                              {formatPrice(
                                detailModal.review_insights.price_risk.current_unit_price,
                              )}
                            </strong>
                            {" · "}Khoảng tham khảo:{" "}
                            <strong>
                              {formatPrice(
                                detailModal.review_insights.price_risk.reference_unit_price.low,
                              )}
                              {" - "}
                              {formatPrice(
                                detailModal.review_insights.price_risk.reference_unit_price.high,
                              )}
                            </strong>
                            {" · "}Mẫu so sánh:{" "}
                            {detailModal.review_insights.price_risk.sample_size}
                          </div>
                        )}
                        {!detailModal.review_insights.price_risk?.reference_unit_price && (
                          <div style={{ fontSize: 12, color: C.secondary, marginBottom: 8 }}>
                            Phạm vi so sánh:{" "}
                            <strong>
                              {detailModal.review_insights.price_risk?.basis ||
                                "Đang mở rộng dữ liệu"}
                            </strong>
                            {" · "}Mẫu tìm được:{" "}
                            {detailModal.review_insights.price_risk?.sample_size || 0}
                          </div>
                        )}
                        {detailModal.review_insights.failed_items?.length > 0 ? (
                          <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.5 }}>
                            Cần kiểm tra:{" "}
                            {detailModal.review_insights.failed_items
                              .map((item) => item.label)
                              .join("; ")}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: C.secondary }}>
                            Tin đạt các tiêu chí chất lượng cơ bản.
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        border: `1px solid ${
                          detailModal.reports?.length ? "#f4b8b8" : C.borderSubtle
                        }`,
                        background: detailModal.reports?.length
                          ? "#fff7f6"
                          : C.surfaceContainerLowest,
                        marginBottom: 18,
                      }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 10,
                        }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.onSurface }}>
                          Báo cáo từ người dùng
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: detailModal.reports?.length ? C.error : C.textMuted,
                          }}>
                          {detailModal.reports?.length || 0} báo cáo
                        </span>
                      </div>

                      {(() => {
                        const policy = getReportPolicy(detailModal.reports?.length || 0);
                        return (
                          <div
                            style={{
                              border: `1px solid ${policy.border}`,
                              background: policy.bg,
                              color: policy.color,
                              borderRadius: 8,
                              padding: "9px 11px",
                              marginBottom: 10,
                              fontSize: 12,
                              lineHeight: 1.45,
                              fontWeight: 700,
                            }}>
                            Quy tắc xử lý: {policy.label}. {policy.action}
                          </div>
                        );
                      })()}

                      {detailModal.reports?.length ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {detailModal.reports.map((report) => {
                            const parsed = parseReportNote(report.note);
                            return (
                              <div
                                key={report.id}
                                style={{
                                  border: `1px solid ${C.borderSubtle}`,
                                  borderRadius: 8,
                                  background: C.surfaceContainerLowest,
                                  padding: "10px 12px",
                                }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    marginBottom: 5,
                                  }}>
                                  <strong style={{ fontSize: 12, color: C.error }}>
                                    {parsed.reason}
                                  </strong>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: C.textMuted,
                                      whiteSpace: "nowrap",
                                    }}>
                                    {timeAgo(report.created_at)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: C.secondary,
                                    lineHeight: 1.45,
                                    marginBottom: 6,
                                  }}>
                                  {parsed.message}
                                </div>
                                <div style={{ fontSize: 11, color: C.textMuted }}>
                                  Người báo cáo: {report.reporter_name || "Người dùng"} ·{" "}
                                  {report.reporter_role === "owner"
                                    ? "Người bán"
                                    : "Người mua"}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: C.textMuted }}>
                          Tin này chưa có báo cáo từ người dùng.
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        background: C.surfaceContainerLow,
                        border: `1px solid ${C.borderSubtle}`,
                      }}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                        Chính sách kiểm duyệt trước khi công khai
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.secondary,
                          lineHeight: 1.55,
                          marginBottom: 14,
                        }}>
                        Admin duyệt tin theo nguyên tắc bảo vệ người mua, giữ
                        thông tin minh bạch và hạn chế giao dịch ngoài hệ thống.
                        Tin không đạt cần bị từ chối kèm lý do cụ thể để người
                        bán chỉnh sửa.
                      </div>

                      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                        {ADMIN_REVIEW_POLICY.map((policy) => (
                          <div
                            key={policy.title}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "18px 1fr",
                              gap: 8,
                              alignItems: "flex-start",
                            }}>
                            <UiIcon
                              name="shield"
                              size={16}
                              color="#0f6e56"
                              style={{ marginTop: 2 }}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: C.onSurface,
                                  marginBottom: 2,
                                }}>
                                {policy.title}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: C.secondary,
                                  lineHeight: 1.45,
                                }}>
                                {policy.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: C.onSurface,
                          marginBottom: 10,
                        }}>
                        Checklist kiểm tra tin này
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
                              background: item.ok ? "#e6f9f0" : C.errorContainer,
                              border: `1px solid ${item.ok ? "#b9dfd3" : "#f4b8b8"}`,
                              borderRadius: 8,
                              padding: "8px 10px",
                            }}>
                            <span
                              style={{
                                display: "inline-flex",
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                alignItems: "center",
                                justifyContent: "center",
                                background: item.ok ? "#0f6e56" : C.error,
                                color: "#fff",
                                fontSize: 11,
                                flexShrink: 0,
                              }}>
                              {item.ok ? "✓" : "!"}
                            </span>
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
                        setRejectModal({ ...detailModal, action: "rejected" });
                        setRejectReason("");
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
                      onClick={() => handleApproveWithPolicy(detailModal)}
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

                {detailModal.status === "approved" && (
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
                      disabled={actionLoading[detailModal.id]}
                      onClick={() => {
                        setRejectModal({ ...detailModal, action: "hidden" });
                        setRejectReason("");
                        setDetailModal(null);
                      }}
                      style={{
                        padding: "9px 18px",
                        borderRadius: 8,
                        border: `1px solid ${C.error}30`,
                        background: C.errorContainer,
                        color: C.error,
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: actionLoading[detailModal.id]
                          ? "not-allowed"
                          : "pointer",
                        fontFamily: font.body,
                      }}>
                      {actionLoading[detailModal.id] ? "..." : "Ẩn tin"}
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
            {(() => {
              const action = rejectModal.action || "rejected";
              const isHiddenAction = action === "hidden";
              const templates = isHiddenAction
                ? HIDE_REASON_TEMPLATES
                : REJECT_REASON_TEMPLATES;
              const title = isHiddenAction ? "Ẩn tin đăng" : "Từ chối tin đăng";
              const label = isHiddenAction ? "Lý do ẩn tin" : "Lý do từ chối";
              const placeholder = isHiddenAction
                ? "Nêu rõ vấn đề khiến tin cần bị ẩn khỏi danh sách công khai..."
                : "Nêu rõ tiêu chí chưa đạt và hướng sửa để owner gửi duyệt lại...";
              const helpText = isHiddenAction
                ? "Lý do cần tối thiểu 20 ký tự và phải nêu rõ vấn đề khiến tin bị ẩn."
                : "Lý do cần tối thiểu 20 ký tự và phải nêu rõ tiêu chí chưa đạt.";
              return (
                <>
            <div
              style={{
                fontFamily: font.headline,
                fontWeight: 700,
                fontSize: 18,
                color: C.onSurface,
                marginBottom: 8,
              }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
              {rejectModal.title}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.onSurface,
                  marginBottom: 8,
              }}>
                Mẫu lý do nhanh
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {templates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => setRejectReason(template.text)}
                    style={{
                      border: `1px solid ${C.borderSubtle}`,
                      borderRadius: 999,
                      background: C.surfaceContainerHigh,
                      color: C.secondary,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: font.body,
                    }}>
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.onSurface,
                display: "block",
                marginBottom: 8,
              }}>
              {label}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={placeholder}
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
                fontSize: 12,
                color:
                  rejectReason.trim().length >= 20 ? C.textMuted : C.error,
                marginTop: 6,
              }}>
              {helpText}
            </div>
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
                disabled={
                  rejectReason.trim().length < 20 ||
                  actionLoading[rejectModal.id]
                }
                onClick={() =>
                  handleStatus(rejectModal.id, action, rejectReason)
                }
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    rejectReason.trim().length < 20 ? "#ccc" : C.error,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor:
                    rejectReason.trim().length < 20
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: font.body,
                }}>
                {actionLoading[rejectModal.id]
                  ? "..."
                  : isHiddenAction
                    ? "Xác nhận ẩn tin"
                    : "Xác nhận từ chối"}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
