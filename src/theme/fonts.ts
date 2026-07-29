/**
 * Font System — Manrope (OFL, free for commercial use)
 *
 * The brand typeface, applied app-wide. Each Manrope weight is a SEPARATE
 * native font family (React Native does NOT auto-select a weight file from a
 * `fontWeight` style), so we:
 *
 *   1. Load all 6 weights at the app root via `useFonts` (@expo-google-fonts/manrope).
 *   2. Set `fontFamily: FONT_FAMILY.regular` on `Text.defaultProps` /
 *      `TextInput.defaultProps` so every text in the app renders Manrope.
 *   3. Use `fontFamilyForWeight()` on display-level text (hero numbers,
 *      titles, CTAs) so those render the TRUE weight instead of the OS
 *      fake-bolding the Regular file.
 *
 * Keep in sync with `typography.fontWeight` in `aurora-tokens.ts` (300–800).
 */

export const FONT_FAMILY = {
  light: 'Manrope_300Light',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export type FontWeightKey = keyof typeof FONT_FAMILY;

/** Map a RN fontWeight string ("400"–"800") to the Manrope family that renders it. */
export const fontFamilyForWeight = (
  weight: keyof typeof FONT_FAMILY | string | undefined
): string => {
  switch (weight) {
    case '300':
    case 'light':
      return FONT_FAMILY.light;
    case '500':
    case 'medium':
      return FONT_FAMILY.medium;
    case '600':
    case 'semibold':
      return FONT_FAMILY.semibold;
    case '700':
    case 'bold':
      return FONT_FAMILY.bold;
    case '800':
    case 'extrabold':
      return FONT_FAMILY.extrabold;
    case '400':
    case 'regular':
    default:
      return FONT_FAMILY.regular;
  }
};
