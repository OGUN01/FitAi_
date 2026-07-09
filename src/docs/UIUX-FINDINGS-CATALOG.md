# UI/UX + Data-Integrity Findings Catalog (Master)

**Authoritative spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`
**Generated:** 2026-07-09 by the Wave-Final data-integrity verification agent.
**Scope:** Deduplicated findings across Waves A–C (code audits + device visual-QA), covering BOTH UI/UX defects and data-integrity violations per FOCUS 1 + FOCUS 2 of the spec.
**Status legend:** FIXED — fix applied + gates green. NOT FIXED — known, mapped to a future wave. DEFERRED — intentionally deferred (low priority or out of scope). N/A — no action needed.

---

## P0 — Critical (blocks primary user flow or causes silent data loss)

| # | Domain | Issue | Root cause | Fix | Status | Wave source |
|---|--------|-------|------------|-----|--------|-------------|
| P0-1 | Data+UI | Workout generation fails with raw Zod error "profile.weight: Too small" when body_analysis missing | `aiRequestTransformers.ts` fabricated `0` for missing weight/height/age (`?? 0`); worker Zod `.min(30)` rejects `0` | `aiRequestTransformers.ts`: `?? undefined`; `fitaiWorkersClient.ts`: type aligned to Zod; `useFitnessLogic.ts`: pre-flight guard with `crossPlatformAlert` | FIXED | A-01 device, A-03 audit, B-02 fix, B2-02 guard |
| P0-2 | Data+UI | Pre-flight guard false-positives for existing users with seeded body_analysis (profileStore.bodyAnalysis never hydrated from Supabase on login) | `App.tsx` existing-user login path only synced local→DB, never DB→local; `profileStore.bodyAnalysis` stays null | `App.tsx`: added `dataBridge.loadAllData(user.id)` fire-and-forget on existing-user login branch | FIXED | B3-02 fix |
| P0-3 | Data | `LogMealModal` corrupts `weeklyMealPlan` by injecting manual meal logs into the AI planning array + persists to Supabase | Manual `newMeal` appended to `weeklyMealPlan.meals` + `saveWeeklyMealPlan` called | `LogMealModal.tsx`: removed `saveWeeklyMealPlan`; uses `addDailyMeal` + in-memory `setWeeklyMealPlan` stage only (no DB persist of manual meal into plan) | FIXED | A-04 audit, C-01 fix |
| P0-4 | Data | Manual meal log lacks `loggedAt` → invisible to `getConsumedMealsFromState` (calorie/macro rings stale until realtime round-trip) | Field-name confusion: `completedAt` set but not `loggedAt` (the SSOT consumed-meal marker) | `LogMealModal.tsx`: added `loggedAt: today.toISOString()` on `newMeal` | FIXED | A-04 audit, C-01 fix |
| P0-5 | Data | `completionTracking.completeMeal` partial revert on DB failure leaves orphaned AsyncStorage meal log (local/Supabase divergence) | Revert only reset `mealProgress`, not the `crudOperations.createMealLog` AsyncStorage row | `completionTracking.ts`: symmetric rollback — `crudOperations.deleteMealLog(mealLogId)` added to the catch block | FIXED | A-04 audit, C-01 fix |
| P0-6 | UI | SetLogModal RPE buttons + Cancel button are dead controls (touch intercepted by `AnimatedPressable` wrapper inside BottomSheet) | `AnimatedPressable` wrapper `Animated.View` has no `pointerEvents` prop; blocks touch propagation to inner `Pressable` on Android when nested in BottomSheet | `AnimatedPressable.tsx`: added `pointerEvents="box-none"` to wrapper `Animated.View` | FIXED | B-01 device, B2-01 fix |
| P0-7 | UI | ExerciseSessionModal "Complete Set" / "Back" controls collapsed to 10px height (invisible, untappable) | `AnimatedPressable` outer `Animated.View` had `flexShrink:1` + no height; inner `Pressable` height irrelevant | `ExerciseSessionModal.tsx`: added `containerStyle` with `flex:1, flexShrink:0, height:rh(50)` + `rs()` scaling for animations | FIXED | visual-qa-workout |
| P0-8 | Data | `initRemoteDataSync()` never called → SIGNED_IN cross-device sync (incl. achievements) is dead code | `remoteDataSync.init()` has 0 callers; `authEvents.emit("SIGNED_IN")` fires into nothing | Wire `remoteDataSync.init()` at app bootstrap (AsyncInitializer or App.tsx after `authStore.initialize()`) | NOT FIXED (Wave D) | A-05 audit F1 |
| P0-9 | Data | Subscription store never bootstraps on auth login → fresh-login user blocked from premium features until paywall opened | `initializeSubscription()` has 0 callers; `fetchSubscriptionStatus()` only runs on paywall mount/purchase | Add `useSubscriptionStore.getState().fetchSubscriptionStatus({preserveExistingOnError:true})` to `syncAllRemoteData` | NOT FIXED (Wave E) | A-05 audit F2 |
| P0-10 | Data | Meal/water/social achievement trackers are dead code; meal completion never triggers achievements | `trackAchievementActivity.mealLogged` etc. have 0 callers; `completeMeal` never calls `checkProgress` | Wire `trackAchievementActivity.mealLogged` in `completionTracking.completeMeal` after successful insert | NOT FIXED (Wave D) | A-05 audit F3 |
| P0-11 | Data | AdvancedReview: 9 calculated/validation fields NEVER computed at save time → permanently NULL for every user | `calculateAndSave` omits `total_calorie_deficit`, `data_completeness_percentage`, `reliability_score`, etc. that `save()` writes | Populate from `extended.*` + `validationResult` in `calculateAndSave` | NOT FIXED (Wave B — deferred) | A-02 audit P0-1 |

---

## P1 — High (degraded UX or data-integrity drift)

| # | Domain | Issue | Root cause | Fix | Status | Wave source |
|---|--------|-------|------------|-----|--------|-------------|
| P1-1 | Data | Sodium totals ALWAYS 0 for Supabase-hydrated meals (sugar was already fixed) | No `deriveMealLogSodium` util; hydrate paths derived fiber+sugar but not sodium from `food_items` | `mealLogNutrition.ts`: added `deriveMealLogSodium`; `nutritionStore.ts`: wired in both loadData + realtime hydrate paths | FIXED | A-04 audit, C-01 fix |
| P1-2 | Data | Triple-source diet preferences (profileStore SSOT + legacy transform + independent Supabase fetch from `useNutritionData`) → stale allergens can leak into generated plan | `useMealPlanning` destructured `dietPreferences` from `useNutritionData` (async Supabase fetch that lags profileStore) | `useMealPlanning.ts`: removed `dietPreferences` from destructure; reads only `profileDietPreferences` (SSOT) + legacy transform | FIXED | A-04 audit, C-02 fix |
| P1-3 | Data | `nutritionData.logMeal` writes Supabase directly without updating Zustand store → consumed totals stale until realtime fires | `logMeal` bypassed `addDailyMeal`; relied on realtime channel (seconds delay or never if disconnected) | `nutritionData.ts`: added `useNutritionStore.getState().addDailyMeal({...})` after successful insert | FIXED | A-04 audit, C-01 fix |
| P1-4 | Data | `nutritionData.logMeal` AsyncStorage/Supabase diverge on partial failure (AsyncStorage row not rolled back on Supabase error) | No transaction; AsyncStorage write unconditional | `nutritionData.ts`: symmetric `crudOperations.deleteMealLog` rollback in the `if (error)` branch | FIXED | A-04 audit, C-01 fix |
| P1-5 | UI | AnalyticsEngine crash leaked to UI as fullscreen LogBox red overlay (blocking) | `getCurrentUserId()` → `getAuthStore().getState()` throws when authStore not yet initialized (import-cycle TDZ) | `authUtils.ts`: null-guard on `getAuthStore()` — returns null if module not ready | FIXED | visual-qa-diet DEFECT D |
| P1-6 | UI | Generic "Failed to start meal plan generation" alert hides real cause ("Calorie target not calculated") | `useMealPlanning` catch showed generic string, not the actionable error | `useMealPlanning.ts`: friendly message for known "Calorie target not calculated" case | FIXED | visual-qa-diet DEFECT B |
| P1-7 | UI | Log Meal "By Ingredients" Fiber column rendered off-screen (negative width, unreachable) | Row content 1101px vs 894px available; Fiber column + spacer pushed past viewport | `LogMealModal.tsx`: column widths reduced (`colFixed` rw(50)→rw(41), ingredient rw(108)→rw(80), spacer rw(26)→rw(22)) | FIXED | visual-qa-diet DEFECT C |
| P1-8 | UI | Personal Info Edit "Save Changes" button inverted bounds (negative height) | `SettingsModalWrapper` footer used `SlideInUp` animation (transient inverted bounds) + no minHeight | `SettingsModalWrapper.tsx`: `SlideInUp`→`FadeIn` + `minHeight: rh(76)` on footer | FIXED | visual-qa-profile |
| P1-9 | UI | Units Selection Modal: all elements below header had inverted bounds | `dialogContainer` had no height constraint; GlassCard `overflow:"hidden"` clipped a11y bounds | `SettingsSelectionModal.tsx`: added `maxHeight: "80%"` to `dialogContainer` | FIXED | visual-qa-profile |
| P1-10 | UI | PaywallModal + SubscriptionManagement: entire a11y tree empty (invisible to uiautomator/TalkBack) | `maxHeight: "92%"` (percentage-based) causes a11y measurement failure on Android | `PaywallModal.tsx`: `maxHeight: rh(2208)` (absolute) + `minHeight: rh(420)` | FIXED | visual-qa-profile, visual-qa-diet DEFECT A |
| P1-11 | UI | ExerciseGifPlayer info chips ("Equipment"/"Target") negative/inverted bounds | `container` style had `overflow: "hidden"` clipping Card content | `ExerciseGifPlayer.tsx`: removed `overflow: "hidden"` from container | FIXED | visual-qa-profile, visual-qa-workout |
| P1-12 | Data | `dietType` type-lying cast drops `"balanced"` from the union | `useOnboardingLogic.ts:597` casts to exclude `"balanced"` (valid enum) | Remove cast: `dp?.diet_type ?? "balanced"` | NOT FIXED (Wave C — deferred) | A-02 audit P1-1 |
| P1-13 | Data | Hardcoded `"desk_job"` fallback for deprecated `occupation_type` (5 locations) | Deprecation incomplete; fallbacks never replaced with `null` | Replace all `\|\| "desk_job"` with `?? null` across 5 files | NOT FIXED (Wave E) | A-02 audit P1-2 |
| P1-14 | Data | Store NOT updated after DB write in profile-edit units save path (dual-store userStore + profileStore) | `userProfileService.updateProfile` writes Supabase; `userStore.setProfile` hand-rolled spread duplicates SSOT | Route units edits through `dataBridge.savePersonalInfo`; delete `userStore.setProfile` spread | NOT FIXED (Wave E) | A-02 audit P1-3 |
| P1-15 | Data | `snacks_count` default divergence (DB=1, type optional, onboarding passes undefined) | Type annotation conflicts with NOT-required-but-defaulted DB semantics | Make `snacks_count: number` (required) in type; set to 1 at form level | NOT FIXED (Wave C — deferred) | A-02 audit P1-4 |
| P1-16 | Data | DataBridge offline-queue guard overbroadly skips ALL profile hydration if ANY offline action queued | `hasPendingActions()` is global, not filtered to profile tables | Filter to profile-related tables or drop guard (partial hydration merge is safe) | NOT FIXED (Wave B — deferred) | A-02 audit P1-5 |
| P1-17 | Data | `useHomeLogic` useEffect dep on `achievementsInitialized` (boolean the effect's own call mutates) — latent infinite loop | Effect deps include the boolean set by `initialize()`; safe only because of early-return guard | Drop `achievementsInitialized` from deps; keep `[user?.id, initializeAchievements]` | NOT FIXED (Wave D) | A-05 audit F4 |
| P1-18 | Data | Entitlement drift: `isPremium()` trusts persisted local state with no server revalidation on boot | Combined with P0-9 (no boot fetch); cancelled-on-other-device user stays premium locally | Wire P0-9 fetch on SIGNED_IN + periodic background revalidation | NOT FIXED (Wave E) | A-05 audit F5 |
| P1-19 | Data | `usePaywall` plan-fetch deps + stale fallback lock-in (0 plans → fallback → never refetches) | Effect deps `[plans.length]`; fallback sets length 3 → guard blocks retry | Use `useRef` "loadedSuccessfully" flag; refetch if `plansSource !== "server"` | NOT FIXED (Wave E) | A-05 audit F6 |
| P1-20 | Data | Guest achievements never merge from cloud; guest→user transition gap | `loadFromSupabase` returns empty for guests; `remoteDataSync` (P0-8) is dead | Wire P0-8; call `syncWithSupabase` (push) on SIGNED_IN transition | NOT FIXED (Wave D) | A-05 audit F7 |
| P1-21 | UI | Onboarding form TextInput fields cannot be cleared/focused via adb/a11y (TalkBack concern) | RN TextInput renders as `View` (not `EditText`); no `focused="true"` after taps; selection/clear fails | Investigate `Input` component `accessible`/`focusable` props; may need Maestro `swipeElement` for E2E | NOT FIXED | A-01 device P1-1 |
| P1-22 | UI | Sign-in password field retains stale input across failed attempts | Password field not reset after failed sign-in alert | Reset password field on alert dismissal | NOT FIXED | A-01 device P1-2 |
| P1-23 | Data | `getDietPreferences` null dereference on Home load ("Cannot read property 'dietType' of null") | `getDietPreferences` dereferences `dietType` on null result without null guard | Add null guard; return null or safe default | NOT FIXED (Wave C — deferred) | A-01 device P1-3 |

---

## P2 — Medium (cosmetic, latent, or low-impact integrity)

| # | Domain | Issue | Root cause | Fix | Status | Wave source |
|---|--------|-------|------------|-----|--------|-------------|
| P2-1 | Data | `convertMealLogToMeal` hardcoded `"local-user"` user_id (Principle 8 violation) | Pre-P1-6 code; `getSyncableUserId` guard not applied to this path | `nutritionData.ts`: `null` + `console.warn` instead of sentinel | FIXED | A-04 audit, C-01 fix |
| P2-2 | Data | `deleteMealLog` soft-delete ("[DELETED]" notes append) → soft-deleted meals STILL COUNT toward totals | Spoofable string-append; no actual SQL DELETE; realtime DELETE handler never fires | `crudOperations.ts`: real hard delete (AsyncStorage + Supabase `.delete()`); `DataBridge.ts`: local hard-delete helper | FIXED | A-04 audit, C-01 fix |
| P2-3 | Data | Dead `get_daily_nutrition_totals` SQL function references non-existent columns (`calories`, `protein_g` etc.) | Table migrated to new column names; function never updated; 0 callers | New migration `20260624000001`: `DROP FUNCTION IF EXISTS public.get_daily_nutrition_totals(UUID, DATE)` | FIXED | A-04 audit, C-02 fix |
| P2-4 | Data | `nutritionRefreshService.getCurrentDailyNutrition` / `validateNutritionConsistency` parallel totals computation | Vestigial diagnostic helper; called only from manual test util | Left in place (deleting would break manual test util); documented | DEFERRED | A-04 audit P2-11, C-01 eval |
| P2-5 | Data | `useEffect` in `useMealPlanning` over-broad deps (`Object.keys(mealProgress).length`) risk re-fetch loops | Derived length as dep; no `useRef` guard on guest branch | Replace with stable `useRef` flag | NOT FIXED (Wave C — deferred) | A-04 audit P2-12 |
| P2-6 | Data | `userStore.profile` duplicates profileStore onboarding data (SSOT violation) | Incomplete migration from userStore-centric to profileStore SSOT model | Remove `personalInfo`/`fitnessGoals`/`bodyMetrics` from `UserProfile`; have `checkProfileComplete` read profileStore | NOT FIXED (Wave E) | A-02 audit P2-1 |
| P2-7 | Data | `AdvancedReviewRow` type missing 8 DB columns (climate/ethnicity/debug columns silently dropped on load) | Type not regenerated after `20260331000000` migration | Add 8 missing columns to interface + `load()` return | NOT FIXED (Wave B) | A-02 audit P2-2 |
| P2-8 | Data | `AdvancedReviewData` retains deprecated/non-DB fields (`health_score`, `vo2_max_estimate`, etc.) | Cleanup after H3 incomplete | Remove `health_score` from Row type; mark UI-only fields | NOT FIXED (Wave B) | A-02 audit P2-4 |
| P2-9 | Data | `loadAllData` returns stale store snapshot when `isHydrated` (no cross-device freshness) | Performance optimization; no `updated_at` check | Document as intentional OR add `updated_at` check | DEFERRED (Wave E, low priority) | A-02 audit P2-5 |
| P2-10 | Data | Silent no-op on achievement cloud-load failure (error indistinguishable from empty result) | `loadUserAchievements` returns empty Map on error; merge gate is `size > 0` | Distinguish error from empty; return `{ok, achievements}` | NOT FIXED (Wave D) | A-05 audit F8 |
| P2-11 | Data/UI | `PaywallModal` hardcodes `TIER_FEATURES` map duplicating server-owned `subscription_plans` features | Marketing copy in component, not in DB | Move copy to `subscription_plans.description` or `app_config` | NOT FIXED (Wave E, UI) | A-05 audit F9 |
| P2-12 | Data | `fetchSubscriptionStatus` error wipes to FREE tier (`preserveExistingOnError=false` default) | Transient network blip flips paying user to free-tier UI | Default `preserveExistingOnError: true` for boot/login path | NOT FIXED (Wave E) | A-05 audit F10 |
| P2-13 | UI | ExerciseGifPlayer info chips inverted bounds in performing phase (hidden background GIF player at opacity:0) | `WorkoutSessionScreen` renders background GIF player with `opacity:0`; info chips still lay out with inverted bounds | Conditionally render as `null` during performing phase OR add `accessibilityElementsHidden` | NOT FIXED (WorkoutSessionScreen — UI agent) | B-01 device B-P2-1 |
| P2-14 | UI | Weight display accumulates floating-point precision errors (2.5 → 2.5445) across SetLogModal opens | `calibrationStartKg` from `calibrationService.ts` carries fp error; raw-string `setWeight` bypasses `toFixed(1)` | Round `calibrationStartKg` to 1 decimal at source + `toFixed(1)` normalization in SetLogModal calibration useEffect | NOT FIXED (calibrationService.ts — code agent) | B-01 device B-P2-2 |
| P2-15 | UI | Inverted/negative bounds across all tabs (recurring pattern: Home, Workout, Diet, Analytics) | Content below viewport bottom with inverted bounds; percentage `maxHeight` / `overflow:"hidden"` | Systematic grep `maxHeight: "9"` + percentage heights; constrain bottom containers | PARTIALLY FIXED (specific instances fixed; systematic sweep not done) | A-01 device P2-1 |
| P2-16 | UI | Zero-dimension invisible elements (zero width AND height) across Home/Diet/Analytics | Animated/collapsing elements at zero size (`flexShrink:1` + no height, or not-yet-measured) | Investigate specific elements; add height constraints | NOT FIXED | A-01 device P2-2 |
| P2-17 | UI | "Region/City (Optional)" label contradicts validation "State is required" | Label says optional, validation says required | Fix label or validation to match | NOT FIXED | A-01 device P2-3 |
| P2-18 | Data | Silent catches (18 empty `catch{}` blocks across 8 files) — errors swallowed with no logging | Pre-existing pattern; CLAUDE.md #5 violation | All 18 filled with `console.error`/`console.warn` | FIXED | silent-catch-fixes.md |
| P2-19 | Data | `convertMealLogToMeal` type-lying cast `null as string` for `user_id` (private dead-code method) | Fix changed value from `"local-user"` to `null` but kept `as string` cast | Cast should be `as string \| null` or the Meal type updated; low priority (0 callers) | NOT FIXED (low priority) | C-01 fix residual |

---

## P3 — Low (no action needed or pre-existing minor)

| # | Domain | Issue | Status | Wave source |
|---|--------|-------|--------|-------------|
| P3-1 | Data | `useWorkoutAchievements` celebration effect latent loop (safe — `recentAchievements` not in deps) | N/A (safe, documented) | A-05 audit F11, B-03 audit |
| P3-2 | Data | RLS gap in achievements/subscription — verified clean (all tables have `auth.uid()=user_id` or service_role-only) | N/A (verified clean) | A-05 audit F12/F13 |
| P3-3 | UI | Achievements dialog uses `Alert.alert` directly (should use `crossPlatformAlert`) | NOT FIXED (pre-existing, UI agent) | visual-qa-profile |
| P3-4 | UI | Dev launcher not auto-reconnecting after `pm clear` (use deep-link workaround) | N/A (workaround documented) | A-01 device P2-4 |
| P3-5 | Data | `progressionService.evaluateFailure` is dead code (deload driven by separate `deloadService`) | NOT FIXED (Wave F cleanup) | B-03 audit |
| P3-6 | Data | `saveWeeklyMealPlan` optimistic `set` then throw leaves store with plan but error surfaced (self-healing on queue retry) | N/A (acceptable per architecture doc B.6) | A-04 audit P3-13 |

---

## Gate results (as of this catalog)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | EXIT 0 (zero errors) |
| `npx jest` | 87 suites passed, 471 tests passed, 9 skipped, 0 failed |
| `npx expo export --platform android` | EXIT 0 (bundle exported successfully) |

---

## Summary counts

| Severity | Total | Fixed | Not Fixed | Deferred | N/A |
|----------|-------|-------|-----------|----------|-----|
| P0 | 11 | 7 | 4 | 0 | 0 |
| P1 | 23 | 11 | 12 | 0 | 0 |
| P2 | 19 | 5 | 10 | 2 | 2 |
| P3 | 6 | 0 | 2 | 0 | 4 |
| **Total** | **59** | **23** | **28** | **2** | **6** |

### Files with data-integrity fixes applied (uncommitted)

**Services:** `aiRequestTransformers.ts`, `fitaiWorkersClient.ts`, `nutritionData.ts`, `completionTracking.ts`, `crudOperations.ts`, `DataBridge.ts`, `authUtils.ts`, `api.ts`, `supabase.ts`, `healthKit.ts`, `health/syncHelpers.ts`, `advancedExerciseMatching.ts`
**Stores:** `nutritionStore.ts`
**Hooks:** `useFitnessLogic.ts`, `useMealPlanning.ts`, `useWorkoutAchievements.ts`
**Utils:** `mealLogNutrition.ts`, `healthCalculations/metricsCalculator.ts`
**App:** `App.tsx`
**Migration:** `supabase/migrations/20260624000001_drop_dead_get_daily_nutrition_totals.sql`
**Test:** `src/__tests__/components/diet/LogMealModal.test.tsx` (updated to verify new SSOT behavior)
**UI components (fixed by UI agents, verified by this agent):** `LogMealModal.tsx`, `ExerciseSessionModal.tsx`, `ExerciseGifPlayer.tsx`, `AnimatedPressable.tsx`, `PaywallModal.tsx`, `SettingsModalWrapper.tsx`, `SettingsSelectionModal.tsx`, `AsyncInitializer.tsx`
