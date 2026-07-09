# Visual QA — Workout Flow (2026-06-23)

Emulator: emulator-5554, SDK 36, 1080×2400 @ 420dpi. Metro dev-client (Fast Refresh).

## Screens Captured

### Screen 1: Home tab (`screen1-home.png`, `07-loaded.xml`)
- **Greeting**: "Good evening, Test User" — visible.
- **Tab bar**: 5 tabs (Home/Exercise/Diet/Analytics/Profile) at y=2187-2313, all reachable.
- **Cards**: Health Intelligence, Move/Steps, Nutrition/Log Meal — all properly sized.
- **Issues**: None.

### Screen 2: Fitness tab (`screen2-fitness.png`, `08e-fitness.xml`)
- **Plan card**: "Lower Body B - Upper/Lower 4x/Week", "Start Workout" button, workout day chips (MON-SUN).
- **Stats**: 0/4 workouts, 1968 Est. Calories, 0% Progress — all visible.
- **Issues**: None.

### Screen 3: Workout session preview (`screen5-session-preview.png`, `11-workout-preview.xml`)
- **Exercise**: "dumbbell one arm snatch", "Exercise 1 of 8", GIF loading state.
- **Start Exercise button**: [273,1763-807,1913] 534×150 — good size.
- **Issues**: None.

### Screen 4: Performing phase — ExerciseSessionModal (`screen6-performing-fixed.png`, `15-height-outer.xml`)
- **ISSUE FOUND (CRITICAL)**: "Complete Set" and "Back" controls collapsed to 10px height (invisible, untappable).
  - **Root cause**: `AnimatedPressable` renders `Animated.View > Pressable`. The `height: rh(50)` and `flexShrink: 0` were on the inner `Pressable.style`, but the outer `Animated.View` (via `containerStyle`) had default `flexShrink: 1` and no height — so it collapsed to 10px, making the inner height irrelevant.
  - **Fix applied** (`ExerciseSessionModal.tsx`):
    - Added `controlButtonOuter` style: `{ flex: 1, flexShrink: 0, height: rh(50) }` passed via `containerStyle` prop to both `AnimatedPressable` instances (lines 463, 478).
    - Added `flexShrink: 0` to `controls` and `controlButton` styles.
    - Changed `animationContainer`, `breathingCircleOuter`, `breathingCircleMiddle` from `rh()/rw()` to `rs()` (min-dimension scale) and reduced from 250→200px to prevent overflow on tall screens.
    - Added explicit `width: rs(180), height: rs(180), flexShrink: 0` to `exerciseGifContainer`.
  - **Verification**: Controls now render at 375×141px. "Back" text 100×61, "Complete Set" text 270×61. Confirmed on Set 1 AND Set 2.

### Screen 5: SetLogModal (`screen7-setlog.png`, `16-setlog.xml`)
- **EditTexts**: Weight "40.0" [452,1389-894,1538] 442×149, Reps "8" [452,1583-894,1732] 442×149 — good.
- **RPE buttons**: "Easy"/"Just right"/"Hard" at y=1842-1926 with `content-desc` labels — a11y fix confirmed.
- **Set Type chips**: W/WU/F/D with `content-desc` ("Set type W" etc.).
- **Weight steppers**: +/- buttons with "Decrease weight by 2.5 kg" desc.
- **Save button**: [66,2122-1014,2271] 948×149 — good.
- **Issues**: None. Calibration note ("Starting at 40kg...") visible.

### Screen 6: Rest Timer (`screen8-rest.png`, `18-rest2.xml`)
- **Timer**: "2:40" remaining, "REST BETWEEN SETS", "Set 1 of 4 complete".
- **Presets**: 60s/90s/120s/180s — all 162-185×80, clickable.
- **Controls**: Pause [485,1595-610,1656], Skip [812,1595-900,1656], +10s [181,1595-281,1656].
- **Issues**: None.

### Screen 7: Set 2 performing phase (`screen9-set2.png`, `19-next-set.xml`)
- Controls at 375×141px — fix confirmed stable across sets.
- Progressive overload: Set 1 = 40.0kg×8=320vol, Set 2 = 42.5kg×8=340vol. Session volume 660.

### Screen 8: Exit dialog (`25-exit-dialog.xml`)
- "Save Progress?" with "0/8 exercises and 2 sets" — accurate.
- "CANCEL" and "SAVE & EXIT" buttons — both clickable.

### Screen 9: Regenerate (`28-regenerate.xml`, `29-regenerated.xml`)
- Confirmation dialog: "Regenerate Workout Plan" with CANCEL/REGENERATE.
- After regenerate: plan reloaded, "7% Complete" preserved. No errors.

## Deferred Issues

1. **ExerciseGifPlayer info chips negative height** (`15-height-outer.xml`): "Equipment: dumbbell" at [399,1003-596,949] = 197×**-54** and "Target: glutes" at 228×**-190**. The info chips render with inverted bounds (y1 > y2) inside the GIF player's container. This is a layout bug in `ExerciseGifPlayer.tsx` info section, not blocking (text is still visible). Deferred — requires investigating the GIF player's internal `exerciseInfo` layout flow.

## Summary

| Metric | Count |
|--------|-------|
| Screens captured | 9 |
| Issues found | 1 (critical) + 1 (deferred) |
| Issues fixed | 1 |
| Issues deferred | 1 |
| tsc --noEmit | PASS (exit 0) |
| jest | PASS (471 passing, 9 skipped, 0 failing) |

### Files Modified
- `src/components/fitness/ExerciseSessionModal.tsx` — fixed collapsed controls (containerStyle + flexShrink + rs() scaling)
