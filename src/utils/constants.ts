// App Constants
// This file contains all application constants

export const APP_CONFIG = {
  NAME: 'FitAI',
  VERSION: '0.1.6',
  API_TIMEOUT: 10000,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// Dark Cosmic Theme - Inspired by CultFit Design
// Export with explicit type for better Metro bundler compatibility
export const THEME = {
  colors: {
    // Primary Colors
    primary: '#ff6b35', // Orange/Gold accent
    primaryDark: '#e55a2b',
    primaryLight: '#ff8c5a',

    // Secondary Colors
    secondary: '#00d4ff', // Electric blue
    secondaryDark: '#00b8e6',
    secondaryLight: '#33ddff',

    // Background Colors
    background: '#0a0f1c', // Deep dark blue
    backgroundSecondary: '#1a1f2e', // Slightly lighter dark
    backgroundTertiary: '#252a3a', // Card backgrounds

    // Surface Colors
    surface: '#1e2332',
    surfaceLight: '#2a2f3f',

    // Text Colors
    text: '#ffffff', // Primary white text
    textSecondary: '#b0b0b0', // Secondary gray text
    textMuted: '#8a8a8a', // Muted text

    // Status Colors
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',

    // Utility Colors
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',

    // Gradient Colors
    gradientStart: '#0a0f1c',
    gradientEnd: '#1a1f2e',

    // Border Colors
    border: '#333844',
    borderLight: '#404552',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  shadows: {
    sm: {
      // Web-compatible shadow only
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
    },
    md: {
      // Web-compatible shadow only
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    },
    lg: {
      // Web-compatible shadow only
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    },
  },
};

// ============================================================================
// RESPONSIVE THEME FUNCTIONS
// ============================================================================

// Create responsive theme function - SAFE: no module-level execution
export const createResponsiveTheme = () => {
  // Import responsive functions lazily to avoid circular dependency
  const { rf, rp, rbr } = require('./responsive');

  return {
    ...THEME,

    spacing: {
      xs: rp(THEME.spacing.xs),
      sm: rp(THEME.spacing.sm),
      md: rp(THEME.spacing.md),
      lg: rp(THEME.spacing.lg),
      xl: rp(THEME.spacing.xl),
      xxl: rp(THEME.spacing.xxl),
    },

    borderRadius: {
      sm: rbr(THEME.borderRadius.sm),
      md: rbr(THEME.borderRadius.md),
      lg: rbr(THEME.borderRadius.lg),
      xl: rbr(THEME.borderRadius.xl),
      xxl: rbr(THEME.borderRadius.xxl),
      full: THEME.borderRadius.full,
    },

    fontSize: {
      xs: rf(THEME.fontSize.xs),
      sm: rf(THEME.fontSize.sm),
      md: rf(THEME.fontSize.md),
      lg: rf(THEME.fontSize.lg),
      xl: rf(THEME.fontSize.xl),
      xxl: rf(THEME.fontSize.xxl),
      xxxl: rf(THEME.fontSize.xxxl),
    },
  };
};

// CRITICAL FIX: Export ResponsiveTheme as base THEME to prevent import crashes
// This prevents the "Cannot read property 'THEME' of undefined" error
// Components should migrate to useResponsiveTheme hook for true responsive values
export const ResponsiveTheme = THEME;

export const STORAGE_KEYS = {
  USER_DATA: '@fitai_user_data',
  ONBOARDING_DATA: '@fitai_onboarding_data',
  WORKOUT_DATA: '@fitai_workout_data',
  DIET_DATA: '@fitai_diet_data',
  SETTINGS: '@fitai_settings',
};

export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  WORKOUTS: '/workouts',
  DIET: '/diet',
  BODY_ANALYSIS: '/body-analysis',
  FOODS: '/foods',
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
