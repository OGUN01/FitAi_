# MultiSelect Custom Entry Keyboard Resilience Design

## Problem and existing flow

`MultiSelectWithCustom` is a bottom-aligned React Native `Modal` used by four onboarding selectors: food allergies, dietary restrictions, medical conditions, and physical limitations. Its normal mode shows a searchable options list and Cancel/Select actions. Choosing the synthetic custom option switches local state to custom mode, hides the normal list/actions, renders an auto-focused `TextInput`, and shows custom Cancel/Add actions. Cancel clears the draft and returns to the option list; Add validates the value, creates and selects the custom option, invokes `onCustomAdd` when provided, and returns to the list.

The modal currently has no keyboard-aware container. On Android, the auto-focused input opens the software keyboard while the sheet remains anchored to the physical bottom of the window, allowing the keyboard to cover the input and custom Cancel/Add actions.

## Approved design

Keep the existing modal overlay and bottom-sheet content unchanged inside a full-height `KeyboardAvoidingView`. The avoiding view remains bottom-aligned so the closed-keyboard appearance is identical. Use `behavior="height"` on Android so the available layout height contracts above the keyboard, and `behavior="padding"` on iOS so the sheet follows the established platform behavior without adding a dependency.

In custom mode, render the existing label, auto-focused input, and Cancel/Add row in a `ScrollView` with `keyboardShouldPersistTaps="handled"`. Its content container retains the current padding. This gives small screens and larger font settings a scroll path and allows the action buttons to receive the first tap while the keyboard is open.

No state, validation, selection, callback, copy, or modal-dismissal logic changes.

## Layout and platform behavior

- The overlay remains dimmed and bottom aligned.
- With the keyboard closed, the sheet keeps its existing width, background, top corners, and `rh(682)` maximum height.
- On Android, the avoiding view shrinks to the visible area and keeps the sheet anchored immediately above the keyboard.
- On iOS, padding avoidance lifts the sheet by the keyboard inset.
- Normal search/list mode retains its current scrolling and footer actions.
- Custom mode becomes independently scrollable only when its content cannot fit; otherwise it looks unchanged.
- `keyboardShouldPersistTaps="handled"` keeps Cancel/Add operable without requiring a keyboard-dismiss tap first.

## Accessibility

The auto-focused custom input remains the initial focus target. Existing button labels and 44-point-or-greater `Button` touch targets remain unchanged. The scrollable custom region prevents larger text from clipping the input or actions, and it preserves a logical reading order: custom label, input, Cancel, Add. No focus trap, automatic submission, or keyboard-dismiss behavior is introduced.

## Tests and visual QA

Update the existing picker component test harness to expose `KeyboardAvoidingView` and Android `Platform.OS`. Add focused regression coverage that opens the selector, enters custom mode, and verifies:

- the modal uses Android `behavior="height"`;
- the custom region uses `keyboardShouldPersistTaps="handled"`;
- the input remains auto-focused;
- Cancel and Add remain rendered and operable;
- the existing trigger and option-row 44-point touch-target assertions still pass.

Visual QA on Android should cover 393 x 852 and 320 x 568 logical-pixel viewports, each at default and 1.3x font scale. Open each affected onboarding selector, choose Add Custom, confirm the input and both actions stay above the visible keyboard, type a value, tap Add without first dismissing the keyboard, then repeat with Cancel. Also confirm normal searching, selection confirmation, backdrop appearance, and bottom-sheet placement are unchanged.

## Exact file impact

- Modify `src/components/advanced/MultiSelectWithCustom.tsx`: import `KeyboardAvoidingView` and `Platform`, add the bottom-aligned avoiding wrapper, and make custom mode keyboard-aware and scrollable.
- Modify `src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx`: extend the React Native mock and add the keyboard-resilience regression assertions.
- No consumer, hook, theme, navigation, or native configuration files change.

## Non-goals

- Refactoring selection state into `useMultiSelectWithCustom` or adopting the currently unused extracted multiselect subcomponents.
- Changing validation, duplicate detection, maximum-selection behavior, option grouping, or custom-value persistence.
- Redesigning the bottom sheet, changing its height token, copy, colors, or animations.
- Adding a third-party keyboard-aware scrolling library.
- Changing onboarding screen containers, Android window soft-input configuration, or iOS keyboard settings.
