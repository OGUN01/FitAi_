# FitAI Home — "Aurora Briefing" Redesign Plan

## Summary

Redesign `HomeScreen` from 10 stacked feature-cards into a **3-zone "briefing" composition** whose centerpiece is a single unified hero: the **Activity Rings merged with Health Intelligence** (recovery ring + sleep + resting HR) in one world-class card, plus a one-tap workout CTA. The user keeps rings, health intelligence, the Log Weight quick-action row, and Body Progress — all redesigned to feel calm, premium, and "wow."

Locked product decisions (from user):
- **Hero = ONE card** containing concentric activity rings (left) + recovery ring with sleep/HR mini-metrics (right).
- **Quick Actions = keep all 8**, unify styling (one accent per semantic family, consistent 56px targets).
- **Motivation Banner = removed**; its emotional job folds into a single data-true line inside the hero.
- **Log Weight row + Body Progress stay** (redesigned).
- Goal: "best in the world, refreshing, unique — user feels glad they're part of it."

## Current State Analysis

`src/screens/main/HomeScreen.tsx` renders, in order: HomeHeader → ErrorBanner → MotivationBanner → GuestPromptBanner → HealthIntelligenceHub → DailyProgressRings (+EmptyMealsMessage, +SyncStatusIndicator) → TodaysFocus → QuickActions → HydrationTracker → BodyProgressCard → AchievementShowcase → EmptyCalendarMessage/WeeklyMiniCalendar.

Problems confirmed by reading the components:
- **Duplication:** steps appear in both `HealthIntelligenceHub` and `DailyProgressRings`; recovery/sleep insight competes with `SmartCoaching` (imported but not rendered) and `MotivationBanner`.
- **No single focal point:** 10 cards, all `GlassCard elevation={2}`, all with icon+title+badge headers — visually identical weight.
- **The #1 user intent** (start/continue workout) is a 44px circular button at scroll position ~5 (`TodaysFocus`).
- **Type chaos:** rf(9)–rf(18) used arbitrarily; rf(9)/rf(10) labels fail accessibility.
- **Nutrition ring rewards overeating** (ring completes at calorie target; over-target shows "complete").

Data plumbing is excellent and stays untouched: `useHomeLogic` exposes everything needed (`healthMetrics`, `realCaloriesBurned`, `currentSteps`, `caloriesConsumed`, `workoutMinutes`, `todaysWorkoutInfo`, `waterIntakeML/waterGoal`, `weightData`, `realStreak`, `weekCalendarData`, handlers).

## Proposed Composition (final, locked)

```
1. ContextBar          greeting · date · streak pill · avatar   (silent, not a hero)
2. HERO: VitalsCard    ONE GlassCard, elevation 3 — the focal point
   ├─ Left:  3 concentric rings (Move / Exercise / Nutrition)
   │         center = overall day % (replaces meaningless 4-ring mix)
   ├─ Right: Recovery ring (score) + Sleep (hrs) + Resting HR (bpm) mini-metrics
   ├─ One AI line: data-true coaching sentence (replaces MotivationBanner + SmartCoaching card)
   └─ PRIMARY CTA (full-width, solid brand): "Start Workout" / "Continue" / "View Summary" / "Create My Plan"
3. QuickActions        all 8, unified styling (horizontal scroll, snap)
4. HydrationTracker    redesigned compact (drop + quick-add, tighter)
5. BodyProgressCard    redesigned (weight trend + Log Weight action row kept)
6. Quiet footer        WeeklyMiniCalendar (compact) + AchievementShowcase (compact) — kept, de-emphasized
   + ErrorBanner, GuestPromptBanner, EmptyMeals/Calendar messages, WeightEntryModal — unchanged behavior
```

Information rule: every number appears **exactly once**. Steps/HR/sleep live only in the hero; the scoreboard rings show Move/Exercise/Nutrition; water lives only in HydrationTracker; weight only in BodyProgress.

## Proposed Changes (files)

### NEW: `src/screens/main/home/VitalsCard.tsx`
The hero. One `GlassCard elevation={3} blurIntensity="default" borderRadius="xl" padding="lg"`.
- Props: `caloriesBurned, caloriesGoal, workoutMinutes, workoutGoal, mealsLogged, mealsGoal, recoveryScore?, sleepHours?, restingHeartRate?, insightLine?, cta: {label, onPress, state}` — all sourced from existing `useHomeLogic` returns; no new data plumbing.
- Layout: `flexDirection: row`, left = concentric rings (extracted/refactored `Ring` from `DailyProgressRings`, 3 rings, outer rw(150)), center = overall %; right column = `RecoveryRing` (rw(72)) over two `MetricItem` rows (Sleep, Resting HR).
- Below: single `insightLine` (typography.variants.caption, text.secondary) — one sentence max, rendered only when a true insight exists; otherwise omitted (no placeholder).
- CTA: full-width `AnimatedPressable`, solid `colors.primary.DEFAULT`, height 52, `typography.variants.cardHeadline`, label derived from `todaysWorkoutInfo` (Start/Continue/View Summary/Create My Plan/Rest Day → "View Plan").
- Accessibility: one `accessibilityLabel` summarizing all metrics; CTA is a separate focusable button; ≥44pt targets.
- Handles `!hasRealData` by hiding right column (rings remain), not by placeholder card.

### REWRITE: `src/screens/main/home/QuickActions.tsx` (styling only, keep all 8)
- Keep `createQuickActions` 8 actions and horizontal scroll + snap.
- Unify: all icon circles 56px, `surface.1` background with `border.subtle` hairline (no per-action tinted rgba fills); icons colored by **semantic family**: logging (weight/meal/water) = `colors.primary`, scanning (food/barcode/label) = `colors.secondary`, content (recipes) = `colors.gold`, system (sync) = `colors.text.tertiary`. Labels `typography.variants.caption`.
- Removes the rainbow; keeps function. Update `QuickActionsConfig.tsx` colors to the 4 family tokens.

### REWRITE (visual): `src/screens/main/home/HydrationTracker.tsx`
- Keep WaterDrop + 3 quick-adds. Tighten: header uses `typography.variants.cardHeadline`; stat values use `typography.variants.sectionTitle` (not rf(18) extrabold); labels min 12px (delete rf(10)); quick-add buttons use `surface.1` + `colors.info` icon (no blue tinted fills); single status text, no duplicate reminder row.

### REWRITE (visual): `src/screens/main/home/BodyProgressCard.tsx`
- Keep TrendChart, GoalProgressBar, and the Log Weight action row (this is the "log weight row" the user wants kept).
- Restyle: current weight `typography.variants.heroStat` (40px Manrope ExtraBold — the one big number allowed); header `cardHeadline`; labels ≥12px; empty state uses `surface.1` icon container (fix wrong purple hexToRgba), single CTA.

### REWRITE (visual): `src/screens/main/home/HomeHeader.tsx`
- Flat avatar (`surface.2` + initial, no LinearGradient), greeting = `typography.variants.caption` text.secondary, name = `typography.variants.sectionTitle`, date = `caption`; streak pill = `surface.1` + flame icon `colors.primary`; remove notification bell until store exposes a real count.

### REWRITE (compact): `src/screens/main/home/WeeklyMiniCalendar.tsx`, `AchievementShowcase.tsx`
- Same data/props; reduce to `padding="md"`, titles `cardHeadline`, no badge headers, single "View all →" text link. Footer is quiet by design.

### EDIT: `src/screens/main/HomeScreen.tsx`
- Render new order (above). Remove `MotivationBanner` and `SmartCoaching` imports/sections. Replace `HealthIntelligenceHub` + `DailyProgressRings` + `TodaysFocus` sections with single `<VitalsCard>`.
- Add `insightLine` memo (small pure util, see below) and `cta` memo from `todaysWorkoutInfo`.
- Keep ErrorBanner, GuestPromptBanner, EmptyMealsMessage, EmptyCalendarMessage, WeightEntryModal, SyncStatusIndicator (moves into hero right column header as tiny status dot when stale/error).

### NEW UTIL: `src/utils/insightLine.ts`
Pure function `(recoveryScore?, sleepHours?, hydrationBehind?, streak?) => string | null`. Port the strongest rules from `SmartCoaching.generateRecommendations`, return at most one sentence, `null` when nothing meaningful. Unit-testable.

### DELETE (after migration, keep files until VitalsCard ships)
- Remove usage of `MotivationBanner`, `SmartCoaching`, `HealthIntelligencePlaceholder` from Home; keep `DailyProgressRings`'s `Ring` by extracting it into `VitalsCard` (then delete the old component once unused). `HealthIntelligenceHub`, `TodaysFocus`, `SmartCoaching`, `MotivationBanner` files deleted at the end.

### Design tokens (no changes needed)
Reuse existing: `surface.0/1/2`, `border.subtle`, `typography.variants` (`heroStat`, `sectionTitle`, `cardHeadline`, `caption`, `caption2`), `spacing`, `borderRadius.xl`, `shadows`, `colors.primary/secondary/gold/info`. One rule enforced: **only the CTA uses a solid brand fill; only the hero uses elevation 3.**

## Assumptions & Decisions

- Steps appear once (hero, not rings) — resolves duplication; wearable steps still attributed via `stepsSource` in hero tooltip/label.
- Nutrition ring semantics fixed: fill = min(consumed/target, 1); if consumed > target×1.1, ring shows full + caption "Over by N kcal" (no celebration of overeating).
- Overall % in ring center = mean of the 3 rings' progress (steps excluded — no longer a ring).
- SmartCoaching's card UI is removed; its best rules survive inside `insightLine`. `useHealthIntelligenceLogic` continues to provide recovery score/label/color.
- SyncStatusIndicator becomes a status dot in hero (visible only when stale/syncing/error); auto-sync-on-resume behavior unchanged.
- MotivationBanner's emotional role is served by `insightLine`; no quote card.
- No new backend, stores, or navigation. All props map to existing `useHomeLogic` returns.

## Verification

1. `npx tsc --noEmit` passes (project has existing errors; ensure no NEW errors in touched files — match the pattern used in `.omo/evidence/task-*-tsc-check.txt`).
2. `npx eslint` on touched files — no new warnings.
3. Hook-invariant test still passes: `src/__tests__/screens/HomeScreen.hookInvariant.test.tsx` (all memos/hooks before early returns — VitalsCard props memoized before `showGuestSignUp`/`isLoading` returns).
4. Manual on-device checklist:
   - Hero renders rings + recovery with real data; without wearable, right column hides cleanly.
   - CTA label/state correct for: no plan / rest day / pending / in-progress (progress %) / completed.
   - Quick Actions scroll/snap; all 8 navigate correctly (web shows health-sync alert).
   - Water quick-add updates instantly with haptic.
   - Body Progress logs weight via modal; trend chart renders.
   - Dark OLED background: elevation reads bg→card→hero with no colored panels.
   - VoiceOver/TalkBack: hero announces full summary; all targets ≥44pt; no text below 12px.
   - Reduce Motion: only opacity animations run.
