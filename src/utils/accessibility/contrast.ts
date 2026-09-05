import type { ColorContrastResult, WCAGLevel } from "./types";

const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

type RGBA = { r: number; g: number; b: number; a: number };

/**
 * Accepts 3-digit shorthand (#fff), 6-digit (#ffffff), 8-digit RGBA
 * (#ffffffff), and `rgb()`/`rgba()` functional notation — the design system's
 * text.secondary/tertiary tokens are alpha-based (e.g.
 * `rgba(245,245,245,0.55)`, see DESIGN.md §2) rather than flat hex.
 */
const parseColor = (input: string): RGBA | null => {
  const str = input.trim();

  const rgbaMatch = str.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  );
  if (rgbaMatch) {
    return {
      r: parseFloat(rgbaMatch[1]),
      g: parseFloat(rgbaMatch[2]),
      b: parseFloat(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  const stripped = str.replace(/^#/, "");

  if (/^[a-f\d]{3}$/i.test(stripped)) {
    const [r, g, b] = stripped.split("");
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
      a: 1,
    };
  }

  if (/^[a-f\d]{6}$/i.test(stripped) || /^[a-f\d]{8}$/i.test(stripped)) {
    return {
      r: parseInt(stripped.slice(0, 2), 16),
      g: parseInt(stripped.slice(2, 4), 16),
      b: parseInt(stripped.slice(4, 6), 16),
      a: stripped.length === 8 ? parseInt(stripped.slice(6, 8), 16) / 255 : 1,
    };
  }

  return null;
};

/** Alpha-composites `fg` over `bg` (both opaque or translucent) into an opaque RGB. */
const compositeOver = (fg: RGBA, bg: RGBA): RGBA => {
  if (fg.a >= 1) return fg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
};

/**
 * Raw WCAG contrast ratio between two colors (1:1 .. 21:1), hex or rgba().
 * A translucent color is alpha-composited over the other color first (e.g.
 * `rgba(245,245,245,0.55)` text over a `#050505` background is evaluated at
 * its true rendered color, not its nominal channel values) — this is the
 * single source of truth for the ratio math; use `checkContrast` below for a
 * pass/fail verdict against a specific WCAG level + text size.
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  if (!c1 || !c2) {
    throw new Error("Invalid color format");
  }

  const composited1 = compositeOver(c1, c2);
  const composited2 = compositeOver(c2, c1);

  const l1 = getRelativeLuminance(composited1.r, composited1.g, composited1.b);
  const l2 = getRelativeLuminance(composited2.r, composited2.g, composited2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// WCAG 2.1 required contrast ratios — the correct 4-way threshold table.
// Large text = 18pt+ (24px+) regular, or 14pt+ (18.66px+) bold.
const REQUIRED_RATIO: Record<WCAGLevel, { normal: number; large: number }> = {
  AA: { normal: 4.5, large: 3.0 },
  AAA: { normal: 7.0, large: 4.5 },
};

/**
 * Single WCAG pass/fail contrast check. Replaces the previous three
 * functions (`meetsWCAG_AA`, `meetsWCAG_AAA`, `validateTextContrast`), which
 * encoded three different, mutually-inconsistent rules — none of which let a
 * caller ask for "AA, large text" (the legitimate 3:1 case).
 */
export const checkContrast = (
  foreground: string,
  background: string,
  level: WCAGLevel = "AA",
  isLargeText: boolean = false,
): ColorContrastResult => {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText
    ? REQUIRED_RATIO[level].large
    : REQUIRED_RATIO[level].normal;

  return {
    ratio,
    requiredRatio,
    level,
    isLargeText,
    passes: ratio >= requiredRatio,
  };
};
