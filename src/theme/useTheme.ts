/**
 * useTheme — typed hook for accessing Aurora design tokens from context.
 *
 * Usage:
 * ```ts
 * const { colors, spacing, typography } = useTheme();
 * ```
 */

import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";
import type { AuroraThemeContextValue } from "./ThemeProvider";

/**
 * Returns the full Aurora theme object from the nearest ThemeProvider.
 * Throws a descriptive error if called outside a provider tree.
 */
export function useTheme(): AuroraThemeContextValue {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error(
      "[useTheme] No Aurora theme found. " +
        "Wrap your component tree with <ThemeProvider> from 'src/theme'.",
    );
  }

  return theme;
}

export default useTheme;
