/**
 * Coerces a value to a finite Number or null.
 * Used everywhere we read numeric fields from request bodies.
 */
export function toNumberOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}