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

/**
 * WCAG relative-luminance check that picks a legible foreground (near-black
 * or white) for text/icons placed on an arbitrary solid `hex` background.
 * Single source of truth — originally defined in AchievementCelebration.tsx
 * (still re-exported there for backward compatibility) and now the shared
 * vehicle for any solid-color badge/button/spinner that needs to stay AA
 * compliant regardless of which brand hue sits behind it.
 */
export function getReadableTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#FFFFFF";
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithBlack > contrastWithWhite ? "#0A0A0F" : "#FFFFFF";
}
