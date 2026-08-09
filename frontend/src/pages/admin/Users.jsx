import { useState, useEffect, useCallback } from "react";
import { C, font, apiFetch, selectStyle, tdStyle } from "./adminShared";
import {
  StatCard,
  Badge,
  LoadingState,
  ErrorState,
  EmptyState,
  Pagination,
} from "./Dashboard";
import { useToast } from "../../components/ToastProvider";
import { useConfirm } from "../../components/ConfirmProvider";

const ROLE_LABELS = {
  buyer: "Người mua",
  owner: "Người bán",
  admin: "Quản trị viên",
};

export default function UsersPage({ showToast }) {
  const { showToast: globalToast } = useToast();
  const { confirm } = useConfirm();
  const notify = showToast || globalToast;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    owners: 0,
    buyers: 0,
    banned: 0,
  });
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const LIMIT = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (filterRole) params.set("role", filterRole);
      if (filterStatus) params.set("status", filterStatus);
      const data = await apiFetch(`/api/admin/users?${params}`);
      const list = Array.isArray(data) ? data : data.data || [];
      setUsers(list);
      setTotalPages(data?.pagination?.total_pages || 1);
      setSummary(
        data?.summary || {
          total: data?.pagination?.total || list.length,
          owners: list.filter((user) => user.role === "owner").length,
          buyers: list.filter((user) => user.role === "buyer").length,
          banned: list.filter((user) => user.status === "banned").length,
        },
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filterRole, filterStatus]);

  useEffect(() => {
    // Fetching the requested server page is the synchronization for this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, [loadUsers]);

  const handleStatus = async (id, newStatus) => {
    const ok = await confirm({
      title:
        newStatus === "banned"
          ? "Vô hiệu hóa tài khoản?"
          : "Kích hoạt tài khoản?",
      message:
        newStatus === "banned"
          ? "Người dùng này sẽ không thể đăng nhập và sử dụng hệ thống."
          : "Tài khoản này sẽ được phép đăng nhập và sử dụng lại hệ thống.",
      confirmText: newStatus === "banned" ? "Vô hiệu hóa" : "Kích hoạt",
      danger: newStatus === "banned",
    });
    if (!ok) return;

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      await loadUsers();
      notify(
        newStatus === "banned" ? "Đã cấm tài khoản" : "Đã kích hoạt tài khoản",
      );
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div style={{ padding: "32px", fontFamily: font.body }}>
      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}>
        <StatCard
          label="Tổng người dùng"
          value={summary.total.toLocaleString()}
        />
        <StatCard
          label="Người bán"
          value={summary.owners.toLocaleString()}
        />
        <StatCard
          label="Người mua"
          value={summary.buyers.toLocaleString()}
        />
        <StatCard
          label="Bị cấm"
          value={summary.banned.toLocaleString()}
          subColor={C.error}
        />
      </div>

      {/* Table card */}
      <div
        style={{
          background: C.surfaceContainerLowest,
          border: `1px solid ${C.borderSubtle}`,
          borderRadius: 12,
          overflow: "hidden",
        }}>
        {/* Filters */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.borderSubtle}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}>
          <div
            style={{
              fontFamily: font.headline,
              fontWeight: 700,
              fontSize: 16,
              color: C.onSurface,
            }}>
            Danh sách người dùng
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setPage(1);
              }}
              style={selectStyle}>
              <option value="">Tất cả vai trò</option>
              <option value="buyer">Người mua</option>
              <option value="owner">Người bán</option>
              <option value="admin">Quản trị viên</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              style={selectStyle}>
              <option value="">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="banned">Bị cấm</option>
            </select>
            {(filterRole || filterStatus) && (
              <button
                onClick={() => {
                  setFilterRole("");
                  setFilterStatus("");
                  setPage(1);
                }}
                style={{
                  fontSize: 13,
                  color: C.primary,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}>
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState msg={error} />
        ) : users.length === 0 ? (
          <EmptyState icon="users" msg="Không có người dùng nào" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surfaceContainerLow }}>
                  {[
                    "ID",
                    "Họ tên",
                    "Email",
                    "Vai trò",
                    "Trạng thái",
                    "Ngày tạo",
                    "Hành động",
                  ].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: i === 6 ? "right" : "left",
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
                {users.map((user) => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.surface)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 11,
                          color: C.textMuted,
                          fontFamily: "monospace",
                        }}>
                        #{user.id}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background:
                              user.role === "owner"
                                ? C.tertiaryFixed
                                : C.surfaceContainerHigh,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color:
                              user.role === "owner"
                                ? C.onTertiaryFixedVariant
                                : C.secondary,
                            flexShrink: 0,
                          }}>
                          {user.full_name
                            ?.split(" ")
                            .slice(-2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.onSurface,
                          }}>
                          {user.full_name}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: C.secondary }}>
                        {user.email}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background:
                            user.role === "owner"
                              ? C.tertiaryFixed
                              : user.role === "admin"
                                ? "#e0e7ff"
                                : C.surfaceContainerHigh,
                          color:
                            user.role === "owner"
                              ? C.onTertiaryFixedVariant
                              : user.role === "admin"
                                ? "#3730a3"
                                : C.secondary,
                        }}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <Badge
                        status={user.status === "active" ? "active" : "banned"}
                      />
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: C.secondary }}>
                        {new Date(user.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      {user.role !== "admin" && (
                        <button
                          disabled={actionLoading[user.id]}
                          onClick={() =>
                            handleStatus(
                              user.id,
                              user.status === "banned" ? "active" : "banned",
                            )
                          }
                          style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: `1px solid ${user.status === "banned" ? C.statusSuccess : C.error}30`,
                            background:
                              user.status === "banned"
                                ? "#e6f9f0"
                                : C.errorContainer,
                            color:
                              user.status === "banned" ? "#0f6e56" : C.error,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: actionLoading[user.id]
                              ? "not-allowed"
                              : "pointer",
                            fontFamily: font.body,
                            opacity: actionLoading[user.id] ? 0.6 : 1,
                          }}>
                          {actionLoading[user.id]
                            ? "..."
                            : user.status === "banned"
                              ? "Kích hoạt"
                              : "Cấm"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        )}
      </div>
    </div>
  );
}
