# Plan: Front-End UI Audit

## Goal
To systematically audit the React Native front-end logic and state management flows for both the Diet and Workout tabs. The backend is verified, so we now must ensure the UI triggers the correct endpoints, handles loading states properly, and updates internal React state (like TodaysMealsSection or WorkoutList) without crashing.

## Context
All Cloudflare Worker endpoints and Supabase interactions for core features (AI Scan, Text Search, Generating Workouts/Meals) are confirmed stable. The remaining risk lies in the client-side UI:
- Do Modals open and close correctly?
- Does clicking "Add Meal" or "Generate Workout" successfully update the local cache/state so the user doesn't need to refresh?
- Are subscription paywalls properly displayed when a 403 error is intercepted?

## Success Criteria
- [ ] Verify AI Meal Scan UI Flow (Camera -> Modal -> State Update)
- [ ] Verify Barcode / Label Scan UI Flows
- [ ] Verify Manual Meal Entry + Portion Adjustments
- [ ] Verify Hydration Tracker operations (animations & state)
- [ ] Verify Workout Tab UI (Starting/Resuming workouts, displaying exercises)
- [ ] Verify Paywall / Feature Limit interception logic in the global API client

## Guardrails
- DO NOT break existing UI designs or Native styling.
- ONLY fix logical bugs (missing re-renders, unhandled promises, state mutations).
- Log any complex visual bugs to the user for manual device testing.

## Tasks

### Wave 1 (Diet Tab UI Flow Verification)
- [x] Task 1: Audit `DietScreen.tsx` and related scanner modals (AI Scan, Barcode, Manual). Check API client usage and state updates.
- [x] Task 2: Audit `HydrationPanel` and `NutritionSummaryCard` for correct prop passing and localized math.
- [x] Task 3: Audit Meal Editing / Deletion state flows.

### Wave 2 (Workout Tab UI Flow Verification)
- [x] Task 4: Audit `WorkoutScreen.tsx` and the Weekly Plan rendering logic (Fixed array vs single object workout rendering).
- [x] Task 5: Audit the "Start/Resume Workout" active session state flow (Fixed Progress loss bug on resume).

### Wave 3 (Global Interceptors)
- [x] Task 6: Audit `fitaiWorkersClient.ts` to ensure 403 errors properly trigger the `PaywallModal` instead of silent failures (Verified catching Error strings).
- [x] Task 7: Check off final items in the global `task.md`.
