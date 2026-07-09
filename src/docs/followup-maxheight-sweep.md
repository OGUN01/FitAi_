# maxHeight Percentage Sweep — Followup Report

**Date:** 2026-07-09
**Task:** Convert percentage-based `maxHeight` to absolute `rh(n)` tokens to fix Android a11y inverted-bounds measurement failure (P1-10 pattern).
**Spec:** `src/docs/UIUX-FINDINGS-CATALOG.md` P2-15 + P1-10 fix pattern.

## Conversion formula

`rh(n)` (from `src/utils/responsive.ts`) returns `n * (screenHeight / 852)` device pixels — i.e. `n` is in **design pixels** relative to the 852px-tall base device, NOT a percentage. To preserve a prior `X%` screen-height cap, the equivalent design-pixel value is `round(X * 8.52)`:

| Old % | New `rh(n)` | Design px (base 852) |
|-------|-------------|----------------------|
| 80%   | `rh(682)`   | 682 (≈80.0% of 852)  |
| 85%   | `rh(724)`   | 724 (≈85.0% of 852)  |
| 88%   | `rh(750)`   | 750 (≈88.0% of 852)  |
| 90%   | `rh(767)`   | 767 (≈90.0% of 852)  |
| 92%   | `rh(784)`   | 784 (≈92.0% of 852)  |

Reference pattern: `PaywallModal.tsx` `maxHeight: rh(2208)`; `AchievementDetailModal.tsx` `maxHeight: rh(400)`. Import path (verified against committed `AchievementDetailModal.tsx:18`): `import { ..., rh, ... } from "../../utils/responsive"` (relative depth adjusted per file).

## Sites changed (percentage → absolute)

| File | Line | Old | New | Import added? |
|------|------|-----|-----|---------------|
| `src/components/advanced/DatePicker.tsx` | 355 | `maxHeight: "80%"` | `maxHeight: rh(682)` | YES — added `import { rh } from "../../utils/responsive"` |
| `src/components/advanced/MultiSelect.tsx` | 343 | `maxHeight: "80%"` | `maxHeight: rh(682)` | YES — added `rh` to existing `import { rs, rbr, rh }` |
| `src/components/advanced/MultiSelectWithCustom.tsx` | 526 | `maxHeight: "80%"` | `maxHeight: rh(682)` | YES — added `rh` to existing `import { rs, rbr, rp, rh }` |
| `src/components/diet/ProductDetailsModal.tsx` | 466 | `maxHeight: '88%'` | `maxHeight: rh(750)` | YES — added `rh` to existing `import { rf, rp, rh }` |
| `src/components/ui/Modal.tsx` | 147 | `maxHeight: "80%"` | `maxHeight: rh(682)` | NO — `rh` already imported |
| `src/screens/main/profile/modals/SettingsSelectionModal.tsx` | 210 | `maxHeight: "80%"` | `maxHeight: rh(682)` | YES — added `rh` to existing `import { rf, rp, rbr, rw, rh }` |
| `src/components/diet/ScanResultModal.tsx` | 297 | `maxHeight: "85%"` | `maxHeight: rh(724)` | YES — added `rh` to existing `import { rf, rp, rh }` |
| `src/components/diet/MealEditModal.tsx` | 445 | `maxHeight: "85%"` | `maxHeight: rh(724)` | NO — `rh` already imported |
| `src/components/diet/MealDetailModal.tsx` | 256 | `maxHeight: "85%"` | `maxHeight: rh(724)` | YES — added `rh` to existing `import { rf, rw, rp, rbr, rh }` |
| `src/components/diet/MealTypeSelector.tsx` | 290 | `maxHeight: "80%"` | `maxHeight: rh(682)` | NO — `rh` already imported |
| `src/components/diet/LogMealModal.tsx` | 1043 | `maxHeight: "90%"` | `maxHeight: rh(767)` | NO — `rh` already imported |
| `src/screens/main/fitness/RecoveryTipsModal.tsx` | 339 | `maxHeight: "85%"` | `maxHeight: rh(724)` | NO — `rh` already imported |
| `src/components/health/HealthConnectDisclosureModal.tsx` | 209 | `maxHeight: "85%"` | `maxHeight: rh(724)` | NO — `rh` already imported (line 230 `rh(280)` was already absolute) |
| `src/components/onboarding/BMRInfoModal.tsx` | 209 | `maxHeight: "85%"` | `maxHeight: rh(724)` | NO — `rh` already imported |
| `src/components/onboarding/AdjustmentWizard.tsx` | 226 | `maxHeight: "92%"` | `maxHeight: rh(784)` | YES — added `rh` to existing `import { rf, rw, rp, rbr, rh }` |
| `src/components/nutrition/IngredientDetailModal.tsx` | 379 | `maxHeight: "80%"` | `maxHeight: rh(682)` | YES — added `rh` to existing `import { rf, rp, rbr, rh }` |
| `src/components/onboarding/TimePicker.tsx` | 325 | `maxHeight: "80%"` | `maxHeight: rh(682)` | NO — `rh` already imported |

**Total: 17 percentage maxHeight sites converted to absolute `rh(n)`.**

## "100%" sites LEFT unchanged (parent-constraint exception)

Per the rule: `"100%"` maxHeight on a child whose parent has an explicit constrained height is SAFE — the parent constrains, so it is not the inverted-bounds bug. These were verified and left as-is:

| File | Line | Value | Parent constraint justification |
|------|------|-------|---------------------------------|
| `src/components/fitness/ExerciseGifPlayer.tsx` | 307 | `maxHeight: "100%"` | Applied to an `<Image>` that already receives an explicit numeric `height` prop (line 304). The Image's own `height`/`width` props are the sizing source; `maxHeight: "100%"` only relaxes the cap relative to the wrapping `TouchableOpacity` (`gifTouchArea`), which is itself sized by the Image. Not a modal/container percentage maxHeight — not the bug pattern. |
| `src/components/fitness/gif-player/GifPlayerContent.tsx` | 83 | `maxHeight: "100%"` | Same as above — `<Image>` with explicit `height`/`width` props (lines 80-81); `maxHeight: "100%"` is a non-load-bearing cap on an already-explicitly-sized element. |
| `src/components/diet/ProductDetailsModal.tsx` | 472 | `maxHeight: '100%'` | `keyboardAvoid` style, child of `sharedModalContent` which now has absolute `maxHeight: rh(750)` (line 466, converted this sweep). Parent constrains → `"100%"` resolves against an absolute-capped parent. |
| `src/components/diet/ProductDetailsModal.tsx` | 526 | `maxHeight: '100%'` | `scrollView` style, also child of `sharedModalContent` (absolute `maxHeight: rh(750)`). Parent constrains → safe. |

## Test fix

`src/__tests__/components/diet/ProductDetailsModal.test.tsx`:
- Line 52-55: the `@/utils/responsive` mock only exported `rf` and `rp`. Added `rh: (value: number) => value` so the imported `rh` is a function at runtime (was causing `TypeError: (0 , _responsive.rh) is not a function`).
- Line 143: assertion `toBe("88%")` → `toBe(750)` to match the new `rh(750)` value (mock returns the input unchanged).

## Gate results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | EXIT 0 (zero errors) |
| Jest | `npx jest` | 86 suites passed, 1 failed, 1 skipped; 470 passed, 1 failed, 9 skipped |
| Expo export | `npx expo export --platform android` | EXIT 0 (bundle exported, 11.2 MB) |

### Note on the 1 remaining jest failure

The single failing suite is `src/__tests__/hooks/useProfileLogic.test.tsx` (line 178: `mockUpdateProfile.toHaveBeenCalledWith` assertion). This failure is caused by a **concurrent agent's** uncommitted edits to `useProfileLogic.ts`, `validation.ts`, `SyncEngine.ts`, `data-loaders.ts`, and `LocationFields.tsx` (P1-14 units-refactor work) — files OUTSIDE this agent's partition. Verified: on a clean tree (git stash of all working changes) `useProfileLogic.test.tsx` passes 4/4. None of the 18 files in this agent's partition are implicated. This failure is not a regression from the maxHeight sweep.

## Files touched (this agent's partition only)

**Source (17 maxHeight conversions):** DatePicker.tsx, MultiSelect.tsx, MultiSelectWithCustom.tsx, ProductDetailsModal.tsx, Modal.tsx, SettingsSelectionModal.tsx, ScanResultModal.tsx, MealEditModal.tsx, MealDetailModal.tsx, MealTypeSelector.tsx, LogMealModal.tsx, RecoveryTipsModal.tsx, HealthConnectDisclosureModal.tsx, BMRInfoModal.tsx, AdjustmentWizard.tsx, IngredientDetailModal.tsx, TimePicker.tsx.

**Test (1):** ProductDetailsModal.test.tsx (mock + assertion update).

No files outside the partition were edited. No new dependencies. Aurora tokens only (`rh`/`rw`/`rs`/`rbr`/`rf`/`rp`). No `Alert.alert`. No `console.log` added.
