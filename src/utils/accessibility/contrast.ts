import type { ColorContrastResult } from "./types";

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

export const getContrastRatio = (
  color1: string,
  color2: string,
): ColorContrastResult => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error("Invalid hex color format");
  }

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio,
    passes: {
      aa: ratio >= 4.5,
      aaa: ratio >= 7.0,
    },
  };
};

export const meetsWCAG_AAA = (
  foreground: string,
  background: string,
): boolean => {
  const result = getContrastRatio(foreground, background);
  return result.passes.aaa;
};

export const meetsWCAG_AA = (
  foreground: string,
  background: string,
): boolean => {
  const result = getContrastRatio(foreground, background);
  return result.passes.aa;
};

export const validateTextContrast = (
  textColor: string,
  backgroundColor: string,
  isLargeText: boolean = false,
): {
  valid: boolean;
  ratio: number;
  requiredRatio: number;
} => {
  const result = getContrastRatio(textColor, backgroundColor);
  const requiredRatio = isLargeText ? 4.5 : 7.0;

  return {
    valid: result.ratio >= requiredRatio,
    ratio: result.ratio,
    requiredRatio,
  };
};
