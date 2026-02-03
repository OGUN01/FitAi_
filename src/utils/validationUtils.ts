export const isValidMetric = (value: any, allowZero = false): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number" && !Number.isFinite(value)) return false;
  if (!allowZero && value === 0) return false;
  return true;
};
