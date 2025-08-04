import { useMemo } from 'react';
import { THEME, createResponsiveTheme } from '../utils/constants';

/**
 * Safe responsive theme hook
 * Calculates responsive values at runtime, not module load time
 * Prevents crashes during app initialization
 */
export const useResponsiveTheme = () => {
  return useMemo(() => {
    try {
      return createResponsiveTheme();
    } catch (error) {
      console.warn('ResponsiveTheme calculation failed, using base theme:', error);
      return THEME; // Fallback to base theme
    }
  }, []); // Empty dependency array - calculate once per component
};

/**
 * Hook for creating safe responsive styles at runtime
 * Use this in components instead of direct ResponsiveTheme usage in StyleSheet.create
 */
export const useResponsiveStyles = <T extends Record<string, any>>(
  styleCreator: (theme: ReturnType<typeof createResponsiveTheme>) => T
) => {
  const theme = useResponsiveTheme();
  
  return useMemo(() => {
    try {
      return styleCreator(theme);
    } catch (error) {
      console.warn('Failed to create responsive styles, using base theme:', error);
      return styleCreator(THEME as any);
    }
  }, [theme, styleCreator]);
};

// For backwards compatibility - use base theme for immediate needs
export const ResponsiveTheme = THEME;
