import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import { locationData } from "../../data/locationData";
import UiIcon from "../../components/UiIcon";
import SiteFooter from "../../components/SiteFooter";

const EMPTY_FILTERS = {
  type: "",
  transaction_type: "",
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
};

export default function PropertyList() {
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
      sort: searchParams.get("sort") || "newest",
      page: searchParams.get("page") || 1,
      limit: 12,
    };

    setSort(filter.sort);
    setFilters((prev) => ({
      ...prev,
      transaction_type: filter.transaction_type,
      type: filter.type,
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

              <div className="row mb-3">
                <div className="col">
                  <input
                    className="form-control"
                    placeholder="Giá từ"
                    value={filters.min_price}
                    onChange={(e) =>
                      handleFilterChange(
                        {
                          ...filters,
                          min_price: e.target.value,
                        },
                        { debounce: true },
                      )
                    }
                  />
                </div>

                <div className="col">
                  <input
                    className="form-control"
                    placeholder="Giá đến"
                    value={filters.max_price}
                    onChange={(e) =>
                      handleFilterChange(
                        {
                          ...filters,
                          max_price: e.target.value,
                        },
                        { debounce: true },
                      )
                    }
                  />
                </div>
              </div>

              <div className="row mb-3">
                <div className="col">
                  <input
                    className="form-control"
                    placeholder="DT từ"
                    value={filters.min_area}
                    onChange={(e) =>
                      handleFilterChange(
                        {
                          ...filters,
                          min_area: e.target.value,
                        },
                        { debounce: true },
                      )
                    }
                  />
                </div>

                <div className="col">
                  <input
                    className="form-control"
                    placeholder="DT đến"
                    value={filters.max_area}
                    onChange={(e) =>
                      handleFilterChange(
                        {
                          ...filters,
                          max_area: e.target.value,
                        },
                        { debounce: true },
                      )
                    }
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
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h3 className="fw-bold">Danh sách bất động sản</h3>

                <p className="text-muted mb-0">
                  Tìm thấy {pagination.total} tin đăng
                </p>
              </div>

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
                    <div
                      className="card border-0 shadow-sm h-100"
                      style={{
                        borderRadius: 16,
                        overflow: "hidden",
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

                        <p className="mb-3"><UiIcon name="user" size={16} style={{ verticalAlign: "-3px", marginRight: 5 }} />{item.owner_name}</p>

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

                        <Link
                          to={`/property/${item.id}`}
                          className="btn btn-danger w-100 mt-3">
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
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

