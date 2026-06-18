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
import UiIcon from "../../components/UiIcon";

export default function UsersPage({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const LIMIT = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      const data = await apiFetch(`/api/admin/users?${params}`);
      let list = Array.isArray(data) ? data : data.data || [];
      // client-side filter since API may not support role/status filters
      if (filterRole) list = list.filter((u) => u.role === filterRole);
      if (filterStatus) list = list.filter((u) => u.status === filterStatus);
      setUsers(list);
      setTotal(data?.pagination?.total || list.length);
      setTotalPages(data?.pagination?.total_pages || 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, filterRole, filterStatus]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleStatus = async (id, newStatus) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u)),
      );
      showToast(
        newStatus === "banned" ? "Đã cấm tài khoản" : "Đã kích hoạt tài khoản",
      );
    } catch (e) {
      showToast(e.message, "error");
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
          value={total.toLocaleString()}
        />
        <StatCard
          label="Người bán (Owner)"
          value={users.filter((u) => u.role === "owner").length}
        />
        <StatCard
          label="Người mua (Buyer)"
          value={users.filter((u) => u.role === "buyer").length}
        />
        <StatCard
          label="Bị cấm"
          value={users.filter((u) => u.status === "banned").length}
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
              <option value="buyer">Buyer</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
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
                        {user.role}
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
