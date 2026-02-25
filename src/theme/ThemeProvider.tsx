/**
 * Aurora ThemeProvider
 * React Context provider that exposes Aurora design tokens to all components.
 * Dark theme only — no light/dark toggle.
 */

import React, { createContext, useMemo } from "react";
import { auroraTokens } from "./aurora-tokens";
import { gradients } from "./gradients";
import { animations } from "./animations";

const auroraThemeValue = {
  ...auroraTokens,
  gradients,
  animations,
} as const;

/** The full Aurora theme shape exposed via context */
export type AuroraThemeContextValue = typeof auroraThemeValue;

/**
 * React Context for Aurora theme tokens.
 * Default value is the full token set so components work
 * even if rendered outside a ThemeProvider (e.g. unit tests).
 */
export const ThemeContext =
  createContext<AuroraThemeContextValue>(auroraThemeValue);
ThemeContext.displayName = "AuroraThemeContext";

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider — wrap your app root to provide Aurora tokens to all descendants.
 *
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme = useMemo(() => auroraThemeValue, []);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

export default ThemeProvider;
