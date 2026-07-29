/**
 * useAppFonts — loads the Manrope brand typeface before the app renders.
 *
 * Each Manrope weight is a SEPARATE native font family (React Native does NOT
 * auto-select a weight file from a `fontWeight` style). The loaded family
 * names come from `@expo-google-fonts/manrope` and MUST match the
 * `FONT_FAMILY` map in `src/theme/fonts.ts`:
 *
 *   Manrope_300Light, Manrope_400Regular, Manrope_500Medium,
 *   Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold
 *
 * NOTE on sources: `assets/fonts/` is currently empty, so the font binaries
 * ship with the installed `@expo-google-fonts/manrope` package (already a
 * dependency — no new packages added). If local `.ttf` files are later placed
 * in `assets/fonts/`, swap the package imports for `require('../../assets/fonts/...')`
 * while keeping the SAME family-name keys so `FONT_FAMILY` stays in sync.
 */
import {
  useFonts,
  Manrope_300Light,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

export type UseAppFontsResult = {
  fontsLoaded: boolean;
  fontError: Error | null;
};

export const useAppFonts = (): UseAppFontsResult => {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  return { fontsLoaded, fontError };
};

export default useAppFonts;
