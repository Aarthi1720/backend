// Half-open interval overlap: [ci, co) vs [rs, re)
export const bookingsOverlap = (ci, co, rs, re) => {
  const checkIn = new Date(ci);
  const checkOut = new Date(co);
  const rangeStart = new Date(rs);
  const rangeEnd = new Date(re);
  // No hour mutation; assume UTC midnight or consistent normalization upstream
  return checkIn < rangeEnd && checkOut > rangeStart;
};
