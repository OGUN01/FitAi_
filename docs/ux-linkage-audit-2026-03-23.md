# FitAI UX Linkage Audit

Date: 2026-03-23
Status: approved for reviewed surfaces

This document records the confirmed UI/UX ambiguity and interaction-honesty fixes completed in the 2026-03-23 Ralph loop.

## Scope

- Analytics truth and empty-state honesty
- Home interaction honesty and empty-state clarity
- Profile settings honesty and stats visibility
- User-facing copy cleanup on reviewed surfaces

## Review Method

- Reused prior UX audit context from `.omx/context/ux-linkage-audit-20260319T123819Z.md`
- Ran fresh code reads on current reviewed surfaces instead of trusting older screenshots
- Fixed only confirmed user-facing ambiguity or fake-action issues
- Verified affected files with diagnostics after each patch batch
- Requested architect sign-off after implementation batches

## Confirmed Issues Fixed

### ANA-01 High: Analytics could show stale history under a newly selected period

- Severity: High
- User-facing symptom:
  After switching period, the workout card updated immediately, but weight and calorie history could still reflect the previously cached period.
- Root cause:
  `AnalyticsScreen` cached history without tracking which period it belonged to, and rendering was allowed before the new history finished loading.
- Affected files:
  - `src/screens/main/AnalyticsScreen.tsx`
- Fix:
  Added `loadedHistoryPeriodDays`, gated rendering on `isHistoryCurrent`, and only treated cached history as valid when it matched the active period.

### ANA-02 High: Weight trend card could fake a period change from goal distance

- Severity: High
- User-facing symptom:
  The Weight card sat under `This Period` but could show a trend chip derived from goal distance when insufficient history existed.
- Root cause:
  Weight trend fallback reused `targetWeight - currentWeight` as if it were period movement.
- Affected files:
  - `src/screens/main/AnalyticsScreen.tsx`
  - `src/screens/main/analytics/MetricSummaryGrid.tsx`
- Fix:
  Removed the goal-distance fallback from period trend logic and showed an honest "Log again to see trend" subtitle instead.

### ANA-03 Medium: Empty analytics charts looked actionable

- Severity: Medium
- User-facing symptom:
  Empty chart cards still appeared tappable, and the weight empty-state hint pointed to the wrong destination.
- Root cause:
  `TrendCharts` passed `onPress` even for empty states, and the empty weight hint still referenced Profile.
- Affected files:
  - `src/screens/main/analytics/TrendCharts.tsx`
  - `src/screens/main/analytics/components/LineChart.tsx`
- Fix:
  Disabled chart presses when the chart had no data and changed the weight empty-state hint to point to Progress.

### ANA-04 Medium: Achievements section could render as a blank `0/0` shell

- Severity: Medium
- User-facing symptom:
  Before achievements initialized, the section could show a count badge and empty card instead of a meaningful state.
- Root cause:
  `AchievementShowcase` ignored loading/init state and had no explicit empty fallback.
- Affected files:
  - `src/screens/main/AnalyticsScreen.tsx`
  - `src/screens/main/analytics/AchievementShowcase.tsx`
- Fix:
  Added loading and empty states and suppressed the count badge until initialization completed.

### ANA-05 Low-medium: Calories card treated aggregate `0` as real data

- Severity: Low-medium
- User-facing symptom:
  Users with no logged meals saw `0` calories and a period label instead of the intended "Log meals to track" empty state.
- Root cause:
  Data presence was inferred from definedness rather than actual logged values.
- Affected files:
  - `src/screens/main/AnalyticsScreen.tsx`
  - `src/screens/main/analytics/MetricSummaryGrid.tsx`
- Fix:
  Added explicit `hasData` semantics from the filtered history set and restored the proper empty-state copy.

### PROF-01 Medium: Theme and Language looked configurable when they were not

- Severity: Medium
- User-facing symptom:
  Profile presented Theme and Language as if they were actionable settings, even though only dark theme and English were available.
- Root cause:
  The UI still rendered these rows with setting affordances and retained dead screen-level modal paths.
- Affected files:
  - `src/hooks/useProfileLogic.ts`
  - `src/screens/main/ProfileScreen.tsx`
  - `src/__tests__/hooks/useProfileLogic.test.tsx`
- Fix:
  Marked those rows as disabled metadata with no chevrons, removed the dead modal path from `ProfileScreen`, and updated the hook test to match the current contract.

### PROF-02 Low-medium: Profile stat alerts used noisy emoji-decorated copy

- Severity: Low-medium
- User-facing symptom:
  Stat detail alerts used emoji-heavy titles that clashed with the app's own UI methodology.
- Root cause:
  `useProfileLogic` still emitted decorative emoji titles for the stat cards.
- Affected files:
  - `src/hooks/useProfileLogic.ts`
- Fix:
  Replaced those alert titles with plain product copy.

### PROF-03 Low: Profile sync alerts contained mojibake

- Severity: Low
- User-facing symptom:
  Sync alerts displayed corrupted punctuation like `Syncing...` and `Settings >`.
- Root cause:
  The file contained broken user-facing string literals.
- Affected files:
  - `src/hooks/useProfileLogic.ts`
- Fix:
  Replaced the mojibake strings with plain ASCII equivalents.

### HOME-01 Medium: Home health detail tiles routed to fake detail alerts

- Severity: Medium
- User-facing symptom:
  Tapping Heart, Sleep, or Quality in Home looked like it would open a real drill-down, but only showed placeholder alerts.
- Root cause:
  `HomeScreen` wired `HealthIntelligenceHub.onDetailPress` to informational alerts instead of a real surface.
- Affected files:
  - `src/screens/main/HomeScreen.tsx`
- Fix:
  Routed those taps to Analytics instead of a fake detail alert.

### HOME-02 Medium: Metric tiles still behaved like buttons without a real action

- Severity: Medium
- User-facing symptom:
  Metric tiles still provided press affordance and haptics even when no handler existed.
- Root cause:
  `MetricItem` always rendered as an interactive `AnimatedPressable`.
- Affected files:
  - `src/components/home/MetricItem.tsx`
- Fix:
  Disabled press behavior, haptics, and accessibility button semantics when no `onPress` handler is supplied.

### HOME-03 Medium: Health Intelligence empty state was oversized and weakly directed

- Severity: Medium
- User-facing symptom:
  The empty health panel consumed a large amount of space without a clear next step.
- Root cause:
  `HealthIntelligencePlaceholder` used a large centered empty slab instead of a compact onboarding-oriented state.
- Affected files:
  - `src/components/home/HealthIntelligencePlaceholder.tsx`
- Fix:
  Compressed the layout into a clearer row-based state with a direct setup hint and a stronger visual hierarchy.

### HOME-04 Medium: Home header/achievement actions still used fake or weak destinations

- Severity: Medium
- User-facing symptom:
  The streak badge, notifications bell, and achievement chips did not consistently go to real surfaces.
- Root cause:
  Home still used placeholder alerts for some of those quick-entry actions.
- Affected files:
  - `src/screens/main/HomeScreen.tsx`
- Fix:
  Routed streak and achievement taps to Achievements, and routed the notifications bell to notification settings.

### HOME-05 Medium: Home Body Progress advertised a fake photo action

- Severity: Medium
- User-facing symptom:
  The `Progress Photo` button appeared active on Home even though no real progress-photo flow existed there.
- Root cause:
  `HomeScreen` passed a placeholder photo alert into `BodyProgressCard`.
- Affected files:
  - `src/screens/main/HomeScreen.tsx`
  - `src/screens/main/home/BodyProgressCard.tsx`
- Fix:
  Removed the fake Home handler and rendered the photo CTA only when a real handler is supplied.

### ANA-06 Low-medium: AI badge in Analytics still looked like a control

- Severity: Low-medium
- User-facing symptom:
  Even after becoming non-interactive, the AI badge still looked visually similar to an action button.
- Root cause:
  The styling still used a large circular emphasis treatment.
- Affected files:
  - `src/screens/main/analytics/AnalyticsHeader.tsx`
- Fix:
  Converted the badge into a smaller status-chip treatment with a dot and `AI Soon` label.

### PROF-04 Low-medium: Profile stats could hide achievements behind horizontal overflow

- Severity: Low-medium
- User-facing symptom:
  On Profile, the achievements stat could be partially or fully hidden off-screen in the horizontal scroll row.
- Root cause:
  `ProfileStats` depended on horizontal overflow and a subtle fade hint to reveal the final card.
- Affected files:
  - `src/screens/main/profile/ProfileStats.tsx`
- Fix:
  Replaced the horizontal scroll row with a compact wrapped grid so all stats are visible by default.

### FIT-01 Low: Workout history meta text contained a corrupted separator

- Severity: Low
- User-facing symptom:
  Recent workout rows could show a broken separator character between duration and calories.
- Root cause:
  `WorkoutHistoryList` in the active Fitness surface contained an encoded separator in user-facing text.
- Affected files:
  - `src/screens/main/fitness/WorkoutHistoryList.tsx`
- Fix:
  Replaced the corrupted separator with a plain ASCII `-` to avoid encoding issues on the live surface.

### AUTH-01 Low: Guest sign-up surface contained corrupted navigation and helper text

- Severity: Low
- User-facing symptom:
  The guest auth screen showed a corrupted back arrow and broken bullet separator in the Google sign-up helper line.
- Root cause:
  `GuestSignUpScreen` used encoded text glyphs instead of stable icon/text rendering.
- Affected files:
  - `src/screens/main/GuestSignUpScreen.tsx`
- Fix:
  Replaced the broken text arrow with an `Ionicons` back icon and replaced the helper separator with plain ASCII text.

### PROG-01 Medium: Goal Progress card on Progress Trends showed fake progress and corrupted goal text

- Severity: Medium
- User-facing symptom:
  The `Goal Progress` card in `ProgressTrends` showed a hardcoded empty progress bar and broken weight-goal text even when current and target weights were available.
- Root cause:
  `GoalProgressCard` ignored the shared weight-goal progress utility and hardcoded the fill width to `0%`, while also containing corrupted text glyphs in the goal display.
- Affected files:
  - `src/screens/main/analytics/GoalProgressCard.tsx`
- Fix:
  Reused `getWeightGoalProgress(...)` to compute a real percentage for the bar and replaced the broken weight-goal/empty-state text with clean ASCII strings.

### FIT-02 Low-medium: Workout session media and instruction surfaces used emoji-heavy and corrupted UI text

- Severity: Low-medium
- User-facing symptom:
  Live workout-session surfaces displayed corrupted glyphs and emoji-led labels in the GIF player, instruction modal, and set-completion modal.
- Root cause:
  These components relied on text glyphs and emoji strings for visible labels, badges, and controls instead of stable plain text.
- Affected files:
  - `src/components/fitness/ExerciseGifPlayer.tsx`
  - `src/components/fitness/ExerciseInstructionModal.tsx`
  - `src/components/fitness/ExerciseSessionModal.tsx`
- Fix:
  Replaced the corrupted and emoji-based UI text with plain readable labels on the active workout-session surfaces.

### FIT-03 Medium: Core workout-session controls and completion alerts still used corrupted or decorative text

- Severity: Medium
- User-facing symptom:
  The active workout session could still show corrupted close glyphs, emoji-led completion labels, mojibake separators, and emoji-heavy completion alert text.
- Root cause:
  Core runtime components under `src/components/workout/` and `screens/workout/workoutAlerts.ts` still relied on decorative or corrupted text instead of stable readable labels.
- Affected files:
  - `src/components/workout/WorkoutErrorState.tsx`
  - `src/components/workout/WorkoutHeader.tsx`
  - `src/components/workout/ExerciseCard.tsx`
  - `src/screens/workout/workoutAlerts.ts`
- Fix:
  Replaced the corrupted/decorative runtime strings with plain readable text in the active workout-session controls and completion alerts.

### FIT-04 Low: Exported fitness card/helper components still carried decorative or corrupted text

- Severity: Low
- User-facing symptom:
  Non-primary fitness components still used emoji-led labels, corrupted separators, or unstable text glyphs, making the component library inconsistent with the cleaned active workout/runtime surfaces.
- Root cause:
  Exported fitness components had not yet been aligned with the plain-text cleanup already applied to the active workout flow.
- Affected files:
  - `src/components/fitness/WorkoutAnalytics.tsx`
  - `src/components/fitness/WorkoutCard.tsx`
  - `src/components/fitness/ExerciseCard.tsx`
  - `src/components/fitness/DayWorkoutView.tsx`
  - `src/components/fitness/gif-player/ExerciseInfo.tsx`
  - `src/components/fitness/gif-player/FullscreenModal.tsx`
  - `src/components/fitness/gif-player/GifPlayerContent.tsx`
  - `src/components/fitness/instruction/TabNavigation.tsx`
  - `src/components/fitness/instruction/ExerciseDetails.tsx`
  - `src/components/fitness/instruction/InstructionSteps.tsx`
  - `src/components/fitness/instruction/ModalHeader.tsx`
- Fix:
  Replaced corrupted/decorative text with readable labels and proper icon usage where the component layout expected icons.

## Simplifications Made

- Removed fake actions instead of inventing placeholder destinations.
- Replaced misleading fallback copy with honest empty-state text.
- Removed dead Theme/Language modal paths from the screen layer.
- Rendered optional CTAs only when a real handler exists.
- Converted a pseudo-button AI badge into a status chip.

## Remaining Non-Blocking Risks

- The Home notifications bell currently routes to notification settings, not a dedicated inbox.
- Profile Theme/Language still retain dormant switch cases in the hook, but they are no longer reachable from the UI contract.
- Full-project type/build verification remains noisy from pre-existing repo issues outside this UX pass.
- Secondary surfaces outside the reviewed branch may still need separate follow-up audits, but no confirmed issue remains in the reviewed main surfaces.

## Final Verdict

Approved for the reviewed surfaces in this Ralph loop. No confirmed ambiguity issue remains in the currently reviewed Home, Analytics, Profile, Guest auth, and live Fitness history surfaces.
