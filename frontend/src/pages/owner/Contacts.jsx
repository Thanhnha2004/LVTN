import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import UiIcon from "../../components/UiIcon";
import SiteFooter from "../../components/SiteFooter";
import { useToast } from "../../components/ToastProvider";
import { fuzzyMatches } from "../../shared/search";

const VN = { fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif" };
const REPLY_MIN_LENGTH = 10;
const REPLY_MAX_LENGTH = 1000;
const OWNER_NOTE_MAX_LENGTH = 500;

const LEAD_STATUS = [
  { value: "new", label: "Mới" },
  { value: "contacted", label: "Đã liên hệ" },
  { value: "scheduled", label: "Đã hẹn xem" },
  { value: "closed", label: "Đã chốt" },
  { value: "cancelled", label: "Đã hủy" },
];

const LEAD_STATUS_LABEL = Object.fromEntries(
  LEAD_STATUS.map((item) => [item.value, item.label]),
);

const LEAD_TRANSITIONS = {
  new: ["contacted"],
  contacted: ["scheduled", "closed", "cancelled"],
  scheduled: ["closed", "cancelled"],
  closed: [],
  cancelled: [],
};

const LEAD_HINTS = {
  new: {
    note: "Lead mới, owner nên phản hồi để xác nhận nhu cầu của khách.",
    placeholder: "Ghi chú nhu cầu ban đầu của khách...",
  },
  contacted: {
    note: "Đã liên hệ khách, nên ghi lại nhu cầu, ngân sách và kênh đã trao đổi.",
    placeholder: "Ví dụ: đã gọi, khách cần căn 2PN, ngân sách khoảng 3 tỷ...",
  },
  scheduled: {
    note: "Chọn lịch hẹn xem thực tế để dễ theo dõi và tránh bỏ sót khách.",
    placeholder: "Ghi chú địa điểm hẹn, người dẫn xem, yêu cầu của khách...",
  },
  closed: {
    note: "Lead đã chốt. Khi lưu trạng thái này, tin đang hiển thị sẽ được chuyển thành đã giao dịch.",
    placeholder: "Ghi chú kết quả giao dịch...",
  },
  cancelled: {
    note: "Lead đã hủy. Nên ghi lại lý do để cải thiện tin đăng hoặc cách tư vấn.",
    placeholder: "Ví dụ: khách đổi nhu cầu, giá chưa phù hợp, không liên hệ được...",
  },
};

const REPLY_TEMPLATES = [
  "Cảm ơn bạn đã quan tâm. Bất động sản hiện vẫn còn, bạn muốn xem nhà vào thời gian nào?",
  "Mình đã nhận thông tin liên hệ. Bạn có thể cho mình biết nhu cầu cụ thể và ngân sách dự kiến không?",
  "Tin này còn hiệu lực. Mình có thể hỗ trợ thêm thông tin pháp lý, vị trí và lịch xem thực tế.",
];

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAppointmentValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function getMinAppointmentValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function parseAppointmentFromNote(note) {
  const value = String(note || "");
  const match = value.match(
    /(?:lịch hẹn xem|lich hen xem)\s*:\s*(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  );
  if (!match) return "";

  const [, hour, minute, day, month, year] = match;
  return formatAppointmentValue(
    new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ),
  );
}

function stripAppointmentFromNote(note) {
  return String(note || "")
    .replace(
      /(?:lịch hẹn xem|lich hen xem)\s*:\s*\d{1,2}:\d{2}\s+\d{1,2}\/\d{1,2}\/\d{4}\.?\s*/i,
      "",
    )
    .trim();
}

function hoursSince(value) {
  if (!value) return 0;
  return Math.max(0, (Date.now() - new Date(value).getTime()) / 36e5);
}

function contactPriority(contact) {
  if (contact.status === "replied") return { label: "Đã xử lý", color: "#0f6e56", bg: "#e6f9f0" };
  const hours = hoursSince(contact.created_at);
  if (hours >= 24) return { label: "Cần phản hồi gấp", color: "#a32d2d", bg: "#fcebeb" };
  if (hours >= 6) return { label: "Nên phản hồi sớm", color: "#8a5a00", bg: "#fff4d6" };
  return { label: "Mới gửi", color: "#2456a6", bg: "#e8f1ff" };
}

function ContactSummaryCard({ label, value, sub, tone = "#b51b17" }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #E8E8E8",
        borderRadius: 12,
        padding: "14px 16px",
        ...VN,
      }}>
      <div style={{ fontSize: 12, color: "#757575", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 25, fontWeight: 800, color: tone, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#5f5e5e", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const SIDEBAR = [
  { to: "/owner/dashboard", icon: "clipboard", label: "Tin đã đăng" },
  { to: "/owner/contacts", icon: "message", label: "Liên hệ", active: true },
  { to: "/profile", icon: "user", label: "Thông tin cá nhân" },
];

// ── Reply Box ──────────────────────────────────────────────
function ReplyBox({ contactId, onSent, onCancel, showToast }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    const replyText = text.trim().replace(/\s+/g, " ");
    if (replyText.length < REPLY_MIN_LENGTH) {
      const message = "Nội dung phản hồi phải có ít nhất 10 ký tự";
      setError(message);
      showToast(message, "error");
      return;
    }
    if (replyText.length > REPLY_MAX_LENGTH) {
      const message = "Nội dung phản hồi không được vượt quá 1000 ký tự";
      setError(message);
      showToast(message, "error");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await api.patch(`/api/contact/${contactId}/reply`, {
        owner_reply: replyText,
      });
      onSent(contactId, replyText, res.data?.lead_status);
      showToast("Đã gửi phản hồi cho người mua");
    } catch (err) {
      const message = err.response?.data?.message || "Gửi thất bại, thử lại.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: "0.5px solid #E8E8E8",
      }}>
      {error && (
        <div
          style={{
            fontSize: 12,
            color: "#a32d2d",
            marginBottom: 8,
            padding: "6px 12px",
            background: "#fcebeb",
            borderRadius: 6,
          }}>
          {error}
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Nhập nội dung phản hồi của bạn..."
        rows={4}
        maxLength={REPLY_MAX_LENGTH}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 10,
          border: "0.5px solid #E8E8E8",
          fontSize: 14,
          resize: "none",
          outline: "none",
          background: "#fff",
          color: "#1a1c1c",
          boxSizing: "border-box",
          ...VN,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#b51b17")}
        onBlur={(e) => (e.target.style.borderColor = "#E8E8E8")}
      />
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color:
            text.trim().length === 0 || text.trim().length >= REPLY_MIN_LENGTH
              ? "#757575"
              : "#a32d2d",
          ...VN,
        }}>
        {text.trim().length}/{REPLY_MAX_LENGTH} ký tự
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 8,
        }}>
        {REPLY_TEMPLATES.map((template, index) => (
          <button
            key={template}
            type="button"
            onClick={() => setText(template)}
            style={{
              border: "0.5px solid #E8E8E8",
              background: "#fff",
              color: "#5f5e5e",
              borderRadius: 999,
              padding: "5px 10px",
              fontSize: 12,
              cursor: "pointer",
              ...VN,
            }}>
            Mẫu {index + 1}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 10,
        }}>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 16px",
            border: "0.5px solid #E8E8E8",
            borderRadius: 8,
            background: "#fff",
            fontSize: 13,
            color: "#5f5e5e",
            cursor: "pointer",
            ...VN,
          }}>
          Hủy
        </button>
        <button
          onClick={send}
          disabled={
            sending ||
            text.trim().length < REPLY_MIN_LENGTH ||
            text.trim().length > REPLY_MAX_LENGTH
          }
          style={{
            padding: "7px 20px",
            border: "none",
            borderRadius: 8,
            background:
              sending ||
              text.trim().length < REPLY_MIN_LENGTH ||
              text.trim().length > REPLY_MAX_LENGTH
                ? "#ccc"
                : "#b51b17",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor:
              sending ||
              text.trim().length < REPLY_MIN_LENGTH ||
              text.trim().length > REPLY_MAX_LENGTH
                ? "not-allowed"
                : "pointer",
            ...VN,
          }}>
          {sending ? "Đang gửi..." : "Gửi phản hồi"}
        </button>
      </div>
    </div>
  );
}

// ── Contact Card ───────────────────────────────────────────
function ContactCard({ contact, onReplied, onLeadUpdated, showToast }) {
  const [open, setOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState(contact.lead_status || "new");
  const [ownerNote, setOwnerNote] = useState(
    stripAppointmentFromNote(contact.owner_note),
  );
  const [appointmentAt, setAppointmentAt] = useState(
    contact.appointment_at
      ? formatAppointmentValue(contact.appointment_at)
      : parseAppointmentFromNote(contact.owner_note),
  );
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadError, setLeadError] = useState("");
  const isPending = contact.status === "pending";
  const priority = contactPriority(contact);
  const leadHint = LEAD_HINTS[leadStatus] || LEAD_HINTS.new;
  const currentLeadStatus = contact.lead_status || "new";
  const availableLeadStatuses = LEAD_STATUS.filter(
    (item) =>
      item.value === currentLeadStatus ||
      (LEAD_TRANSITIONS[currentLeadStatus] || []).includes(item.value),
  );

  const saveLead = async () => {
    const trimmedNote = ownerNote.trim().replace(/\s+/g, " ");
    if (trimmedNote.length > OWNER_NOTE_MAX_LENGTH) {
      const message = "Ghi chú chăm sóc khách không được vượt quá 500 ký tự";
      setLeadError(message);
      showToast(message, "error");
      return;
    }
    if (leadStatus === "scheduled" && !appointmentAt) {
      const message = "Vui lòng chọn ngày giờ hẹn xem";
      setLeadError(message);
      showToast(message, "error");
      return;
    }
    if (leadStatus === "scheduled" && new Date(appointmentAt) <= new Date()) {
      const message = "Lịch hẹn xem phải lớn hơn thời gian hiện tại";
      setLeadError(message);
      showToast(message, "error");
      return;
    }
    if (
      ["contacted", "closed", "cancelled"].includes(leadStatus) &&
      trimmedNote.length < 10
    ) {
      const message = "Vui lòng nhập ghi chú kết quả tối thiểu 10 ký tự";
      setLeadError(message);
      showToast(message, "error");
      return;
    }

    const noteToSave =
      leadStatus === "scheduled"
        ? [
            `Lịch hẹn xem: ${formatDateTime(appointmentAt)}`,
            trimmedNote,
          ]
            .filter(Boolean)
            .join(". ")
        : trimmedNote;

    setLeadSaving(true);
    setLeadError("");
    try {
      await api.patch(`/api/contact/${contact.id}/lead`, {
        lead_status: leadStatus,
        owner_note: noteToSave,
      });
      onLeadUpdated(contact.id, leadStatus, noteToSave, appointmentAt);
      setOwnerNote(stripAppointmentFromNote(noteToSave));
      showToast("Đã lưu trạng thái chăm sóc khách hàng");
    } catch (err) {
      const message =
        err.response?.data?.message || "Không thể cập nhật lead.";
      setLeadError(message);
      showToast(message, "error");
    } finally {
      setLeadSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #E8E8E8",
        borderRadius: 12,
        padding: "20px 24px 20px 28px",
        display: "flex",
        gap: 18,
        position: "relative",
        transition: "box-shadow .15s",
        boxShadow: isPending ? "0 1px 6px rgba(181,27,23,.07)" : "none",
      }}
      onMouseEnter={(e) => {
        if (isPending)
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)";
      }}
      onMouseLeave={(e) =>
        (e.currentTarget.style.boxShadow = isPending
          ? "0 1px 6px rgba(181,27,23,.07)"
          : "none")
      }>
      {/* left accent */}
      {isPending && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 4,
            height: "100%",
            background: "#b51b17",
            borderRadius: "12px 0 0 12px",
          }}
        />
      )}

      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          flexShrink: 0,
          background: isPending ? "#ffdad5" : "#e4e2e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 15,
          color: isPending ? "#410001" : "#5f5e5e",
        }}>
        {initials(contact.buyer_name)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 6,
          }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1a1c1c",
              margin: 0,
              ...VN,
            }}>
            {contact.buyer_name}
          </h3>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              background: priority.bg,
              color: priority.color,
              whiteSpace: "nowrap",
            }}>
            {priority.label}
          </span>
        </div>

        {/* Property link */}
        <p
          style={{
            fontSize: 14,
            color: "#5b403c",
            margin: "0 0 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}>
          Quan tâm:&nbsp;
          <Link
            to={`/property/${contact.property_id}`}
            style={{
              color: "#b51b17",
              textDecoration: "none",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.target.style.textDecoration = "none")}>
            {contact.property_title || `Tin #${contact.property_id}`}
          </Link>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
            marginBottom: 12,
          }}>
          {[
            ["Email", contact.buyer_email || "Chưa có"],
            ["Số điện thoại", contact.buyer_phone || "Chưa cập nhật"],
            ["Thời gian gửi", formatDateTime(contact.created_at)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "#f9f9f9",
                border: "0.5px solid #E8E8E8",
                borderRadius: 8,
                padding: "8px 10px",
                minWidth: 0,
              }}>
              <div style={{ fontSize: 10, color: "#757575", marginBottom: 3 }}>
                {label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#1a1c1c",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Message bubble */}
        <div
          style={{
            background: "#f9f9f9",
            borderLeft: "4px solid #E8E8E8",
            borderRadius: "0 8px 8px 0",
            padding: "12px 16px",
            fontSize: 14,
            color: "#5f5e5e",
            fontStyle: "italic",
            marginBottom: 12,
          }}>
          "{contact.message}"
        </div>

        {/* Owner reply (if replied) */}
        {!isPending && contact.owner_reply && (
          <div
            style={{
              background: "#fff0ef",
              border: "0.5px solid #ffb4aa",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 12,
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#b51b17",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}></span>
            </div>
            <p style={{ fontSize: 14, color: "#1a1c1c", margin: 0, ...VN }}>
              {contact.owner_reply}
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              leadStatus === "scheduled" ? "170px 210px 1fr auto" : "180px 1fr auto",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
          }}>
          <select
            value={leadStatus}
            onChange={(e) => setLeadStatus(e.target.value)}
            style={{
              height: 36,
              border: "0.5px solid #E8E8E8",
              borderRadius: 8,
              padding: "0 10px",
              fontSize: 13,
              background: "#fff",
              color: "#1a1c1c",
              ...VN,
            }}>
            {availableLeadStatuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {leadStatus === "scheduled" && (
            <input
              type="datetime-local"
              value={appointmentAt}
              min={getMinAppointmentValue()}
              onChange={(e) => setAppointmentAt(e.target.value)}
              style={{
                height: 36,
                border: "0.5px solid #E8E8E8",
                borderRadius: 8,
                padding: "0 10px",
                fontSize: 13,
                color: "#1a1c1c",
                ...VN,
              }}
            />
          )}
          <input
            value={ownerNote}
            onChange={(e) => setOwnerNote(e.target.value)}
            placeholder={leadHint.placeholder}
            maxLength={OWNER_NOTE_MAX_LENGTH}
            style={{
              height: 36,
              border: "0.5px solid #E8E8E8",
              borderRadius: 8,
              padding: "0 12px",
              fontSize: 13,
              color: "#1a1c1c",
              ...VN,
            }}
          />
          <button
            onClick={saveLead}
            disabled={leadSaving}
            style={{
              height: 36,
              border: "none",
              borderRadius: 8,
              padding: "0 14px",
              background: leadSaving ? "#ccc" : "#1a1c1c",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: leadSaving ? "not-allowed" : "pointer",
              ...VN,
            }}>
            {leadSaving ? "Đang lưu" : "Lưu lead"}
          </button>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#757575",
            margin: "-4px 0 10px",
            lineHeight: 1.5,
          }}>
          {leadHint.note}
        </div>
        {leadError && (
          <div style={{ fontSize: 12, color: "#a32d2d", marginBottom: 10 }}>
            {leadError}
          </div>
        )}

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}>
          <span
            style={{
              fontSize: 12,
              color: "#757575",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}></span>

          {isPending ? (
            <button
              onClick={() => setOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 20px",
                background: "#b51b17",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                ...VN,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = ".88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
              <UiIcon name="reply" size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />
              Phản hồi ngay
            </button>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setOpen((o) => !o)}
                style={{
                  fontSize: 13,
                  color: "#b51b17",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  ...VN,
                }}>
                Chỉnh sửa câu trả lời
              </button>
              <button
                style={{
                  fontSize: 13,
                  color: "#757575",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  ...VN,
                }}></button>
            </div>
          )}
        </div>

        {/* Reply box */}
        {open && (
          <ReplyBox
            contactId={contact.id}
            onSent={(id, text, leadStatusAfterReply) => {
              setOpen(false);
              if (leadStatusAfterReply) setLeadStatus(leadStatusAfterReply);
              onReplied(id, text, leadStatusAfterReply);
            }}
            onCancel={() => setOpen(false)}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function OwnerContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/contact/owner", {
          params: { limit: 100 },
        });
        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        setContacts(data);
      } catch (err) {
        if (err.response?.status === 401) navigate("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleReplied = (id, text, lead_status) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "replied",
              owner_reply: text,
              lead_status: lead_status || c.lead_status,
              updated_at: new Date().toISOString(),
            }
          : c,
      ),
    );
  };

  const handleLeadUpdated = (id, lead_status, owner_note, appointment_at) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, lead_status, owner_note, appointment_at } : c,
      ),
    );
  };

  const total = contacts.length;
  const pending = contacts.filter((c) => c.status === "pending").length;
  const replied = contacts.filter((c) => c.status === "replied").length;
  const scheduled = contacts.filter((c) => c.lead_status === "scheduled").length;
  const closed = contacts.filter((c) => c.lead_status === "closed").length;
  const cancelled = contacts.filter((c) => c.lead_status === "cancelled").length;
  const urgent = contacts.filter(
    (c) => c.status === "pending" && hoursSince(c.created_at) >= 24,
  ).length;
  const responseRate = total > 0 ? Math.round((replied / total) * 100) : 0;

  const filtered = contacts
    .filter((c) => {
      if (activeTab === "pending") return c.status === "pending";
      if (activeTab === "replied") return c.status === "replied";
      if (activeTab === "scheduled") return c.lead_status === "scheduled";
      if (activeTab === "closed") return c.lead_status === "closed";
      if (activeTab === "cancelled") return c.lead_status === "cancelled";
      return true;
    })
    .filter(
      (c) =>
        fuzzyMatches(
          [
            c.buyer_name,
            c.property_title,
            c.message,
            c.owner_reply,
            c.owner_note,
            c.lead_status,
            c.status,
          ],
          search,
        ),
    )
    .sort((a, b) =>
      sort === "newest"
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at),
    );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const TABS = [
    { key: "pending", label: `Chưa phản hồi (${pending})` },
    { key: "replied", label: `Đã phản hồi (${replied})` },
    { key: "scheduled", label: `Đã hẹn (${scheduled})` },
    { key: "closed", label: `Đã chốt (${closed})` },
    { key: "cancelled", label: `Đã hủy (${cancelled})` },
  ];

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh", ...VN }}>
      <Navbar />

      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 56px)",
          maxWidth: 1280,
          margin: "0 auto",
        }}>
        {/* ── Main ── */}
        <main style={{ flex: 1, padding: "24px 28px", minWidth: 0 }}>
          {/* Page header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1a1c1c",
                  margin: 0,
                }}>
                Quản lý liên hệ
              </h1>
              <p style={{ fontSize: 13, color: "#757575", margin: "4px 0 0" }}>
                Phản hồi nhanh để tăng cơ hội giao dịch thành công.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    color: "#aaa",
                  }}>
                  <UiIcon name="search" size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    paddingLeft: 32,
                    paddingRight: 12,
                    height: 36,
                    border: "0.5px solid #E8E8E8",
                    borderRadius: 8,
                    fontSize: 13,
                    width: 180,
                    outline: "none",
                    background: "#fff",
                    color: "#1a1c1c",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 20,
            }}>
            <ContactSummaryCard
              label="Tổng liên hệ"
              value={total}
              sub={`${scheduled} đã hẹn xem, ${closed} đã chốt`}
            />
            <ContactSummaryCard
              label="Chưa phản hồi"
              value={pending}
              sub={urgent > 0 ? `${urgent} liên hệ quá 24 giờ` : "Không có liên hệ quá hạn"}
              tone={pending > 0 ? "#b51b17" : "#0f6e56"}
            />
            <ContactSummaryCard
              label="Tỷ lệ phản hồi"
              value={`${responseRate}%`}
              sub="Phản hồi càng sớm càng tăng cơ hội giao dịch"
              tone="#0f6e56"
            />
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "0.5px solid #E8E8E8",
              marginBottom: 20,
              gap: 0,
            }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setPage(1);
                  }}
                  style={{
                    padding: "10px 18px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#b51b17" : "#5f5e5e",
                    borderBottom: isActive
                      ? "2px solid #b51b17"
                      : "2px solid transparent",
                    whiteSpace: "nowrap",
                  }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div className="spinner-border text-danger" />
            </div>
          ) : paginated.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "#757575",
              }}>
              <div style={{ marginBottom: 16 }}><UiIcon name="message" size={56} /></div>
              <h5 style={{ fontWeight: 600, color: "#1a1c1c" }}>
                {search ? "Không tìm thấy kết quả" : "Chưa có liên hệ nào"}
              </h5>
              <p style={{ fontSize: 13 }}>
                {search
                  ? "Thử từ khoá khác."
                  : "Khi có khách hàng liên hệ, bạn sẽ thấy ở đây."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {paginated.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  onReplied={handleReplied}
                  onLeadUpdated={handleLeadUpdated}
                  showToast={showToast}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 28,
                paddingTop: 20,
                borderTop: "0.5px solid #E8E8E8",
              }}>
              <span style={{ fontSize: 13, color: "#757575" }}>
                Hiển thị {(page - 1) * PER_PAGE + 1}–
                {Math.min(page * PER_PAGE, filtered.length)} trong{" "}
                {filtered.length} liên hệ
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{
                    width: 36,
                    height: 36,
                    border: "0.5px solid #E8E8E8",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.4 : 1,
                    fontSize: 16,
                  }}>
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border:
                          "0.5px solid " + (page === n ? "#b51b17" : "#E8E8E8"),
                        background: page === n ? "#b51b17" : "#fff",
                        color: page === n ? "#fff" : "#1a1c1c",
                        fontWeight: page === n ? 600 : 400,
                        fontSize: 13,
                        cursor: "pointer",
                      }}>
                      {n}
                    </button>
                  ),
                )}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{
                    width: 36,
                    height: 36,
                    border: "0.5px solid #E8E8E8",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    opacity: page === totalPages ? 0.4 : 1,
                    fontSize: 16,
                  }}>
                  ›
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

