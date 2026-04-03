/**
 * LEGACY ONBOARDING TYPES
 *
 * Re-exports from the canonical source in src/types/onboarding.ts
 * This file previously held a stripped-down duplicate of OnboardingReviewData.
 * The canonical (full) definition lives in src/types/onboarding.ts.
 */

// Re-export from the canonical source so any barrel-imported consumers
// get the full, up-to-date type instead of a stale subset.
export type { OnboardingReviewData } from "../onboarding";
