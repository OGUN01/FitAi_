/**
 * onboardingStagger — canonical entrance-animation timing for onboarding tab
 * sections.
 *
 * Every onboarding tab previously hand-rolled its own FadeInDown duration +
 * stagger-step constants instead of sharing one rhythm: PersonalInfoTab used
 * 360ms/70ms, DietPreferencesTab 420ms/60ms, WorkoutPreferencesTab
 * 280ms/(60ms + index*50ms), and AdvancedReviewTab a flat 300ms/600ms delay
 * with no stagger at all. The pacing of the "content arriving" motion
 * subtly changed step to step through the single most important flow in the
 * app.
 *
 * This helper is built on the canonical `duration`/`stagger` scale already
 * defined in src/theme/animations.ts (the intended single source of truth
 * for exactly this) so all onboarding tabs share one entrance rhythm.
 */
import { FadeInDown } from "react-native-reanimated";
import { animations } from "../../../theme/animations";

export const ONBOARDING_ENTER_DURATION = animations.duration.normal;
export const ONBOARDING_STAGGER_MS = animations.stagger.delay;

/**
 * Returns the `entering` prop for the section at `index` within a tab's
 * top-level stagger sequence (0-based).
 */
export const onboardingStagger = (index: number) =>
  FadeInDown.duration(ONBOARDING_ENTER_DURATION).delay(
    ONBOARDING_STAGGER_MS * index,
  );
