import { THEME } from './constants';
import { rf, rp, rbr } from './responsive';

// Create responsive theme by applying responsive functions to numeric values
export const ResponsiveTheme = {
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