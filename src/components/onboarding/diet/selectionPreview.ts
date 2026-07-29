/**
 * selectionPreview — "collapse is not hide selections" (2026 chip-rail rule).
 *
 * When a CollapsibleSection is closed, its subtitle should still name what's
 * inside, not just count it: "2 · Keto, Paleo +1" instead of "2 selected".
 * Used by the diet tab's collapsible sections (all diet/* owned files).
 */

/**
 * "Nuts, Dairy" or "Nuts, Dairy +2" when more than `max` names exist.
 */
export const previewNames = (names: string[], max = 2): string => {
  if (names.length === 0) return "";
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
};

/**
 * Collapsed-subtitle composer: "<count> · <preview>" when items are chosen,
 * otherwise the untouched empty-state helper line.
 */
export const countWithPreview = (
  count: number,
  emptyText: string,
  names: string[],
  max = 2,
): string => {
  if (count === 0) return emptyText;
  const preview = previewNames(names, max);
  return preview ? `${count} · ${preview}` : `${count} selected`;
};
