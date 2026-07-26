# Android Opaque Overlay Surfaces Design

## Problem and evidenced root cause

Several text-heavy overlays use `GlassCard` on top of populated screens. On Android, `GlassView` intentionally replaces native blur with a plain `View` when `optimizeForAndroid` is enabled. That fallback uses `colors.glass.background`, which is only `rgba(255, 255, 255, 0.1)`. Consequently, `blurIntensity="medium"` or `blurIntensity="heavy"` does not make the surface more opaque on Android. The modal scrim darkens the background, but sharp text and controls can still composite through the foreground card and compete with its content.

This is the same rendering mechanism established for the Health Connect disclosure. It is a surface-opacity defect, not duplicate rendering or a data-flow defect. The existing Health Connect fix provides the working pattern: apply `colors.backgroundSecondary` directly to the text-bearing overlay surface.

## Approved design

Make only text-heavy modal surfaces opaque with `colors.backgroundSecondary`:

- In `src/components/ui/aurora/BottomSheet.tsx`, apply an opaque surface style to the shared sheet `GlassCard`. `BottomSheet` is itself a modal-overlay primitive, so opacity belongs at this shared boundary and covers all current sheet consumers consistently.
- In `src/components/profile/LogoutConfirmationModal.tsx`, apply a local opaque surface style to the confirmation `GlassCard`.
- In `src/screens/main/profile/modals/SettingsSelectionModal.tsx`, apply a local opaque surface style to the selection `GlassCard`.
- In `src/screens/main/profile/modals/ClearCacheConfirmModal.tsx`, apply a local opaque surface style to the confirmation `GlassCard`.
- In `src/components/diet/MealDetailModal.tsx`, apply a local opaque surface style to the meal-detail `GlassCard`.

The style is intentionally applied to these overlay surfaces on every platform. This creates deterministic foreground contrast and avoids maintaining two visual contracts for the same modal. Existing border radius, shadow, padding, animation, backdrop, dismissal, scrolling, keyboard, gesture, and safe-area behavior remain unchanged.

Ordinary in-page `GlassCard` consumers retain their translucent appearance. `GlassView`, both `GlassCard` implementations, theme token defaults, and Expo Blur configuration remain unchanged.

## Affected components and flows

The shared `BottomSheet` change covers these current flows:

- Set logging from `WorkoutSessionScreen` through `SetLogModal`.
- Exercise instructions from `WorkoutSessionScreen` through `ExerciseInstructionModal`.
- Workout-template selection in `ScheduleBuilderScreen`.
- Exercise selection in `ScheduleBuilderScreen`.

The standalone changes cover:

- Sign Out from `ProfileScreen` through `LogoutConfirmationModal`.
- Theme, Units, and Language selection from `ProfileScreen` through `SettingsSelectionModal`.
- Clear Cache confirmation from `ProfileScreen` through `ClearCacheConfirmModal`.
- Meal detail from `DietScreen` through `MealDetailModal`.

No callbacks, state transitions, navigation, persistence, or domain logic change. The only data-flow effect is that the existing theme color token reaches the native surface style.

## Alternatives considered

### Selected: shared opacity for BottomSheet plus local opacity for standalone dialogs

This matches component ownership: every `BottomSheet` is an overlay, while ordinary `GlassCard` usage is broader and must remain translucent. It fixes all evidenced flows with a small, reviewable surface-area change.

### Rejected: make GlassView or GlassCard opaque on Android

A primitive-level change would alter ordinary dashboard, analytics, onboarding, diet, and workout cards that are not overlays. It would erase the intended glass treatment across the application and create a much larger regression radius.

### Rejected: enable experimental Android blur

Experimental blur introduces device- and version-dependent rendering and performance risk. It would not provide a deterministic contrast guarantee and is unnecessary when an opaque modal surface solves the readability problem directly.

## Accessibility and interaction behavior

The opaque dark surface prevents background labels, values, and controls from visually interfering with foreground text. This improves readability, focus separation, and cognitive clarity without changing semantic accessibility behavior.

The implementation must preserve:

- Android hardware-back handling and existing outside-tap behavior.
- BottomSheet drag-to-dismiss configuration and close controls.
- Set Log keyboard behavior and scroll access to all controls.
- Existing 44-point minimum touch targets.
- Screen-reader roles, labels, radio state, and alert semantics.
- Existing scroll limits at smaller sizes and increased font scaling.

Opacity must be attached to the existing card/sheet surface, not added as an intercepting view, so touch and accessibility trees remain unchanged.

## Regression test plan

Add focused component coverage for the surface contract:

1. Render `BottomSheet` visible and assert its `GlassCard` receives a style resolving to `backgroundColor: colors.backgroundSecondary`.
2. Render each standalone target visible and assert its foreground `GlassCard` resolves to the same opaque background.
3. Retain or add one interaction assertion per modal family so the style change cannot silently block behavior:
   - BottomSheet close action calls `onClose`.
   - Logout cancel and confirm call their existing callbacks.
   - Settings selection calls `onSelect`, and close calls `onClose`.
   - Clear Cache cancel and confirm preserve their callbacks.
   - Meal Detail close and its mark-complete/delete actions preserve their callbacks.

Tests must inspect the real `GlassCard` props or resolved styles rather than replacing it with a child-only mock. Expo Blur can remain mocked because the contract under test is the opaque style supplied by the overlay owner. No snapshot-only test is sufficient for this regression.

## Android visual QA

Test on an Android device or emulator at approximately 393 x 852 logical pixels with populated underlying screens:

1. Open Set Log over a workout session, show the keyboard, and confirm workout text is not legible through the sheet; scroll to every control and dismiss normally.
2. Open Exercise Instructions over the same session and verify the title, tips, and controls remain readable.
3. Open both Schedule Builder pickers over a populated schedule and verify rows remain visually isolated from the schedule beneath them.
4. On a populated Profile screen, open Sign Out, each settings selector, and Clear Cache; confirm no profile labels show through the cards and all actions work.
5. On a populated Diet day, open Meal Detail and confirm meal cards and nutrition values do not show through the modal.
6. Repeat representative long-content flows with increased system font size. Confirm content remains scrollable, controls remain reachable, and no text clips.

The visual pass criterion is strict: the dimmed screen may remain visible outside the sheet or dialog, but no underlying text or controls may be legible through the opaque foreground surface.

## Scope and non-goals

In scope:

- One shared opaque surface style on the `BottomSheet` card.
- One local opaque surface style in each of the four standalone target components.
- Focused style-contract and interaction regression tests.
- Android device/emulator visual and accessibility QA for the listed flows.

Out of scope:

- Changing `GlassView`, `GlassCard`, glass theme tokens, shadows, or gradients.
- Making ordinary in-page cards opaque.
- Enabling or configuring experimental Android blur.
- Migrating standalone dialogs to `BottomSheet` or another modal primitive.
- Redesigning modal layouts, copy, animation, gestures, or navigation.
- Changing the separately specified Health Connect disclosure fix.
- Reviving or modifying unused modal components.

## Risks and mitigations

- **Overlay appearance becomes less glass-like on iOS and web.** This is intentional for text-bearing modal surfaces; deterministic contrast takes precedence. Ordinary glass cards remain unchanged.
- **A shared BottomSheet change affects all current consumers.** All consumers are modal overlays and require the same contrast guarantee. Focused interaction tests and device checks cover the critical Set Log, exercise instruction, and picker flows.
- **Style placement could interfere with clipping or gestures.** Apply only `backgroundColor` to the existing `GlassCard`; do not add wrappers, change `overflow`, or alter gesture/accessibility structure.
- **Tests could pass while mocking away the regression.** Assert the real surface style and complement unit coverage with Android visual QA over dense content.

## Acceptance criteria

- Every listed overlay foreground resolves to opaque `colors.backgroundSecondary`.
- Underlying text is not legible through any listed foreground surface on Android.
- Ordinary `GlassCard` behavior and theme tokens are unchanged.
- Existing dismissal, selection, confirmation, scrolling, keyboard, gesture, and accessibility behavior still works.
- Focused tests, TypeScript validation, and the Android visual QA checklist pass.
