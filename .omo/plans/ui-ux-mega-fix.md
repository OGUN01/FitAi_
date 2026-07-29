# UI/UX Mega Fix — FitAI Comprehensive Quality Overhaul

## TL;DR

> **Quick Summary**: Fix all 69+ UI/UX issues across layout, theme, mock data, diet preferences, and data architecture. Consolidate to Aurora Design System as single theme source, migrate all profile data to profileStore SSOT, fix diet preference forwarding, and repair every visual bug.
> 
> **Deliverables**:
> - Aurora ThemeProvider wired as single theme source (replacing constants.ts THEME + 81 hardcoded color instances)
> - All screens using correct SafeAreaView with proper bottom insets
> - Subscription/Paywall + Cooking systems converted to dark theme
> - MealSuggestions connected to real user data (respecting vegetarian/country/cuisine)
> - Full userStore → profileStore migration (21+ consumer files)
> - All SSOT violations resolved (14 type/constant duplications)
> - Zero mock/hardcoded data remaining
> 
> **Estimated Effort**: XL (69+ issues, 100+ files affected)
> **Parallel Execution**: YES — 6 waves
> **Critical Path**: Task 1 (Aurora ThemeProvider) → Task 5 (Theme tokens) → Tasks 8-16 (Screen fixes) → Task 30 (Integration QA)

---

## Context

### Original Request
User wants a comprehensive UI/UX fix pass to make FitAI "best in the world" quality. Screenshots showed: content overlapping status bar, cropped text at bottom, theme inconsistencies (light modals on dark app), hardcoded non-vegetarian meals shown to vegetarian user, transparent backgrounds, mock data everywhere, and achievement cards with oversized responsive values.

### Interview Summary
**Key Discussions**:
- **Brand color**: Aurora Orange (#FF6B35) chosen as forward-looking brand primary (replaces indigo #6366F1 / #667eea used 81+ times)
- **Theme architecture**: Wire Aurora as real ThemeProvider (not just consolidate into constants.ts)
- **Store migration**: Full userStore → profileStore migration (21+ consumer files)
- **Test strategy**: No automated tests — Agent-Executed QA only (Playwright, curl, tmux)
- **Scope**: Fix everything found, don't hold back. User believes in thorough approach.

**Research Findings**:
- 6 background agents completed exhaustive code searches across entire codebase
- 35+ critical files read and analyzed directly
- Pattern: codebase has "refactored into subdirectory" patterns where BOTH old monolithic file AND new subdirectory still exist
- Tab bar height = `rh(60) + insets.bottom`; correct bottom spacing = `insets.bottom + rh(90)`
- Responsive utilities: `rw(N)` = N% screen width, `rh(N)` = N% screen height
- AchievementsSection uses `rw(48)/rh(48)` for icons = 48% of screen dimensions (critical bug)
- Two competing theme systems, two competing user stores, types defined in 4+ places

### Metis Review
**Identified Gaps** (addressed):
- Brand color decision needed → Resolved: Aurora Orange (#FF6B35)
- Aurora ThemeProvider wiring scope → Resolved: Yes, full wiring
- Store migration depth → Resolved: Full migration including stats porting
- Missing acceptance criteria for "theme looks correct" → Addressed: Playwright screenshots with color assertion
- Risk of breaking existing working UI during theme switch → Addressed: Wave structure ensures foundation before screen fixes

---

## Work Objectives

### Core Objective
Transform FitAI from a visually inconsistent app with data integrity issues into a polished, world-class fitness application with a unified Aurora Design System, single source of truth architecture, and diet-preference-aware meal suggestions.

### Concrete Deliverables
- `src/theme/ThemeProvider.tsx` — New Aurora ThemeProvider wrapping entire app
- `src/theme/aurora-tokens.ts` — Updated with complete color/spacing/typography tokens
- `src/theme/useTheme.ts` — Hook for consuming theme in any component
- All 24+ screens fixed for SafeAreaView + bottom insets
- All 14+ components converted from light → dark theme
- `src/components/diet/MealSuggestions.tsx` — Connected to user preferences
- `src/stores/profileStore.ts` — Extended with stats fields from userStore
- All 14 SSOT violations resolved (types, calculations, constants unified)
- Zero hardcoded colors remaining (all reference theme tokens)
- Zero mock data remaining (all connected to real data sources)

### Definition of Done
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] App launches without crashes on iOS simulator
- [ ] All main tabs (Home, Fitness, Diet, Progress, Profile) render correctly with dark theme
- [ ] No light-themed modals/popups visible anywhere in the app
- [ ] Vegetarian user sees zero non-vegetarian meal suggestions
- [ ] No hardcoded hex colors in any component file (all use theme tokens)
- [ ] profileStore is the only store used for user profile data

### Must Have
- Aurora Orange (#FF6B35) as primary brand color everywhere
- Dark theme (#0A0F1C background) on every screen, modal, popup, and overlay
- SafeAreaView from `react-native-safe-area-context` on every screen (not `react-native` core)
- Bottom content padding = `insets.bottom + rh(90)` on every scrollable screen
- MealSuggestions reading from user's diet preferences (vegetarian/vegan/country/cuisine)
- Country field forwarded to AI diet generation requests
- Single definition for each type (ActivityLevel, DietType, MealType, etc.)
- Single BMR calculation path (core/bmrCalculation.ts)
- API URLs from config only (zero hardcoded URLs in service files)

### Must NOT Have (Guardrails)
- ❌ No hardcoded hex colors in component files — ALL colors must come from theme tokens
- ❌ No `import { SafeAreaView } from 'react-native'` — must use `react-native-safe-area-context`
- ❌ No `useUserStore` imports for profile data — must use `useProfileStore`
- ❌ No duplicate type definitions — one canonical file per type
- ❌ No hardcoded calorie targets (2000, 1500) — must calculate from user profile
- ❌ No hardcoded meal suggestions — must derive from user preferences
- ❌ No hardcoded API URLs in service files — must use `API_CONFIG`
- ❌ No light theme colors (#fff, #f3f4f6, #ffffff, #F9FAFB) in any component
- ❌ No `ResponsiveTheme` usage (alias for old THEME) — use Aurora tokens
- ❌ No AI slop: excessive comments, over-abstraction, generic variable names

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (bun test present)
- **Automated tests**: NONE — User chose "just fix everything"
- **Framework**: N/A
- **QA Method**: Agent-Executed QA Scenarios only

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **Theme verification**: Playwright screenshots + color sampling at key coordinates
- **Data verification**: Read store state via React DevTools or console injection
- **Type verification**: `npx tsc --noEmit` — zero errors
- **API verification**: Grep for forbidden patterns (hardcoded URLs, hex colors)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — types, theme system, store extension):
├── Task 1: Create Aurora ThemeProvider + useTheme hook [deep]
├── Task 2: Unify all type definitions (ActivityLevel, DietType, MealType, etc.) [unspecified-high]
├── Task 3: Extend profileStore with stats fields from userStore [unspecified-high]
├── Task 4: Unify BMR/metabolic calculations (remove duplicates) [unspecified-high]
├── Task 5: Unify API URL config (remove hardcoded URLs) [quick]
├── Task 6: Unify exercise data + YouTube URL + MEAL_TYPES constants [quick]
├── Task 7: Fix responsive values in AchievementsSection.tsx [quick]

Wave 2 (Store migration + Diet logic — depends on Wave 1):
├── Task 8: Migrate all userStore consumers to profileStore (11 hook files) [unspecified-high]
├── Task 9: Migrate all userStore consumers to profileStore (10 screen/context files) [unspecified-high]
├── Task 10: Fix diet preference forwarding to AI (country, cuisine, diet type) [deep]
├── Task 11: Connect MealSuggestions.tsx to real user data [unspecified-high]
├── Task 12: Fix hardcoded calorie targets (2000/1500 fallbacks) [quick]
├── Task 13: Remove hardcoded meal times in NutritionEngine [quick]
├── Task 14: Fix regionalCuisineData (India-only → multi-country) [unspecified-high]

Wave 3 (Theme conversion — dark theme for light-themed systems):
├── Task 15: Convert Subscription/Paywall system to Aurora dark theme (6 files) [visual-engineering]
├── Task 16: Convert Cooking system to Aurora dark theme (6 files) [visual-engineering]
├── Task 17: Fix AIMealsPanel light status banners + MealTypeSelector [visual-engineering]
├── Task 18: Fix AchievementsSection rarity badges + HealthScoreIndicator [visual-engineering]
├── Task 19: Fix remaining light-themed components (AlertsSection, ProductDetailsModal, ProgressChart, GifPlayer) [visual-engineering]
├── Task 20: Replace hardcoded #667eea/#764ba2 across all components (81+ instances) [unspecified-high]

Wave 4 (Layout fixes — SafeArea + bottom insets):
├── Task 21: Fix wrong SafeAreaView imports (6 screens: WorkoutSession, MealSession, ExerciseDetail, MealDetail, WorkoutDetail, OnboardingContainer) [quick]
├── Task 22: Add SafeAreaView to AdvancedReviewTab + fix double inset in onboarding [quick]
├── Task 23: Fix bottom insets on ProgressScreen, DietScreen, ProfileScreen [quick]
├── Task 24: Fix bottom insets on all settings screens + detail screens + AchievementsScreen [quick]
├── Task 25: Fix AchievementNotifications toast positioning (status bar + keyboard aware) [quick]

Wave 5 (Mock data cleanup + remaining fixes):
├── Task 26: Remove/connect RecoveryTipsModal hardcoded tips [quick]
├── Task 27: Remove/connect MotivationBanner hardcoded quotes [quick]
├── Task 28: Fix ProfileScreen hardcoded app version [quick]
├── Task 29: Remove duplicate SuggestedWorkouts component file [quick]
├── Task 30: Delete old monolithic files (healthCalculations.ts, duplicate calculators) [quick]
├── Task 31: Wire Aurora ThemeProvider into App.tsx [quick]

Wave 6 (Final Verification — ALL must APPROVE):
├── Task F1: Plan Compliance Audit [oracle]
├── Task F2: Code Quality Review (tsc + lint + forbidden patterns) [unspecified-high]
├── Task F3: Real Manual QA — Playwright full app walkthrough [unspecified-high]
├── Task F4: Scope Fidelity Check [deep]

Critical Path: T1 → T5 (theme tokens) → T15-T20 (theme conversion) → T31 (wire provider) → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 (ThemeProvider) | — | T15-T20, T31 |
| T2 (Types) | — | T4, T8-T14 |
| T3 (ProfileStore extend) | — | T8, T9 |
| T4 (BMR unify) | T2 | T12, T30 |
| T5 (API URLs) | — | T10 |
| T6 (Constants unify) | — | T11, T14 |
| T7 (Achievements responsive) | — | T18 |
| T8 (Store hooks migration) | T2, T3 | T10, T11 |
| T9 (Store screens migration) | T2, T3 | T15-T20 |
| T10 (Diet AI forwarding) | T5, T8 | T11 |
| T11 (MealSuggestions connect) | T6, T8, T10 | F3 |
| T12 (Calorie targets) | T4 | F2 |
| T13 (Meal times) | — | F2 |
| T14 (RegionalCuisine) | T6 | T11 |
| T15-T20 (Theme conversion) | T1, T9 | T31 |
| T21-T25 (Layout fixes) | — | F3 |
| T26-T30 (Mock data) | — | F2 |
| T31 (Wire ThemeProvider) | T1, T15-T20 | F1-F4 |
| F1-F4 (Verification) | ALL tasks | — |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 1 | 7 | T1→deep, T2→unspecified-high, T3→unspecified-high, T4→unspecified-high, T5→quick, T6→quick, T7→quick |
| 2 | 7 | T8→unspecified-high, T9→unspecified-high, T10→deep, T11→unspecified-high, T12→quick, T13→quick, T14→unspecified-high |
| 3 | 6 | T15→visual-engineering, T16→visual-engineering, T17→visual-engineering, T18→visual-engineering, T19→visual-engineering, T20→unspecified-high |
| 4 | 5 | T21→quick, T22→quick, T23→quick, T24→quick, T25→quick |
| 5 | 6 | T26→quick, T27→quick, T28→quick, T29→quick, T30→quick, T31→quick |
| FINAL | 4 | F1→oracle, F2→unspecified-high, F3→unspecified-high, F4→deep |

---

## TODOs

### Wave 1 — Foundation (All tasks start immediately, no dependencies)

- [ ] 1. Create Aurora ThemeProvider + useTheme Hook

  **What to do**:
  - Create `src/theme/ThemeProvider.tsx` — React Context provider that exposes Aurora tokens to all components
  - Create `src/theme/useTheme.ts` — `useTheme()` hook that returns typed theme object from context
  - Update `src/theme/aurora-tokens.ts` to ensure it has COMPLETE token coverage:
    - `colors.primary` = `#FF6B35` (Aurora Orange — new brand primary)
    - `colors.background.primary` = `#0A0F1C` (dark base)
    - `colors.background.secondary` = `#111827` (card/surface)
    - `colors.background.tertiary` = `#1F2937` (elevated surface)
    - `colors.text.primary` = `#FFFFFF`
    - `colors.text.secondary` = `rgba(255,255,255,0.7)`
    - `colors.text.muted` = `rgba(255,255,255,0.5)`
    - `colors.accent.cyan` = existing cyan accent
    - `colors.accent.success` = green for success states
    - `colors.accent.warning` = amber for warnings
    - `colors.accent.error` = red for errors
    - `colors.glass.background` = `rgba(255,255,255,0.05)` (glass morphism)
    - `colors.glass.border` = `rgba(255,255,255,0.1)`
    - `colors.glass.highlight` = `rgba(255,255,255,0.15)`
    - All spacing, typography, and border radius tokens
  - Export `ThemeProvider` and `useTheme` from `src/theme/index.ts`
  - Do NOT wire into App.tsx yet (that's Task 31)
  - Do NOT convert any components yet (that's Wave 3)
  - Reference existing `src/theme/aurora-tokens.ts` for current token structure and extend it
  - Reference `src/theme/gradients.ts` for gradient definitions to include

  **Must NOT do**:
  - Do not touch App.tsx (Task 31)
  - Do not modify any component files (Wave 3)
  - Do not import from `src/utils/constants.ts` THEME — this is the OLD system being replaced
  - Do not create multiple theme variants (light/dark) — dark only

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Architectural foundation piece — requires understanding the full token system, proper React Context patterns, TypeScript generics for typed hook
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Design system architecture expertise needed for proper token structure
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — no UI testing at this stage

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6, 7)
  - **Blocks**: Tasks 15-20 (theme conversion), Task 31 (wiring)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/theme/aurora-tokens.ts` — Current Aurora token structure (colors, spacing, typography). Extend this, don't replace.
  - `src/theme/gradients.ts` — Gradient definitions to incorporate into theme
  - `src/theme/index.ts` — Current exports, will need updating
  - `src/components/ui/aurora/GlassCard.tsx` — Example of how aurora glass morphism tokens are consumed today

  **API/Type References**:
  - `src/utils/constants.ts:1-169` — The OLD `THEME` / `ResponsiveTheme` object being replaced. Study its structure to ensure Aurora covers all the same properties.

  **External References**:
  - React Context + useContext pattern for theme providers in React Native
  - TypeScript `as const` for token objects to get literal types

  **WHY Each Reference Matters**:
  - `aurora-tokens.ts`: This is the foundation — extend it with missing tokens (currently incomplete)
  - `constants.ts THEME`: Need to cover every property this old system provides so migration is seamless
  - `GlassCard.tsx`: Shows the consumption pattern other components will follow

  **Acceptance Criteria**:
  - [ ] `src/theme/ThemeProvider.tsx` exists and exports ThemeProvider component
  - [ ] `src/theme/useTheme.ts` exists and exports typed useTheme hook
  - [ ] `src/theme/aurora-tokens.ts` updated with complete color/spacing/typography tokens
  - [ ] `src/theme/index.ts` re-exports ThemeProvider, useTheme, and all tokens
  - [ ] `npx tsc --noEmit` passes with zero errors related to theme files
  - [ ] Aurora Orange `#FF6B35` is defined as `colors.primary` in tokens

  **QA Scenarios:**

  ```
  Scenario: ThemeProvider renders without errors
    Tool: Bash
    Preconditions: Theme files created
    Steps:
      1. Run `npx tsc --noEmit 2>&1 | grep -i "theme"` to check for type errors in theme files
      2. Run `grep -n "colors.primary" src/theme/aurora-tokens.ts` to verify primary color exists
      3. Run `grep -n "#FF6B35" src/theme/aurora-tokens.ts` to verify Aurora Orange is primary
      4. Run `grep -n "useTheme" src/theme/useTheme.ts` to verify hook exists
      5. Run `grep -n "ThemeProvider" src/theme/ThemeProvider.tsx` to verify provider exists
    Expected Result: All greps return matches, tsc returns 0 theme errors
    Failure Indicators: tsc errors mentioning theme files, missing exports, wrong primary color
    Evidence: .sisyphus/evidence/task-1-theme-provider-setup.txt

  Scenario: Token coverage is complete
    Tool: Bash
    Preconditions: aurora-tokens.ts updated
    Steps:
      1. Run `grep -c "colors\." src/theme/aurora-tokens.ts` — should return 15+ color definitions
      2. Run `grep -c "spacing" src/theme/aurora-tokens.ts` — should have spacing scale
      3. Run `grep -c "typography\|fontSize\|fontWeight" src/theme/aurora-tokens.ts` — should have typography tokens
      4. Verify no reference to `#6366F1` or `#667eea` in aurora-tokens.ts (old indigo must not be primary)
    Expected Result: Complete token coverage with 15+ colors, spacing scale, typography scale. Zero old indigo references.
    Failure Indicators: Missing color categories, no spacing/typography, old indigo present
    Evidence: .sisyphus/evidence/task-1-token-coverage.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(theme): create Aurora ThemeProvider with useTheme hook and complete token set`
  - Files: `src/theme/ThemeProvider.tsx`, `src/theme/useTheme.ts`, `src/theme/aurora-tokens.ts`, `src/theme/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 2. Unify All Type Definitions (ActivityLevel, DietType, MealType)

  **What to do**:
  - **ActivityLevel** — Currently defined in 4 places with DIFFERENT values:
    - `src/types/user.ts:311` → `"sedentary" | "light" | "moderate" | "active" | "extreme"`
    - `src/utils/healthCalculations/core/tdeeCalculation.ts:15` → adds `"very_active"`
    - `src/utils/healthCalculations/types.ts:71` → `"sedentary" | "light" | "moderate" | "active" | "very_active"` (no extreme)
    - `src/utils/healthCalculations/types/index.ts:9` → same as types.ts
  - **DietType** — Defined in 2 places with mismatched values:
    - `src/utils/healthCalculations/types.ts:89` — includes 8 values
    - `src/utils/healthCalculations/types/index.ts:15` — includes 8 values (different order)
    - `src/types/onboarding.ts` uses `"vegetarian" | "vegan" | "non-veg" | "pescatarian"` (4 values) — DIFFERENT
  - **MealType** — Defined in 5+ places:
    - `src/services/foodRecognitionService.ts:18` — 4 values
    - `src/stores/nutrition/types.ts:5` — 4 values
    - `src/stores/nutritionStore.ts:19` — 4 values
    - `src/types/diet.ts:138` — 6 values (adds pre_workout, post_workout)
    - `src/types/diet/meal.ts:47` — 6 values
  - **PersonalInfo types** — Duplicate definitions:
    - `src/types/onboarding.ts` — `PersonalInfoData`, `DietPreferencesData`, `WorkoutPreferencesData`
    - `src/types/onboarding/diet-preferences.ts` — duplicate `DietPreferencesData`
    - `src/types/onboarding/workout-preferences.ts` — duplicate `WorkoutPreferencesData`
    - `src/types/onboarding/legacy.ts` — yet another `OnboardingReviewData`
  - **Resolution strategy**:
    1. Make `src/types/user.ts` the canonical source for `ActivityLevel` — use the SUPERSET: `"sedentary" | "light" | "moderate" | "active" | "very_active" | "extreme"`
    2. Make `src/types/diet.ts` the canonical source for `MealType` — use the 6-value version
    3. Make `src/types/onboarding.ts` the canonical source for onboarding types — delete subdirectory duplicates
    4. Create `src/types/health.ts` if needed for `DietType` (calculator version with 8 values) — keep separate from onboarding `diet_type` (4 user-facing values)
    5. Update ALL consumers to import from canonical sources
    6. Delete duplicate type definitions in subdirectory files

  **Must NOT do**:
  - Do not change the VALUES of types that are already correct — just consolidate the source
  - Do not rename types that would cause massive import changes — keep the same names
  - Do not delete `src/utils/healthCalculations/types.ts` entirely — just make it re-export from canonical

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Many files to touch, requires careful tracing of imports across the codebase
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — pure TypeScript refactoring

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6, 7)
  - **Blocks**: Tasks 4, 8-14 (consumers need unified types)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/types/user.ts:311` — Current ActivityLevel definition (missing `very_active`)
  - `src/utils/healthCalculations/core/tdeeCalculation.ts:15` — ActivityLevel with `very_active` + `extreme`
  - `src/utils/healthCalculations/types.ts:71-89` — ActivityLevel + DietType definitions
  - `src/utils/healthCalculations/types/index.ts:9-15` — Duplicate ActivityLevel + DietType
  - `src/types/diet.ts:138` — MealType with 6 values (canonical)
  - `src/types/diet/meal.ts:47` — Duplicate MealType
  - `src/types/onboarding.ts` — PersonalInfoData, DietPreferencesData, WorkoutPreferencesData
  - `src/types/onboarding/diet-preferences.ts` — Duplicate DietPreferencesData
  - `src/types/onboarding/workout-preferences.ts` — Duplicate WorkoutPreferencesData

  **API/Type References**:
  - `src/stores/nutrition/types.ts:5` — MealType consumer (4 values, needs updating to 6)
  - `src/stores/nutritionStore.ts:19` — MealType consumer
  - `src/services/foodRecognitionService.ts:18` — MealType consumer

  **WHY Each Reference Matters**:
  - Each duplicate file must be identified, the canonical version kept, and all consumers redirected
  - The VALUE DIFFERENCES (e.g., `extreme` vs `very_active`) must be resolved — superset approach

  **Acceptance Criteria**:
  - [ ] `ActivityLevel` defined in exactly ONE file, imported everywhere else
  - [ ] `DietType` (calculator) defined in exactly ONE file
  - [ ] `MealType` defined in exactly ONE file with 6 values
  - [ ] `PersonalInfoData`, `DietPreferencesData`, `WorkoutPreferencesData` defined in exactly ONE file each
  - [ ] All duplicate definition files either deleted or changed to re-export from canonical
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] `grep -rn "export type ActivityLevel" src/` returns exactly 1 result
  - [ ] `grep -rn "export type MealType" src/` returns exactly 1 result

  **QA Scenarios:**

  ```
  Scenario: No duplicate type exports remain
    Tool: Bash
    Preconditions: Type unification complete
    Steps:
      1. Run `grep -rn "export type ActivityLevel" src/` — expect exactly 1 result
      2. Run `grep -rn "export type MealType" src/` — expect exactly 1 result
      3. Run `grep -rn "export type DietType" src/` — expect exactly 1-2 results (user-facing + calculator)
      4. Run `grep -rn "export.*DietPreferencesData" src/` — expect exactly 1 result
      5. Run `grep -rn "export.*WorkoutPreferencesData" src/` — expect exactly 1 result
      6. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Each type exported from exactly one canonical file. TSC passes.
    Failure Indicators: Multiple export locations for same type, TSC type errors
    Evidence: .sisyphus/evidence/task-2-type-unification.txt

  Scenario: ActivityLevel superset is correct
    Tool: Bash
    Preconditions: Canonical ActivityLevel updated
    Steps:
      1. Run `grep -A3 "export type ActivityLevel" src/types/user.ts`
      2. Verify output contains ALL of: sedentary, light, moderate, active, very_active, extreme
    Expected Result: All 6 values present in one type definition
    Failure Indicators: Missing values, still showing old 5-value definition
    Evidence: .sisyphus/evidence/task-2-activity-level-values.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `refactor(types): unify ActivityLevel, DietType, MealType to single canonical sources`
  - Files: `src/types/user.ts`, `src/types/diet.ts`, `src/types/onboarding.ts`, `src/utils/healthCalculations/types.ts`, `src/utils/healthCalculations/types/index.ts`, `src/utils/healthCalculations/core/tdeeCalculation.ts`, `src/stores/nutrition/types.ts`, `src/stores/nutritionStore.ts`, `src/services/foodRecognitionService.ts`, `src/types/onboarding/diet-preferences.ts`, `src/types/onboarding/workout-preferences.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 3. Extend profileStore with Stats Fields from userStore

  **What to do**:
  - Read `src/stores/userStore.ts` to identify ALL profile/stat fields still living there (weight history, streak data, workout counts, any onboarding fields)
  - Add these fields to `src/stores/profileStore.ts` with proper TypeScript types
  - Add Zustand actions to update these fields (matching existing profileStore patterns)
  - Add migration logic: on app load, if `userStore` has legacy data, migrate it into `profileStore` and clear from `userStore`
  - Keep `userStore` for Supabase auth ONLY (session, user ID, auth methods)
  - Update `profileStore`'s persistence key if schema changes (bump version in `persist` config)

  **Must NOT do**:
  - Do not touch any CONSUMERS of userStore yet (that's Tasks 8-9)
  - Do not delete fields from userStore yet — just add to profileStore
  - Do not change Supabase sync logic — just local store shape

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires careful state migration logic, understanding Zustand persist patterns, and ensuring backward compatibility
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — pure state logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6, 7)
  - **Blocks**: Tasks 8, 9 (consumer migration depends on new fields existing)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/stores/profileStore.ts` — Current profileStore structure, Zustand persist config, action patterns. Extend this store.
  - `src/stores/userStore.ts` — Fields to migrate FROM. Identify all non-auth fields.

  **API/Type References**:
  - `src/types/user.ts` — User-related types that profileStore should align with
  - `src/stores/profileStore.ts:persist(...)` — Persistence config pattern (storage key, version)

  **WHY Each Reference Matters**:
  - `profileStore.ts`: Must match existing patterns (action naming, slice structure) so consumers can migrate seamlessly
  - `userStore.ts`: Must identify EVERY non-auth field to ensure nothing is left behind

  **Acceptance Criteria**:
  - [ ] All non-auth fields from userStore have equivalents in profileStore
  - [ ] Migration logic moves legacy data on app load
  - [ ] `npx tsc --noEmit` passes
  - [ ] profileStore persist version bumped if schema changed

  **QA Scenarios:**

  ```
  Scenario: profileStore has all required fields
    Tool: Bash
    Preconditions: profileStore extended
    Steps:
      1. Run `grep -n "interface\|type.*Profile" src/stores/profileStore.ts` to see type shape
      2. Run `grep -n "set.*:\|update.*:" src/stores/profileStore.ts` to verify actions exist for new fields
      3. Run `npx tsc --noEmit 2>&1 | grep -i "profileStore\|userStore"` — expect 0 errors
    Expected Result: New fields visible in interface, actions exist, zero type errors
    Failure Indicators: Missing fields, type errors, no actions for new data
    Evidence: .sisyphus/evidence/task-3-profilestore-extend.txt

  Scenario: userStore retains only auth fields
    Tool: Bash
    Preconditions: profileStore extended
    Steps:
      1. Run `grep -n "export interface\|export type" src/stores/userStore.ts` to verify auth-only shape
      2. Verify no onboarding/stats fields remain as primary storage (deprecated wrappers are OK)
    Expected Result: userStore interface is auth-focused
    Failure Indicators: Profile data still primary in userStore
    Evidence: .sisyphus/evidence/task-3-userstore-auth-only.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(store): extend profileStore with stats fields, add migration from userStore`
  - Files: `src/stores/profileStore.ts`, `src/stores/userStore.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 4. Unify BMR/Metabolic Calculations (Remove Duplicates)

  **What to do**:
  - **BMR is calculated in 4 places** — consolidate to ONE canonical calculator:
    - `src/utils/healthCalculations/core/bmrCalculation.ts` — Keep as CANONICAL
    - `src/utils/healthCalculations/metabolic.ts` — `MetabolicCalculations` class (duplicate) → make it import from core
    - `src/utils/healthCalculations.ts` — Old monolithic file with its own `MetabolicCalculations` class → delete or make re-export
    - `src/utils/healthCalculations/calculators/bmrCalculators.ts` — Redundant calculators → delete or redirect
  - **MET_VALUES table duplicated** in `metabolic.ts` and `calorieCalculator.ts` → consolidate to one location
  - **Strategy**: Keep `src/utils/healthCalculations/core/bmrCalculation.ts` as the ONE true BMR source. All other files either:
    a) Re-export from core (if they're imported by many consumers), OR
    b) Get deleted (if they're redundant)
  - Update all import paths to point to canonical source
  - Ensure `MetabolicCalculations` class (if kept) delegates to core functions

  **Must NOT do**:
  - Do not change calculation LOGIC (formulas must stay identical) — only consolidate the source
  - Do not remove the public API surface — consumers should still be able to import as before

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple files with interlocking imports; requires careful tracing of consumers
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — pure refactoring

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6, 7)
  - **Blocks**: Tasks 12 (calorie targets need unified calculation), Task 30 (file cleanup)
  - **Blocked By**: Task 2 (unified types for ActivityLevel needed by calculators)

  **References**:

  **Pattern References**:
  - `src/utils/healthCalculations/core/bmrCalculation.ts` — CANONICAL BMR calculator (keep this)
  - `src/utils/healthCalculations/metabolic.ts` — Duplicate MetabolicCalculations class
  - `src/utils/healthCalculations.ts` — Old monolithic file (another duplicate)
  - `src/utils/healthCalculations/calculators/bmrCalculators.ts` — Redundant calculators

  **API/Type References**:
  - `src/utils/healthCalculations/core/tdeeCalculation.ts` — TDEE depends on BMR; verify import chain
  - `src/types/user.ts:ActivityLevel` — Canonical type (from Task 2)

  **WHY Each Reference Matters**:
  - Must verify each duplicate produces SAME result before consolidating
  - Must trace all consumers via `lsp_find_references` before deleting any file

  **Acceptance Criteria**:
  - [ ] BMR calculation exists in exactly ONE canonical file
  - [ ] MET_VALUES table exists in exactly ONE file
  - [ ] All consumers import from canonical source
  - [ ] `npx tsc --noEmit` passes
  - [ ] `grep -rn "calculateBMR\|MetabolicCalculations" src/ | grep -v node_modules` shows imports pointing to canonical

  **QA Scenarios:**

  ```
  Scenario: Single BMR source verification
    Tool: Bash
    Preconditions: BMR consolidation complete
    Steps:
      1. Run `grep -rn "export.*calculateBMR\|export.*class MetabolicCalculations" src/` — expect ≤2 results (canonical + one re-export)
      2. Run `grep -rn "MET_VALUES" src/ | grep -v node_modules` — expect exactly 1 definition location
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: One canonical BMR, one MET table, zero errors
    Failure Indicators: Multiple independent BMR implementations, tsc errors from broken imports
    Evidence: .sisyphus/evidence/task-4-bmr-unification.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `refactor(calc): unify BMR/metabolic calculations to single canonical source`
  - Files: `src/utils/healthCalculations/core/bmrCalculation.ts`, `src/utils/healthCalculations/metabolic.ts`, `src/utils/healthCalculations.ts`, `src/utils/healthCalculations/calculators/bmrCalculators.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 5. Unify API URL Config (Remove Hardcoded URLs)

  **What to do**:
  - **Workers API URL** hardcoded in 3 places — one bypasses `API_CONFIG` entirely:
    - `src/config/api.ts` — Canonical config (KEEP)
    - `src/services/fitaiWorkersClient.ts` — Should import from config
    - `src/ai/constrainedWorkoutGeneration.ts` — BYPASSES config entirely, has its own URL string
  - **YouTube API URL** duplicated:
    - `src/services/youtube/config.ts` — Canonical (KEEP)
    - `src/services/youtubeVideoService.ts` — Duplicate URL string
  - **Fix**: Make all service files import URLs from their canonical config, delete inline URL strings
  - Verify `API_CONFIG` structure covers all needed endpoints

  **Must NOT do**:
  - Do not change the actual URL values — just consolidate the source
  - Do not change API_CONFIG's export interface

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple find-and-replace of URL strings with config imports. 3-5 files max.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6, 7)
  - **Blocks**: Task 10 (diet AI forwarding needs correct API config)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/config/api.ts` — Canonical API_CONFIG (workers URL source of truth)
  - `src/services/fitaiWorkersClient.ts` — Workers client (should already use config, verify)
  - `src/ai/constrainedWorkoutGeneration.ts` — BYPASSES config, has hardcoded URL
  - `src/services/youtube/config.ts` — Canonical YouTube config
  - `src/services/youtubeVideoService.ts` — Duplicate YouTube URL

  **WHY Each Reference Matters**:
  - `constrainedWorkoutGeneration.ts` is the worst offender — entirely bypasses config, so if API URL changes, this file would break silently
  - YouTube duplicate is minor but still a SSOT violation

  **Acceptance Criteria**:
  - [ ] Zero hardcoded API URLs in service files (all import from config)
  - [ ] `grep -rn "https://.*workers\|https://.*youtube" src/ --include="*.ts" --include="*.tsx" | grep -v config | grep -v node_modules` returns 0 results
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No hardcoded URLs outside config
    Tool: Bash
    Preconditions: URL consolidation complete
    Steps:
      1. Run `grep -rn "https://" src/services/ src/ai/ --include="*.ts" | grep -v "config\|Config\|/config/\|node_modules\|test\|.test."` — expect 0 URL strings
      2. Run `grep -rn "import.*API_CONFIG\|import.*from.*config" src/ai/constrainedWorkoutGeneration.ts` — expect import present
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: All URLs sourced from config files, zero hardcoded strings in services
    Failure Indicators: Any hardcoded URL outside config files
    Evidence: .sisyphus/evidence/task-5-api-url-unify.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix(config): remove hardcoded API URLs, use API_CONFIG everywhere`
  - Files: `src/ai/constrainedWorkoutGeneration.ts`, `src/services/youtubeVideoService.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 6. Unify Exercise Data + MEAL_TYPES Constants

  **What to do**:
  - **Exercise databases** — Two separate DBs with overlapping data:
    - `src/data/exercises.ts` — 12 hardcoded exercises with static calorie values
    - `src/ai/constants/exerciseDatabase.ts` — Separate AI exercise database
    - **Resolution**: Keep `src/data/exercises.ts` as canonical, make AI database import from it OR merge into one
  - **MEAL_TYPES constant** — Defined in 3 places with different shapes:
    - `src/components/diet/MealEditModal.tsx` — Array of `{ id, label, icon }` objects
    - `src/components/diet/meal-edit/MealTypeSelector.tsx` — Another array of objects (likely same shape)
    - `src/ai/schemas/foodRecognitionSchema.ts` — Different shape (schema context)
    - **Resolution**: Create ONE canonical `MEAL_TYPES` constant in `src/constants/diet.ts` (or similar), import everywhere
  - Update all imports to point to canonical sources

  **Must NOT do**:
  - Do not change the runtime behavior of exercise lookups
  - Do not remove data that AI layer depends on
  - Do not modify MealType VALUES (those were unified in Task 2) — just the CONSTANTS arrays

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward data consolidation — move constants, update imports
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5, 7)
  - **Blocks**: Tasks 11 (MealSuggestions needs unified meal types), Task 14 (RegionalCuisine)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/data/exercises.ts` — 12 exercises, static calorie data
  - `src/ai/constants/exerciseDatabase.ts` — AI exercise database
  - `src/components/diet/MealEditModal.tsx` — MEAL_TYPES constant (array of objects)
  - `src/components/diet/meal-edit/MealTypeSelector.tsx` — MEAL_TYPES constant (duplicate)
  - `src/ai/schemas/foodRecognitionSchema.ts` — MEAL_TYPES in schema context

  **WHY Each Reference Matters**:
  - Exercise DBs: Must verify overlap/difference before merging to avoid losing AI-specific data
  - MEAL_TYPES: Three different component files defining the same constant = guaranteed drift

  **Acceptance Criteria**:
  - [ ] Exercise data exists in exactly ONE canonical file
  - [ ] MEAL_TYPES constant defined in ONE location, imported by all consumers
  - [ ] `npx tsc --noEmit` passes
  - [ ] `grep -rn "MEAL_TYPES.*=" src/ | grep -v node_modules` returns exactly 1 definition

  **QA Scenarios:**

  ```
  Scenario: Single MEAL_TYPES definition
    Tool: Bash
    Preconditions: Constants unified
    Steps:
      1. Run `grep -rn "MEAL_TYPES\s*=\|const MEAL_TYPES" src/ | grep -v node_modules` — expect exactly 1 definition
      2. Run `grep -rn "export.*exercises\|exerciseDatabase" src/data/ src/ai/constants/` — verify consolidation
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: One MEAL_TYPES, one exercise DB, zero errors
    Failure Indicators: Multiple MEAL_TYPES definitions, tsc errors
    Evidence: .sisyphus/evidence/task-6-constants-unify.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `refactor(data): unify exercise databases and MEAL_TYPES constants`
  - Files: `src/data/exercises.ts`, `src/ai/constants/exerciseDatabase.ts`, `src/components/diet/MealEditModal.tsx`, `src/components/diet/meal-edit/MealTypeSelector.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 7. Fix Responsive Values in AchievementsSection.tsx

  **What to do**:
  - **CRITICAL BUG**: `src/components/progress/AchievementsSection.tsx` uses:
    - `rw(48)` for icon container = 48% of screen WIDTH (should be ~48px → `rw(12)` or similar)
    - `rh(48)` for icon container = 48% of screen HEIGHT (should be ~48px → `rh(6)` or similar)
    - `minWidth: rw(50)` on absolute rarity badge = 50% of screen width (should be ~50px → `rw(13)` or similar)
  - These oversized values push text off screen, create layout overflow, and break the achievement cards
  - Fix ALL responsive values in this file to use correct pixel-equivalent percentages
  - Audit other `rw()`/`rh()` calls in the file for similar bugs
  - Reference: `rw(1)` ≈ 1% of 390px (iPhone) ≈ 3.9px. So for 48px → `rw(12.3)` or `rs(48)`

  **Must NOT do**:
  - Do not change any non-responsive styling (colors, fonts, etc.) — that's Wave 3
  - Do not touch other components

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file fix — find oversized rw/rh values, replace with correct ones
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Responsive sizing expertise needed to choose correct values

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5, 6)
  - **Blocks**: Task 18 (AchievementsSection badge fix builds on corrected layout)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/progress/AchievementsSection.tsx` — THE file to fix
  - `src/utils/responsive.ts` — `rw()`, `rh()`, `rs()`, `rf()` utility functions. Understand what each returns.
  - `src/screens/main/HomeScreen.tsx` — Example of correct `rw()`/`rh()` usage in a working screen

  **WHY Each Reference Matters**:
  - `AchievementsSection.tsx`: Must audit EVERY `rw()`/`rh()` call — the bug is passing pixel-like values to percentage-based functions
  - `responsive.ts`: Need to understand conversion formulas to choose correct values

  **Acceptance Criteria**:
  - [ ] No `rw()` calls with values > 30 in AchievementsSection (anything > 30% of screen width is suspicious)
  - [ ] No `rh()` calls with values > 20 in AchievementsSection (anything > 20% of screen height is suspicious)
  - [ ] `npx tsc --noEmit` passes
  - [ ] Achievement cards no longer overflow the screen

  **QA Scenarios:**

  ```
  Scenario: Responsive values are reasonable
    Tool: Bash
    Preconditions: Fix applied
    Steps:
      1. Run `grep -n "rw(" src/components/progress/AchievementsSection.tsx` — no value > 30
      2. Run `grep -n "rh(" src/components/progress/AchievementsSection.tsx` — no value > 20
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: All responsive values within reasonable ranges
    Failure Indicators: Any rw(48), rh(48), rw(50) or similar oversized values remaining
    Evidence: .sisyphus/evidence/task-7-achievements-responsive.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `fix(ui): correct oversized responsive values in AchievementsSection`
  - Files: `src/components/progress/AchievementsSection.tsx`
  - Pre-commit: `npx tsc --noEmit`

### Wave 2 — Store Migration + Diet Logic (depends on Wave 1)

- [ ] 8. Migrate All userStore Consumers to profileStore (Hook Files)

  **What to do**:
  - **21+ files still import `useUserStore`** for profile data. This task handles the 11 HOOK files:
    - Find ALL hooks that call `useUserStore()` for non-auth data (personal info, diet preferences, body analysis, etc.)
    - Replace with `useProfileStore()` equivalent calls
    - Update destructured field names if profileStore uses different naming
    - The 11 hook files were identified by Agent 6 — use `lsp_find_references` on `useUserStore` to get the full list
  - Ensure each hook still returns the same data shape to avoid breaking its consumers

  **Must NOT do**:
  - Do not change screen/component files (that's Task 9)
  - Do not change the hook's PUBLIC API (return type) — only the internal source
  - Do not remove `useUserStore` from `userStore.ts` itself

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 11 files to update, each with different destructured fields; requires verifying profileStore has matching fields
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9, 10, 11, 12, 13, 14)
  - **Blocks**: Tasks 10, 11 (diet hooks depend on correct data source)
  - **Blocked By**: Tasks 2 (unified types), 3 (profileStore extended)

  **References**:

  **Pattern References**:
  - `src/stores/profileStore.ts` — Target store with all profile fields (from Task 3)
  - `src/stores/userStore.ts` — Source store being migrated away from
  - `src/hooks/useCalculatedMetrics.ts` — Example of a hook that already reads from Supabase (may need updating)
  - `src/hooks/useMealPlanning.ts` — Reads from `useNutritionData` (Supabase), not profileStore
  - `src/hooks/useAIMealGeneration.ts` — Same pattern as useMealPlanning

  **WHY Each Reference Matters**:
  - Must map `userStore.fieldName` → `profileStore.fieldName` for each hook
  - Some hooks may access nested objects differently between stores

  **Acceptance Criteria**:
  - [ ] Zero hook files importing `useUserStore` for non-auth data
  - [ ] `grep -rn "useUserStore" src/hooks/ | grep -v auth | grep -v test` returns 0 results
  - [ ] `npx tsc --noEmit` passes
  - [ ] All hooks maintain their existing return type signatures

  **QA Scenarios:**

  ```
  Scenario: No userStore usage in hooks for profile data
    Tool: Bash
    Preconditions: Migration complete
    Steps:
      1. Run `grep -rn "useUserStore" src/hooks/ --include="*.ts" --include="*.tsx" | grep -v "auth\|Auth\|test"` — expect 0 results
      2. Run `grep -rn "useProfileStore" src/hooks/ --include="*.ts" --include="*.tsx"` — expect 5+ results (showing migration)
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: All hooks use profileStore for profile data
    Failure Indicators: Any remaining useUserStore for non-auth data in hooks
    Evidence: .sisyphus/evidence/task-8-hooks-migration.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `refactor(hooks): migrate all hooks from userStore to profileStore for profile data`
  - Files: All 11 hook files identified via `lsp_find_references`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 9. Migrate All userStore Consumers to profileStore (Screen/Context Files)

  **What to do**:
  - Handle the remaining ~10 SCREEN and CONTEXT files that import `useUserStore` for profile data
  - Find ALL screens/components/contexts that call `useUserStore()` for non-auth data
  - Replace with `useProfileStore()` equivalent calls
  - Update destructured field names as needed
  - Includes onboarding screens, profile screen, settings screens, and any contexts

  **Must NOT do**:
  - Do not change hook files (that's Task 8)
  - Do not remove `useUserStore` from auth-related code (login, logout, session check)
  - Do not change component rendering logic — only the data source

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: ~10 files across different screen directories, each with different data access patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 10, 11, 12, 13, 14)
  - **Blocks**: Tasks 15-20 (theme conversion screens need correct store)
  - **Blocked By**: Tasks 2 (unified types), 3 (profileStore extended)

  **References**:

  **Pattern References**:
  - `src/stores/profileStore.ts` — Target store
  - `src/screens/main/ProfileScreen.tsx` — Key screen consuming user data
  - `src/screens/onboarding/OnboardingContainer.tsx` — Onboarding likely writes to userStore
  - `src/contexts/` — Any context providers that wrap userStore data

  **WHY Each Reference Matters**:
  - Screens may destructure deeply nested objects that differ between stores
  - Onboarding flow WRITES data — must ensure writes go to profileStore now

  **Acceptance Criteria**:
  - [ ] Zero screen/context files importing `useUserStore` for non-auth data
  - [ ] `grep -rn "useUserStore" src/screens/ src/contexts/ | grep -v auth | grep -v test` returns 0 results
  - [ ] `npx tsc --noEmit` passes
  - [ ] Onboarding writes data to profileStore

  **QA Scenarios:**

  ```
  Scenario: No userStore usage in screens for profile data
    Tool: Bash
    Preconditions: Migration complete
    Steps:
      1. Run `grep -rn "useUserStore" src/screens/ src/contexts/ --include="*.ts" --include="*.tsx" | grep -v "auth\|Auth\|test"` — expect 0 results
      2. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: All screens use profileStore for profile data
    Failure Indicators: Remaining useUserStore imports for non-auth data
    Evidence: .sisyphus/evidence/task-9-screens-migration.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `refactor(screens): migrate all screens from userStore to profileStore for profile data`
  - Files: All ~10 screen/context files identified via `lsp_find_references`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 10. Fix Diet Preference Forwarding to AI (Country, Cuisine, Diet Type)

  **What to do**:
  - **BUG**: User's country, cuisine preferences, and full diet context are NOT forwarded to AI meal generation:
    - `src/services/aiRequestTransformers.ts` — `transformForDietRequest()` missing: `country`, `cuisinePreferences` hardcoded as `[]`, `dislikes` hardcoded as `[]`
    - `src/services/ai-transformers/diet-transformers.ts` — Duplicate transformer with SAME bugs
    - `src/services/fitaiWorkersClient.ts` — `DietGenerationRequest` type has NO `country` field
  - **Fix**:
    1. Add `country` field to `DietGenerationRequest` type
    2. Update `transformForDietRequest()` to read `personalInfo.country` from profileStore and include it
    3. Update `transformForDietRequest()` to read `dietPreferences.cuisine_preferences` and pass them (not `[]`)
    4. Update `transformForDietRequest()` to read `dietPreferences.dislikes` and pass them (not `[]`)
    5. Add dietary restriction context for "non-veg" diet type (currently only veg/vegan/pescatarian/keto get restrictions)
    6. Delete the DUPLICATE transformer in `ai-transformers/diet-transformers.ts` (or make it re-export from canonical)

  **Must NOT do**:
  - Do not change the AI prompt format (backend expects specific fields)
  - Do not change any screen/UI code — this is backend data flow only
  - Do not invent new fields — only forward data that profileStore already has

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires tracing data flow from store → transformer → API client → backend, understanding the DietGenerationRequest contract
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 11, 12, 13, 14)
  - **Blocks**: Task 11 (MealSuggestions needs correct AI data)
  - **Blocked By**: Tasks 5 (API URLs unified), 8 (hooks migrated to profileStore)

  **References**:

  **Pattern References**:
  - `src/services/aiRequestTransformers.ts` — Main transformer file (primary target)
  - `src/services/ai-transformers/diet-transformers.ts` — DUPLICATE transformer (delete or redirect)
  - `src/services/fitaiWorkersClient.ts` — `DietGenerationRequest` type definition
  - `src/stores/profileStore.ts` — Source of `personalInfo.country` and `dietPreferences.cuisine_preferences`

  **API/Type References**:
  - `src/services/fitaiWorkersClient.ts:DietGenerationRequest` — Type to extend with `country` field
  - `src/types/onboarding.ts:DietPreferencesData` — Shape of diet preferences including cuisine_preferences

  **WHY Each Reference Matters**:
  - `aiRequestTransformers.ts`: This is where the actual bug is — hardcoded empty arrays instead of real user data
  - `DietGenerationRequest`: Must add `country` field or backend won't receive it
  - `profileStore`: Must know exact field paths to read from

  **Acceptance Criteria**:
  - [ ] `DietGenerationRequest` type includes `country` field
  - [ ] `transformForDietRequest()` reads `personalInfo.country` from store/params
  - [ ] `transformForDietRequest()` reads real `cuisine_preferences` (not `[]`)
  - [ ] `transformForDietRequest()` reads real `dislikes` (not `[]`)
  - [ ] "non-veg" diet type gets appropriate context in restrictions
  - [ ] Duplicate transformer deleted or redirected
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Diet preferences are forwarded completely
    Tool: Bash
    Preconditions: Transformer updated
    Steps:
      1. Run `grep -n "cuisinePreferences.*\[\]\|dislikes.*\[\]" src/services/aiRequestTransformers.ts` — expect 0 results (no more hardcoded empty arrays)
      2. Run `grep -n "country" src/services/fitaiWorkersClient.ts` — expect country in DietGenerationRequest type
      3. Run `grep -rn "transformForDietRequest" src/services/ai-transformers/` — expect 0 results OR re-export only
      4. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Real user preferences forwarded, country added, duplicate removed
    Failure Indicators: Hardcoded empty arrays still present, missing country field
    Evidence: .sisyphus/evidence/task-10-diet-forwarding.txt

  Scenario: Non-veg diet type gets context
    Tool: Bash
    Preconditions: Transformer updated
    Steps:
      1. Run `grep -A5 "non-veg\|non_veg" src/services/aiRequestTransformers.ts` — expect handling for non-veg diet type
    Expected Result: Non-veg users get appropriate dietary context (not empty restrictions)
    Failure Indicators: No handling for non-veg diet type
    Evidence: .sisyphus/evidence/task-10-non-veg-handling.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `fix(diet): forward country, cuisine preferences, and dislikes to AI generation`
  - Files: `src/services/aiRequestTransformers.ts`, `src/services/fitaiWorkersClient.ts`, `src/services/ai-transformers/diet-transformers.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 11. Connect MealSuggestions.tsx to Real User Data

  **What to do**:
  - `src/components/diet/MealSuggestions.tsx` (lines 146-180) is 100% hardcoded — 3 static meals including non-vegetarian "Grilled Chicken Salad" and "Salmon with Quinoa"
  - **Zero** connection to any store, hook, or prop. No user data flows into this component.
  - Replace hardcoded meals with dynamic suggestions that:
    1. Read user's `dietPreferences.diet_type` from profileStore (vegetarian/vegan/etc.)
    2. Read user's `personalInfo.country` from profileStore
    3. Read user's `dietPreferences.cuisine_preferences` from profileStore
    4. Filter/generate meals that match ALL three criteria
    5. Use AI-generated meals from `useAIMealGeneration` hook if available, fallback to `regionalCuisineData` filtered by diet type + country
  - Add a loading state while meals are being fetched/generated
  - Show appropriate empty state if no meals match criteria
  - **CRITICAL**: A vegetarian user must NEVER see non-vegetarian meal suggestions

  **Must NOT do**:
  - Do not create a new API endpoint — use existing hooks/stores
  - Do not hardcode any new meals — all data must come from stores or AI generation
  - Do not change the visual layout/card design of MealSuggestions (that stays the same)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding data flow from profileStore → AI generation → component rendering, with diet type filtering logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 12, 13, 14)
  - **Blocks**: None
  - **Blocked By**: Tasks 8 (hooks migrated), 10 (diet preferences forwarded)

  **References**:

  **Pattern References**:
  - `src/components/diet/MealSuggestions.tsx` — THE file to fix (lines 146-180 are the hardcoded meals)
  - `src/components/diet/AIMealsPanel.tsx` — Example of a diet component that DOES use hooks for data
  - `src/hooks/useAIMealGeneration.ts` — Hook for AI-generated meals (use this as data source)
  - `src/hooks/useMealPlanning.ts` — Alternative meal planning hook

  **API/Type References**:
  - `src/stores/profileStore.ts` — `personalInfo.country`, `dietPreferences.diet_type`, `dietPreferences.cuisine_preferences`
  - `src/data/regionalCuisineData.ts` — Fallback meal data (currently India-only, Task 14 expands it)

  **WHY Each Reference Matters**:
  - `MealSuggestions.tsx`: This is the exact file to fix — need to understand its current rendering pattern to preserve card layout while changing data source
  - `AIMealsPanel.tsx`: Shows how other diet components in the codebase already connect to hooks
  - `useAIMealGeneration.ts`: The AI meal generation hook that should feed this component

  **Acceptance Criteria**:
  - [ ] MealSuggestions.tsx has ZERO hardcoded meal objects
  - [ ] Component reads from profileStore or an AI hook for meal data
  - [ ] Vegetarian users see only vegetarian meal suggestions
  - [ ] Country preference influences meal suggestions
  - [ ] `npx tsc --noEmit` passes
  - [ ] Loading state shown while data is being fetched

  **QA Scenarios:**

  ```
  Scenario: No hardcoded meals remain
    Tool: Bash
    Preconditions: Component refactored
    Steps:
      1. Run `grep -n "Grilled Chicken\|Salmon\|chicken\|salmon" src/components/diet/MealSuggestions.tsx` — expect 0 results
      2. Run `grep -n "useProfileStore\|useAIMealGeneration\|useMealPlanning" src/components/diet/MealSuggestions.tsx` — expect 1+ results (connected to store/hook)
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Zero hardcoded meals, component connected to real data source
    Failure Indicators: Any hardcoded food names, no store/hook imports
    Evidence: .sisyphus/evidence/task-11-meal-suggestions.txt

  Scenario: Vegetarian filtering works
    Tool: Bash
    Preconditions: Component connected to data
    Steps:
      1. Run `grep -n "diet_type\|vegetarian\|dietType\|isVegetarian" src/components/diet/MealSuggestions.tsx` — expect filtering logic present
      2. Run `grep -n "filter\|includes" src/components/diet/MealSuggestions.tsx` — expect array filtering logic
    Expected Result: Diet type filtering logic exists in component
    Failure Indicators: No filtering, meals shown without preference check
    Evidence: .sisyphus/evidence/task-11-veg-filter.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `fix(diet): connect MealSuggestions to real user data with diet/country filtering`
  - Files: `src/components/diet/MealSuggestions.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 12. Fix Hardcoded Calorie Targets Across Codebase

  **What to do**:
  - 4 files have hardcoded calorie targets that should read from `useCalculatedMetrics` or Supabase:
    1. `src/services/progress-data/converters.ts` — `daily_calorie_goal: 2000` hardcoded
    2. `src/services/progressData.ts` — `daily_calorie_goal: 2000` hardcoded
    3. `src/hooks/adjustment-wizard/errorRouter.ts` — `dailyCalories: 1500` fallback
    4. `src/hooks/useAdjustmentWizard.ts` — `1500` calorie fallback duplicate
  - Replace each with reads from the user's actual calculated targets:
    - `useCalculatedMetrics` hook returns `dailyCalories` computed from user's BMR + activity level + goals
    - If hook value is null/undefined, use a clearly-labeled DEFAULT constant from a single location (not magic numbers)
  - Create a single `FALLBACK_DAILY_CALORIES` constant in `src/types/nutrition.ts` or similar — used ONLY when calculated value unavailable

  **Must NOT do**:
  - Do not change the calculation logic in `useCalculatedMetrics` — just consume its output
  - Do not remove fallback entirely (edge case: new user with no profile data yet)
  - Do not hardcode new magic numbers — define ONE constant for the fallback

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 4 files, each with a simple find-replace of hardcoded number with hook/constant reference
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11, 13, 14)
  - **Blocks**: None
  - **Blocked By**: Task 4 (calorie calculation consolidated)

  **References**:

  **Pattern References**:
  - `src/hooks/useCalculatedMetrics.ts` — SSOT hook for computed calorie targets (returns `dailyCalories`, `macros`, etc.)
  - `src/services/progress-data/converters.ts` — Contains `daily_calorie_goal: 2000` hardcoded
  - `src/services/progressData.ts` — Contains `daily_calorie_goal: 2000` hardcoded
  - `src/hooks/adjustment-wizard/errorRouter.ts` — Contains `dailyCalories: 1500` fallback
  - `src/hooks/useAdjustmentWizard.ts` — Contains `1500` calorie fallback duplicate

  **WHY Each Reference Matters**:
  - `useCalculatedMetrics`: The correct source of calorie targets — must understand its return type
  - Each target file: Need to find the exact line and replace with hook call or constant

  **Acceptance Criteria**:
  - [ ] `grep -rn "daily_calorie_goal: 2000\|dailyCalories:.*1500" src/` returns 0 results
  - [ ] A single `FALLBACK_DAILY_CALORIES` constant exists somewhere canonical
  - [ ] All 4 files read from `useCalculatedMetrics` or the single fallback constant
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No hardcoded calorie targets
    Tool: Bash
    Preconditions: All 4 files updated
    Steps:
      1. Run `grep -rn "daily_calorie_goal: 2000" src/` — expect 0 results
      2. Run `grep -rn "dailyCalories.*1500\|1500.*calori" src/hooks/ src/services/` — expect 0 magic numbers
      3. Run `grep -rn "FALLBACK_DAILY_CALORIES" src/` — expect exactly 1 definition + N imports
      4. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Zero hardcoded calorie targets, single fallback constant
    Failure Indicators: Any remaining 2000 or 1500 calorie hardcoded values
    Evidence: .sisyphus/evidence/task-12-calorie-targets.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `fix(nutrition): replace hardcoded calorie targets with useCalculatedMetrics`
  - Files: `src/services/progress-data/converters.ts`, `src/services/progressData.ts`, `src/hooks/adjustment-wizard/errorRouter.ts`, `src/hooks/useAdjustmentWizard.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 13. Remove Hardcoded Meal Times in NutritionEngine

  **What to do**:
  - `src/features/nutrition/NutritionEngine.ts` lines 416-427 has hardcoded meal times: `"08:00"`, `"12:30"`, `"19:00"`, `"15:00"`
  - These ignore the user's `wake_time` and `sleep_time` from their profile
  - Replace hardcoded times with calculated times based on:
    - User's `wake_time` from profileStore (breakfast = wake_time + 30-60min)
    - User's `sleep_time` from profileStore (dinner = sleep_time - 2-3hrs)
    - Lunch = midpoint between breakfast and dinner
    - Snack = midpoint between lunch and dinner
  - If `wake_time`/`sleep_time` are null, use the current hardcoded values as DEFAULT fallback
  - Add the fallback default times as named constants (not magic strings)

  **Must NOT do**:
  - Do not change the meal generation logic — only the time derivation
  - Do not add new fields to profileStore (it should already have wake/sleep times)
  - Do not change the number of meals generated

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, single function — replace 4 hardcoded strings with calculated values
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11, 12, 14)
  - **Blocks**: None
  - **Blocked By**: None (independent fix)

  **References**:

  **Pattern References**:
  - `src/features/nutrition/NutritionEngine.ts:416-427` — THE lines to fix (hardcoded meal times)
  - `src/stores/profileStore.ts` — Source of `wake_time` and `sleep_time` fields

  **WHY Each Reference Matters**:
  - `NutritionEngine.ts`: Must understand the function signature to know how user data can be passed in
  - `profileStore`: Must verify field names and types for wake/sleep time

  **Acceptance Criteria**:
  - [ ] No hardcoded `"08:00"`, `"12:30"`, `"19:00"`, `"15:00"` strings in NutritionEngine.ts (unless as named DEFAULT constants)
  - [ ] Meal times derived from user's wake/sleep time when available
  - [ ] Fallback to named constants when wake/sleep time unavailable
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No hardcoded meal time strings
    Tool: Bash
    Preconditions: NutritionEngine updated
    Steps:
      1. Run `grep -n '"08:00"\|"12:30"\|"19:00"\|"15:00"' src/features/nutrition/NutritionEngine.ts` — expect 0 results for inline strings (may exist as named constants)
      2. Run `grep -n "DEFAULT_.*TIME\|FALLBACK_.*TIME\|wake_time\|sleep_time" src/features/nutrition/NutritionEngine.ts` — expect references to user times or named defaults
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Dynamic meal times with named fallback constants
    Failure Indicators: Bare string times still inline in logic
    Evidence: .sisyphus/evidence/task-13-meal-times.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `fix(nutrition): derive meal times from user wake/sleep schedule`
  - Files: `src/features/nutrition/NutritionEngine.ts`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 14. Expand regionalCuisineData Beyond India-Only

  **What to do**:
  - `src/data/regionalCuisineData.ts` (213 lines) contains ONLY Indian cuisine data
  - The user onboarding collects `personalInfo.country` but this data file can only serve Indian users
  - Restructure to support multiple countries:
    1. Change the data structure to a map keyed by country/region code
    2. Keep existing Indian data as `india` entry
    3. Add at minimum 3-5 more country/region entries: USA, UK, Mediterranean, East Asian, Latin American
    4. Each entry should have cuisine names, common ingredients, and typical meal patterns
    5. Export a `getCuisineDataForCountry(country: string)` function that returns matched data or a "global/default" fallback
  - Also update `src/data/indianFoodDatabase.ts` (728 lines) — rename to `foodDatabase.ts` or keep as-is but ensure it's properly scoped as India-specific
  - Ensure the data works with the diet type filtering (vegetarian entries must be tagged)

  **Must NOT do**:
  - Do not generate hundreds of meals — 5-10 representative items per country is sufficient
  - Do not change existing Indian data (only restructure the wrapper)
  - Do not create API calls to fetch cuisine data — keep as static local data
  - Do not include non-vegetarian items without proper tagging (`isVegetarian: true/false`)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Data structure design + creating representative meal data for multiple countries requires thoughtfulness
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11, 12, 13)
  - **Blocks**: Task 11 (MealSuggestions uses this data as fallback)
  - **Blocked By**: Task 6 (constants unified)

  **References**:

  **Pattern References**:
  - `src/data/regionalCuisineData.ts` — Current India-only data (restructure this)
  - `src/data/indianFoodDatabase.ts` — 728-line India-only food DB (scope/rename consideration)
  - `src/stores/profileStore.ts` — `personalInfo.country` field shape

  **WHY Each Reference Matters**:
  - `regionalCuisineData.ts`: Must understand current structure to preserve Indian data while adding new countries
  - `indianFoodDatabase.ts`: Decide whether to rename or keep scoped — either way, consumers must know it's India-specific
  - `profileStore`: Must know what values `country` can take to create matching keys

  **Acceptance Criteria**:
  - [ ] `regionalCuisineData.ts` supports at least 4 country/region entries (India + 3 more)
  - [ ] `getCuisineDataForCountry()` function exported with fallback for unknown countries
  - [ ] Each cuisine entry has vegetarian tagging on food items
  - [ ] Existing Indian data preserved (not deleted or altered)
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Multi-country cuisine data structure
    Tool: Bash
    Preconditions: Data file restructured
    Steps:
      1. Run `grep -n "india\|usa\|mediterranean\|east_asian\|latin" src/data/regionalCuisineData.ts` — expect 4+ country keys
      2. Run `grep -n "getCuisineDataForCountry\|export" src/data/regionalCuisineData.ts` — expect exported lookup function
      3. Run `grep -n "isVegetarian\|vegetarian" src/data/regionalCuisineData.ts` — expect diet type tagging
      4. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Multi-country data with lookup function and diet tagging
    Failure Indicators: Only India present, no lookup function, no diet tagging
    Evidence: .sisyphus/evidence/task-14-regional-cuisine.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(data): expand regionalCuisineData to support multiple countries with diet tagging`
  - Files: `src/data/regionalCuisineData.ts`
  - Pre-commit: `npx tsc --noEmit`

### Wave 3 — Theme Conversion (depends on Wave 1 ThemeProvider + Wave 2 store migration)

- [ ] 15. Convert Subscription/Paywall System to Aurora Dark Theme

  **What to do**:
  - 4+ files in the Subscription/Paywall system are entirely LIGHT-themed with 50+ hardcoded light colors:
    - `src/components/subscription/PaywallModal.tsx`
    - `src/components/subscription/paywall/PaywallHeader.tsx`
    - `src/components/subscription/paywall/PaywallFeaturesList.tsx`
    - `src/components/subscription/PremiumGate.tsx`
  - Replace ALL light background colors (`#ffffff`, `#f3f4f6`, `#f9fafb`, `white`, etc.) with Aurora dark theme tokens
  - Replace ALL text colors that assume light background with Aurora text tokens
  - Replace any gradient colors (`#667eea`, `#764ba2`) with Aurora gradient tokens
  - Apply glass morphism styling where appropriate (cards, overlays)
  - Ensure proper contrast ratios for accessibility (white text on dark backgrounds)

  **Must NOT do**:
  - Do not change the LAYOUT or FUNCTIONALITY of paywall components
  - Do not remove any features or subscription tiers
  - Do not use inline hex colors — import from Aurora tokens via `useTheme()` hook or direct token import

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Theme conversion requiring visual design judgment for dark mode aesthetics
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Dark theme conversion with proper contrast and visual hierarchy

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 16, 17, 18, 19, 20)
  - **Blocks**: Task 31 (ThemeProvider wiring)
  - **Blocked By**: Task 1 (ThemeProvider created), Task 9 (store migration in screens)

  **References**:

  **Pattern References**:
  - `src/components/subscription/PaywallModal.tsx` — Main paywall modal (most light colors)
  - `src/components/subscription/paywall/PaywallHeader.tsx` — Header with light background
  - `src/components/subscription/paywall/PaywallFeaturesList.tsx` — Features list with light cards
  - `src/components/subscription/PremiumGate.tsx` — Gate component with light styling
  - `src/theme/aurora-tokens.ts` — Token values to use for replacements
  - `src/components/ui/aurora/GlassCard.tsx` — Example of glass morphism dark styling pattern

  **WHY Each Reference Matters**:
  - Each paywall file has 10-15+ light colors to replace — need to map each to the correct Aurora token
  - `GlassCard.tsx`: Shows the glass morphism pattern (rgba backgrounds, borders) to follow for consistency

  **Acceptance Criteria**:
  - [ ] `grep -rn "#ffffff\|#fff\b\|#f3f4f6\|#F9FAFB\|white" src/components/subscription/` returns 0 results
  - [ ] All 4 files use Aurora tokens or `useTheme()` for colors
  - [ ] `npx tsc --noEmit` passes
  - [ ] Visual: dark backgrounds throughout paywall flow

  **QA Scenarios:**

  ```
  Scenario: No light colors remain in paywall system
    Tool: Bash
    Preconditions: Theme conversion complete
    Steps:
      1. Run `grep -rn "#ffffff\|#fff\b\|#f3f4f6\|#F9FAFB\|#FFFFFF\|white" src/components/subscription/` — expect 0 results
      2. Run `grep -rn "#667eea\|#764ba2\|#6366F1" src/components/subscription/` — expect 0 old brand colors
      3. Run `grep -rn "aurora\|AURORA\|useTheme" src/components/subscription/` — expect theme imports present
      4. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Zero light colors, all using Aurora tokens
    Failure Indicators: Any remaining light hex colors or old brand colors
    Evidence: .sisyphus/evidence/task-15-paywall-dark.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `fix(theme): convert Subscription/Paywall system to Aurora dark theme`
  - Files: `src/components/subscription/PaywallModal.tsx`, `src/components/subscription/paywall/PaywallHeader.tsx`, `src/components/subscription/paywall/PaywallFeaturesList.tsx`, `src/components/subscription/PremiumGate.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 16. Convert Cooking System to Aurora Dark Theme

  **What to do**:
  - 6 files in the Cooking system are entirely LIGHT-themed with 40+ hardcoded light colors:
    - `src/screens/cooking/CookingSessionScreen.tsx`
    - `src/components/cooking/CurrentStepDisplay.tsx`
    - `src/components/cooking/StepsList.tsx`
    - `src/components/cooking/VideoSection.tsx`
    - `src/components/cooking/IngredientsSection.tsx`
    - `src/components/cooking/NavigationButtons.tsx`
  - Replace ALL light backgrounds, text colors, card colors, and border colors with Aurora tokens
  - Apply glass morphism for card surfaces
  - Ensure step numbers/progress indicators use Aurora accent colors
  - Maintain readability of recipe instructions on dark background

  **Must NOT do**:
  - Do not change cooking logic, step navigation, or timer functionality
  - Do not change component structure/hierarchy
  - Do not use inline hex colors — all from Aurora tokens

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 6 files of theme conversion requiring consistent dark mode aesthetics
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Dark theme conversion with recipe/cooking UX considerations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 17, 18, 19, 20)
  - **Blocks**: Task 31
  - **Blocked By**: Task 1 (ThemeProvider created)

  **References**:

  **Pattern References**:
  - `src/screens/cooking/CookingSessionScreen.tsx` — Main cooking screen (parent)
  - `src/components/cooking/CurrentStepDisplay.tsx` — Step display with light background
  - `src/components/cooking/StepsList.tsx` — Steps list with light cards
  - `src/components/cooking/VideoSection.tsx` — Video area with light frame
  - `src/components/cooking/IngredientsSection.tsx` — Ingredients list with light background
  - `src/components/cooking/NavigationButtons.tsx` — Nav buttons with light styling
  - `src/theme/aurora-tokens.ts` — Token values for replacements

  **WHY Each Reference Matters**:
  - Each file is a self-contained component with its own StyleSheet — all need conversion
  - The cooking screen is a complex multi-section layout; must ensure dark theme works across all sections

  **Acceptance Criteria**:
  - [ ] `grep -rn "#ffffff\|#fff\b\|#f3f4f6\|#F9FAFB\|white" src/components/cooking/ src/screens/cooking/` returns 0 results
  - [ ] All 6 files use Aurora tokens for colors
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No light colors in cooking system
    Tool: Bash
    Preconditions: Theme conversion complete
    Steps:
      1. Run `grep -rn "#ffffff\|#fff\b\|#f3f4f6\|#F9FAFB\|#FFFFFF\|white" src/components/cooking/ src/screens/cooking/` — expect 0
      2. Run `grep -rn "aurora\|AURORA\|useTheme" src/components/cooking/` — expect theme imports
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Zero light colors, Aurora tokens everywhere
    Failure Indicators: Remaining light hex values
    Evidence: .sisyphus/evidence/task-16-cooking-dark.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `fix(theme): convert Cooking system to Aurora dark theme`
  - Files: `src/screens/cooking/CookingSessionScreen.tsx`, `src/components/cooking/CurrentStepDisplay.tsx`, `src/components/cooking/StepsList.tsx`, `src/components/cooking/VideoSection.tsx`, `src/components/cooking/IngredientsSection.tsx`, `src/components/cooking/NavigationButtons.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 17. Fix AIMealsPanel Light Status Banners + MealTypeSelector

  **What to do**:
  - `src/components/diet/AIMealsPanel.tsx` has light-colored status banners:
    - Success banner: `#dcfce7` background (light green) — replace with Aurora success dark variant
    - Warning banner: `#fef3c7` background (light amber) — replace with Aurora warning dark variant
  - `src/components/diet/meal-edit/MealTypeSelector.tsx` may have light-themed selection UI
  - Also fix hardcoded meal suggestion tags in AIMealsPanel.tsx (lines 37-102)
  - Replace all light backgrounds with Aurora glass/dark equivalents
  - Status indicators should use Aurora accent colors (success green, warning amber) at reduced opacity on dark background

  **Must NOT do**:
  - Do not change the AI meal generation logic
  - Do not change the panel layout structure

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Status banner color design on dark theme requires visual judgment
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 16, 18, 19, 20)
  - **Blocks**: None
  - **Blocked By**: Task 1 (ThemeProvider)

  **References**:

  **Pattern References**:
  - `src/components/diet/AIMealsPanel.tsx` — Lines with `#dcfce7` and `#fef3c7` status banners
  - `src/components/diet/meal-edit/MealTypeSelector.tsx` — Meal type selection UI
  - `src/theme/aurora-tokens.ts` — `colors.accent.success`, `colors.accent.warning` tokens

  **WHY Each Reference Matters**:
  - `AIMealsPanel.tsx`: Exact lines with light colors need surgical replacement
  - Aurora tokens: Must use proper success/warning dark variants (rgba with low opacity on dark bg)

  **Acceptance Criteria**:
  - [ ] `grep -rn "#dcfce7\|#fef3c7" src/components/diet/` returns 0 results
  - [ ] Status banners use Aurora dark success/warning colors
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No light status banners in AIMealsPanel
    Tool: Bash
    Preconditions: Colors replaced
    Steps:
      1. Run `grep -rn "#dcfce7\|#fef3c7\|#d1fae5\|#fefce8" src/components/diet/AIMealsPanel.tsx` — expect 0
      2. Run `grep -rn "aurora\|useTheme\|accent" src/components/diet/AIMealsPanel.tsx` — expect theme usage
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Dark status banners using Aurora accent colors
    Failure Indicators: Light green/amber backgrounds remaining
    Evidence: .sisyphus/evidence/task-17-aimealspanel-dark.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `fix(theme): convert AIMealsPanel status banners and MealTypeSelector to dark theme`
  - Files: `src/components/diet/AIMealsPanel.tsx`, `src/components/diet/meal-edit/MealTypeSelector.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 18. Fix AchievementsSection Rarity Badges + HealthScoreIndicator

  **What to do**:
  - `src/components/progress/AchievementsSection.tsx` (lines 217-227):
    - Light rarity badge backgrounds (`#fef3c7`, `#dbeafe`, etc.) with white text = contrast failure
    - Replace with dark-theme-compatible badge colors (dark backgrounds with colored text/borders)
  - `src/components/progress/HealthScoreIndicator.tsx`:
    - Light-themed health score display colors
    - Replace with Aurora dark equivalents
  - Note: Task 7 already fixed the responsive VALUES in AchievementsSection — this task fixes COLORS only

  **Must NOT do**:
  - Do not change responsive values (already fixed in Task 7)
  - Do not change achievement logic or badge criteria
  - Do not change HealthScore calculation logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Badge color design for dark theme requires visual hierarchy expertise
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 16, 17, 19, 20)
  - **Blocks**: None
  - **Blocked By**: Task 1 (ThemeProvider), Task 7 (responsive values fixed first)

  **References**:

  **Pattern References**:
  - `src/components/progress/AchievementsSection.tsx:217-227` — Rarity badge color definitions
  - `src/components/progress/HealthScoreIndicator.tsx` — Health score display with light colors
  - `src/theme/aurora-tokens.ts` — Accent color tokens

  **WHY Each Reference Matters**:
  - `AchievementsSection.tsx`: Lines 217-227 have the exact badge color map to replace
  - `HealthScoreIndicator.tsx`: Light-themed score display needs dark conversion

  **Acceptance Criteria**:
  - [ ] `grep -rn "#fef3c7\|#dbeafe\|#fee2e2\|#d1fae5" src/components/progress/AchievementsSection.tsx` returns 0
  - [ ] Badge colors provide readable contrast on dark background
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No light badge colors in achievements
    Tool: Bash
    Preconditions: Badge colors converted
    Steps:
      1. Run `grep -rn "#fef3c7\|#dbeafe\|#fee2e2\|#d1fae5\|#faf5ff" src/components/progress/AchievementsSection.tsx` — expect 0
      2. Run `grep -rn "#ffffff\|#fff\b\|white" src/components/progress/HealthScoreIndicator.tsx` — expect 0
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Dark-theme badge colors with proper contrast
    Failure Indicators: Light pastel badge backgrounds remaining
    Evidence: .sisyphus/evidence/task-18-badges-dark.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `fix(theme): convert achievement badges and HealthScoreIndicator to dark theme`
  - Files: `src/components/progress/AchievementsSection.tsx`, `src/components/progress/HealthScoreIndicator.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 19. Fix Remaining Light-Themed Components

  **What to do**:
  - Several additional components have light theme colors that need conversion:
    - `src/components/progress/AlertsSection.tsx` — Alert cards with light backgrounds
    - `src/components/details/ProductDetailsModal.tsx` — Modal with light theme
    - `src/components/progress/ProgressChart.tsx` — Chart background/axis colors
    - `src/components/common/GifPlayerContent.tsx` — Player container with light background
  - Replace all light backgrounds, text colors, borders with Aurora tokens
  - Apply glass morphism where appropriate (modals, cards)

  **Must NOT do**:
  - Do not change component logic or data handling
  - Do not touch components already handled in Tasks 15-18

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Multiple component theme conversions requiring consistent visual style
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 16, 17, 18, 20)
  - **Blocks**: None
  - **Blocked By**: Task 1 (ThemeProvider)

  **References**:

  **Pattern References**:
  - `src/components/progress/AlertsSection.tsx` — Alert card light backgrounds
  - `src/components/details/ProductDetailsModal.tsx` — Modal light theme
  - `src/components/progress/ProgressChart.tsx` — Chart light colors
  - `src/components/common/GifPlayerContent.tsx` — Player light container
  - `src/theme/aurora-tokens.ts` — Dark theme tokens to apply

  **WHY Each Reference Matters**:
  - Each file has its own set of light colors; agent must convert each independently
  - Aurora tokens provide the consistent dark palette to apply across all

  **Acceptance Criteria**:
  - [ ] `grep -rn "#ffffff\|#fff\b\|#f3f4f6\|#F9FAFB\|white" src/components/progress/AlertsSection.tsx src/components/details/ProductDetailsModal.tsx src/components/progress/ProgressChart.tsx src/components/common/GifPlayerContent.tsx` returns 0
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No light colors in remaining components
    Tool: Bash
    Preconditions: Theme conversion complete
    Steps:
      1. Run `grep -rn "#ffffff\|#fff\b\|#f3f4f6\|#F9FAFB\|white" src/components/progress/AlertsSection.tsx src/components/details/ProductDetailsModal.tsx src/components/progress/ProgressChart.tsx src/components/common/GifPlayerContent.tsx` — expect 0
      2. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Zero light colors in these 4 components
    Failure Indicators: Any remaining light hex values
    Evidence: .sisyphus/evidence/task-19-remaining-dark.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `fix(theme): convert AlertsSection, ProductDetailsModal, ProgressChart, GifPlayer to dark theme`
  - Files: `src/components/progress/AlertsSection.tsx`, `src/components/details/ProductDetailsModal.tsx`, `src/components/progress/ProgressChart.tsx`, `src/components/common/GifPlayerContent.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 20. Replace Hardcoded #667eea/#764ba2 Brand Colors (81+ Instances)

  **What to do**:
  - The old brand gradient colors `#667eea` and `#764ba2` are hardcoded in 81+ places across the codebase
  - Also replace related old colors: `#6366F1` (indigo primary from constants.ts THEME)
  - Replace ALL instances with Aurora gradient tokens or `colors.primary` (#FF6B35)
  - Strategy:
    1. Use `ast_grep_search` or `grep` to find all instances
    2. For gradient usage: replace with Aurora gradient (e.g., `['#FF6B35', '#FF8C42']` or tokens)
    3. For solid color usage: replace with `colors.primary` token reference
    4. For background gradients: use Aurora background gradient tokens
  - This is a mass find-and-replace task but each replacement needs context-aware judgment

  **Must NOT do**:
  - Do not change colors that are NOT `#667eea`/`#764ba2`/`#6366F1` — only these specific old brand colors
  - Do not break gradient arrays (maintain LinearGradient format)
  - Do not leave any inline hex colors — use token imports

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 81+ instances across many files; needs codebase-wide search and context-aware replacement
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15, 16, 17, 18, 19)
  - **Blocks**: Task 31
  - **Blocked By**: Task 1 (Aurora tokens defined)

  **References**:

  **Pattern References**:
  - `src/theme/aurora-tokens.ts` — Aurora gradient and primary color tokens
  - `src/theme/gradients.ts` — Gradient definitions (may already have Aurora gradients)
  - `src/utils/constants.ts` — Old THEME with `#6366F1` primary (being replaced)

  **WHY Each Reference Matters**:
  - Need to know exact Aurora replacement values before mass-replacing
  - `gradients.ts`: May already define Aurora gradients that can be imported

  **Acceptance Criteria**:
  - [ ] `grep -rn "#667eea\|#764ba2\|#6366F1" src/components/ src/screens/` returns 0 results
  - [ ] All replacements use Aurora tokens (not new hardcoded hex values)
  - [ ] `npx tsc --noEmit` passes
  - [ ] LinearGradient arrays still valid after replacement

  **QA Scenarios:**

  ```
  Scenario: Zero old brand colors remain
    Tool: Bash
    Preconditions: Mass replacement complete
    Steps:
      1. Run `grep -rn "#667eea" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules` — expect 0
      2. Run `grep -rn "#764ba2" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules` — expect 0
      3. Run `grep -rn "#6366F1" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v constants.ts` — expect 0 (constants.ts may still have old THEME for reference)
      4. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Zero old brand colors in any component or screen file
    Failure Indicators: Any remaining #667eea, #764ba2, or #6366F1
    Evidence: .sisyphus/evidence/task-20-brand-colors.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `fix(theme): replace all 81+ hardcoded #667eea/#764ba2/#6366F1 with Aurora tokens`
  - Files: All component/screen files containing old brand colors
  - Pre-commit: `npx tsc --noEmit`

### Wave 4 — Layout Fixes (SafeArea + Bottom Insets, can start parallel with Wave 3)

- [ ] 21. Fix Wrong SafeAreaView Imports (6 Screens)

  **What to do**:
  - 6 screens import `SafeAreaView` from deprecated `react-native` core instead of `react-native-safe-area-context`:
    1. `src/screens/workout/WorkoutSessionScreen.tsx`
    2. `src/screens/session/MealSession.tsx`
    3. `src/screens/details/ExerciseDetail.tsx`
    4. `src/screens/details/MealDetail.tsx`
    5. `src/screens/details/WorkoutDetail.tsx`
    6. `src/screens/onboarding/OnboardingContainer.tsx` (one import branch)
  - Change each import from `import { SafeAreaView } from 'react-native'` to `import { SafeAreaView } from 'react-native-safe-area-context'`
  - Verify `react-native-safe-area-context` is in package.json (it should be — other screens use it)

  **Must NOT do**:
  - Do not change any other imports in these files
  - Do not change SafeAreaView props or usage — only the import source
  - Do not touch screens that already use the correct import

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 6 files, each with a single import line change
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 22, 23, 24, 25)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately, but scheduled after earlier waves)

  **References**:

  **Pattern References**:
  - `src/screens/workout/WorkoutSessionScreen.tsx` — Wrong SafeAreaView import
  - `src/screens/session/MealSession.tsx` — Wrong SafeAreaView import
  - `src/screens/details/ExerciseDetail.tsx` — Wrong SafeAreaView import
  - `src/screens/details/MealDetail.tsx` — Wrong SafeAreaView import
  - `src/screens/details/WorkoutDetail.tsx` — Wrong SafeAreaView import
  - `src/screens/onboarding/OnboardingContainer.tsx` — Wrong SafeAreaView import branch
  - `src/screens/main/HomeScreen.tsx` — Example of CORRECT import pattern

  **WHY Each Reference Matters**:
  - Each file needs the exact same fix: change import source
  - HomeScreen shows the correct pattern to follow

  **Acceptance Criteria**:
  - [ ] `grep -rn "import.*SafeAreaView.*from 'react-native'" src/screens/ | grep -v safe-area-context` returns 0 results
  - [ ] All 6 files now import from `react-native-safe-area-context`
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: All SafeAreaView imports are correct
    Tool: Bash
    Preconditions: Imports changed
    Steps:
      1. Run `grep -rn "SafeAreaView" src/screens/ --include="*.tsx" | grep "from 'react-native'" | grep -v "safe-area-context"` — expect 0 results
      2. Run `grep -rn "react-native-safe-area-context" src/screens/workout/WorkoutSessionScreen.tsx src/screens/session/MealSession.tsx src/screens/details/ExerciseDetail.tsx src/screens/details/MealDetail.tsx src/screens/details/WorkoutDetail.tsx` — expect 5 results
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: All screens use react-native-safe-area-context
    Failure Indicators: Any screen still importing from bare react-native
    Evidence: .sisyphus/evidence/task-21-safearea-imports.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `fix(layout): replace deprecated SafeAreaView imports with react-native-safe-area-context`
  - Files: All 6 screen files listed above
  - Pre-commit: `npx tsc --noEmit`

- [ ] 22. Add SafeAreaView to AdvancedReviewTab + Fix Double Inset in Onboarding

  **What to do**:
  - `src/screens/onboarding/tabs/AdvancedReviewTab.tsx` has NO SafeAreaView at all — content can overlap status bar
    - Add `SafeAreaView` from `react-native-safe-area-context` with appropriate edges
  - Onboarding tabs have DOUBLE safe area inset:
    - Parent `OnboardingContainer.tsx` already adds `paddingTop: insets.top`
    - Child tabs add `edges={["top"]}` on their own SafeAreaView
    - Result: double top padding
  - Fix: Remove `edges={["top"]}` from child tabs OR remove `paddingTop: insets.top` from parent — pick ONE location
  - Recommended: Keep inset handling in parent `OnboardingContainer`, remove from individual tabs

  **Must NOT do**:
  - Do not change onboarding flow logic or data handling
  - Do not change the tab content or layout
  - Do not remove ALL SafeAreaView — just fix the double application

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Few files, clear fix pattern (add SafeAreaView to one, remove double inset from others)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21, 23, 24, 25)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/screens/onboarding/tabs/AdvancedReviewTab.tsx` — Missing SafeAreaView entirely
  - `src/screens/onboarding/OnboardingContainer.tsx` — Parent with `paddingTop: insets.top`
  - `src/screens/onboarding/tabs/PersonalInfoTab.tsx` — Example of child tab with `edges={["top"]}` (double inset)

  **WHY Each Reference Matters**:
  - `AdvancedReviewTab`: Needs SafeAreaView added
  - `OnboardingContainer`: Parent's padding strategy determines what children should do
  - `PersonalInfoTab`: Example of the double-inset pattern to fix

  **Acceptance Criteria**:
  - [ ] `AdvancedReviewTab.tsx` has SafeAreaView from `react-native-safe-area-context`
  - [ ] No double top inset in onboarding flow (parent OR children handle it, not both)
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No double inset and AdvancedReviewTab has SafeArea
    Tool: Bash
    Preconditions: Fixes applied
    Steps:
      1. Run `grep -n "SafeAreaView\|safe-area-context" src/screens/onboarding/tabs/AdvancedReviewTab.tsx` — expect SafeAreaView present
      2. Run `grep -c "edges.*top" src/screens/onboarding/tabs/*.tsx` — if parent handles top, expect 0 in tabs
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: SafeAreaView in AdvancedReviewTab, no double top inset
    Failure Indicators: Missing SafeAreaView in AdvancedReviewTab, double top padding visible
    Evidence: .sisyphus/evidence/task-22-onboarding-safearea.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `fix(layout): add SafeAreaView to AdvancedReviewTab and fix double inset in onboarding`
  - Files: `src/screens/onboarding/tabs/AdvancedReviewTab.tsx`, `src/screens/onboarding/OnboardingContainer.tsx`, other onboarding tabs as needed
  - Pre-commit: `npx tsc --noEmit`

- [ ] 23. Fix Bottom Insets on Main Tab Screens (Progress, Diet, Profile)

  **What to do**:
  - 3 main tab screens are missing proper bottom content spacing, causing content to be hidden behind tab bar:
    - `src/screens/main/ProgressScreen.tsx` — missing `insets.bottom + rh(90)` bottom spacing
    - `src/screens/main/DietScreen.tsx` — missing proper bottom spacing
    - `src/screens/main/ProfileScreen.tsx` — missing proper bottom spacing
  - The correct pattern (used in HomeScreen, FitnessScreen, AnalyticsScreen) is:
    - `paddingBottom: insets.bottom + rh(90)` on the ScrollView/FlatList contentContainerStyle
    - OR a spacer `<View style={{ height: insets.bottom + rh(90) }} />` at the bottom
  - Apply the same bottom spacing pattern to all 3 screens

  **Must NOT do**:
  - Do not change any content or logic in these screens
  - Do not change the tab bar itself
  - Do not use fixed pixel values — must use `insets.bottom + rh(90)` formula

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 files, each needing the same bottom padding pattern added
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21, 22, 24, 25)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/screens/main/HomeScreen.tsx` — CORRECT pattern: `insets.bottom + rh(90)` bottom spacing
  - `src/screens/main/FitnessScreen.tsx` — Another correct pattern example
  - `src/screens/main/ProgressScreen.tsx` — MISSING bottom spacing (fix this)
  - `src/screens/main/DietScreen.tsx` — MISSING bottom spacing (fix this)
  - `src/screens/main/ProfileScreen.tsx` — MISSING bottom spacing (fix this)
  - `src/components/navigation/TabBar.tsx` — Tab bar height: `rh(60) + insets.bottom`

  **WHY Each Reference Matters**:
  - HomeScreen: Copy this exact bottom spacing pattern
  - TabBar: Understanding its height explains why `rh(90)` is the magic number (rh(60) tab + rh(30) buffer)

  **Acceptance Criteria**:
  - [ ] All 3 screens have `insets.bottom + rh(90)` (or equivalent) bottom spacing
  - [ ] `grep -n "insets.bottom" src/screens/main/ProgressScreen.tsx src/screens/main/DietScreen.tsx src/screens/main/ProfileScreen.tsx` returns results in all 3 files
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Bottom spacing present on main tab screens
    Tool: Bash
    Preconditions: Bottom spacing added
    Steps:
      1. Run `grep -n "insets.bottom.*rh(90)\|rh(90).*insets.bottom\|bottomSpacing\|paddingBottom" src/screens/main/ProgressScreen.tsx` — expect bottom spacing
      2. Run same for DietScreen.tsx and ProfileScreen.tsx
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: All 3 screens have proper bottom spacing for tab bar
    Failure Indicators: Missing bottom spacing, content still hidden behind tab bar
    Evidence: .sisyphus/evidence/task-23-main-bottom-insets.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `fix(layout): add proper bottom insets to ProgressScreen, DietScreen, ProfileScreen`
  - Files: `src/screens/main/ProgressScreen.tsx`, `src/screens/main/DietScreen.tsx`, `src/screens/main/ProfileScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 24. Fix Bottom Insets on Settings, Detail, and Achievement Screens

  **What to do**:
  - Apply same `insets.bottom + rh(90)` bottom spacing pattern to ALL remaining screens missing it:
    - All 6 settings screens in `src/screens/settings/`
    - All 3 detail screens in `src/screens/details/` (ExerciseDetail, MealDetail, WorkoutDetail)
    - `src/screens/main/AchievementsScreen.tsx`
    - Any other screens identified as missing bottom spacing during implementation
  - Use `useSafeAreaInsets()` hook from `react-native-safe-area-context` to get insets
  - Add to ScrollView/FlatList `contentContainerStyle` or as bottom spacer View

  **Must NOT do**:
  - Do not change content or logic
  - Do not change screens already fixed in Task 23
  - Do not use fixed pixel values

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Repetitive pattern application across ~10 files
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21, 22, 23, 25)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/screens/main/HomeScreen.tsx` — CORRECT bottom spacing pattern to copy
  - `src/screens/settings/` — All 6 settings screens to fix
  - `src/screens/details/` — All 3 detail screens to fix
  - `src/screens/main/AchievementsScreen.tsx` — Achievement screen to fix

  **WHY Each Reference Matters**:
  - HomeScreen: The canonical pattern to replicate
  - Each target screen: Needs the same bottom spacing treatment

  **Acceptance Criteria**:
  - [ ] All settings screens have bottom spacing
  - [ ] All detail screens have bottom spacing
  - [ ] AchievementsScreen has bottom spacing
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Bottom spacing on all secondary screens
    Tool: Bash
    Preconditions: Bottom spacing added
    Steps:
      1. Run `grep -rn "insets.bottom" src/screens/settings/` — expect results in all settings files
      2. Run `grep -rn "insets.bottom" src/screens/details/` — expect results in all detail files
      3. Run `grep -n "insets.bottom" src/screens/main/AchievementsScreen.tsx` — expect result
      4. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Bottom spacing present in all secondary screens
    Failure Indicators: Any screen missing insets.bottom reference
    Evidence: .sisyphus/evidence/task-24-secondary-bottom-insets.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `fix(layout): add proper bottom insets to settings, detail, and achievement screens`
  - Files: All settings screens, detail screens, AchievementsScreen
  - Pre-commit: `npx tsc --noEmit`

- [ ] 25. Fix AchievementNotifications Toast Positioning

  **What to do**:
  - `src/components/workout/AchievementNotifications.tsx` positions toast with hardcoded `top: 60`
  - This ignores status bar height and dynamic island on newer iPhones
  - Replace with `insets.top + 10` (or similar) using `useSafeAreaInsets()` from `react-native-safe-area-context`
  - Also review `zIndex: 1000`/`999` values for potential conflicts with other overlays

  **Must NOT do**:
  - Do not change toast animation or content
  - Do not change the achievement notification logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, single positioning fix
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 21, 22, 23, 24)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/workout/AchievementNotifications.tsx` — Toast with hardcoded `top: 60`

  **WHY Each Reference Matters**:
  - Need to find the exact `top: 60` line and replace with insets-aware value

  **Acceptance Criteria**:
  - [ ] No hardcoded `top: 60` in AchievementNotifications.tsx
  - [ ] Toast position uses `insets.top` from `useSafeAreaInsets()`
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Toast uses dynamic top position
    Tool: Bash
    Preconditions: Positioning fixed
    Steps:
      1. Run `grep -n "top: 60" src/components/workout/AchievementNotifications.tsx` — expect 0 results
      2. Run `grep -n "insets.top\|useSafeAreaInsets" src/components/workout/AchievementNotifications.tsx` — expect present
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Dynamic top positioning using safe area insets
    Failure Indicators: Hardcoded top value remaining
    Evidence: .sisyphus/evidence/task-25-toast-position.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `fix(layout): replace hardcoded toast position with safe area insets`
  - Files: `src/components/workout/AchievementNotifications.tsx`
  - Pre-commit: `npx tsc --noEmit`

### Wave 5 — Mock Data Cleanup + Final Wiring (depends on earlier waves)

- [ ] 26. Remove/Connect RecoveryTipsModal Hardcoded Tips

  **What to do**:
  - `src/screens/main/fitness/RecoveryTipsModal.tsx` (lines 34-88) has 6 generic static recovery tips
  - These are not personalized to the user's workout, fitness level, or recovery needs
  - Options (pick the most appropriate):
    1. Connect to AI-generated recovery tips based on the user's last workout
    2. Connect to profile-based tips (e.g., stretch tips for flexibility goals, rest tips for overtraining)
    3. At minimum, select tips based on `workoutPreferences` from profileStore
  - If AI generation is complex, at minimum filter existing tips by workout type/goal from profileStore

  **Must NOT do**:
  - Do not remove the modal entirely — just fix the data source
  - Do not create new API endpoints

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single component, connect to existing store data
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 27, 28, 29, 30, 31)
  - **Blocks**: None
  - **Blocked By**: Task 8 (hooks migrated to profileStore)

  **References**:

  **Pattern References**:
  - `src/screens/main/fitness/RecoveryTipsModal.tsx:34-88` — Hardcoded tips array
  - `src/stores/profileStore.ts` — `workoutPreferences` for filtering

  **Acceptance Criteria**:
  - [ ] Recovery tips are filtered/selected based on user profile data
  - [ ] No fully static tip array without any personalization logic
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Recovery tips use profile data
    Tool: Bash
    Steps:
      1. Run `grep -n "useProfileStore\|workoutPreferences\|fitnessLevel" src/screens/main/fitness/RecoveryTipsModal.tsx` — expect profile data usage
      2. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Tips personalized based on user profile
    Evidence: .sisyphus/evidence/task-26-recovery-tips.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `fix(data): personalize RecoveryTipsModal based on user workout preferences`
  - Files: `src/screens/main/fitness/RecoveryTipsModal.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 27. Remove/Connect MotivationBanner Hardcoded Quotes

  **What to do**:
  - `src/screens/main/home/MotivationBanner.tsx` has 9 hardcoded motivational quotes
  - These are generic and not tied to user's goals, progress, or achievements
  - Connect to profileStore to make quotes goal-aware:
    1. Read user's primary goal (weight loss, muscle gain, general fitness, etc.)
    2. Filter/categorize quotes by relevance to the user's goal
    3. Optionally: add progress-aware messages ("You're 80% to your goal!", etc.)
  - At minimum: tag existing quotes with goal categories and filter based on user goal

  **Must NOT do**:
  - Do not remove the banner — just make it smarter
  - Do not create API calls for quotes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single component, add goal-based filtering to existing quotes
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 26, 28, 29, 30, 31)
  - **Blocks**: None
  - **Blocked By**: Task 8 (hooks migrated)

  **References**:

  **Pattern References**:
  - `src/screens/main/home/MotivationBanner.tsx` — Hardcoded quotes array
  - `src/stores/profileStore.ts` — User goals for filtering

  **Acceptance Criteria**:
  - [ ] Quotes are filtered/selected based on user's fitness goals
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Motivation quotes are goal-aware
    Tool: Bash
    Steps:
      1. Run `grep -n "useProfileStore\|goal\|fitness_goal" src/screens/main/home/MotivationBanner.tsx` — expect profile data reference
      2. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Quotes filtered by user goal
    Evidence: .sisyphus/evidence/task-27-motivation-quotes.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `fix(data): make MotivationBanner quotes goal-aware using profileStore`
  - Files: `src/screens/main/home/MotivationBanner.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 28. Fix ProfileScreen Hardcoded App Version

  **What to do**:
  - `src/screens/main/ProfileScreen.tsx` line 144 has `"1.0.0"` hardcoded as app version
  - Replace with dynamic version from `expo-constants` or `app.json`:
    - `import Constants from 'expo-constants'`
    - `Constants.expoConfig?.version` or `Constants.manifest?.version`
  - Fallback to `"0.0.0"` if Constants unavailable

  **Must NOT do**:
  - Do not change any other ProfileScreen content
  - Do not add new dependencies (expo-constants should already be available in Expo projects)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line change in single file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 26, 27, 29, 30, 31)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/screens/main/ProfileScreen.tsx:144` — Hardcoded `"1.0.0"`
  - `app.json` — Source of truth for app version

  **Acceptance Criteria**:
  - [ ] `grep -n '"1.0.0"' src/screens/main/ProfileScreen.tsx` returns 0 results
  - [ ] Version reads from expo-constants or app.json
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Dynamic app version
    Tool: Bash
    Steps:
      1. Run `grep -n '"1.0.0"' src/screens/main/ProfileScreen.tsx` — expect 0
      2. Run `grep -n "Constants\|expoConfig\|version" src/screens/main/ProfileScreen.tsx` — expect dynamic version
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: Dynamic version from expo-constants
    Evidence: .sisyphus/evidence/task-28-app-version.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `fix(profile): replace hardcoded app version with dynamic expo-constants`
  - Files: `src/screens/main/ProfileScreen.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 29. Remove Duplicate SuggestedWorkouts Component

  **What to do**:
  - Two IDENTICAL 284-line `SuggestedWorkouts` files exist:
    1. `src/screens/main/fitness/SuggestedWorkouts.tsx`
    2. `src/components/fitness/SuggestedWorkouts.tsx`
  - Delete ONE and update all imports to point to the remaining file
  - Keep the one in `src/components/fitness/` (components directory is canonical for reusable components)
  - Delete `src/screens/main/fitness/SuggestedWorkouts.tsx`
  - Update any imports referencing the deleted path

  **Must NOT do**:
  - Do not change the component's code — just remove the duplicate
  - Do not delete both files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Delete one file, update imports
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 26, 27, 28, 30, 31)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/screens/main/fitness/SuggestedWorkouts.tsx` — DUPLICATE (delete this)
  - `src/components/fitness/SuggestedWorkouts.tsx` — KEEP this one

  **Acceptance Criteria**:
  - [ ] Only ONE SuggestedWorkouts file exists
  - [ ] All imports point to the remaining file
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: Single SuggestedWorkouts file
    Tool: Bash
    Steps:
      1. Run `find src/ -name "SuggestedWorkouts.tsx"` — expect exactly 1 result
      2. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: One SuggestedWorkouts file, zero import errors
    Evidence: .sisyphus/evidence/task-29-dedup-workouts.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `chore(cleanup): remove duplicate SuggestedWorkouts component`
  - Files: Delete `src/screens/main/fitness/SuggestedWorkouts.tsx`, update imports
  - Pre-commit: `npx tsc --noEmit`

- [ ] 30. Delete Old Monolithic Files and Duplicate Calculators

  **What to do**:
  - After Task 4 unified BMR/metabolic calculations, old monolithic files should be cleaned up:
    - `src/utils/healthCalculations.ts` — Old monolithic file (if still exists and is fully replaced by subdirectory)
    - Any duplicate calculator files identified during Task 4 that were kept temporarily
  - Verify all consumers have been updated to import from the canonical subdirectory files
  - Delete files that are no longer imported anywhere
  - Use `lsp_find_references` to verify zero references before deleting

  **Must NOT do**:
  - Do not delete files that still have active imports (check first!)
  - Do not delete the canonical calculation files (only duplicates)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Delete verified-unused files
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 26, 27, 28, 29, 31)
  - **Blocks**: None
  - **Blocked By**: Task 4 (calculations unified)

  **References**:

  **Pattern References**:
  - `src/utils/healthCalculations.ts` — Old monolithic file to potentially delete
  - `src/utils/healthCalculations/` — New subdirectory (canonical)

  **Acceptance Criteria**:
  - [ ] No unused calculation files remain
  - [ ] All consumers import from canonical locations
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios:**

  ```
  Scenario: No orphaned calculation files
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` — expect 0 errors (no broken imports from deletions)
      2. Run `grep -rn "from.*healthCalculations'" src/ | grep -v healthCalculations/` — expect 0 (no imports to old monolithic)
    Expected Result: Clean import tree, no orphaned files
    Evidence: .sisyphus/evidence/task-30-cleanup.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `chore(cleanup): delete old monolithic healthCalculations and duplicate calculators`
  - Files: Deleted files as identified
  - Pre-commit: `npx tsc --noEmit`

- [ ] 31. Wire Aurora ThemeProvider into App.tsx

  **What to do**:
  - This is the FINAL wiring task — wrap the entire app root with `<ThemeProvider>` from Task 1
  - Open `App.tsx` (or `src/App.tsx` or wherever the root component is)
  - Import `ThemeProvider` from `src/theme`
  - Wrap the outermost component with `<ThemeProvider>...</ThemeProvider>`
  - This makes `useTheme()` available throughout the entire component tree
  - Also remove any imports of old `THEME`/`ResponsiveTheme` from `constants.ts` in App.tsx if present

  **Must NOT do**:
  - Do not change any other App.tsx logic (navigation, store providers, etc.)
  - Do not remove other providers (SafeAreaProvider, NavigationContainer, etc.)
  - Do not make ThemeProvider depend on any store (it should be context-only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, wrap existing JSX with one more provider component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (last task in Wave 5)
  - **Blocks**: F1-F4 (final verification depends on full theme being wired)
  - **Blocked By**: Task 1 (ThemeProvider exists), Tasks 15-20 (all theme conversions use tokens)

  **References**:

  **Pattern References**:
  - `App.tsx` or `src/App.tsx` — Root component to wrap
  - `src/theme/index.ts` — ThemeProvider export to import
  - `src/theme/ThemeProvider.tsx` — The provider component created in Task 1

  **WHY Each Reference Matters**:
  - `App.tsx`: Must identify the correct JSX nesting point for ThemeProvider
  - `theme/index.ts`: Must use the correct import path

  **Acceptance Criteria**:
  - [ ] `grep -n "ThemeProvider" App.tsx` (or equivalent) shows ThemeProvider wrapping app
  - [ ] `useTheme()` hook works in any component (theme is available via context)
  - [ ] `npx tsc --noEmit` passes
  - [ ] No imports of old `THEME` from `constants.ts` in App.tsx

  **QA Scenarios:**

  ```
  Scenario: ThemeProvider wraps app root
    Tool: Bash
    Preconditions: ThemeProvider wired
    Steps:
      1. Run `grep -n "ThemeProvider" App.tsx` (or find the root component) — expect present
      2. Run `grep -n "THEME\|ResponsiveTheme" App.tsx | grep -v ThemeProvider` — expect 0 old theme references
      3. Run `npx tsc --noEmit` — expect 0 errors
    Expected Result: ThemeProvider wrapping app, no old theme imports
    Failure Indicators: Missing ThemeProvider, old THEME still imported
    Evidence: .sisyphus/evidence/task-31-wire-provider.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(theme): wire Aurora ThemeProvider into app root`
  - Files: `App.tsx`
  - Pre-commit: `npx tsc --noEmit`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep for patterns). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit`. Grep for forbidden patterns: hardcoded hex colors in components (`#fff`, `#ffffff`, `#f3f4f6`, `#667eea`, `#6366F1`), `import { SafeAreaView } from 'react-native'`, `useUserStore` in non-auth contexts, hardcoded calorie targets (2000, 1500), hardcoded API URLs. Check for `as any`, empty catches, console.log in prod.
  Output: `TSC [PASS/FAIL] | Forbidden Patterns [N found] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` + `playwright` skill
  Start app in iOS simulator. Navigate every tab: Home, Fitness, Diet, Progress, Profile. Open every modal: PaywallModal, CookingSession, MealSuggestions, AchievementDetail. Verify dark theme everywhere. Verify vegetarian user sees no non-veg meals. Verify no content overlap with status bar. Verify no content cropped at bottom. Screenshot every screen. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Screens [N/N dark] | Modals [N/N dark] | Layout [N/N correct] | Diet [PASS/FAIL] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 compliance. Check "Must NOT do" rules. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message | Key Files |
|------|---------------|-----------|
| 1 | `feat(theme): create Aurora ThemeProvider + unify types and calculations` | theme/, types/, utils/healthCalculations/ |
| 2 | `fix(data): migrate to profileStore SSOT + fix diet preference forwarding` | stores/, hooks/, services/ |
| 3 | `fix(theme): convert all components to Aurora dark theme` | components/subscription/, components/cooking/, components/ |
| 4 | `fix(layout): correct SafeAreaView imports + bottom insets on all screens` | screens/ |
| 5 | `chore(cleanup): remove mock data, duplicate files, wire ThemeProvider` | data/, components/, App.tsx |

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # Expected: 0 errors
grep -r "from 'react-native'" src/ | grep SafeAreaView  # Expected: 0 results (all from react-native-safe-area-context)
grep -r "useUserStore" src/ --include="*.ts" --include="*.tsx" | grep -v "userStore.ts" | grep -v "auth"  # Expected: 0 non-auth results
grep -rn "#ffffff\|#fff\b\|#f3f4f6\|#F9FAFB\|#FFFFFF" src/components/ src/screens/  # Expected: 0 results
grep -rn "#667eea\|#764ba2\|#6366F1" src/components/ src/screens/  # Expected: 0 results
grep -rn "daily_calorie_goal: 2000\|dailyCalories: .*1500" src/  # Expected: 0 results
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] App renders correctly on iOS simulator
- [ ] All 5 main tabs load without errors
- [ ] Dark theme on every visible surface
- [ ] Vegetarian user sees only vegetarian meals

---

## Self-Review Addendum — Critical Gap Corrections

> Written after full plan read-through. These corrections OVERRIDE the original task descriptions where they conflict.

### GAP 1: Task 11 Intra-Wave Dependency on Task 14 (CRITICAL)

**Problem**: Task 11 (MealSuggestions.tsx) needs `getCuisineDataForCountry()` from Task 14 (regionalCuisineData expansion) as its fallback data source. Both are Wave 2 and marked as parallelizable, but T11 cannot start until T14 finishes.

**Correction**: The dependency matrix already lists `T14 → T11` (line 201), but Wave 2 dispatch instructions say all 7 tasks start simultaneously.

**Override**: When dispatching Wave 2, start T14 FIRST (or in the first parallel batch with T8, T9, T10, T12, T13). Start T11 ONLY after T14 completes. This means Wave 2 runs as two sub-waves:
- **Wave 2A** (parallel): T8, T9, T10, T12, T13, T14
- **Wave 2B** (after T14 completes): T11

### GAP 2: Task 12 Cannot Use React Hooks in Service Files (CRITICAL)

**Problem**: Task 12 says to replace hardcoded `daily_calorie_goal: 2000` in `converters.ts` and `progressData.ts` with reads from `useCalculatedMetrics`. But these are plain TypeScript service files, NOT React components — they CANNOT call React hooks.

**Correction to Task 12 "What to do"**:
- For `src/services/progress-data/converters.ts` and `src/services/progressData.ts`: These are service files called by other code. They MUST accept `dailyCalorieGoal` as a **function parameter** instead of calling a hook. The calling React component (which CAN use hooks) should pass the value from `useCalculatedMetrics`.
- For `src/hooks/adjustment-wizard/errorRouter.ts` and `src/hooks/useAdjustmentWizard.ts`: These ARE hooks and CAN call `useCalculatedMetrics` directly.
- Still create `FALLBACK_DAILY_CALORIES` constant for the parameter default: `function convertProgress(data, dailyCalorieGoal = FALLBACK_DAILY_CALORIES)`
- Find and update all CALLERS of `converters.ts`/`progressData.ts` functions to pass the calorie value from `useCalculatedMetrics`.

**Updated acceptance criteria for Task 12**:
- [ ] Service file functions accept `dailyCalorieGoal` as parameter with `FALLBACK_DAILY_CALORIES` default
- [ ] Hook files read from `useCalculatedMetrics` directly
- [ ] All callers of service functions pass the calorie value
- [ ] No React hook calls in non-React files

### GAP 3: Task 13 — NutritionEngine.ts is NOT a React Component (CRITICAL)

**Problem**: Task 13 says to read `wake_time`/`sleep_time` from `profileStore`. However, `NutritionEngine.ts` is a feature-level service class (located in `src/features/nutrition/`), NOT a React component. It cannot call `useProfileStore()` hook.

**Verified**: `profileStore.personalInfo.wake_time` and `.sleep_time` DO exist (from `PersonalInfoData` type in `src/types/onboarding/personal-info.ts`). The data is available — but the access pattern must change.

**Correction to Task 13 "What to do"**:
- NutritionEngine methods that generate meal times must accept `wakeTime?: string` and `sleepTime?: string` as **function parameters**
- Callers (React components/hooks that invoke NutritionEngine) should pass these from `useProfileStore().personalInfo?.wake_time`
- Named default constants: `DEFAULT_WAKE_TIME = "07:00"` and `DEFAULT_SLEEP_TIME = "23:00"`
- Use defaults when parameters are undefined: `const wake = wakeTime ?? DEFAULT_WAKE_TIME`

**Override to "Must NOT do"**: Remove line "Do not add new fields to profileStore (it should already have wake/sleep times)" — it's misleading. Replace with: "Do not add new fields to profileStore. The data already exists at `personalInfo.wake_time`/`sleep_time`. Access via function parameters, not hook calls."

**Additional finding**: `src/stores/notificationStore.ts` (line 43-44) has its own `wakeUpTime: "07:00"` and `sleepTime: "23:00"` — another SSOT violation. Task 13 should also update notificationStore to read from profileStore's wake/sleep times instead of its own hardcoded defaults. Add this as a sub-task.

### GAP 4: Task 20 Missing `frontend-ui-ux` Skill (MEDIUM)

**Problem**: Task 20 replaces 81+ hardcoded brand colors across the entire UI. It's categorized as `unspecified-high` with no skills. This is fundamentally a visual/styling task — the `frontend-ui-ux` skill understands color semantics, contrast ratios, and how to pick appropriate Aurora token replacements.

**Correction**: Change Task 20's agent profile to:
- **Category**: `unspecified-high`
- **Skills**: `["frontend-ui-ux"]`

### GAP 5: F3 References iOS Simulator — Project Runs on Windows (MEDIUM)

**Problem**: F3 (Real Manual QA) says "Start app in iOS simulator." But this project is developed on Windows (`win32` platform). iOS simulator is macOS-only.

**Correction**: Replace F3 instructions:
- "Start app in iOS simulator" → "Start app via `npx expo start` and open in Android emulator or Expo Go on physical device"
- All iOS-specific references → platform-agnostic or Android-specific

**Also update Final Checklist**:
- Line 2416: "App renders correctly on iOS simulator" → "App renders correctly on Android emulator / Expo Go"

### GAP 6: No Task Explicitly Deprecates Old THEME Object (MEDIUM)

**Problem**: Task 1 creates the Aurora ThemeProvider. Task 31 wires it into App.tsx. But NO task explicitly removes or deprecates the old `THEME`/`ResponsiveTheme` object from `src/utils/constants.ts`. After all theme conversion (Wave 3), no component should reference it — but the object definition still exists as dead code.

**Correction**: Add to Task 30 (Delete old monolithic files):
- In `src/utils/constants.ts`: Remove or comment out the `THEME` and `ResponsiveTheme` objects
- Add `// @deprecated` comment if keeping for reference, or delete entirely
- Verify `grep -rn "THEME\|ResponsiveTheme" src/ --include="*.ts" --include="*.tsx" | grep -v aurora | grep -v ThemeProvider | grep -v node_modules` returns 0 consumer results

### GAP 7 (Minor): notificationStore SSOT Violation — Additional Discovery

**Problem**: `src/stores/notificationStore.ts` (line 43-44) hardcodes `wakeUpTime: "07:00"` and `sleepTime: "23:00"` independently of `profileStore.personalInfo.wake_time/sleep_time`. This is an SSOT violation not captured in any task.

**Correction**: Add sub-task to Task 13: Update `notificationStore.ts` to initialize its `wakeUpTime`/`sleepTime` from `profileStore.personalInfo.wake_time`/`.sleep_time` when available, falling back to the same `DEFAULT_WAKE_TIME`/`DEFAULT_SLEEP_TIME` constants.

---

### Summary of Self-Review Changes

| Gap | Severity | Task Affected | Action |
|-----|----------|---------------|--------|
| 1 | CRITICAL | T11, T14 | Split Wave 2 into 2A (parallel) + 2B (T11 after T14) |
| 2 | CRITICAL | T12 | Service files accept calorie param; hooks call useCalculatedMetrics |
| 3 | CRITICAL | T13 | NutritionEngine accepts wake/sleep params; callers pass from store |
| 4 | MEDIUM | T20 | Add `frontend-ui-ux` skill |
| 5 | MEDIUM | F3, Final Checklist | iOS simulator → Android emulator / Expo Go |
| 6 | MEDIUM | T30 | Add THEME/ResponsiveTheme removal to cleanup task |
| 7 | MINOR | T13 (sub-task) | notificationStore reads wake/sleep from profileStore |

**Self-review status: COMPLETE. Plan ready for Momus submission.**
