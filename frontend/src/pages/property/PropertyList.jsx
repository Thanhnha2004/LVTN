import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import { locationData } from "../../data/locationData";
import UiIcon from "../../components/UiIcon";
import SiteFooter from "../../components/SiteFooter";

const EMPTY_FILTERS = {
  type: "",
  transaction_type: "",
  keyword: "",
  city: "",
  district: "",
  ward: "",
  min_price: "",
  max_price: "",
  min_area: "",
  max_area: "",
  bedrooms: "",
  direction: "",
  legal_status: "",
  featured_only: "",
};

const PRICE_MIN = 0;
const PRICE_MAX = 20000000000;
const PRICE_STEP = 100000000;
const AREA_MIN = 0;
const AREA_MAX = 500;
const AREA_STEP = 5;

const formatSliderPrice = (value) => {
  const number = Number(value || 0);
  if (number >= 1000000000) {
    return `${Number((number / 1000000000).toFixed(1))} tỷ`;
  }
  if (number >= 1000000) {
    return `${Number((number / 1000000).toFixed(0))} triệu`;
  }
  return "0";
};

const getSliderValue = (value, fallback) =>
  value === "" || value === undefined || value === null
    ? fallback
    : Number(value);

const normalizeRangeFilterValue = (field, value) => {
  if ((field === "min_price" || field === "min_area") && value === 0) {
    return "";
  }
  if (field === "max_price" && value === PRICE_MAX) {
    return "";
  }
  if (field === "max_area" && value === AREA_MAX) {
    return "";
  }
  return value;
};

export default function PropertyList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const filterDebounceRef = useRef(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    total_pages: 1,
  });
  const [sort, setSort] = useState("newest");
  const cities = Object.keys(locationData);

  const districts = filters.city
    ? Object.keys(locationData[filters.city] || {})
    : [];

  const wards =
    filters.city && filters.district
      ? locationData[filters.city]?.[filters.district] || []
      : [];

  useEffect(() => {
    const filter = {
      transaction_type: searchParams.get("transaction_type") || "",
      type: searchParams.get("type") || "",
      keyword: searchParams.get("keyword") || "",
      city: searchParams.get("city") || "",
      district: searchParams.get("district") || "",
      ward: searchParams.get("ward") || "",
      min_price: searchParams.get("min_price") || "",
      max_price: searchParams.get("max_price") || "",
      min_area: searchParams.get("min_area") || "",
      max_area: searchParams.get("max_area") || "",
      bedrooms: searchParams.get("bedrooms") || "",
      direction: searchParams.get("direction") || "",
      legal_status: searchParams.get("legal_status") || "",
      featured_only: searchParams.get("featured_only") || "",
      sort: searchParams.get("sort") || "newest",
      page: searchParams.get("page") || 1,
      limit: 12,
    };

    setSort(filter.sort);
    setFilters((prev) => ({
      ...prev,
      transaction_type: filter.transaction_type,
      type: filter.type,
      keyword: filter.keyword,
      city: filter.city,
      district: filter.district,
      ward: filter.ward,
      min_price: filter.min_price,
      max_price: filter.max_price,
      min_area: filter.min_area,
      max_area: filter.max_area,
      bedrooms: filter.bedrooms,
      direction: filter.direction,
      legal_status: filter.legal_status,
      featured_only: filter.featured_only,
    }));
    fetchProperties(filter);
  }, [searchParams]);

  const fetchProperties = async (filter) => {
    try {
      setLoading(true);

      const res = await api.get("/api/listing", {
        params: filter,
      });

      setProperties(res.data.data || []);
      setPagination(
        res.data.pagination || {
          total: 0,
          page: 1,
          limit: 12,
          total_pages: 1,
        },
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }
    setFilters(EMPTY_FILTERS);
    setSort("newest");
    updateQuery({ ...EMPTY_FILTERS, sort: "newest", page: 1 });
  };

  const updateQuery = (nextParams) => {
    const params = new URLSearchParams();
    Object.entries(nextParams).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  };

  const handleFilterChange = (nextFilters, { debounce = false } = {}) => {
    setFilters(nextFilters);
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }

    const apply = () => updateQuery({ ...nextFilters, sort, page: 1 });
    if (debounce) {
      filterDebounceRef.current = setTimeout(apply, 450);
      return;
    }
    apply();
  };

  const handleSortChange = (value) => {
    setSort(value);
    updateQuery({ ...filters, sort: value, page: 1 });
  };

  const handleRangeFilterChange = (field, rawValue) => {
    const value = Number(rawValue);
    const nextFilters = {
      ...filters,
      [field]: normalizeRangeFilterValue(field, value),
    };

    if (
      field === "min_price" &&
      filters.max_price &&
      value > Number(filters.max_price)
    ) {
      nextFilters.max_price = normalizeRangeFilterValue("max_price", value);
    }
    if (
      field === "max_price" &&
      filters.min_price &&
      value < Number(filters.min_price)
    ) {
      nextFilters.min_price = normalizeRangeFilterValue("min_price", value);
    }
    if (
      field === "min_area" &&
      filters.max_area &&
      value > Number(filters.max_area)
    ) {
      nextFilters.max_area = normalizeRangeFilterValue("max_area", value);
    }
    if (
      field === "max_area" &&
      filters.min_area &&
      value < Number(filters.min_area)
    ) {
      nextFilters.min_area = normalizeRangeFilterValue("min_area", value);
    }

    handleFilterChange(nextFilters, { debounce: true });
  };

  const handlePageChange = (page) => {
    const nextPage = Math.min(Math.max(1, page), pagination.total_pages || 1);
    updateQuery({ ...filters, sort, page: nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ background: "#f8f9fa", minHeight: "100vh" }}>
      <Navbar />

      <div className="container py-4">
        <div className="row">
          {/* FILTER */}
          <div className="col-lg-3">
            <div
              className="card border-0 shadow-sm p-4"
              style={{
                borderRadius: 20,
                position: "sticky",
                top: 90,
              }}>
              <div className="d-flex justify-content-between mb-4">
                <h5 className="fw-bold">Bộ lọc chi tiết</h5>

                <button
                  type="button"
                  className="btn btn-link text-danger p-0"
                  onClick={handleClearFilter}>
                  Xóa lọc
                </button>
              </div>

              <div className="mb-3">
                <label>Giao dịch</label>

                <select
                  className="form-select"
                  value={filters.transaction_type}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      transaction_type: e.target.value,
                    })
                  }>
                  <option value="">Tất cả</option>
                  <option value="sale">Cần bán</option>
                  <option value="rent">Cho thuê</option>
                </select>
              </div>

              <div className="mb-3">
                <label>Loại hình</label>

                <select
                  className="form-select"
                  value={filters.type}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      type: e.target.value,
                    })
                  }>
                  <option value="">Tất cả</option>
                  <option value="apartment">Căn hộ</option>
                  <option value="house">Nhà phố</option>
                  <option value="land">Đất nền</option>
                  <option value="office">Văn phòng</option>
                </select>
              </div>

              <div className="mb-3">
                <label>Tỉnh / Thành phố</label>

                <select
                  className="form-select"
                  value={filters.city}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      city: e.target.value,
                      district: "",
                      ward: "",
                    })
                  }>
                  <option value="">Tất cả</option>

                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label>Quận / Huyện</label>

                <select
                  className="form-select"
                  value={filters.district}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      district: e.target.value,
                      ward: "",
                    })
                  }>
                  <option value="">Tất cả</option>

                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label>Phường / Xã</label>

                <select
                  className="form-select"
                  value={filters.ward}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      ward: e.target.value,
                    })
                  }>
                  <option value="">Tất cả</option>

                  {wards.map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="mb-0">Khoảng giá</label>
                  <span className="text-muted small">
                    {filters.min_price || filters.max_price
                      ? `${formatSliderPrice(getSliderValue(filters.min_price, PRICE_MIN))} - ${formatSliderPrice(getSliderValue(filters.max_price, PRICE_MAX))}`
                      : "Tất cả"}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Từ</span>
                    <span>{formatSliderPrice(getSliderValue(filters.min_price, PRICE_MIN))}</span>
                  </div>
                  <input
                    type="range"
                    className="form-range"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    value={getSliderValue(filters.min_price, PRICE_MIN)}
                    onChange={(e) => handleRangeFilterChange("min_price", e.target.value)}
                  />
                </div>
                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Đến</span>
                    <span>{formatSliderPrice(getSliderValue(filters.max_price, PRICE_MAX))}</span>
                  </div>
                  <input
                    type="range"
                    className="form-range"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    value={getSliderValue(filters.max_price, PRICE_MAX)}
                    onChange={(e) => handleRangeFilterChange("max_price", e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="mb-0">Diện tích</label>
                  <span className="text-muted small">
                    {filters.min_area || filters.max_area
                      ? `${getSliderValue(filters.min_area, AREA_MIN)} - ${getSliderValue(filters.max_area, AREA_MAX)} m²`
                      : "Tất cả"}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Từ</span>
                    <span>{getSliderValue(filters.min_area, AREA_MIN)} m²</span>
                  </div>
                  <input
                    type="range"
                    className="form-range"
                    min={AREA_MIN}
                    max={AREA_MAX}
                    step={AREA_STEP}
                    value={getSliderValue(filters.min_area, AREA_MIN)}
                    onChange={(e) => handleRangeFilterChange("min_area", e.target.value)}
                  />
                </div>
                <div>
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Đến</span>
                    <span>{getSliderValue(filters.max_area, AREA_MAX)} m²</span>
                  </div>
                  <input
                    type="range"
                    className="form-range"
                    min={AREA_MIN}
                    max={AREA_MAX}
                    step={AREA_STEP}
                    value={getSliderValue(filters.max_area, AREA_MAX)}
                    onChange={(e) => handleRangeFilterChange("max_area", e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label>Phòng ngủ</label>

                <div className="d-flex gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`btn ${
                        filters.bedrooms == num
                          ? "btn-danger"
                          : "btn-outline-secondary"
                      }`}
                      onClick={() =>
                        handleFilterChange({
                          ...filters,
                          bedrooms: filters.bedrooms == num ? "" : num,
                        })
                      }>
                      {num === 4 ? "4+" : num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label>Hướng nhà</label>

                <select
                  className="form-select"
                  value={filters.direction}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      direction: e.target.value,
                    })
                  }>
                  <option value="">Tất cả</option>
                  <option value="east">Đông</option>
                  <option value="west">Tây</option>
                  <option value="south">Nam</option>
                  <option value="north">Bắc</option>
                  <option value="northeast">Đông Bắc</option>
                  <option value="northwest">Tây Bắc</option>
                  <option value="southeast">Đông Nam</option>
                  <option value="southwest">Tây Nam</option>
                </select>
              </div>

              <div className="mb-4">
                <label>Pháp lý</label>

                <select
                  className="form-select"
                  value={filters.legal_status}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      legal_status: e.target.value,
                    })
                  }>
                  <option value="">Tất cả</option>
                  <option value="sohong">Sổ hồng</option>
                  <option value="sokhongdo">Sổ đỏ</option>
                  <option value="dangchoso">Đang chờ sổ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

            </div>
          </div>

          {/* CONTENT */}
          <div className="col-lg-9">
            <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
              <div>
                <h3 className="fw-bold">Danh sách bất động sản</h3>

                <p className="text-muted mb-0">
                  Tìm thấy {pagination.total} tin đăng
                </p>
              </div>

              <input
                className="form-control"
                style={{ width: 320, maxWidth: "100%" }}
                value={filters.keyword}
                placeholder="Nhập từ khóa: nhà 2 tầng, 2 lầu..."
                onChange={(e) =>
                  handleFilterChange(
                    { ...filters, keyword: e.target.value },
                    { debounce: true },
                  )
                }
              />

              <select
                className="form-select"
                style={{ width: 220 }}
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}>
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá thấp đến cao</option>
                <option value="price_desc">Giá cao đến thấp</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-5">Đang tải...</div>
            ) : (
              <div className="row g-4">
                {properties.map((item) => (
                  <div key={item.id} className="col-xl-6">
                    <Link
                      to={`/property/${item.id}`}
                      className="text-decoration-none text-dark d-block h-100"
                      aria-label={`Xem chi tiết ${item.title}`}>
                    <div
                      className="card border-0 shadow-sm h-100"
                      style={{
                        borderRadius: 16,
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "transform 0.18s ease, box-shadow 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow =
                          "0 14px 30px rgba(15, 23, 42, 0.14)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "";
                      }}>
                      {/* IMAGE */}
                      <div
                        style={{
                          position: "relative",
                          height: 250,
                        }}>
                        <img
                          src={
                            item.thumbnail ||
                            "https://via.placeholder.com/600x400"
                          }
                          alt={item.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />

                        {item.featured_until &&
                          new Date(item.featured_until) > new Date() && (
                            <span
                              className="badge"
                              style={{
                                position: "absolute",
                                top: 12,
                                left: 12,
                                background: "#d97706",
                              }}>
                              NỔI BẬT
                            </span>
                          )}

                      </div>

                      {/* BODY */}
                      <div className="card-body">
                        <h5
                          className="fw-bold mb-2"
                          style={{
                            minHeight: 55,
                          }}>
                          {item.title}
                        </h5>

                        <p className="text-muted mb-3"><UiIcon name="location" size={16} style={{ verticalAlign: "-3px", marginRight: 5 }} />{item.address}</p>

                        <p className="mb-3">
                          <UiIcon name="user" size={16} style={{ verticalAlign: "-3px", marginRight: 5 }} />
                          {item.owner_id ? (
                            <span
                              role="link"
                              tabIndex={0}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/owners/${item.owner_id}`);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/owners/${item.owner_id}`);
                                }
                              }}
                              style={{
                                color: "#b51b17",
                                fontWeight: 600,
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}>
                              {item.owner_name}
                            </span>
                          ) : (
                            item.owner_name
                          )}
                        </p>

                        <div className="d-flex justify-content-between align-items-center border-top pt-3">
                          <div>
                            <div
                              className="fw-bold"
                              style={{
                                color: "#b51b17",
                                fontSize: 22,
                              }}>
                              {Number(item.price).toLocaleString()}đ
                            </div>
                          </div>

                          <div className="d-flex gap-4">
                            <div className="text-center">
                              <div><UiIcon name="area" size={18} /></div>
                              <small>{item.area}m²</small>
                            </div>

                            <div className="text-center">
                              <div><UiIcon name="bed" size={18} /></div>
                              <small>{item.bedrooms}</small>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
            <div className="d-flex justify-content-center mt-5">
              <nav>
                <ul className="pagination">
                  <li
                    className={`page-item ${
                      pagination.page <= 1 ? "disabled" : ""
                    }`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}>
                      «
                    </button>
                  </li>

                  {Array.from(
                    { length: pagination.total_pages },
                    (_, i) => i + 1,
                  ).map((page) => (
                    <li
                      key={page}
                      className={`page-item ${
                        page === pagination.page ? "active" : ""
                      }`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => handlePageChange(page)}>
                        {page}
                      </button>
                    </li>
                  ))}

                  <li
                    className={`page-item ${
                      pagination.page >= pagination.total_pages ? "disabled" : ""
                    }`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.total_pages}>
                      »
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
            )}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

