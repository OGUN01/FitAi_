## Task Statement

Continue the architecture rollout with the health/profile/read-model consolidation batch.

## Desired Outcome

Remove the remaining duplicated mutable truths around:
- weight and body metrics
- health sync result handling
- profile/body fallback precedence
- residual streak/read-model shadow copies

## Known Facts / Evidence

- Nutrition/offline foundation is complete.
- Local day/week contract is complete.
- Workout identity cleanup is locally landed.
- Subscription/config/auth truth slice is locally landed.
- Remaining audit findings in this area include:
  - health sync can report success while writing empty or duplicated data
  - weight is still written and read from multiple stores/services
  - profile/body data still has duplicated fallback paths
  - current streak still exists in multiple places outside its intended authority

## Constraints

- Preserve the new shared local day/week contract.
- Avoid introducing a new “one more copy” of weight or streak data.
- Prefer one canonical writer and one canonical reader path per concept.

## Likely Codebase Touchpoints

- `src/stores/healthDataStore.ts`
- `src/stores/analyticsStore.ts`
- `src/services/WeightTrackingService.ts`
- `src/hooks/useDashboardData.ts`
- `src/screens/main/AnalyticsScreen.tsx`
- `src/hooks/useProgressScreen.ts`
- `src/services/userProfile.ts`
- `src/utils/integration.ts`
- `src/hooks/useCalculatedMetrics.ts`

## Batch Strategy

1. Decide and enforce canonical ownership for weight/body metrics.
2. Fix health sync success semantics so success means real provider data applied.
3. Remove residual shadow readers and fallback chains where possible.
