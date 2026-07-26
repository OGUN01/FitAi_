# Health Connect Disclosure Android Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Connect Wearables background content from showing through the Health Connect disclosure on Android while preserving the existing permission flow and layout.

**Architecture:** Keep the existing transparent native modal, backdrop, `GlassCard`, scroll region, and actions. Override only this dialog card's surface with the opaque `flatColors.backgroundSecondary` token, so Android rendering is deterministic without changing shared glass primitives or enabling experimental blur.

**Tech Stack:** React Native 0.79, Expo SDK 53, TypeScript 5.8, Jest 29 with `jest-expo`, React Native Testing Library 13, ESLint 9, Prettier 3.

## Global Constraints

- Production scope is limited to `src/components/health/HealthConnectDisclosureModal.tsx`.
- Use exactly `colors.backgroundSecondary` for the local opaque dialog surface.
- Preserve the modal structure, radius, shadow, padding, animation, internal `ScrollView`, actions, haptics, permission copy, and callback behavior.
- Do not change `GlassView`, `GlassCard`, theme defaults, or other dialogs.
- Do not enable Expo's experimental Android blur implementation.
- Do not change Health Connect permissions, acknowledgement persistence, or navigation.
- Do not add dependencies and do not commit changes.

---

### Task 1: Add the regression test and local opaque surface

**Files:**
- Create: `src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx`
- Modify: `src/components/health/HealthConnectDisclosureModal.tsx:82-87,206-210`

**Interfaces:**
- Consumes: `HealthConnectDisclosureModalProps` with `visible: boolean`, `onAcknowledge: () => void`, and `onDismiss: () => void`; `GlassCard`'s existing `style?: ViewStyle`; `flatColors.backgroundSecondary: string`.
- Produces: a private `styles.dialogSurface` with `{ backgroundColor: colors.backgroundSecondary }`; no exported API or callback signature changes.

- [ ] **Step 1: Write the failing component test**

Create `src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx` with the complete test below. Mock only the haptic side effect; render the real disclosure and real `GlassCard`.

```tsx
import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { HealthConnectDisclosureModal } from "@/components/health/HealthConnectDisclosureModal";
import { GlassCard } from "@/components/ui/aurora/GlassCard";
import { flatColors as colors } from "@/theme/aurora-tokens";

jest.mock("@/utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
  },
}));

describe("HealthConnectDisclosureModal", () => {
  it("uses an opaque surface so Android background content cannot bleed through", () => {
    const view = render(
      <HealthConnectDisclosureModal
        visible
        onAcknowledge={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    const dialogCard = view.UNSAFE_getByType(GlassCard);

    expect(StyleSheet.flatten(dialogCard.props.style)).toMatchObject({
      backgroundColor: colors.backgroundSecondary,
    });
  });

  it("dismisses from the secondary action", () => {
    const onDismiss = jest.fn();
    const view = render(
      <HealthConnectDisclosureModal
        visible
        onAcknowledge={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(view.getByText("Not now"));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("acknowledges from the primary action", () => {
    const onAcknowledge = jest.fn();
    const view = render(
      <HealthConnectDisclosureModal
        visible
        onAcknowledge={onAcknowledge}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(view.getByText("Acknowledge & continue"));

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npx jest src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx --runInBand
```

Expected: the opaque-surface test fails because `dialogCard.props.style` has no `backgroundColor`; the two existing callback-behavior tests pass. If the suite errors during setup, fix only the test harness and rerun until the assertion fails for this expected reason.

- [ ] **Step 3: Apply the minimal production change**

Pass the local style to the existing `GlassCard`:

```tsx
<GlassCard
  elevation={5}
  blurIntensity="heavy"
  padding="lg"
  borderRadius="xl"
  style={styles.dialogSurface}
>
```

Add the style immediately after `dialogWrapper`:

```tsx
dialogSurface: {
  backgroundColor: colors.backgroundSecondary,
},
```

- [ ] **Step 4: Rerun the focused test and verify GREEN**

Run:

```powershell
npx jest src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx --runInBand
```

Expected: `3 passed, 0 failed` with exit code 0 and no unexpected warnings.

- [ ] **Step 5: Run focused static checks**

Run:

```powershell
npx eslint src/components/health/HealthConnectDisclosureModal.tsx src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx
npx prettier --check src/components/health/HealthConnectDisclosureModal.tsx src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx
```

Expected: both commands exit 0. If formatting fails, run Prettier only on these two files, then rerun both checks.

- [ ] **Step 6: Run repository TypeScript validation**

Run:

```powershell
npm run type-check
```

Expected: `tsc --noEmit` exits 0. Report any unrelated pre-existing diagnostic separately rather than changing unrelated files.

### Task 2: Review scope and record verification

**Files:**
- Create: `.superpowers/sdd/health-connect-modal-report.md`
- Review only: `docs/superpowers/specs/2026-07-23-health-connect-disclosure-android-surface-design.md`
- Review only: `docs/superpowers/plans/2026-07-23-health-connect-disclosure-android-surface.md`

**Interfaces:**
- Consumes: RED and GREEN Jest output, ESLint/Prettier/typecheck exit status, and the final Git diff.
- Produces: a concise Markdown evidence report; no runtime interface.

- [ ] **Step 1: Run fresh final verification**

Run:

```powershell
npx jest src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx --runInBand
npx eslint src/components/health/HealthConnectDisclosureModal.tsx src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx
npx prettier --check src/components/health/HealthConnectDisclosureModal.tsx src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx
npm run type-check
```

Expected: every command exits 0; the test command reports 3 passing tests.

- [ ] **Step 2: Confirm exact scope and patch integrity**

Run:

```powershell
git status --short
git diff --check
git diff -- src/components/health/HealthConnectDisclosureModal.tsx src/__tests__/components/health/HealthConnectDisclosureModal.test.tsx
```

Expected: no whitespace errors; the production diff contains only the local `dialogSurface` style hookup; unrelated existing worktree changes remain untouched.

- [ ] **Step 3: Write the implementation report**

Create `.superpowers/sdd/health-connect-modal-report.md` with these concrete sections and the observed command results:

```markdown
# Health Connect Modal Implementation Report

## Files changed

## RED evidence

## GREEN evidence

## Verification

## Concerns
```

Record Android device visual verification as pending if no connected device is available; do not claim a screenshot-level result from unit tests alone.
