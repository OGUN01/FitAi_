// App Constants
// This file contains all application constants

export const APP_CONFIG = {
  NAME: "FitAI",
  VERSION: "0.1.6",
  API_TIMEOUT: 10000,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
};

/** @deprecated Use aurora-tokens from src/theme/aurora-tokens.ts instead. This object has ZERO consumers as of Wave 5. */
// Dark Cosmic Theme - DEPRECATED (replaced by Aurora Design System)
// Export with explicit type for better Metro bundler compatibility
export const THEME = {
  colors: {
    // Primary Colors - Aurora Orange (FitAI Brand)
    primary: "#FF6B35", // Aurora Orange
    primaryDark: "#E55A2B", // Aurora Dark
    primaryLight: "#FF8A5C", // Aurora Light
    primaryFaded: "rgba(255, 107, 53, 0.3)", // Primary with transparency

    // Secondary Colors - Aurora Cyan
    secondary: "#00D4FF", // Cyan
    secondaryDark: "#00B8D9", // Cyan Dark
    secondaryLight: "#4DE5FF", // Cyan Light

    // Background Colors
    background: "#0a0f1c", // Deep dark blue
    backgroundSecondary: "#1a1f2e", // Slightly lighter dark
    backgroundTertiary: "#252a3a", // Card backgrounds

    // Surface Colors
    surface: "#1e2332",
    surfaceLight: "#2a2f3f",

    // Text Colors
    text: "#ffffff", // Primary white text
    textSecondary: "#b0b0b0", // Secondary gray text
    textMuted: "#8a8a8a", // Muted text
    textTertiary: "#6a6a6a", // Tertiary text

    // Status Colors
    success: "#4caf50",
    warning: "#ff9800",
    error: "#f44336",
    info: "#2196f3",
    accent: "#FF8A5C", // Accent color (same as primaryLight)

    // Extended Status Colors
    successAlt: "#10B981",       // Tailwind green-500
    successAltDark: "#059669",   // Tailwind green-600
    successLight: "#8BC34A",     // Material light green
    errorLight: "#FF6B6B",       // Soft red / destructive accent
    errorAlt: "#EF4444",         // Tailwind red-500
    warningAlt: "#F59E0B",       // Tailwind amber-500

    // Accent Colors
    gold: "#FFD700",             // Achievement / gold star
    amber: "#FFC107",            // Carbs / material amber
    teal: "#4ECDC4",             // Teal macro
    pink: "#EC4899",             // Pink accent
    cyan: "#06B6D4",             // Cyan accent
    neutral: "#9E9E9E",          // Neutral/muted icon
    purple: "#9333EA",           // Purple accent
    orange: "#F97316",           // Orange accent
    blue: "#3B82F6",             // Blue accent
    amberBright: "#FBBF24",      // Amber bright
    successBright: "#4ADE80",    // Green bright (Tailwind green-400)
    muted: "#9CA3AF",            // Muted gray (Tailwind gray-400)

    // Glass / Surface Effects
    glassSurface: "rgba(255, 255, 255, 0.04)",
    glassBorder: "rgba(255, 255, 255, 0.08)",
    glassHighlight: "rgba(255, 255, 255, 0.1)",

    // Overlay Colors
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayDark: "rgba(0, 0, 0, 0.7)",

    // Tinted Backgrounds
    primaryTint: "rgba(255, 107, 53, 0.1)",
    successTint: "rgba(76, 175, 80, 0.15)",
    errorTint: "rgba(244, 67, 54, 0.15)",
    warningTint: "rgba(255, 152, 0, 0.15)",
    // Utility Colors
    white: "#ffffff",
    black: "#000000",
    transparent: "transparent",

    // Gradient Colors
    gradientStart: "#0a0f1c",
    gradientEnd: "#1a1f2e",

    // Border Colors
    border: "#333844",
    borderLight: "#404552",
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  borderRadius: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },

  fontSize: {
    micro: 12, // Labels, metadata
    xs: 13, // Small labels
    sm: 14, // Caption text
    md: 16, // Body text
    lg: 20, // H3 - Subsection headings
    xl: 24, // H2 - Section headings
    xxl: 32, // H1 - Primary headings
    display: 48, // Display - Hero headings
  },

  fontWeight: {
    light: "300" as "300",
    normal: "400" as "400",
    medium: "500" as "500",
    semibold: "600" as "600",
    bold: "700" as "700",
    extrabold: "800" as "800",
  },

  shadows: {
    sm: {
      // Web-compatible shadow only
      boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.2)",
    },
    md: {
      // Web-compatible shadow only
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.25)",
    },
    lg: {
      // Web-compatible shadow only
      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
    },
  },
};

// ============================================================================
// RESPONSIVE THEME FUNCTIONS
// ============================================================================

/** @deprecated No consumers remain. Use aurora-tokens instead. */
export const createResponsiveTheme = () => {
  // Import responsive functions lazily to avoid circular dependency
  const { rf, rp, rbr } = require("./responsive");

  return {
    ...THEME,

    spacing: {
      xxs: rp(THEME.spacing.xxs),
      xs: rp(THEME.spacing.xs),
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

/** @deprecated No consumers remain. Use aurora-tokens instead. */
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
