import { ymdToUtcDate } from "./date.js";

// Normalize to UTC midnight half-open: [checkIn, checkOut)
export const normalizeCheckInOut = (checkInStr, checkOutStr) => {
  const checkIn = ymdToUtcDate(checkInStr);
  const checkOut = ymdToUtcDate(checkOutStr);
  return { checkIn, checkOut };
};
