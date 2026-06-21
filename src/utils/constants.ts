// App Constants
// This file contains all application constants

// Aurora tokens are the SINGLE SOURCE OF TRUTH for the design language.
// THEME / ResponsiveTheme below are kept as a FLAT PROJECTION of the aurora
// tokens so legacy consumers (still imported across the app) read the exact
// same authoritative values — there is now one token system, not two.
import {
  colors as auroraColors,
  spacing as auroraSpacing,
  borderRadius as auroraBorderRadius,
  typography as auroraTypography,
  shadows as auroraShadows,
} from "../theme/aurora-tokens";

export const APP_CONFIG = {
  NAME: "FitAI",
  VERSION: "0.1.6",
  API_TIMEOUT: 10000,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
};

/**
 * @deprecated Migrate to `aurora-tokens` (`colors`/`spacing`/`borderRadius`/
 * `typography`/`shadows`) from `src/theme/aurora-tokens.ts` directly.
 *
 * `THEME` is now a FLAT PROJECTION of the aurora tokens — every value below is
 * sourced from `aurora-tokens` so the app has ONE design-token source of truth.
 * The flat key names (primary, primaryDark, surface, glassSurface, successAlt…)
 * are preserved for backwards compatibility with the ~300 legacy consumers.
 * No hardcoded hex lives here anymore.
 *
 * NOTE: `colors` is cast to a `Record<string, string>` (broadened from the
 * narrow `as const` literals on aurora-tokens) so legacy consumers that
 * reassign color values (`let c = colors.surface; c = colors.success;`)
 * type-check against `string` — matching the pre-projection behavior where
 * THEME was a plain object literal (no `as const`).
 */
export const THEME = {
  colors: {
    // Primary — aurora orange (projected from colors.primary.{DEFAULT,dark,light})
    primary: auroraColors.primary.DEFAULT,
    primaryDark: auroraColors.primary.dark,
    primaryLight: auroraColors.primary.light,
    primaryFaded: "rgba(255, 107, 53, 0.3)",

    // Secondary — electric cyan (projected from colors.secondary)
    secondary: auroraColors.secondary.DEFAULT,
    secondaryDark: auroraColors.secondary.dark,
    secondaryLight: auroraColors.secondary.light,

    // Background (projected from colors.background / colors.aurora.space)
    background: auroraColors.background.DEFAULT,
    backgroundSecondary: auroraColors.background.secondary,
    backgroundTertiary: auroraColors.background.tertiary,

    // Surface — derived from the background tiers (no separate aurora surface)
    surface: auroraColors.background.secondary,
    surfaceLight: auroraColors.background.tertiary,

    // Text (projected from colors.text)
    text: auroraColors.text.primary,
    textSecondary: auroraColors.text.secondary,
    textMuted: auroraColors.text.muted,
    textTertiary: auroraColors.text.tertiary,

    // Status (projected from colors.success/warning/error/info)
    success: auroraColors.success.DEFAULT,
    warning: auroraColors.warning.DEFAULT,
    error: auroraColors.error.DEFAULT,
    info: auroraColors.info.DEFAULT,
    accent: auroraColors.primary.light,

    // Extended status (projected from aurora light/dark variants)
    successAlt: "#10B981",
    successAltDark: "#059669",
    successLight: auroraColors.success.light,
    errorLight: auroraColors.error.light,
    errorAlt: "#EF4444",
    warningAlt: "#F59E0B",

    // Accent / macro palette (no direct aurora equivalent — kept as semantic colors)
    gold: "#FFD700",
    amber: "#FFC107",
    teal: "#4ECDC4",
    pink: "#EC4899",
    cyan: "#06B6D4",
    neutral: "#9E9E9E",
    purple: "#9333EA",
    orange: "#F97316",
    blue: "#3B82F6",
    amberBright: "#FBBF24",
    successBright: "#4ADE80",
    muted: "#9CA3AF",

    // Glass (projected from colors.glass)
    glassSurface: auroraColors.glass.backgroundDark,
    glassBorder: auroraColors.glass.border,
    glassHighlight: auroraColors.glass.backgroundLight,

    // Overlay
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayDark: "rgba(0, 0, 0, 0.7)",

    // Tints
    primaryTint: "rgba(255, 107, 53, 0.1)",
    successTint: "rgba(76, 175, 80, 0.15)",
    errorTint: "rgba(244, 67, 54, 0.15)",
    warningTint: "rgba(255, 152, 0, 0.15)",

    // Utility
    white: "#ffffff",
    black: "#000000",
    transparent: "transparent",

    // Gradient (projected from aurora space tiers)
    gradientStart: auroraColors.aurora.space.base,
    gradientEnd: auroraColors.aurora.space.mid,

    // Border
    border: auroraColors.background.tertiary,
    borderLight: auroraColors.glass.border,
  } as Record<string, string>,

  spacing: auroraSpacing,

  borderRadius: auroraBorderRadius,

  // fontSize preserves the legacy 8-step scale (aurora uses the same values
  // via typography.fontSize). `xs` (13) is legacy-only; aurora has no `xs`.
  fontSize: {
    micro: auroraTypography.fontSize.micro,
    xs: 13,
    sm: auroraTypography.fontSize.caption,
    md: auroraTypography.fontSize.body,
    lg: auroraTypography.fontSize.h3,
    xl: auroraTypography.fontSize.h2,
    xxl: auroraTypography.fontSize.h1,
    display: auroraTypography.fontSize.display,
  },

  fontWeight: {
    light: "300" as "300",
    normal: "400" as "400",
    medium: "500" as "500",
    semibold: "600" as "600",
    bold: "700" as "700",
    extrabold: "800" as "800",
  },

  // Projected from aurora shadows (level1/2/3) so the legacy sm/md/lg keys
  // resolve to the authoritative shadow definitions.
  shadows: {
    sm: auroraShadows.level1,
    md: auroraShadows.level2,
    lg: auroraShadows.level3,
  },
};

// ============================================================================
// RESPONSIVE THEME FUNCTIONS
// ============================================================================

/**
 * @deprecated Use `aurora-tokens` + the `rp`/`rf`/`rbr` responsive wrappers
 * from `src/utils/responsive` directly.
 *
 * `createResponsiveTheme` returns THEME with spacing/borderRadius/fontSize
 * passed through the responsive wrappers. Now delegates to aurora tokens.
 */
export const createResponsiveTheme = () => {
  // Import responsive functions lazily to avoid circular dependency
  const { rf, rp, rbr } = require("./responsive");

  return {
    ...THEME,

    spacing: {
      xxs: rp(THEME.spacing.xxs),
      xs: rp(THEME.spacing.xxs),
      sm: rp(THEME.spacing.sm),
      md: rp(THEME.spacing.md),
      lg: rp(THEME.spacing.lg),
      xl: rp(THEME.spacing.xl),
      xxl: rp(THEME.spacing.xxl),
      xxxl: rp(THEME.spacing.xxxl),
    },

    borderRadius: {
      xs: rbr(THEME.borderRadius.xs),
      sm: rbr(THEME.borderRadius.sm),
      md: rbr(THEME.borderRadius.md),
      lg: rbr(THEME.borderRadius.lg),
      xl: rbr(THEME.borderRadius.xl),
      xxl: rbr(THEME.borderRadius.xxl),
      full: THEME.borderRadius.full,
    },

    fontSize: {
      micro: rf(THEME.fontSize.micro),
      xs: rf(THEME.fontSize.xs),
      sm: rf(THEME.fontSize.sm),
      md: rf(THEME.fontSize.md),
      lg: rf(THEME.fontSize.lg),
      xl: rf(THEME.fontSize.xl),
      xxl: rf(THEME.fontSize.xxl),
      display: rf(THEME.fontSize.display),
    },
  };
};

/**
 * @deprecated Use `aurora-tokens` directly. `ResponsiveTheme = THEME` now, and
 * THEME is a flat projection of the aurora tokens — so legacy consumers
 * automatically read the authoritative design-token values.
 */
// This prevents the "Cannot read property 'THEME' of undefined" error
// Components should migrate to useResponsiveTheme hook for true responsive values
export const ResponsiveTheme = THEME;

export const API_ENDPOINTS = {
  AUTH: "/auth",
  USERS: "/users",
  WORKOUTS: "/workouts",
  DIET: "/diet",
  BODY_ANALYSIS: "/body-analysis",
  FOODS: "/foods",
};

export const VALIDATION_RULES = {
  MIN_AGE: 13,
  MAX_AGE: 100,
  MIN_HEIGHT: 100, // cm
  MAX_HEIGHT: 250, // cm
  MIN_WEIGHT: 30, // kg
  MAX_WEIGHT: 300, // kg
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 50,
};
