/**
 * useTopSafeAreaInset
 *
 * Single source of truth for "how much top padding clears the status bar"
 * on screens whose wrapping SafeAreaView only owns the bottom edge (so the
 * header component itself is responsible for clearing the status bar).
 *
 * useSafeAreaInsets().top can report 0 before SafeAreaProvider has measured
 * (e.g. certain Expo Go / device configs), which would let content render
 * behind the status bar. This falls back to StatusBar.currentHeight
 * (Android) and a 24px floor so content always clears the bar even when the
 * inset is unavailable.
 *
 * This fallback formula was previously hand-copied in
 * src/screens/main/analytics/AnalyticsHeader.tsx, which now uses this hook.
 * src/screens/main/FitnessScreen.tsx (lines ~150-155) still hand-rolls the
 * identical Math.max(insets.top, statusBarHeight, 24) formula inline and
 * passes the result into FitnessHeader as a paddingTop prop — that call
 * site has NOT been migrated to this hook yet, so drift between the two is
 * still possible today. Migrating it is outside this file's own scope
 * (src/screens/main/ is a screen file, not a ui/theme file).
 */
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useTopSafeAreaInset(floor: number = 24): number {
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  return Math.max(insets.top, statusBarHeight, floor);
}

export default useTopSafeAreaInset;
