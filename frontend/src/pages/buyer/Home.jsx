import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";

const TYPE_OPTIONS = [
  { value: "", label: "Tất cả loại hình" },
  { value: "apartment", label: "Căn hộ" },
  { value: "house", label: "Nhà phố" },
  { value: "land", label: "Đất nền" },
  { value: "office", label: "Văn phòng" },
];

const TRANSACTION_OPTIONS = [
  { value: "", label: "Mua & Thuê" },
  { value: "sale", label: "Mua bán" },
  { value: "rent", label: "Cho thuê" },
];

const PRICE_OPTIONS = [
  { value: "", label: "Tất cả mức giá" },
  { value: "0-1000000000", label: "Dưới 1 tỷ" },
  { value: "1000000000-3000000000", label: "1 - 3 tỷ" },
  { value: "3000000000-5000000000", label: "3 - 5 tỷ" },
  { value: "5000000000-10000000000", label: "5 - 10 tỷ" },
  { value: "10000000000-", label: "Trên 10 tỷ" },
];

function formatPrice(price) {
  if (price >= 1000000000) return (price / 1000000000).toFixed(1) + " tỷ";
  if (price >= 1000000) return (price / 1000000).toFixed(0) + " triệu";
  return price.toLocaleString() + " đ";
}

function PropertyCard({ property }) {
  return (
    <Link
      to={`/property/${property.id}`}
      className="text-decoration-none text-dark">
      <div
        className="card h-100 border-0 shadow-sm"
        style={{
          borderRadius: 12,
          overflow: "hidden",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.transform = "translateY(-4px)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.transform = "translateY(0)")
        }>
        {/* Ảnh */}
        <div
          style={{
            height: 200,
            overflow: "hidden",
            background: "#f0f0f0",
            position: "relative",
          }}>
          {property.thumbnail ? (
            <img
              src={property.thumbnail}
              alt={property.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100">
              <span style={{ fontSize: 48 }}>🏠</span>
            </div>
          )}
          <span
            className="badge position-absolute top-0 start-0 m-2"
            style={{
              background:
                property.transaction_type === "sale" ? "#e74c3c" : "#2980b9",
              borderRadius: 6,
            }}>
            {property.transaction_type === "sale" ? "Bán" : "Cho thuê"}
          </span>
        </div>

        {/* Nội dung */}
        <div className="card-body p-3">
          <h6
            className="fw-bold mb-1"
            style={{
              fontSize: 14,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
            {property.title}
          </h6>
          <p className="text-danger fw-bold mb-1" style={{ fontSize: 15 }}>
            {formatPrice(property.price)}
            {property.transaction_type === "rent" && (
              <span className="text-muted fw-normal" style={{ fontSize: 12 }}>
                /tháng
              </span>
            )}
          </p>
          <p className="text-muted mb-2" style={{ fontSize: 12 }}>
            📐 {property.area} m² &nbsp;·&nbsp; 📍 {property.city}
          </p>
          <p className="text-muted mb-0" style={{ fontSize: 12 }}>
            👤 {property.owner_name}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    type: "",
    transaction_type: "",
    city: "",
    keyword: "",
    min_price: "",
    max_price: "",
    page: 1,
    limit: 12,
  });
  const [search, setSearch] = useState({
    keyword: "",
    type: "",
    transaction_type: "",
    price: "",
  });

  const fetchProperties = async (params) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
      const res = await api.get(`/api/listing?${query}`);
      setProperties(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(filter);
  }, [filter]);

  const handleSearch = () => {
    let min_price = "",
      max_price = "";
    if (search.price) {
      const [min, max] = search.price.split("-");
      min_price = min || "";
      max_price = max || "";
    }
    setFilter({ ...filter, ...search, min_price, max_price, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilter({ ...filter, page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero + Search */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
          padding: "50px 0 70px",
        }}>
        <div className="container">
          <h1
            className="text-white fw-bold text-center mb-2"
            style={{ fontSize: 32 }}>
            Tìm kiếm Bất động sản
          </h1>
          <p className="text-white-50 text-center mb-4">
            Hàng nghìn tin đăng uy tín, cập nhật mỗi ngày
          </p>

          {/* Search box */}
          <div
            className="card border-0 shadow-lg p-3"
            style={{ borderRadius: 16 }}>
            <div className="row g-2">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Từ khóa, địa chỉ..."
                  value={search.keyword}
                  onChange={(e) =>
                    setSearch({ ...search, keyword: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{ borderRadius: 8 }}
                />
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  style={{ borderRadius: 8 }}
                  value={search.transaction_type}
                  onChange={(e) =>
                    setSearch({ ...search, transaction_type: e.target.value })
                  }>
                  {TRANSACTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  style={{ borderRadius: 8 }}
                  value={search.type}
                  onChange={(e) =>
                    setSearch({ ...search, type: e.target.value })
                  }>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  style={{ borderRadius: 8 }}
                  value={search.price}
                  onChange={(e) =>
                    setSearch({ ...search, price: e.target.value })
                  }>
                  {PRICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <button
                  className="btn w-100 text-white fw-semibold"
                  onClick={handleSearch}
                  style={{
                    background: "#e74c3c",
                    borderRadius: 8,
                    border: "none",
                  }}>
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách */}
      <div className="container py-4">
        {/* Kết quả */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 fw-semibold">
            {loading ? "Đang tải..." : `${pagination.total || 0} bất động sản`}
          </h6>
          <div className="d-flex gap-2">
            {filter.type && (
              <span className="badge bg-secondary">
                {TYPE_OPTIONS.find((o) => o.value === filter.type)?.label} ✕
              </span>
            )}
            {filter.transaction_type && (
              <span className="badge bg-secondary">
                {
                  TRANSACTION_OPTIONS.find(
                    (o) => o.value === filter.transaction_type,
                  )?.label
                }{" "}
                ✕
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-secondary" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: 64 }}>🏚️</div>
            <h5 className="text-muted mt-2">Không tìm thấy bất động sản nào</h5>
            <p className="text-muted small">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
          </div>
        ) : (
          <>
            <div className="row g-3">
              {properties.map((p) => (
                <div key={p.id} className="col-sm-6 col-md-4 col-lg-3">
                  <PropertyCard property={p} />
                </div>
              ))}
            </div>

            {/* Phân trang */}
            {pagination.total_pages > 1 && (
              <nav className="mt-4 d-flex justify-content-center">
                <ul className="pagination">
                  <li
                    className={`page-item ${pagination.page === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.page - 1)}>
                      ‹
                    </button>
                  </li>
                  {Array.from(
                    { length: pagination.total_pages },
                    (_, i) => i + 1,
                  )
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === pagination.total_pages ||
                        Math.abs(p - pagination.page) <= 2,
                    )
                    .map((p, i, arr) => (
                      <>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <li
                            key={`ellipsis-${p}`}
                            className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li
                          key={p}
                          className={`page-item ${p === pagination.page ? "active" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(p)}>
                            {p}
                          </button>
                        </li>
                      </>
                    ))}
                  <li
                    className={`page-item ${pagination.page === pagination.total_pages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(pagination.page + 1)}>
                      ›
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-4 mt-4 border-top bg-white">
        <p className="text-muted small mb-0">
          © 2026 BDS Platform — Nền tảng bất động sản trực tuyến
        </p>
      </footer>
    </div>
  );
}
