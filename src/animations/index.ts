/**
 * Animation token system — canonical entry point.
 *
 * The actual duration/easing/spring/scale constants live in
 * `src/theme/animations.ts` (that file predates the `src/animations/`
 * ownership convention). This module re-exports it under the path that
 * accessibility/perf/motion tooling is scoped to own, so future audit rounds
 * targeting "animation consistency" (ad hoc `withSpring({damping, stiffness})`
 * literals bypassing the shared `springConfig` presets) have an editable path
 * instead of being perpetually cross-domain-only.
 *
 * Prefer importing from here for new code; existing `theme/animations`
 * imports continue to work unchanged.
 */
export * from '../theme/animations';
export { animations as default } from '../theme/animations';
