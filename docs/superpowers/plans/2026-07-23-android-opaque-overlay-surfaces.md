# Android Opaque Overlay Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent dense underlying screen content from bleeding through the shared BottomSheet and four standalone text-heavy modal surfaces by giving only those foreground surfaces an opaque `colors.backgroundSecondary` background.

**Architecture:** Keep `GlassView`, `GlassCard`, and all theme defaults unchanged. Attach one surface style to the shared `BottomSheet` card because every BottomSheet consumer is a modal overlay, and attach local surface styles to Logout, Settings Selection, Clear Cache, and Meal Detail cards. Protect the boundary with component tests that inspect the real `GlassCard` style and retain representative callback coverage.

**Tech Stack:** React Native 0.79, React 19, TypeScript 5.8, Jest 29 with `jest-expo`, `@testing-library/react-native`, Aurora `GlassCard`, and `flatColors` theme tokens.

## Global Constraints

- Use the exact `flatColors.backgroundSecondary` token value for every foreground surface override. Standalone components already alias `flatColors` as `colors`; `BottomSheet` imports `flatColors` alongside its existing nested `colors` palette.
- Apply opacity only to `BottomSheet`, `LogoutConfirmationModal`, `SettingsSelectionModal`, `ClearCacheConfirmModal`, and `MealDetailModal`.
- Do not change `GlassView`, either `GlassCard` implementation, theme tokens, Expo Blur configuration, or ordinary in-page cards.
- Preserve all existing layout, border radius, shadow, padding, backdrop, animation, gestures, scrolling, keyboard, safe-area, callbacks, and accessibility behavior.
- Attach opacity to the existing `GlassCard`; do not add wrappers or intercepting views.
- Do not modify Health Connect source, tests, specs, or plans.
- Add no dependency and create no commit.
- Record RED, GREEN, and final verification evidence in `.superpowers/sdd/android-opaque-overlay-surfaces-report.md`.

---

## File Map

- Create `src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx`: focused real-component style-contract and representative interaction tests.
- Modify `src/components/ui/aurora/BottomSheet.tsx`: shared opaque sheet surface only.
- Modify `src/components/profile/LogoutConfirmationModal.tsx`: local opaque confirmation surface only.
- Modify `src/screens/main/profile/modals/SettingsSelectionModal.tsx`: local opaque selection surface only.
- Modify `src/screens/main/profile/modals/ClearCacheConfirmModal.tsx`: local opaque confirmation surface only.
- Modify `src/components/diet/MealDetailModal.tsx`: local opaque meal-detail surface only.
- Create `.superpowers/sdd/android-opaque-overlay-surfaces-report.md`: commands, RED/GREEN output summary, and final verification evidence.

### Task 1: Add the focused regression suite and establish RED

**Files:**

- Create: `src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx`

**Interfaces:**

- Consumes: `GlassCardProps.style?: ViewStyle`, `flatColors.backgroundSecondary: string`, `BottomSheetProps`, and the existing modal props without changing their signatures.
- Produces: five style-contract tests and representative callback tests; no production export.

- [ ] **Step 1: Create fixtures, minimal dependency isolation, and a real-surface assertion helper**

```tsx
import React from "react";
import { StyleSheet, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { BottomSheet } from "@/components/ui/aurora/BottomSheet";
import { GlassCard } from "@/components/ui/aurora/GlassCard";
import { LogoutConfirmationModal } from "@/components/profile/LogoutConfirmationModal";
import { SettingsSelectionModal } from "@/screens/main/profile/modals/SettingsSelectionModal";
import { ClearCacheConfirmModal } from "@/screens/main/profile/modals/ClearCacheConfirmModal";
import { MealDetailModal } from "@/components/diet/MealDetailModal";
import { flatColors as colors } from "@/theme/aurora-tokens";
import type { DayMeal } from "@/types/ai";

jest.mock("@/utils/haptics", () => ({
  haptics: { trigger: jest.fn() },
}));

const meal: DayMeal = {
  id: "meal-1",
  type: "lunch",
  name: "Test Lunch",
  description: "A complete test meal",
  items: [],
  totalCalories: 500,
  totalMacros: { protein: 30, carbohydrates: 50, fat: 15, fiber: 8 },
  preparationTime: 10,
  difficulty: "easy",
  tags: [],
  dayOfWeek: "Monday",
  isPersonalized: true,
  aiGenerated: true,
  createdAt: "2026-07-23T00:00:00.000Z",
};

const expectOpaqueSurface = (view: ReturnType<typeof render>) => {
  const card = view.UNSAFE_getByType(GlassCard);
  expect(StyleSheet.flatten(card.props.style)).toMatchObject({
    backgroundColor: colors.backgroundSecondary,
  });
};
```

The haptics mock isolates the device API only; every foreground surface remains the real `GlassCard` and is the object under assertion.

- [ ] **Step 2: Add five failing surface-contract tests**

```tsx
describe("opaque overlay surfaces", () => {
  it("makes the shared BottomSheet surface opaque", () => {
    const view = render(
      <BottomSheet visible onClose={jest.fn()} title="Sheet">
        <Text>Sheet content</Text>
      </BottomSheet>,
    );
    expectOpaqueSurface(view);
  });

  it("makes the logout dialog surface opaque", () => {
    expectOpaqueSurface(
      render(
        <LogoutConfirmationModal
          visible
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />,
      ),
    );
  });

  it("makes the settings-selection surface opaque", () => {
    expectOpaqueSurface(
      render(
        <SettingsSelectionModal
          visible
          title="Units"
          icon="options-outline"
          iconColor="#00aaff"
          options={[
            { value: "metric", label: "Metric", icon: "speedometer-outline" },
          ]}
          selectedValue="metric"
          onSelect={jest.fn()}
          onClose={jest.fn()}
        />,
      ),
    );
  });

  it("makes the clear-cache confirmation surface opaque", () => {
    expectOpaqueSurface(
      render(
        <ClearCacheConfirmModal
          visible
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />,
      ),
    );
  });

  it("makes the meal-detail surface opaque", () => {
    expectOpaqueSurface(
      render(
        <MealDetailModal
          visible
          meal={meal}
          onClose={jest.fn()}
          onMarkComplete={jest.fn()}
          onDelete={jest.fn()}
        />,
      ),
    );
  });
});
```

- [ ] **Step 3: Add representative interaction assertions**

```tsx
describe("opaque overlay interactions", () => {
  it("preserves BottomSheet close behavior", () => {
    const onClose = jest.fn();
    const view = render(
      <BottomSheet visible onClose={onClose} title="Sheet">
        <Text>Sheet content</Text>
      </BottomSheet>,
    );
    fireEvent.press(view.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("preserves logout cancellation", () => {
    const onCancel = jest.fn();
    const view = render(
      <LogoutConfirmationModal
        visible
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.press(view.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("preserves settings selection", () => {
    const onSelect = jest.fn();
    const view = render(
      <SettingsSelectionModal
        visible
        title="Units"
        icon="options-outline"
        iconColor="#00aaff"
        options={[
          { value: "metric", label: "Metric", icon: "speedometer-outline" },
          { value: "imperial", label: "Imperial", icon: "speedometer-outline" },
        ]}
        selectedValue="metric"
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(view.getByText("Imperial"));
    expect(onSelect).toHaveBeenCalledWith("imperial");
  });

  it("preserves clear-cache confirmation", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const view = render(
      <ClearCacheConfirmModal
        visible
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    const clearCacheLabels = view.getAllByText("Clear Cache");
    fireEvent.press(clearCacheLabels[clearCacheLabels.length - 1]);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("preserves meal completion", () => {
    const onMarkComplete = jest.fn();
    const view = render(
      <MealDetailModal
        visible
        meal={meal}
        onClose={jest.fn()}
        onMarkComplete={onMarkComplete}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.press(view.getByText("Mark Complete"));
    expect(onMarkComplete).toHaveBeenCalledWith(meal);
  });
});
```

These tests use the real components and do not assert on mock elements.

- [ ] **Step 4: Run the focused suite to verify RED**

Run:

```powershell
npx jest src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx --runInBand
```

Expected: the five opacity tests fail because the relevant `GlassCard` styles resolve without `backgroundColor: colors.backgroundSecondary`; representative interaction tests pass. Fix setup errors until failures are specifically the missing background contract, then record the exact result in the report.

### Task 2: Make the shared BottomSheet surface opaque

**Files:**

- Modify: `src/components/ui/aurora/BottomSheet.tsx:199-204,269-276`
- Test: `src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx`

**Interfaces:**

- Consumes: `GlassCard.style?: ViewStyle` and `flatColors.backgroundSecondary`, added alongside BottomSheet's existing nested `colors` import.
- Produces: a shared modal-surface contract for all `BottomSheet` consumers; no prop or export changes.

- [ ] **Step 1: Pass a dedicated surface style to the existing GlassCard**

```tsx
<GlassCard
  blurIntensity="heavy"
  elevation={6}
  padding="none"
  borderRadius="xxl"
  style={styles.sheetSurface}
  contentStyle={styles.sheetContent}
>
```

- [ ] **Step 2: Define the single-property style**

```tsx
sheetSurface: {
  backgroundColor: flatColors.backgroundSecondary,
},
```

Do not change `sheetContent`, the backdrop, wrapper, gesture tree, or any BottomSheet prop.

### Task 3: Make standalone modal surfaces opaque

**Files:**

- Modify: `src/components/profile/LogoutConfirmationModal.tsx:40-46,105-115`
- Modify: `src/screens/main/profile/modals/SettingsSelectionModal.tsx:68-74,198-208`
- Modify: `src/screens/main/profile/modals/ClearCacheConfirmModal.tsx:67-73,124-134`
- Modify: `src/components/diet/MealDetailModal.tsx:63-69,250-259`
- Test: `src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx`

**Interfaces:**

- Consumes: each component's existing `GlassCard.style?: ViewStyle` and already imported `flatColors as colors`.
- Produces: opaque standalone foreground surfaces; no callback, prop, or export changes.

- [ ] **Step 1: Add `style={styles.dialogSurface}` to each profile GlassCard**

Use the same local style name in Logout, Settings Selection, and Clear Cache:

```tsx
dialogSurface: {
  backgroundColor: colors.backgroundSecondary,
},
```

Pass `style={styles.dialogSurface}` alongside the existing elevation, blur, padding, and border-radius props.

- [ ] **Step 2: Add a local Meal Detail surface style**

Pass `style={styles.modalSurface}` to the existing Meal Detail `GlassCard` and define:

```tsx
modalSurface: {
  backgroundColor: colors.backgroundSecondary,
},
```

Do not alter the overlay, card content, ScrollView, completion button, or delete confirmation.

- [ ] **Step 3: Run the focused suite to verify GREEN**

Run:

```powershell
npx jest src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx --runInBand
```

Expected: all opacity and representative interaction tests pass with no new warnings or errors. Record the exact result in the report.

### Task 4: Verify the scoped change and document evidence

**Files:**

- Create: `.superpowers/sdd/android-opaque-overlay-surfaces-report.md`
- Review only: all files listed in the File Map

**Interfaces:**

- Consumes: Jest output, TypeScript output, ESLint/Prettier output, and Git diff checks.
- Produces: a self-contained RED/GREEN and verification report; no runtime interface.

- [ ] **Step 1: Run targeted tests**

```powershell
npx jest src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx src/__tests__/components/chrome/TouchChrome.test.tsx --runInBand
```

Expected: all selected suites and tests pass.

- [ ] **Step 2: Run repository TypeScript validation**

```powershell
npm run type-check
```

Expected: exit code 0. If unrelated pre-existing failures occur, record exact diagnostics and separately type-check the touched test/source paths if the repository provides a supported scoped command.

- [ ] **Step 3: Run scoped lint and formatting checks**

```powershell
npx eslint src/components/ui/aurora/BottomSheet.tsx src/components/profile/LogoutConfirmationModal.tsx src/screens/main/profile/modals/SettingsSelectionModal.tsx src/screens/main/profile/modals/ClearCacheConfirmModal.tsx src/components/diet/MealDetailModal.tsx src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx
npx prettier --check docs/superpowers/plans/2026-07-23-android-opaque-overlay-surfaces.md src/components/ui/aurora/BottomSheet.tsx src/components/profile/LogoutConfirmationModal.tsx src/screens/main/profile/modals/SettingsSelectionModal.tsx src/screens/main/profile/modals/ClearCacheConfirmModal.tsx src/components/diet/MealDetailModal.tsx src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx .superpowers/sdd/android-opaque-overlay-surfaces-report.md
```

Expected: exit code 0. Do not format unrelated files.

- [ ] **Step 4: Check whitespace and scope**

```powershell
git diff --check
git diff -- src/components/ui/aurora/BottomSheet.tsx src/components/profile/LogoutConfirmationModal.tsx src/screens/main/profile/modals/SettingsSelectionModal.tsx src/screens/main/profile/modals/ClearCacheConfirmModal.tsx src/components/diet/MealDetailModal.tsx src/__tests__/components/modals/OpaqueOverlaySurfaces.test.tsx
git status --short
```

Expected: no whitespace errors; production diff contains only five `backgroundColor` styles, their five existing-card style props, and BottomSheet's required `flatColors` import. Confirm Health Connect and other workstreams are absent from this workstream's diff.

- [ ] **Step 5: Write the evidence report**

Document graph-tool unavailability, RED failure count and reason, GREEN pass count, targeted verification, type-check, lint/format, diff-check results, changed files, and any environmental limitation on Android device visual QA. Do not claim device QA unless it was actually performed.
