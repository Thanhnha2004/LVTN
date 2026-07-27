import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatCoord(value) {
  return Number(value).toFixed(6);
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  height = 260,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [status, setStatus] = useState("");

  const selected = useMemo(() => {
    const lat = toNumber(latitude);
    const lng = toNumber(longitude);
    return lat !== null && lng !== null ? [lat, lng] : null;
  }, [latitude, longitude]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      scrollWheelZoom: false,
    }).setView(selected || [10.7769, 106.7009], selected ? 15 : 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapRef.current);

    mapRef.current.on("click", (event) => {
      const nextLat = formatCoord(event.latlng.lat);
      const nextLng = formatCoord(event.latlng.lng);
      onChange?.({ latitude: nextLat, longitude: nextLng });
      setStatus("Đã chọn vị trí trên bản đồ");
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const markerIcon = L.divIcon({
      className: "",
      html: '<div style="width:20px;height:20px;background:#b51b17;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (!selected) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(selected, { icon: markerIcon }).addTo(
        mapRef.current,
      );
    } else {
      markerRef.current.setLatLng(selected);
    }

    mapRef.current.setView(selected, Math.max(mapRef.current.getZoom(), 15));
  }, [selected]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Trình duyệt không hỗ trợ lấy vị trí hiện tại");
      return;
    }

    setStatus("Đang lấy vị trí hiện tại...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLat = formatCoord(position.coords.latitude);
        const nextLng = formatCoord(position.coords.longitude);
        onChange?.({ latitude: nextLat, longitude: nextLng });
        setStatus("Đã lấy vị trí hiện tại");
      },
      () => setStatus("Không thể lấy vị trí hiện tại"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div
      style={{
        border: "1px solid #E8E8E8",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
      }}>
      <div ref={containerRef} style={{ height, width: "100%" }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderTop: "1px solid #E8E8E8",
          fontSize: 13,
          color: "#6f5b57",
        }}>
        <span>
          {status ||
            "Bấm vào bản đồ để chọn vị trí, hệ thống sẽ tự điền tọa độ."}
        </span>
        <button
          type="button"
          onClick={useCurrentLocation}
          style={{
            border: "1px solid #b51b17",
            borderRadius: 8,
            background: "#fff",
            color: "#b51b17",
            fontWeight: 700,
            padding: "6px 10px",
            whiteSpace: "nowrap",
          }}>
          Lấy vị trí hiện tại
        </button>
      </div>
    </div>
  );
}
