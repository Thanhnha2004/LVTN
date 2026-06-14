import { useState } from "react";
import api from "../../api/axios";

export default function CreateProperty() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "",
    transactionType: "",
    area: "",
    price: "",
  });

  const [images, setImages] = useState([]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const propertyRes = await api.post("/properties", form);

      const propertyId = propertyRes.data._id;

      const imageForm = new FormData();

      images.forEach((img) => {
        imageForm.append("images", img);
      });

      await api.post(`/properties/${propertyId}/images`, imageForm);

      alert("Đăng tin thành công");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border">
      <h2 className="text-2xl font-bold mb-6">Đăng tin bất động sản</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          name="title"
          placeholder="Tiêu đề"
          className="w-full border rounded-lg p-3"
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Mô tả"
          className="w-full border rounded-lg p-3"
          rows="5"
          onChange={handleChange}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="number"
            name="price"
            placeholder="Giá"
            className="border rounded-lg p-3"
            onChange={handleChange}
          />

          <input
            type="number"
            name="area"
            placeholder="Diện tích"
            className="border rounded-lg p-3"
            onChange={handleChange}
          />
        </div>

        <select
          name="type"
          className="w-full border rounded-lg p-3"
          onChange={handleChange}>
          <option value="">Chọn loại BĐS</option>

          <option value="apartment">Căn hộ</option>

          <option value="house">Nhà riêng</option>

          <option value="land">Đất nền</option>
        </select>

        <input
          type="file"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files))}
        />

        <button
          type="submit"
          className="bg-red-700 text-white px-8 py-3 rounded-lg">
          Đăng tin
        </button>
      </form>
    </div>
  );
}
