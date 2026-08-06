const GENERIC_SERVER_MESSAGES = new Set(["Lỗi server", "Lỗi upload"]);

function normalizePath(url = "") {
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return url.split("?")[0] || "";
  }
}

function getRequestFallback(error) {
  const method = (error?.config?.method || "").toUpperCase();
  const path = normalizePath(error?.config?.url || "");

  if (/\/api\/auth\/login$/.test(path)) return "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.";
  if (/\/api\/auth\/register$/.test(path)) return "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.";
  if (/\/api\/auth\/send-otp$/.test(path)) return "Không thể gửi mã OTP. Vui lòng thử lại.";
  if (/\/api\/auth\/verify-email$/.test(path)) return "Xác minh email thất bại. Vui lòng kiểm tra lại mã OTP.";
  if (/\/api\/auth\/forgot-password$/.test(path)) return "Không thể gửi mã đặt lại mật khẩu.";
  if (/\/api\/auth\/reset-password$/.test(path)) return "Không thể đặt lại mật khẩu.";
  if (/\/api\/auth\/me$/.test(path) && method === "PUT") return "Không thể cập nhật hồ sơ.";
  if (/\/api\/auth\/change-password$/.test(path)) return "Không thể đổi mật khẩu.";

  if (/\/api\/admin\/stats$/.test(path)) return "Không thể tải thống kê dashboard.";
  if (/\/api\/admin\/users/.test(path) && method === "GET") return "Không thể tải danh sách tài khoản.";
  if (/\/api\/admin\/users\/[^/]+\/status$/.test(path)) return "Không thể cập nhật trạng thái tài khoản.";
  if (/\/api\/admin\/properties/.test(path)) return "Không thể tải danh sách tin đăng.";

  if (/\/api\/property\/owner\/stats$/.test(path)) return "Không thể tải thống kê tin đăng.";
  if (/\/api\/property\/owner\/list$/.test(path)) return "Không thể tải danh sách tin của bạn.";
  if (/\/api\/property\/owner\/featured-orders$/.test(path)) return "Không thể tải lịch sử thanh toán gói nổi bật.";
  if (/\/api\/property\/admin\/reports$/.test(path)) return "Không thể tải danh sách báo cáo tin đăng.";
  if (/\/api\/property\/featured-packages$/.test(path)) return "Không thể tải danh sách gói nổi bật.";
  if (/\/api\/property\/featured-orders$/.test(path) && method === "POST") return "Không thể tạo đơn thanh toán gói nổi bật.";
  if (/\/api\/property\/vnpay-return$/.test(path)) return "Không thể xác nhận kết quả thanh toán VNPay.";
  if (/\/api\/property\/[^/]+\/images$/.test(path)) return "Không thể tải ảnh lên. Vui lòng kiểm tra lại ảnh đã chọn.";
  if (/\/api\/property\/[^/]+\/status$/.test(path)) return "Không thể cập nhật trạng thái tin đăng.";
  if (/\/api\/property\/[^/]+\/hide$/.test(path)) return "Không thể ẩn tin đăng.";
  if (/\/api\/property\/[^/]+\/unhide$/.test(path)) return "Không thể gửi lại tin đăng.";
  if (/\/api\/property\/[^/]+\/report$/.test(path)) return "Không thể gửi báo cáo tin đăng.";
  if (/\/api\/property\/[^/]+\/sold$/.test(path)) return "Không thể đánh dấu tin đã giao dịch.";
  if (/\/api\/property\/[^/]+\/history$/.test(path)) return "Không thể tải lịch sử trạng thái tin.";
  if (/\/api\/property\/[^/]+$/.test(path) && method === "GET") return "Không thể tải thông tin tin đăng.";
  if (/\/api\/property\/[^/]+$/.test(path) && method === "PUT") return "Không thể cập nhật tin đăng.";
  if (/\/api\/property\/[^/]+$/.test(path) && method === "DELETE") return "Không thể xóa tin đăng.";
  if (/\/api\/property$/.test(path) && method === "POST") return "Không thể đăng tin. Vui lòng kiểm tra lại thông tin bất động sản.";

  if (/\/api\/listing\/category-counts$/.test(path)) return "Không thể tải số lượng tin theo danh mục.";
  if (/\/api\/listing\/owners\/[^/]+$/.test(path)) return "Không thể tải hồ sơ người bán.";
  if (/\/api\/listing\/[^/]+\/similar$/.test(path)) return "Không thể tải tin tương tự.";
  if (/\/api\/listing\/[^/]+\/price-estimate$/.test(path)) return "Không thể tải định giá tham khảo.";
  if (/\/api\/listing\/[^/]+$/.test(path)) return "Không thể tải chi tiết bất động sản.";
  if (/\/api\/listing$/.test(path)) return "Không thể tải danh sách bất động sản.";

  if (/\/api\/contact\/saved\/[^/]+$/.test(path) && method === "DELETE") return "Không thể bỏ lưu tin.";
  if (/\/api\/contact\/saved$/.test(path) && method === "POST") return "Không thể lưu tin.";
  if (/\/api\/contact\/saved$/.test(path)) return "Không thể tải danh sách tin đã lưu.";
  if (/\/api\/contact\/owner$/.test(path)) return "Không thể tải danh sách liên hệ.";
  if (/\/api\/contact\/buyer$/.test(path)) return "Không thể tải lịch sử liên hệ.";
  if (/\/api\/contact\/[^/]+\/reply$/.test(path)) return "Không thể gửi phản hồi liên hệ.";
  if (/\/api\/contact\/[^/]+\/lead$/.test(path)) return "Không thể cập nhật trạng thái lead.";
  if (/\/api\/contact$/.test(path) && method === "POST") return "Không thể gửi yêu cầu liên hệ.";

  return "";
}

function mapTechnicalError(errorText) {
  if (!errorText) return "";

  const text = String(errorText);

  if (/network error|failed to fetch|econnrefused|econnreset|timeout/i.test(text)) {
    return "Không kết nối được máy chủ. Vui lòng kiểm tra backend đang chạy chưa.";
  }

  if (/jwt|token|unauthorized/i.test(text)) {
    return "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.";
  }

  if (/duplicate entry|er_dup_entry/i.test(text)) {
    return "Dữ liệu đã tồn tại trong hệ thống.";
  }

  if (/foreign key|cannot add or update a child row|er_no_referenced_row/i.test(text)) {
    return "Dữ liệu liên kết không tồn tại hoặc không còn hợp lệ.";
  }

  if (/data truncated|incorrect .* value|out of range|er_bad_null_error|cannot be null/i.test(text)) {
    return "Dữ liệu gửi lên không đúng định dạng. Vui lòng kiểm tra lại thông tin đã nhập.";
  }

  if (/column count doesn't match|unknown column|no database selected|table .* doesn't exist|parse error|er_parse_error/i.test(text)) {
    return "Cấu trúc dữ liệu hiện tại chưa khớp với database. Vui lòng kiểm tra lại migration/schema.";
  }

  if (/cloudinary|file size|invalid image|unsupported file/i.test(text)) {
    return "Không thể tải ảnh lên. Vui lòng kiểm tra định dạng hoặc dung lượng ảnh.";
  }

  return "";
}

export function getApiErrorMessage(error, fallback = "") {
  const data = error?.response?.data || error?.data || {};
  const message = data.message || "";
  const detail = data.error || data.detail || "";
  const requestFallback =
    fallback || getRequestFallback(error) || "Thao tác thất bại. Vui lòng thử lại.";

  if (message && !GENERIC_SERVER_MESSAGES.has(message)) {
    return message;
  }

  const mappedDetail = mapTechnicalError(detail);
  if (mappedDetail) return mappedDetail;

  const mappedMessage = mapTechnicalError(message);
  if (mappedMessage && !GENERIC_SERVER_MESSAGES.has(mappedMessage)) {
    return mappedMessage;
  }

  const mappedTransportError = mapTechnicalError(error?.message);
  if (mappedTransportError) return mappedTransportError;

  const status = error?.response?.status;
  if (status === 401) {
    return "Bạn cần đăng nhập lại để tiếp tục.";
  }
  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (status === 404) {
    return "Không tìm thấy dữ liệu cần xử lý.";
  }
  if (status === 413) {
    return "Dữ liệu gửi lên quá lớn. Vui lòng giảm dung lượng ảnh hoặc tệp.";
  }

  return requestFallback;
}
