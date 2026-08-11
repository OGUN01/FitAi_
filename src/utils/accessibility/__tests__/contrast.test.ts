import { checkContrast, getContrastRatio } from "../contrast";
import { colors, flatColors } from "../../../theme/aurora-tokens";

/**
 * Contrast gate — walks the app's real Aurora color tokens and asserts every
 * documented text/background pairing clears WCAG AA (4.5:1).
 *
 * Before this test existed, `checkContrast` (and its predecessors
 * `getContrastRatio`/`meetsWCAG_AA`/`meetsWCAG_AAA`/`validateTextContrast`)
 * had zero callers anywhere in the app — nothing actually verified that any
 * text/background pair cleared WCAG at runtime or build time. This is the
 * enforcement.
 *
 * Scope: the three "readable body text" colors (primary/secondary/tertiary)
 * against the three background elevation tiers they are actually painted on
 * (screen background, card surface, raised surface). `text.disabled` is
 * intentionally excluded — WCAG 1.4.3 exempts disabled UI text from the
 * contrast requirement.
 */
describe("color token contrast (WCAG AA)", () => {
  const backgrounds: Record<string, string> = {
    background: colors.background.DEFAULT,
    backgroundSecondary: colors.background.secondary,
    backgroundTertiary: colors.background.tertiary,
  };

  const textColors: Record<string, string> = {
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    textTertiary: colors.text.tertiary,
  };

  Object.entries(textColors).forEach(([textName, textColor]) => {
    Object.entries(backgrounds).forEach(([bgName, bgColor]) => {
      it(`${textName} (${textColor}) on ${bgName} (${bgColor}) clears 4.5:1`, () => {
        const result = checkContrast(textColor, bgColor, "AA", false);
        expect(result.ratio).toBeGreaterThanOrEqual(result.requiredRatio);
        expect(result.passes).toBe(true);
      });
    });
  });

  it("flatColors text tokens are sourced from the same nested colors (no drift)", () => {
    expect(flatColors.text).toBe(colors.text.primary);
    expect(flatColors.textSecondary).toBe(colors.text.secondary);
    expect(flatColors.textMuted).toBe(colors.text.muted);
    expect(flatColors.textTertiary).toBe(colors.text.tertiary);
  });

  it("getContrastRatio is symmetric regardless of argument order", () => {
    const a = getContrastRatio(colors.text.primary, colors.background.DEFAULT);
    const b = getContrastRatio(colors.background.DEFAULT, colors.text.primary);
    expect(a).toBeCloseTo(b, 5);
  });
});
