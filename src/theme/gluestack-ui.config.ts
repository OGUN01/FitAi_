/**
 * Gluestack UI Configuration
 * Custom configuration integrating Aurora design tokens
 */

import { createConfig } from '@gluestack-style/react';
import { colors, typography, spacing, borderRadius, shadows } from './aurora-tokens';

// Gluestack UI configuration with Aurora theme
export const config = createConfig({
  aliases: {
    bg: 'backgroundColor',
    bgColor: 'backgroundColor',
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    pt: 'paddingTop',
    pb: 'paddingBottom',
    pl: 'paddingLeft',
    pr: 'paddingRight',
    m: 'margin',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    mt: 'marginTop',
    mb: 'marginBottom',
    ml: 'marginLeft',
    mr: 'marginRight',
    w: 'width',
    h: 'height',
    minW: 'minWidth',
    minH: 'minHeight',
    maxW: 'maxWidth',
    maxH: 'maxHeight',
    rounded: 'borderRadius',
  },
  tokens: {
    colors: {
      // Primary colors
      primary0: colors.primary[50],
      primary50: colors.primary[100],
      primary100: colors.primary[200],
      primary200: colors.primary[300],
      primary300: colors.primary[400],
      primary400: colors.primary[500],
      primary500: colors.primary[600],
      primary600: colors.primary[700],
      primary700: colors.primary[800],
      primary800: colors.primary[900],
      primary900: colors.primary[900],

      // Secondary colors
      secondary0: colors.secondary[50],
      secondary50: colors.secondary[100],
      secondary100: colors.secondary[200],
      secondary200: colors.secondary[300],
      secondary300: colors.secondary[400],
      secondary400: colors.secondary[500],
      secondary500: colors.secondary[600],
      secondary600: colors.secondary[700],
      secondary700: colors.secondary[800],
      secondary800: colors.secondary[900],
      secondary900: colors.secondary[900],

      // Background colors
      backgroundPrimary: colors.background.DEFAULT,
      backgroundSecondary: colors.background.secondary,
      backgroundTertiary: colors.background.tertiary,

      // Text colors
      textPrimary: colors.text.primary,
      textSecondary: colors.text.secondary,
      textMuted: colors.text.muted,
      textDisabled: colors.text.disabled,

      // Status colors
      success: colors.success.DEFAULT,
      successLight: colors.success.light,
      successDark: colors.success.dark,
      warning: colors.warning.DEFAULT,
      warningLight: colors.warning.light,
      warningDark: colors.warning.dark,
      error: colors.error.DEFAULT,
      errorLight: colors.error.light,
      errorDark: colors.error.dark,
      info: colors.info.DEFAULT,
      infoLight: colors.info.light,
      infoDark: colors.info.dark,

      // Glass colors
      glassBackground: colors.glass.background,
      glassBorder: colors.glass.border,

      // Aurora colors
      auroraSpaceBase: colors.aurora.space.base,
      auroraSpaceMid: colors.aurora.space.mid,
      auroraSpaceHigh: colors.aurora.space.high,
      auroraPurpleBase: colors.aurora.purple.base,
      auroraPurpleMid: colors.aurora.purple.mid,
      auroraPurpleHigh: colors.aurora.purple.high,
      auroraOceanBase: colors.aurora.ocean.base,
      auroraOceanMid: colors.aurora.ocean.mid,
      auroraOceanHigh: colors.aurora.ocean.high,
    },
    space: {
      'px': '1px',
      '0': 0,
      '0.5': 2,
      '1': 4,
      '1.5': 6,
      '2': 8,
      '2.5': 10,
      '3': 12,
      '3.5': 14,
      '4': 16,
      '5': 20,
      '6': 24,
      '7': 28,
      '8': 32,
      '9': 36,
      '10': 40,
      '12': 48,
      '16': 64,
      '20': 80,
      '24': 96,
      '32': 128,
      'xs': spacing.xs,
      'sm': spacing.sm,
      'md': spacing.md,
      'lg': spacing.lg,
      'xl': spacing.xl,
      'xxl': spacing.xxl,
      'xxxl': spacing.xxxl,
    },
    borderRadius: {
      'none': 0,
      'xs': 2,
      'sm': borderRadius.sm,
      'md': borderRadius.md,
      'lg': borderRadius.lg,
      'xl': borderRadius.xl,
      'xxl': borderRadius.xxl,
      'full': borderRadius.full,
    },
    fontSizes: {
      'micro': typography.fontSize.micro,
      'caption': typography.fontSize.caption,
      'body': typography.fontSize.body,
      'h3': typography.fontSize.h3,
      'h2': typography.fontSize.h2,
      'h1': typography.fontSize.h1,
      'display': typography.fontSize.display,
    },
    fontWeights: {
      'light': typography.fontWeight.light,
      'regular': typography.fontWeight.regular,
      'medium': typography.fontWeight.medium,
      'semibold': typography.fontWeight.semibold,
      'bold': typography.fontWeight.bold,
      'extrabold': typography.fontWeight.extrabold,
    },
    lineHeights: {
      'tight': typography.lineHeight.tight,
      'normal': typography.lineHeight.normal,
      'relaxed': typography.lineHeight.relaxed,
    },
  },
  globalStyle: {
    variants: {
      hardShadow: {
        '1': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: -2,
            height: 2,
          },
          shadowRadius: 8,
          shadowOpacity: 0.5,
          elevation: 10,
        },
        '2': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowRadius: 8,
          shadowOpacity: 0.5,
          elevation: 10,
        },
        '3': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 2,
            height: 2,
          },
          shadowRadius: 8,
          shadowOpacity: 0.5,
          elevation: 10,
        },
        '4': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowRadius: 8,
          shadowOpacity: 0.5,
          elevation: 10,
        },
        '5': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowRadius: 8,
          shadowOpacity: 0.5,
          elevation: 10,
        },
      },
      softShadow: {
        '1': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowRadius: 10,
          shadowOpacity: 0.1,
          _android: {
            shadowColor: '$backgroundDark500',
            elevation: 5,
            shadowOpacity: 0.05,
          },
        },
        '2': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowRadius: 20,
          elevation: 3,
          shadowOpacity: 0.1,
          _android: {
            shadowColor: '$backgroundDark500',
            elevation: 10,
            shadowOpacity: 0.1,
          },
        },
        '3': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowRadius: 30,
          shadowOpacity: 0.1,
          elevation: 4,
          _android: {
            shadowColor: '$backgroundDark500',
            elevation: 15,
            shadowOpacity: 0.15,
          },
        },
        '4': {
          shadowColor: '$backgroundDark950',
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowRadius: 40,
          shadowOpacity: 0.1,
          elevation: 10,
          _android: {
            shadowColor: '$backgroundDark500',
            elevation: 20,
            shadowOpacity: 0.2,
          },
        },
      },
    },
  },
});

export type Config = typeof config;
export type ConfigType = Config['theme'];

// Export default
export default config;
