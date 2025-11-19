/**
 * Aurora Gradient Presets
 * Gradient configurations for backgrounds, buttons, and card borders
 */

import { colors } from './aurora-tokens';

// Type definition for gradient configuration
export interface GradientConfig {
  colors: string[];
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  angle?: number;
}

// Primary Gradients
export const gradientPrimary: GradientConfig = {
  colors: [colors.primary[600], colors.primary[500]],
  locations: [0, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  angle: 135,
};

export const gradientSecondary: GradientConfig = {
  colors: [colors.secondary.DEFAULT, colors.secondary.light],
  locations: [0, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  angle: 135,
};

// Aurora Background Gradients
export const gradientAuroraSpace: GradientConfig = {
  colors: [
    colors.aurora.space.base,
    colors.aurora.space.mid,
    colors.aurora.space.high,
  ],
  locations: [0, 0.5, 1],
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  angle: 180,
};

export const gradientAuroraPurple: GradientConfig = {
  colors: [
    colors.aurora.purple.base,
    colors.aurora.purple.mid,
    colors.aurora.purple.high,
  ],
  locations: [0, 0.5, 1],
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  angle: 180,
};

export const gradientAuroraOcean: GradientConfig = {
  colors: [
    colors.aurora.ocean.base,
    colors.aurora.ocean.mid,
    colors.aurora.ocean.high,
  ],
  locations: [0, 0.5, 1],
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
  angle: 180,
};

// Northern Lights gradient (animated, multi-color)
export const gradientNorthernLights: GradientConfig = {
  colors: [
    '#1C0A1F', // Deep purple
    '#2E1A2F', // Purple
    '#0A1F1C', // Teal
    '#1A2F2E', // Blue-teal
    '#0A0F1C', // Deep blue
  ],
  locations: [0, 0.25, 0.5, 0.75, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  angle: 45,
};

// Glass gradient overlay
export const gradientGlass: GradientConfig = {
  colors: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
  locations: [0, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  angle: 135,
};

// Button gradients
export const gradientButton = {
  primary: gradientPrimary,
  secondary: gradientSecondary,
  success: {
    colors: [colors.success.DEFAULT, colors.success.light],
    locations: [0, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 135,
  } as GradientConfig,
  warning: {
    colors: [colors.warning.DEFAULT, colors.warning.light],
    locations: [0, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 135,
  } as GradientConfig,
  error: {
    colors: [colors.error.DEFAULT, colors.error.light],
    locations: [0, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    angle: 135,
  } as GradientConfig,
};

// Card border gradients
export const gradientBorder = {
  primary: {
    colors: [colors.primary[600], colors.primary[500], colors.secondary[500]],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    angle: 90,
  } as GradientConfig,
  glass: {
    colors: [
      'rgba(255, 255, 255, 0.18)',
      'rgba(255, 255, 255, 0.1)',
      'rgba(255, 255, 255, 0.18)',
    ],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    angle: 90,
  } as GradientConfig,
};

// Overlay gradients for hero images
export const gradientOverlay = {
  dark: {
    colors: ['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.3)'],
    locations: [0, 1],
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
    angle: 180,
  } as GradientConfig,
  primary: {
    colors: [
      `${colors.primary[900]}CC`,
      `${colors.primary[700]}66`,
      'transparent',
    ],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
    angle: 180,
  } as GradientConfig,
  secondary: {
    colors: [
      `${colors.secondary[900]}CC`,
      `${colors.secondary[700]}66`,
      'transparent',
    ],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 1 },
    end: { x: 0, y: 0 },
    angle: 180,
  } as GradientConfig,
};

// Progress ring gradients
export const gradientProgressRing = {
  primary: {
    colors: [colors.primary[500], colors.primary[700]],
    locations: [0, 1],
  } as GradientConfig,
  secondary: {
    colors: [colors.secondary[500], colors.secondary[700]],
    locations: [0, 1],
  } as GradientConfig,
  success: {
    colors: [colors.success.light, colors.success.dark],
    locations: [0, 1],
  } as GradientConfig,
  multiColor: {
    colors: [
      colors.primary[500],
      colors.secondary[500],
      colors.success.DEFAULT,
    ],
    locations: [0, 0.5, 1],
  } as GradientConfig,
};

// Export all gradients
export const gradients = {
  primary: gradientPrimary,
  secondary: gradientSecondary,
  aurora: {
    space: gradientAuroraSpace,
    purple: gradientAuroraPurple,
    ocean: gradientAuroraOcean,
    northernLights: gradientNorthernLights,
  },
  glass: gradientGlass,
  button: gradientButton,
  border: gradientBorder,
  overlay: gradientOverlay,
  progressRing: gradientProgressRing,
};

// Helper function to convert gradient to LinearGradient props
export const toLinearGradientProps = (gradient: GradientConfig) => ({
  colors: gradient.colors,
  locations: gradient.locations,
  start: gradient.start,
  end: gradient.end,
});

// Aurora theme variants for easy switching
export type AuroraTheme = 'space' | 'purple' | 'ocean' | 'northernLights';

export const getAuroraGradient = (theme: AuroraTheme): GradientConfig => {
  switch (theme) {
    case 'space':
      return gradientAuroraSpace;
    case 'purple':
      return gradientAuroraPurple;
    case 'ocean':
      return gradientAuroraOcean;
    case 'northernLights':
      return gradientNorthernLights;
    default:
      return gradientAuroraSpace;
  }
};
