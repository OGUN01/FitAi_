# Wave UI Sweep — Bounds / FP Precision / Alert (P2-13/14/15/16/17, P3-3)

**Agent:** code-only UI agent (partition: ExerciseGifPlayer, SetLogModal, WorkoutSessionScreen, achievements/*)
**Date:** 2026-07-09
**Constraints:** Aurora tokens only, no new deps, no `Alert.alert`, no `console.log` in prod, no commits.

---

## P2-13 — ExerciseGifPlayer info chips inverted bounds in performing phase

**Root cause:** `WorkoutSessionScreen` rendered the `ExerciseGifPlayer` at `opacity:0` during the `performing` phase. The hidden player still laid out its info chips (Equipment/Target) with inverted/unmeasurable bounds, polluting the a11y tree with invisible nodes behind the `ExerciseSessionModal` overlay.

**Fix (in partition):** `src/screens/workout/WorkoutSessionScreen.tsx:796-818` — replaced the always-rendered `ExerciseGifPlayer` (with `session.exercisePhase === "performing" && { opacity: 0 }` style) with a conditional render: `{session.exercisePhase !== "performing" && (<ExerciseGifPlayer ... style={styles.exerciseGifPlayer} />)}`. The player is now `null` during the performing phase. The instructions entry point (`onInstructionsPress`) is available again in the next preview/resting phase. The inline `opacity:0` style array merge was removed; the `style` prop now passes only `styles.exerciseGifPlayer`.

**Verification:** `npx tsc --noEmit` exit 0. The performing phase is covered by `ExerciseSessionModal` (separate overlay); the GIF player only needs to show during preview/resting. No a11y nodes for hidden chips remain.

---

## P2-14 — Weight display fp precision accumulation across SetLogModal opens

**Root cause:** `calibrationStartKg` (mapped from `calibrationService.estimatedStartKg`) can carry floating-point drift after kg↔lbs round-trips, and the raw-string `setWeight` could leak unrounded values. The `calibrationService.ts` source uses `roundToPlate` (rounds to 2.5 multiples) which is mostly clean, but the lbs conversion path (`kg * 2.2046`) and repeated steppers can introduce fp error.

**Fix (in partition — SetLogModal calibration rounding only):** `src/components/workout/SetLogModal.tsx:193-201` — the calibration-seed useEffect now rounds `calibrationStartKg` to 1 decimal BEFORE passing to `kgToDisplay`:
```ts
const roundedStartKg = Math.round(calibrationStartKg * 10) / 10;
setWeight(kgToDisplay(roundedStartKg, userUnits));
```
This guarantees the seeded input string is always a clean 1-decimal value (e.g. `2.5`, never `2.5445`), stable across re-opens and the lbs path.

**Out-of-partition follow-up (NOTED, not edited):** `src/services/calibrationService.ts` — the `estimatedStartKg` returned by `getCalibrationStatus` flows from `computeStartWeight` → `roundToPlate`. `roundToPlate` already returns `Math.round(kg / 2.5) * 2.5` which is fp-clean for the kg path. No source-level rounding change is strictly required there, but for defense-in-depth a `Math.round(kg * 10) / 10` on the `estimatedStartKg` field before returning from `getCalibrationStatus` (line ~160) would harden the lbs downstream path. This file is a service (not a UI component) — left for a code agent.

---

## P2-15 — Systematic inverted/negative bounds sweep (percentage maxHeight + overflow:hidden)

**Method:** Grepped `maxHeight: "\d+%` and `maxHeight: "9` across `src/`. Found 20 instances of percentage-string `maxHeight` across modal containers.

**In-partition findings (all clean — no fix needed):**
- `src/components/fitness/ExerciseGifPlayer.tsx:306-307` — `maxWidth/Height: "100%"` on the `gif` Image, but the parent `gifContainer` has explicit absolute `{ height, width }` props (concrete px), so 100% resolves correctly. Not the problematic flex-end-Modal pattern. Safe.
- `src/components/achievements/AchievementDetailModal.tsx:206` — already `maxHeight: rh(400)` (absolute token, fixed in a prior wave per `visual-qa-achievements.md`). Good.
- `src/components/achievements/AchievementDetailModal.tsx:345` + `src/components/achievements/AchievementCard.tsx:220` — `overflow: "hidden"` on small fixed-height progress bars (`height: rp(8)` / `rh(0.6)`), not modal containers. Safe.
- `src/components/workout/SetLogModal.tsx` + `src/screens/workout/WorkoutSessionScreen.tsx` — no percentage maxHeight, no overflow:hidden on containers. Clean.

**Out-of-partition follow-ups (NOTED with exact file:line + needed change):**
Each uses the established P1-10 fix pattern (percentage maxHeight → absolute `rh(...)` token). All are modal containers in other agents' partitions:
1. `src/components/diet/LogMealModal.tsx:1043` — `maxHeight: "90%"` → `maxHeight: rh(2160)` (90% of 2400px).
2. `src/components/onboarding/AdjustmentWizard.tsx:226` — `maxHeight: "92%"` → `maxHeight: rh(2208)`.
3. `src/components/diet/MealEditModal.tsx:445` — `maxHeight: "85%"` → `maxHeight: rh(2040)`.
4. `src/components/diet/MealDetailModal.tsx:256` — `maxHeight: "85%"` → `maxHeight: rh(2040)`.
5. `src/components/diet/ScanResultModal.tsx:297` — `maxHeight: "85%"` → `maxHeight: rh(2040)`.
6. `src/components/health/HealthConnectDisclosureModal.tsx:209` — `maxHeight: "85%"` → `maxHeight: rh(2040)`.
7. `src/components/nutrition/IngredientDetailModal.tsx:379` — `maxHeight: "80%"` → `maxHeight: rh(1920)`.
8. `src/components/advanced/DatePicker.tsx:355` — `maxHeight: "80%"` → `maxHeight: rh(1920)`.
9. `src/components/advanced/MultiSelect.tsx:343` — `maxHeight: "80%"` → `maxHeight: rh(1920)`.
10. `src/components/advanced/MultiSelectWithCustom.tsx:526` — `maxHeight: "80%"` → `maxHeight: rh(1920)`.
11. `src/components/onboarding/TimePicker.tsx:325` — `maxHeight: "80%"` → `maxHeight: rh(1920)`.
12. `src/components/onboarding/BMRInfoModal.tsx:209` — `maxHeight: "85%"` → `maxHeight: rh(2040)`.
13. `src/components/diet/MealTypeSelector.tsx:290` — `maxHeight: "80%"` → `maxHeight: rh(1920)`.
14. `src/components/ui/Modal.tsx:147` — `maxHeight: "80%"` → `maxHeight: rh(1920)` (shared modal — high blast radius; verify all consumers).
15. `src/screens/main/fitness/RecoveryTipsModal.tsx:339` — `maxHeight: "85%"` → `maxHeight: rh(2040)`.
16. `src/screens/main/profile/modals/SettingsSelectionModal.tsx:210` — `maxHeight: "80%"` (this was the P1-9 fix; it works but uses percentage. Consider `rh(1920)` for consistency with P1-10 pattern, though it's already FIXED and functional.)

**Note:** `rh()` must be imported from `../../utils/responsive` (or appropriate relative path) at each file. The absolute values assume a 2400px-tall device screen (the test device); `rh(N)` scales by screen height ratio so it adapts to other devices.

---

## P2-16 — Zero-dimension invisible elements (zero width AND height)

**Root cause (from catalog):** Animated/collapsing elements at zero size (`flexShrink:1` + no height, or not-yet-measured) across Home/Diet/Analytics.

**In-partition findings (all clean — no fix needed):** Grepped `flexShrink`, `Animated.View`, and height-less containers across `src/components/achievements/*`, `src/components/fitness/ExerciseGifPlayer.tsx`, `src/components/workout/SetLogModal.tsx`, `src/screens/workout/WorkoutSessionScreen.tsx`. None exhibit the `flexShrink:1 + no height` zero-dimension pattern:
- AchievementCelebration `Animated.View` elements have concrete content + `width: "100%"` + `maxWidth: rp(320)`; content drives height.
- AchievementCard / AchievementDetailModal have explicit `height: rh(...)` / `rp(...)` tokens.
- ExerciseGifPlayer containers have explicit `{ height, width }` props.
- SetLogModal uses `flex: 1` ScrollView with `rp(spacing)` paddings, no zero-size risk.

**Out-of-partition follow-up:** P2-16 is scoped to Home/Diet/Analytics tabs (per catalog). The zero-dimension elements are not in this agent's partition. A device/visual-QA agent should grep `flexShrink:\s*1` across `src/screens/main/home`, `src/screens/main/diet`, `src/screens/main/analytics` and add explicit height constraints following the P0-7 pattern (`flex:1, flexShrink:0, height:rh(N)`).

---

## P2-17 — "Region/City (Optional)" label contradicts "State is required" validation

**Root cause:** In `src/components/onboarding/LocationFields.tsx`, the `state` field has two render paths:
- State button grid (line 124-158): label "State/Province *" (correctly marked required).
- Custom-country text Input (line 160-168): label "State/Province" (NO asterisk — looks optional).
But `src/services/onboardingService.ts:1058` always validates `if (!data.state?.trim()) errors.push("State is required")` — state is required regardless of country. So the custom-country state Input label misleads the user into thinking state is optional, then the Next button throws "State is required".

The `region` field (line 173, label "Region/City (Optional)") is genuinely optional and correctly labeled.

**Out-of-partition (NOTED — `LocationFields.tsx` is in `src/components/onboarding/`, not this agent's partition):**
- **Fix needed:** `src/components/onboarding/LocationFields.tsx:163` — change `label="State/Province"` → `label="State/Province *"` to match the button-grid label (line 127) and the validation requirement. This makes label + validation consistent (both indicate required).

---

## P3-3 — Achievements dialog uses Alert.alert

**Finding:** Grepped `Alert.alert` across all `*chiev*` files (components, screens, hooks, services). **Zero matches.** The achievements flow uses `AchievementDetailModal` (RN `Modal`) + toasts (`AchievementNotifications`), NOT `Alert.alert`. The `visual-qa-achievements.md:133,138` doc confirms: "No `Alert.alert`: Achievements flow uses `AchievementDetailModal` (RN Modal) + toasts. No `Alert.alert` introduced."

**Conclusion:** P3-3 is a false positive — the original `visual-qa-profile.md` note referenced the Profile stat-tap `Alert.alert`, which was already fixed (`useProfileLogic.ts:382` delegates to `crossPlatformAlert`). No `Alert.alert` exists in `src/components/achievements/*`. **No fix needed.** Status: N/A (already clean).

**Remaining `Alert.alert` in codebase (out-of-partition, NOTED):**
- `src/screens/main/profile/modals/SettingsSelectionModal.tsx`
- `src/screens/main/profile/modals/ClearCacheConfirmModal.tsx`
- `src/components/ui/CustomDialog.tsx`
These are not achievements components and not in this agent's partition.

---

## Gate results

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | EXIT 0 (zero errors) |
| `npx jest` | 470 passed, 9 skipped, 1 failed (480 total); 86 suites passed, 1 failed, 1 skipped (88 total) |
| `npx expo export --platform android` | EXIT 0 (bundle exported: `dist/`) |

**Note on jest regression:** The 1 failing test is `src/__tests__/hooks/useMealPlanning.test.ts` — "skips redundant initial hydration when meal data is already warm". Failure is in `src/hooks/useMealPlanning.ts:172` (`loadNutritionStoreData().catch` — `loadNutritionStoreData()` returns undefined, not a Promise). This is a PRE-EXISTING failure caused by the `useMealPlanning.ts` changes already in the working tree (modified by another agent this session — see git status `M src/hooks/useMealPlanning.ts`). **Not caused by this agent's edits** — this agent only touched `WorkoutSessionScreen.tsx` (GIF render), `SetLogModal.tsx` (calibration rounding), and wrote this report. The baseline was 471/87; the regression is in meal-planning, not workout/fitness UI.

---

## Summary of edits made (in-partition)

1. `src/screens/workout/WorkoutSessionScreen.tsx:796-818` — P2-13: conditional null render of ExerciseGifPlayer during performing phase (removed opacity:0 hack).
2. `src/components/workout/SetLogModal.tsx:193-201` — P2-14: round `calibrationStartKg` to 1 decimal before seeding weight input.

## Out-of-partition follow-ups (16 P2-15 modal files + calibrationService.ts + LocationFields.tsx + 3 Alert.alert files)

See sections above for exact file:line + needed change for each.
