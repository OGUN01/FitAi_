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
    DEFAULT: '#FF6B35',
    light: '#FF8A5C',
    dark: '#E55A2B',
    50: '#FFF5F2',
    100: '#FFEAE3',
    200: '#FFD4C7',
    300: '#FFBFAB',
    400: '#FFA58F',
    500: '#FF8A5C',
    600: '#FF6B35',
    700: '#E55A2B',
    800: '#CC4A21',
    900: '#B33A17',
  },

  // Secondary palette - Electric Cyan
  secondary: {
    DEFAULT: '#00D4FF',
    light: '#00FFFF',
    dark: '#00B8E6',
    50: '#E6FBFF',
    100: '#CCF7FF',
    200: '#99EFFF',
    300: '#66E7FF',
    400: '#33DFFF',
    500: '#00D4FF',
    600: '#00B8E6',
    700: '#009DCC',
    800: '#0081B3',
    900: '#006699',
  },

  // Aurora background themes
  aurora: {
    space: {
      base: '#0A0F1C',
      mid: '#1A1F2E',
      high: '#252A3A',
    },
    purple: {
      base: '#1C0A1F',
      mid: '#2E1A2F',
      high: '#3A252F',
    },
    ocean: {
      base: '#0A1F1C',
      mid: '#1A2F2E',
      high: '#253A3A',
    },
  },

  // Background system
  background: {
    DEFAULT: '#0A0F1C',
    secondary: '#1A1F2E',
    tertiary: '#252A3A',
  },

  // Text color system
  text: {
    primary: '#FFFFFF',
    secondary: '#B0B0B0',
    muted: '#8A8A8A',
    disabled: '#5A5A5A',
  },

  // Status colors
  success: {
    DEFAULT: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
  },
  warning: {
    DEFAULT: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
  },
  error: {
    DEFAULT: '#F44336',
    light: '#E57373',
    dark: '#D32F2F',
  },
  info: {
    DEFAULT: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
  },

  // Glass surface colors
  glass: {
    background: 'rgba(255, 255, 255, 0.1)',
    backgroundLight: 'rgba(255, 255, 255, 0.15)',
    backgroundDark: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.18)',
    surface: 'rgba(255, 255, 255, 0.1)', // Default glass surface
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
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Spacing System (8pt grid)
export const spacing = {
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// Shadow System (8 levels)
export const shadows = {
  level1: {
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    shadowOpacity: 0.1,
    shadowColor: '#000000',
    elevation: 1,
  },
  level2: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 0.15,
    shadowColor: '#000000',
    elevation: 2,
  },
  level3: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.2,
    shadowColor: '#000000',
    elevation: 3,
  },
  level4: {
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    shadowOpacity: 0.25,
    shadowColor: '#000000',
    elevation: 4,
  },
  level5: {
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.3,
    shadowColor: '#000000',
    elevation: 5,
  },
  level6: {
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    shadowOpacity: 0.35,
    shadowColor: '#000000',
    elevation: 6,
  },
  level7: {
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    shadowOpacity: 0.4,
    shadowColor: '#000000',
    elevation: 7,
  },
  level8: {
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 48,
    shadowOpacity: 0.45,
    shadowColor: '#000000',
    elevation: 8,
  },
  glass: {
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
    shadowOpacity: 0.37,
    shadowColor: '#000000',
    elevation: 4,
  },
} as const;

// Glass Surface Specifications
export const glassSurface = {
  blur: {
    default: 20,
    light: 10,
    heavy: 30,
  },
  background: 'rgba(255, 255, 255, 0.1)',
  border: 'rgba(255, 255, 255, 0.18)',
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

// Type exports for TypeScript
export type AuroraTokens = typeof auroraTokens;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
export type GlassSurface = typeof glassSurface;
export type Animation = typeof animation;
