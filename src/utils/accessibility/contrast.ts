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

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Raw WCAG contrast ratio between two hex colors (1:1 .. 21:1). This is the
 * single source of truth for the ratio math — use `checkContrast` below for a
 * pass/fail verdict against a specific WCAG level + text size.
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error("Invalid hex color format");
  }

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

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
