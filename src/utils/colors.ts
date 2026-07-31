/**
 * Color utility helpers.
 *
 * `hexToRgba` replaces the fragile `${color}1F` / `${color}20` hex-append
 * pattern that silently breaks if `color` is ever switched to an `rgba()`
 * or named color (React Native accepts the appended-alpha trick only for
 * 6-digit hex values, and many token colors are now `rgba(...)`).
 *
 * Usage:
 *   import { hexToRgba } from "@/utils/colors";
 *   backgroundColor: hexToRgba(colors.primary, 0.12)
 *
 * If `hex` is not a parseable hex string (e.g. already an `rgba(...)` string
 * or a named color), the function falls back to returning the input
 * unchanged so callers do not crash — but the caller should migrate that
 * token to a hex form or use rgba() directly.
 */
export function hexToRgba(hex: string, alpha: number): string {
  // Marked as a worklet so it is also safe to call inside reanimated
  // useAnimatedStyle/useAnimatedProps callbacks on the UI thread (reanimated
  // 3.17 throws ReanimatedError for non-worklet calls there). Pure string
  // math only — no captures beyond its arguments.
  'worklet';
  if (!hex) return hex;
  // Pass through rgba()/rgb()/named colors untouched.
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) {
    return hex;
  }
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) {
    return hex;
  }
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** ~12% tint for badge backgrounds. */
export const TINT_ALPHA_LOW = 0.12;
/** ~20% tint for soft fills. */
export const TINT_ALPHA_SOFT = 0.2;
/** ~30% tint for pressed / disabled surfaces (WCAG-safe with white text). */
export const TINT_ALPHA_MEDIUM = 0.3;
