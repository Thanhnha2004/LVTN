import UiIcon from "./UiIcon";

const itemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  whiteSpace: "nowrap",
};

export default function PropertyMeta({ property, showLocation = false, iconSize = 13 }) {
  return (
    <>
      {property.area != null && (
        <span style={itemStyle}>
          <UiIcon name="area" size={iconSize} /> {property.area}m²
        </span>
      )}
      {property.bedrooms != null && (
        <span style={itemStyle}>
          <UiIcon name="bed" size={iconSize} /> {property.bedrooms}
        </span>
      )}
      {property.bathrooms != null && (
        <span style={itemStyle}>
          <UiIcon name="bath" size={iconSize} /> {property.bathrooms}
        </span>
      )}
      {showLocation && property.city && (
        <span style={itemStyle}>
          <UiIcon name="location" size={iconSize} /> {property.city}
        </span>
      )}
    </>
  );
}
