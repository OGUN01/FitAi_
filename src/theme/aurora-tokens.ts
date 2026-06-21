import { Platform } from 'react-native';

/**
 * Aurora Design System - Complete Design Tokens
 * Based on cult.fit Aurora design language
 *
 * This file contains all design tokens for the FitAI application
 * following the Aurora design principles: Bold, Energetic, Immersive
 */

// Color System
export const colors = {
  // Primary palette - Vibrant Orange/Coral
  primary: {
    DEFAULT: "#FF6B35",
    light: "#FF8A5C",
    dark: "#E55A2B",
    50: "#FFF5F2",
    100: "#FFEAE3",
    200: "#FFD4C7",
    300: "#FFBFAB",
    400: "#FFA58F",
    500: "#FF8A5C",
    600: "#FF6B35",
    700: "#E55A2B",
    800: "#CC4A21",
    900: "#B33A17",
  },

  // Secondary palette - Electric Cyan
  secondary: {
    DEFAULT: "#00D4FF",
    light: "#00FFFF",
    dark: "#00B8E6",
    50: "#E6FBFF",
    100: "#CCF7FF",
    200: "#99EFFF",
    300: "#66E7FF",
    400: "#33DFFF",
    500: "#00D4FF",
    600: "#00B8E6",
    700: "#009DCC",
    800: "#0081B3",
    900: "#006699",
  },

  // Aurora background themes
  aurora: {
    space: {
      base: "#0A0F1C",
      mid: "#1A1F2E",
      high: "#252A3A",
    },
    purple: {
      base: "#1C0A1F",
      mid: "#2E1A2F",
      high: "#3A252F",
    },
    ocean: {
      base: "#0A1F1C",
      mid: "#1A2F2E",
      high: "#253A3A",
    },
  },

  // Background system
  background: {
    DEFAULT: "#0A0F1C",
    secondary: "#1A1F2E",
    tertiary: "#252A3A",
  },

  // Text color system
  text: {
    primary: "#FFFFFF",
    secondary: "#B0B0B0",
    tertiary: "#8A8A8A",
    muted: "#8A8A8A",
    disabled: "#5A5A5A",
  },

  // Status colors
  success: {
    DEFAULT: "#4CAF50",
    light: "#81C784",
    dark: "#388E3C",
  },
  warning: {
    DEFAULT: "#FF9800",
    light: "#FFB74D",
    dark: "#F57C00",
  },
  error: {
    DEFAULT: "#F44336",
    light: "#E57373",
    dark: "#D32F2F",
  },
  info: {
    DEFAULT: "#2196F3",
    light: "#64B5F6",
    dark: "#1976D2",
  },

  // Glass surface colors
  glass: {
    background: "rgba(255, 255, 255, 0.1)",
    backgroundLight: "rgba(255, 255, 255, 0.15)",
    backgroundDark: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.18)",
    surface: "rgba(255, 255, 255, 0.1)", // Default glass surface
  },
} as const;

// Typography System
export const typography = {
  fontSize: {
    display: 48,
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    caption: 14,
    micro: 12,
  },

  fontWeight: {
    light: "300" as const,
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Spacing System (8pt grid)
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// Border Radius System
export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// Defensive Platform access: some test suites mock `react-native` minimally
// without exporting `Platform`. Guard so the token module (imported at load by
// `utils/constants.ts`) never crashes — default to native behavior off-web.
const isWeb = typeof Platform !== 'undefined' && Platform?.OS === 'web';

// Helper to create platform-appropriate shadow styles
// On web, only boxShadow is used (deprecated shadow* props cause warnings)
// On native, both native shadow props and elevation are used
const makeShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
  boxShadow: string,
) => {
  if (isWeb) {
    return { boxShadow };
  }
  return {
    shadowOffset: { width: 0, height: offsetY },
    shadowRadius: radius,
    shadowOpacity: opacity,
    shadowColor: '#000000',
    elevation,
    boxShadow,
  };
};

// Shadow System (8 levels)
export const shadows = {
  level1: makeShadow(1, 2, 0.1, 1, '0px 1px 2px rgba(0, 0, 0, 0.1)'),
  level2: makeShadow(2, 4, 0.15, 2, '0px 2px 4px rgba(0, 0, 0, 0.15)'),
  level3: makeShadow(4, 8, 0.2, 3, '0px 4px 8px rgba(0, 0, 0, 0.2)'),
  level4: makeShadow(6, 12, 0.25, 4, '0px 6px 12px rgba(0, 0, 0, 0.25)'),
  level5: makeShadow(8, 16, 0.3, 5, '0px 8px 16px rgba(0, 0, 0, 0.3)'),
  level6: makeShadow(12, 24, 0.35, 6, '0px 12px 24px rgba(0, 0, 0, 0.35)'),
  level7: makeShadow(16, 32, 0.4, 7, '0px 16px 32px rgba(0, 0, 0, 0.4)'),
  level8: makeShadow(24, 48, 0.45, 8, '0px 24px 48px rgba(0, 0, 0, 0.45)'),
  glass: makeShadow(8, 32, 0.37, 4, '0px 8px 32px rgba(0, 0, 0, 0.37)'),
};

// Glass Surface Specifications
export const glassSurface = {
  blur: {
    default: 25,
    light: 15,
    heavy: 40,
  },
  background: "rgba(255, 255, 255, 0.08)",
  border: "rgba(255, 255, 255, 0.25)",
  borderWidth: 1,
} as const;

// Animation Constants
export const animation = {
  duration: {
    instant: 100,
    quick: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },

  easing: {
    easeIn: [0.4, 0, 1, 1] as const,
    easeOut: [0, 0, 0.2, 1] as const,
    easeInOut: [0.4, 0, 0.2, 1] as const,
  },

  spring: {
    default: {
      damping: 15,
      stiffness: 100,
    },
    bounce: {
      damping: 10,
      stiffness: 80,
    },
    smooth: {
      damping: 20,
      stiffness: 120,
    },
  },

  scale: {
    press: 0.95,
    default: 1.0,
  },
} as const;

// Breakpoints (for responsive design)
export const breakpoints = {
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// Z-Index System
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

// Export all tokens as a single object
export const auroraTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  glassSurface,
  animation,
  breakpoints,
  zIndex,
} as const;

// ============================================================================
// FLAT TOKEN PROJECTIONS — canonical non-deprecated flat API
//
// The nested `colors` (colors.primary.DEFAULT, colors.background.DEFAULT, …)
// is the source of truth, but legacy consumers use a FLAT color API
// (colors.primary, colors.surface, colors.glassSurface, colors.successAlt…).
// These projections expose that flat shape, sourced from the nested tokens,
// so consumers migrate from the deprecated `ResponsiveTheme`/`THEME`
// (src/utils/constants.ts) to `flatColors`/`flatShadows`/`flatFontSize` here —
// one non-deprecated design-token source of truth.
// `src/utils/constants.ts` re-exports these as `THEME`/`ResponsiveTheme` for
// back-compat; new code should import these directly.
// ============================================================================

/**
 * Flat color map — every value sourced from the nested `colors` tokens above.
 * Keys mirror the legacy ResponsiveTheme flat names for a 1:1 migration.
 */
export const flatColors = {
  // Primary
  primary: colors.primary.DEFAULT,
  primaryDark: colors.primary.dark,
  primaryLight: colors.primary.light,
  primaryFaded: 'rgba(255, 107, 53, 0.3)',

  // Secondary
  secondary: colors.secondary.DEFAULT,
  secondaryDark: colors.secondary.dark,
  secondaryLight: colors.secondary.light,

  // Background
  background: colors.background.DEFAULT,
  backgroundSecondary: colors.background.secondary,
  backgroundTertiary: colors.background.tertiary,

  // Surface (derived from background tiers)
  surface: colors.background.secondary,
  surfaceLight: colors.background.tertiary,

  // Text
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  textMuted: colors.text.muted,
  textTertiary: colors.text.tertiary,

  // Status
  success: colors.success.DEFAULT,
  warning: colors.warning.DEFAULT,
  error: colors.error.DEFAULT,
  info: colors.info.DEFAULT,
  accent: colors.primary.light,

  // Extended status
  successAlt: '#10B981',
  successAltDark: '#059669',
  successLight: colors.success.light,
  errorLight: colors.error.light,
  errorAlt: '#EF4444',
  warningAlt: '#F59E0B',

  // Accent / macro palette (no nested aurora equivalent — semantic)
  gold: '#FFD700',
  amber: '#FFC107',
  teal: '#4ECDC4',
  pink: '#EC4899',
  cyan: '#06B6D4',
  neutral: '#9E9E9E',
  purple: '#9333EA',
  orange: '#F97316',
  blue: '#3B82F6',
  amberBright: '#FBBF24',
  successBright: '#4ADE80',
  muted: '#9CA3AF',

  // Glass
  glassSurface: colors.glass.backgroundDark,
  glassBorder: colors.glass.border,
  glassHighlight: colors.glass.backgroundLight,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',

  // Tints
  primaryTint: 'rgba(255, 107, 53, 0.1)',
  successTint: 'rgba(76, 175, 80, 0.15)',
  errorTint: 'rgba(244, 67, 54, 0.15)',
  warningTint: 'rgba(255, 152, 0, 0.15)',

  // Utility
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Gradient
  gradientStart: colors.aurora.space.base,
  gradientEnd: colors.aurora.space.mid,

  // Border
  border: colors.background.tertiary,
  borderLight: colors.glass.border,
} as Record<string, string>;

/**
 * Flat font-size scale mirroring the legacy 8-step names. `xs` (13) is
 * legacy-only (nested typography has no `xs`); `sm`/`md`/`lg`/`xl`/`xxl`/
 * `display` map to typography.fontSize.{caption,body,h3,h2,h1,display}.
 */
export const flatFontSize = {
  micro: typography.fontSize.micro,
  xs: 13,
  sm: typography.fontSize.caption,
  md: typography.fontSize.body,
  lg: typography.fontSize.h3,
  xl: typography.fontSize.h2,
  xxl: typography.fontSize.h1,
  display: typography.fontSize.display,
} as const;

/**
 * Flat shadow map (sm/md/lg → aurora level1/2/3).
 */
export const flatShadows = {
  sm: shadows.level1,
  md: shadows.level2,
  lg: shadows.level3,
} as const;

// Type exports for TypeScript
export type AuroraTokens = typeof auroraTokens;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type GlassSurface = typeof glassSurface;
export type Animation = typeof animation;
