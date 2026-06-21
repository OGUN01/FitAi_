import { ResponsiveTheme, THEME } from "../../utils/constants";
import {
  colors as auroraColors,
  spacing as auroraSpacing,
  borderRadius as auroraBorderRadius,
} from "../../theme/aurora-tokens";

describe("Token SSOT — ResponsiveTheme delegates to aurora-tokens", () => {
  it("THEME === ResponsiveTheme (back-compat alias)", () => {
    expect(THEME).toBe(ResponsiveTheme);
  });

  it("color values are sourced from aurora tokens", () => {
    expect(ResponsiveTheme.colors.primary).toBe(auroraColors.primary.DEFAULT);
    expect(ResponsiveTheme.colors.primaryDark).toBe(auroraColors.primary.dark);
    expect(ResponsiveTheme.colors.background).toBe(auroraColors.background.DEFAULT);
    expect(ResponsiveTheme.colors.text).toBe(auroraColors.text.primary);
    expect(ResponsiveTheme.colors.textSecondary).toBe(auroraColors.text.secondary);
    expect(ResponsiveTheme.colors.success).toBe(auroraColors.success.DEFAULT);
    expect(ResponsiveTheme.colors.glassSurface).toBe(auroraColors.glass.backgroundDark);
    expect(ResponsiveTheme.colors.glassBorder).toBe(auroraColors.glass.border);
  });

  it("spacing + borderRadius delegate to aurora tokens", () => {
    expect(ResponsiveTheme.spacing.md).toBe(auroraSpacing.md);
    expect(ResponsiveTheme.spacing.xl).toBe(auroraSpacing.xl);
    expect(ResponsiveTheme.borderRadius.lg).toBe(auroraBorderRadius.lg);
  });
});
