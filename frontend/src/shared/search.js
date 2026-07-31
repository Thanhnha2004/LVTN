export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function fuzzyMatches(fields, query) {
  const tokens = normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  return tokens.every((token) => haystack.includes(token));
}
