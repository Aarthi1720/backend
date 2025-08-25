// Convert 'YYYY-MM-DD' to a Date at UTC midnight (no timezone drift)
export const ymdToUtcDate = (s) => {
  if (!s) return new Date(NaN);
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Format a Date (assumed UTC) to YYYY-MM-DD safely
export const formatYmd = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
