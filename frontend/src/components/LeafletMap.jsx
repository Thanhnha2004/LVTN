import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function LeafletMap({
  markers = [],
  center,
  zoom = 13,
  height = 320,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

  const validMarkers = useMemo(
    () =>
      markers
        .map((m) => ({
          ...m,
          latitude: toNumber(m.latitude),
          longitude: toNumber(m.longitude),
        }))
        .filter((m) => m.latitude !== null && m.longitude !== null),
    [markers],
  );

  const initialCenter = useMemo(() => {
    if (center?.latitude && center?.longitude) {
      return [Number(center.latitude), Number(center.longitude)];
    }
    if (validMarkers[0]) {
      return [validMarkers[0].latitude, validMarkers[0].longitude];
    }
    return [10.7769, 106.7009];
  }, [center, validMarkers]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      scrollWheelZoom: false,
    }).setView(initialCenter, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapRef.current);

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return;

    markerLayerRef.current.clearLayers();

    const markerIcon = L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;background:#b51b17;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    validMarkers.forEach((marker) => {
      const popup = `
        <div style="min-width:180px">
          <div style="font-weight:700;margin-bottom:4px">${escapeHtml(marker.title)}</div>
          ${marker.price ? `<div style="color:#b51b17;font-weight:600">${Number(marker.price).toLocaleString("vi-VN")} đ</div>` : ""}
          ${marker.address ? `<div style="font-size:12px;color:#666;margin-top:4px">${escapeHtml(marker.address)}</div>` : ""}
        </div>
      `;

      L.marker([marker.latitude, marker.longitude], { icon: markerIcon })
        .bindPopup(popup)
        .addTo(markerLayerRef.current);
    });

    if (validMarkers.length === 1) {
      mapRef.current.setView(
        [validMarkers[0].latitude, validMarkers[0].longitude],
        zoom,
      );
    } else if (validMarkers.length > 1) {
      const bounds = L.latLngBounds(
        validMarkers.map((m) => [m.latitude, m.longitude]),
      );
      mapRef.current.fitBounds(bounds, { padding: [28, 28] });
    }
  }, [validMarkers, zoom]);

  return (
    <div
      style={{
        border: "1px solid #E8E8E8",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
      }}>
      <div ref={containerRef} style={{ height, width: "100%" }} />
    </div>
  );
}
