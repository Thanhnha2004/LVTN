import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import { locationData } from "../../data/locationData";
import UiIcon from "../../components/UiIcon";
import SiteFooter from "../../components/SiteFooter";

export default function PropertyList() {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
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
  });
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
      min_price: searchParams.get("min_price") || "",
      max_price: searchParams.get("max_price") || "",
      page: searchParams.get("page") || 1,
      limit: 12,
    };

    fetchProperties(filter);
  }, [searchParams]);

  const fetchProperties = async (filter) => {
    try {
      setLoading(true);

      const res = await api.get("/api/listing", {
        params: filter,
      });

      setProperties(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    fetchProperties(filters);
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

                <button className="btn btn-link text-danger p-0">
                  Xóa lọc
                </button>
              </div>

              <div className="mb-3">
                <label>Giao dịch</label>

                <select
                  className="form-select"
                  value={filters.transaction_type}
                  onChange={(e) =>
                    setFilters({
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
                    setFilters({
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
                    setFilters({
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
                    setFilters({
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
                    setFilters({
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
                      setFilters({
                        ...filters,
                        min_price: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="col">
                  <input
                    className="form-control"
                    placeholder="Giá đến"
                    value={filters.max_price}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        max_price: e.target.value,
                      })
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
                      setFilters({
                        ...filters,
                        min_area: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="col">
                  <input
                    className="form-control"
                    placeholder="DT đến"
                    value={filters.max_area}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        max_area: e.target.value,
                      })
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
                        setFilters({
                          ...filters,
                          bedrooms: num,
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
                    setFilters({
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
                    setFilters({
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

              <button
                className="btn text-white w-100"
                style={{
                  background: "#b51b17",
                  height: 50,
                }}
                onClick={handleApplyFilter}>
                Áp dụng bộ lọc
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="col-lg-9">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h3 className="fw-bold">Danh sách bất động sản</h3>

                <p className="text-muted mb-0">
                  Tìm thấy {properties.length} tin đăng
                </p>
              </div>

              <select className="form-select" style={{ width: 220 }}>
                <option>Mới nhất</option>
                <option>Giá thấp đến cao</option>
                <option>Giá cao đến thấp</option>
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
            <div className="d-flex justify-content-center mt-5">
              <nav>
                <ul className="pagination">
                  <li className="page-item">
                    <button className="page-link">«</button>
                  </li>

                  <li className="page-item active">
                    <button className="page-link">1</button>
                  </li>

                  <li className="page-item">
                    <button className="page-link">2</button>
                  </li>

                  <li className="page-item">
                    <button className="page-link">3</button>
                  </li>

                  <li className="page-item">
                    <button className="page-link">»</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

