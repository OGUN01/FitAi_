# MultiSelect Custom Entry Keyboard Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the auto-focused custom value input and its Cancel/Add actions reachable above the software keyboard in onboarding multiselect bottom sheets.

**Architecture:** Preserve the existing modal, sheet, state, and selection flow. Add a full-height, bottom-aligned React Native `KeyboardAvoidingView` around the existing sheet and make only custom-entry mode a tappable `ScrollView`, using Android `height` avoidance and iOS `padding` avoidance with no new dependency.

**Tech Stack:** React Native 0.79, Expo SDK 53, TypeScript 5.8, Jest 29 with `jest-expo`, React Native Testing Library 13.

## Global Constraints

- Production changes are limited to `src/components/advanced/MultiSelectWithCustom.tsx`.
- Test changes are limited to `src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx`.
- Use React Native `KeyboardAvoidingView`; add no dependency.
- Use `behavior="height"` on Android and `behavior="padding"` on iOS.
- Use `keyboardShouldPersistTaps="handled"` in custom-entry mode.
- Preserve the existing bottom-sheet overlay, `rh(682)` maximum height, colors, top corners, animation, text, autofocus, selection state, validation, callbacks, and 44-point touch targets.
- Do not change consumers, hooks, theme tokens, navigation, or native soft-input configuration.
- Do not commit changes.

---

### Task 1: Add keyboard-resilience regression coverage

**Files:**
- Modify: `src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx:2-31,137-268`

**Interfaces:**
- Consumes: `MultiSelectWithCustomProps`, React Native `KeyboardAvoidingViewProps.behavior`, `ScrollViewProps.keyboardShouldPersistTaps`, and the existing `onCustomAdd(value: string)` / `onSelectionChange(values: any[])` callbacks.
- Produces: test coverage for Android `height`, iOS `padding`, custom-region tap persistence, retained autofocus, and the existing Add/Select callback sequence.

- [ ] **Step 1: Extend the React Native test double**

Update the React Native import:

```tsx
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
```

Inside the existing `jest.mock("react-native", ...)` return value, add:

```tsx
KeyboardAvoidingView: React.forwardRef((props: any, ref) =>
  React.createElement(
    "KeyboardAvoidingView",
    { ...props, ref },
    props.children,
  ),
),
Platform: {
  OS: "android",
},
```

This test double preserves children and production props; it does not add test-only production APIs.

- [ ] **Step 2: Add the focused behavior tests**

Append this describe block after the existing picker tests:

```tsx
describe("MultiSelectWithCustom keyboard resilience", () => {
  const setPlatformOS = (os: "android" | "ios") => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: os,
    });
  };

  afterEach(() => {
    setPlatformOS("android");
  });

  const renderCustomPicker = (
    overrides: Partial<React.ComponentProps<typeof MultiSelectWithCustom>> = {},
  ) =>
    render(
      <MultiSelectWithCustom
        label="Cuisine"
        options={[{ id: "1", label: "Indian", value: "indian" }]}
        selectedValues={[]}
        onSelectionChange={jest.fn()}
        customPlaceholder="Enter cuisine"
        {...overrides}
      />,
    );

  const openCustomEntry = (
    view: ReturnType<typeof render>,
  ) => {
    fireEvent.press(view.getByLabelText("Cuisine"));
    fireEvent.press(view.getByLabelText(/Add Custom/));
  };

  it("uses Android height avoidance and a tappable scroll region for custom entry", () => {
    const view = renderCustomPicker();
    openCustomEntry(view);

    const avoidingView = view.UNSAFE_queryByType(KeyboardAvoidingView);
    const customScroll = view
      .UNSAFE_getAllByType(ScrollView)
      .find((node) => node.props.keyboardShouldPersistTaps === "handled");

    expect(avoidingView).not.toBeNull();
    expect(avoidingView?.props.behavior).toBe("height");
    expect(customScroll).toBeDefined();
    expect(view.getByPlaceholderText("Enter cuisine").props.autoFocus).toBe(
      true,
    );
    expect(view.getByLabelText("Cancel")).toBeTruthy();
    expect(view.getByLabelText("Add")).toBeTruthy();
  });

  it("uses padding avoidance on iOS", () => {
    setPlatformOS("ios");
    const view = renderCustomPicker();
    fireEvent.press(view.getByLabelText("Cuisine"));

    expect(
      view.UNSAFE_getByType(KeyboardAvoidingView).props.behavior,
    ).toBe("padding");
  });

  it("preserves custom add and selection callbacks", () => {
    const onCustomAdd = jest.fn();
    const onSelectionChange = jest.fn();
    const view = renderCustomPicker({ onCustomAdd, onSelectionChange });
    openCustomEntry(view);

    fireEvent.changeText(
      view.getByPlaceholderText("Enter cuisine"),
      "Family recipe",
    );
    fireEvent.press(view.getByLabelText("Add"));

    expect(onCustomAdd).toHaveBeenCalledWith("Family recipe");

    fireEvent.press(view.getByLabelText("Select 1 item"));

    expect(onSelectionChange).toHaveBeenCalledWith(["family-recipe"]);
  });
});
```

- [ ] **Step 3: Run the focused suite and verify RED**

Run:

```powershell
npx jest src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx --runInBand
```

Expected: the Android and iOS avoidance tests fail because no `KeyboardAvoidingView` exists; existing touch-target tests and the custom callback test pass. If the suite errors instead of reaching these assertions, correct only the test harness and rerun until the missing keyboard behavior produces the failures.

### Task 2: Implement the keyboard-safe bottom sheet

**Files:**
- Modify: `src/components/advanced/MultiSelectWithCustom.tsx:2-13,280-447,516-604`
- Test: `src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx`

**Interfaces:**
- Consumes: `Platform.OS: string`, `KeyboardAvoidingViewProps.behavior: "height" | "padding"`, and `ScrollViewProps.keyboardShouldPersistTaps: "handled"`.
- Produces: private `styles.keyboardAvoidingContainer` and `styles.customInputScroll`; no component prop or callback signature changes.

- [ ] **Step 1: Import the platform keyboard primitives**

Add `KeyboardAvoidingView` and `Platform` to the existing `react-native` import:

```tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";
```

- [ ] **Step 2: Add the bottom-aligned avoiding wrapper**

Inside `styles.modalOverlay`, wrap the existing `styles.modalContent` view:

```tsx
<KeyboardAvoidingView
  style={styles.keyboardAvoidingContainer}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
>
  <View style={styles.modalContent}>
    {/* Existing header, normal mode, custom mode, and actions remain here. */}
  </View>
</KeyboardAvoidingView>
```

Add:

```tsx
keyboardAvoidingContainer: {
  flex: 1,
  justifyContent: "flex-end",
},
```

- [ ] **Step 3: Make custom-entry mode scrollable and tap persistent**

Replace only the custom-mode outer `View`:

```tsx
<ScrollView
  style={styles.customInputScroll}
  contentContainerStyle={styles.customInputContainer}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
  <Text style={styles.customInputLabel}>
    Add Custom {label?.replace("Select ", "")}
  </Text>
  <TextInput
    style={styles.customTextInput}
    placeholder={customPlaceholder}
    placeholderTextColor={colors.textMuted}
    value={customValue}
    onChangeText={setCustomValue}
    autoFocus
  />
  <View style={styles.customInputActions}>
    <Button
      title="Cancel"
      onPress={() => {
        setShowCustomInput(false);
        setCustomValue("");
      }}
      variant="outline"
      style={styles.customActionButton}
    />
    <Button
      title="Add"
      onPress={handleAddCustom}
      variant="primary"
      style={styles.customActionButton}
    />
  </View>
</ScrollView>
```

Add:

```tsx
customInputScroll: {
  flexShrink: 1,
},
```

Keep the existing `customInputContainer: { padding: spacing.md }` as the content-container style.

- [ ] **Step 4: Rerun the focused suite and verify GREEN**

Run:

```powershell
npx jest src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx --runInBand
```

Expected: 5 tests pass, 0 fail, including the existing 44-point assertions and all three keyboard/custom-flow tests.

### Task 3: Verify scope and record evidence

**Files:**
- Create: `.superpowers/sdd/multiselect-custom-keyboard-resilience-report.md`
- Review only: `docs/superpowers/specs/2026-07-23-multiselect-custom-keyboard-resilience-design.md`
- Review only: `docs/superpowers/plans/2026-07-23-multiselect-custom-keyboard-resilience.md`

**Interfaces:**
- Consumes: RED/GREEN Jest output, TypeScript/lint/format results, and the final diff.
- Produces: a Markdown evidence report; no runtime interface.

- [ ] **Step 1: Run final automated verification**

Run:

```powershell
npx jest src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx --runInBand
npm run type-check
npx eslint src/components/advanced/MultiSelectWithCustom.tsx src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx
npx prettier --check src/components/advanced/MultiSelectWithCustom.tsx src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx
git diff --check -- src/components/advanced/MultiSelectWithCustom.tsx src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx
```

Expected: Jest reports 5 passing tests, TypeScript and diff checks exit 0. Record repository baseline lint/format failures without rewriting unrelated code.

- [ ] **Step 2: Inspect the exact implementation diff**

Run:

```powershell
git diff -- src/components/advanced/MultiSelectWithCustom.tsx src/__tests__/components/pickers/AdvancedTouchTargets.test.tsx
```

Expected: only the keyboard primitives/wrapper, custom scroll conversion, two private styles, React Native test-double additions, and focused regression tests are present.

- [ ] **Step 3: Write the evidence report**

Create `.superpowers/sdd/multiselect-custom-keyboard-resilience-report.md` with:

```markdown
# MultiSelect Custom Keyboard Resilience Report

## Files changed

## RED evidence

## GREEN evidence

## Verification

## Concerns
```

Record Android visual QA as pending when no emulator/device is available; unit tests do not prove physical keyboard geometry.
