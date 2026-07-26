# Workout Complete Dialog Resilience Design

## Problem and success criteria

`WorkoutCompleteDialog` is rendered after a workout is saved. Its current React Native `Modal` contains a centered `SafeAreaView` and `Card` whose celebration content, multiline notes input, and two actions are laid out as one unbounded column. It has no keyboard avoidance or scrolling. On a 320 x 568 viewport, at increased font scale, or while the Android keyboard is open for the notes field, the lower content can extend outside the available safe area and make `View Progress` or `Done` unreachable.

The fix succeeds when the complete dialog stays inside the current safe-area-adjusted viewport, the body can scroll when it does not fit, and both actions remain visible and operable at 320 x 568 logical pixels and 200% system font scaling with the Android keyboard open.

## Existing architecture and live flow

- `WorkoutSessionScreen` creates `completeDialog` after workout persistence succeeds, then renders `WorkoutCompleteDialog` from `src/components/ui/CustomDialog.tsx`.
- `WorkoutCompleteDialog` owns only ephemeral `rating` and `notes` state. `Done` calls `onDone`; `View Progress` first calls `onDone` and then `onViewProgress`.
- The dialog currently uses a transparent stock React Native `Modal`, the shared dim overlay, a `SafeAreaView`, and the shared elevated `Card` styling.
- The celebration icon, title, workout summary, statistics, rating stars, multiline notes input, and actions are direct children of the card. There is no `KeyboardAvoidingView`, height constraint, or `ScrollView` in this dialog.
- No focused component test currently covers `WorkoutCompleteDialog` layout structure or callback behavior.

## Considered approaches

1. **Keyboard-aware card with a scrollable body and fixed action footer (chosen).** Constrain the existing card to the numeric safe-area-adjusted window height, let its body shrink and scroll, and keep the two actions outside the scroll region. This preserves the visual hierarchy and guarantees the completion choices remain reachable.
2. **Put the entire card, including actions, in one `ScrollView`.** This is smaller structurally, but users could still have to discover and scroll to the completion actions while the keyboard is open.
3. **Convert the dialog to the shared `BottomSheet`.** This would standardize the container but changes presentation, gestures, animation, and Android modal behavior. It is unnecessary for this focused resilience fix.

## Proposed component and layout behavior

The production change remains inside the `WorkoutCompleteDialog` branch of `src/components/ui/CustomDialog.tsx`:

1. Read the current window height with `useWindowDimensions` and safe-area insets with `useSafeAreaInsets`.
2. Derive a numeric maximum dialog height from `windowHeight - insets.top - insets.bottom - vertical outer spacing`. Use a numeric value rather than percentage `maxHeight`, matching the project's Android accessibility-bounds guidance.
3. Replace the dialog's overlay root with a full-height `KeyboardAvoidingView` that retains the existing overlay style. Use `behavior="padding"` on iOS and `behavior="height"` on Android. No keyboard behavior is added for web.
4. Preserve the existing `SafeAreaView` width and elevated `Card`. Apply the numeric maximum height to a workout-completion-specific `SafeAreaView` style, and give the card a workout-completion-specific shrinkable layout so it stays inside that wrapper without changing the generic `CustomDialog` layout.
5. Place the celebration icon, title, stats, rating controls, and notes input in a vertical `ScrollView`. Give the scroll view `keyboardShouldPersistTaps="handled"`, a shrinkable content area, and a content container that preserves the current centered alignment and spacing.
6. Keep `View Progress` and `Done` after the scroll view in a fixed footer inside the card. The footer remains part of the constrained card and therefore stays above the keyboard while the body scrolls independently.

The existing colors, card surface, shadow, padding, icon, copy, stats, rating appearance, notes behavior, button order, modal animation, and overlay opacity remain unchanged.

## Platform behavior

- **Android:** `KeyboardAvoidingView` uses `height`, reducing the dialog's usable region when the software keyboard appears. The scroll body yields space while the action footer remains reachable.
- **iOS:** `KeyboardAvoidingView` uses `padding`, preserving the current centered presentation while moving keyboard-obscured content into the scrollable region.
- **Web:** no native keyboard-avoidance behavior is selected; the numeric window/safe-area height cap and scroll body still prevent short-browser clipping.
- Window dimension changes, including rotation and split-screen resizing, recompute the numeric height cap through `useWindowDimensions`.

## Data flow, callbacks, and errors

This change adds no persistence, navigation, or asynchronous work. Rating and notes state, trimming, reset behavior, and callback order remain exactly as implemented:

- `Done` calls `onDone(rating?, notes?)` and resets local feedback state.
- `View Progress` calls `onDone(rating?, notes?)` and then `onViewProgress()`.
- The modal remains non-dismissible through a new gesture or background tap; no new error state is introduced.
- Layout calculations use current window dimensions and safe-area insets only. If insets are zero, the normal outer spacing still prevents the card from touching the viewport edge.

## Accessibility

- Do not add fixed heights to text or truncate labels; increased system font sizes must flow into the scroll body.
- Preserve logical TalkBack/VoiceOver order: celebration content, stats, rating, notes, `View Progress`, then `Done`.
- Preserve the existing button components and their minimum touch targets.
- Keep both actions outside the scroll region so keyboard and large-text users do not lose the completion controls.
- `keyboardShouldPersistTaps="handled"` allows rating and other controls inside the scroll body to receive the first tap while the keyboard is open; the fixed footer buttons remain directly tappable outside that scroll region.

## Test and visual QA plan

Add focused coverage under `src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx`:

- Render the visible dialog and verify the existing title, notes input, and both actions remain present.
- Verify the workout-specific safe-area wrapper receives a numeric maximum height and the Android keyboard-avoidance contract uses `behavior="height"`.
- Verify the body is a `ScrollView` with `keyboardShouldPersistTaps="handled"` and that `View Progress` and `Done` are outside that scroll body.
- Enter notes and select a rating, then verify `Done` preserves the current `onDone` payload and does not call `onViewProgress`.
- Verify `View Progress` preserves callback order: `onDone` before `onViewProgress`.

Run the focused test, repository type-check, and diff/format checks. On an Android emulator or device, verify a completed workout at 320 x 568 and a representative 393 x 852 viewport, first at default font size and then at 200%. Focus the notes field, keep the keyboard open, scroll through the full body, and confirm both actions remain visible, tappable, and inside the safe area. Repeat on iOS for padding behavior and on rotation if available.

## Scope and non-goals

Production scope is limited to `src/components/ui/CustomDialog.tsx`. Test scope is limited to the focused workout-completion dialog test. This work does not change `WorkoutSessionScreen`, workout persistence, navigation, copy, rating semantics, shared `Card`, generic `CustomDialog`, other modal layouts, theme tokens, or dependencies. It does not redesign the dialog as a bottom sheet or make unrelated accessibility refactors.
