## Task Statement

Investigate and fix the application's perceived slowness, especially the roughly one-second delay when opening screens after a tap, while preserving existing behavior.

## Desired Outcome

The app should feel materially faster during first interaction and tab/screen transitions, with high-confidence regression protection and verification evidence.

## Known Facts / Evidence

- User reports first-click / first-open latency around one second.
- `App.tsx` performs substantial eager startup work: auth, app-config, onboarding, subscription, backend/offline initialization, notification-store loading, multiple safety timers.
- `src/components/navigation/MainNavigation.tsx` eagerly imports all primary tab screens and several session screens into the main bundle.
- `src/screens/main/HomeScreen.tsx` mounts a large dashboard with many sections and hooks.
- `src/screens/main/DietScreen.tsx` mounts multiple heavy hooks (`useMealPlanning`, `useNutritionTracking`, `useAIMealGeneration`) and many modal flows.
- The worktree already contains unrelated user changes; those must be preserved.

## Constraints

- Do not break behavior.
- No new dependencies.
- Keep diffs small, reversible, and reviewable.
- Run lint, typecheck, tests, and static analysis after changes when practical.
- Ralph workflow requires planning artifacts and verification evidence before completion.

## Unknowns / Open Questions

- Which delay is dominant: bundle parse/import cost, initial screen mount cost, data-fetch side effects, or avoidable rerenders?
- Whether first-open latency is concentrated on one tab (likely `diet` / `analytics`) or shared across multiple tabs.
- Which existing tests already cover navigation/tab behavior sufficiently.

## Likely Touchpoints

- `D:\FitAi\FitAI\App.tsx`
- `D:\FitAi\FitAI\src\components\navigation\MainNavigation.tsx`
- `D:\FitAi\FitAI\src\screens\main\HomeScreen.tsx`
- `D:\FitAi\FitAI\src\screens\main\DietScreen.tsx`
- `D:\FitAi\FitAI\src\screens\main\AnalyticsScreen.tsx`
- `D:\FitAi\FitAI\src\hooks\useHomeLogic.ts`
- `D:\FitAi\FitAI\src\hooks\useMealPlanning.ts`
- `D:\FitAi\FitAI\src\hooks\useNutritionTracking.ts`
- `D:\FitAi\FitAI\src\hooks\useAIMealGeneration.ts`
