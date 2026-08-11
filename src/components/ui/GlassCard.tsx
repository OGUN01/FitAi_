/**
 * GlassCard — re-export of the canonical aurora implementation.
 *
 * This file used to be a second, divergent GlassCard (bare Pressable, no
 * gradient-border rendering, no accessibilityLabel/Hint) that no production
 * screen imported — every one of the app's 90+ GlassCard usages already
 * resolve to `ui/aurora/GlassCard`. Rather than maintain two implementations
 * with different feature sets, this now just re-exports the aurora version
 * so any lingering import of this path (and the jest.mock in
 * __tests__/components/chrome/TouchChrome.test.tsx) keeps working.
 *
 * Prefer importing from `./aurora/GlassCard` (or the `ui` barrel) directly
 * in new code.
 */

export { GlassCard, default } from "./aurora/GlassCard";
