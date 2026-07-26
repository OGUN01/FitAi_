# Workout Complete Dialog Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `WorkoutCompleteDialog` and both completion actions reachable on short screens, at 200% font scaling, and while the Android software keyboard is open.

**Architecture:** Preserve the existing native modal, safe-area wrapper, elevated card, feedback state, copy, and callbacks. Add a numeric safe-area-adjusted height cap, platform-specific keyboard avoidance, a shrinkable scroll body, and a fixed action footer; scope every production style to `WorkoutCompleteDialog`.

**Tech Stack:** React Native 0.79, Expo SDK 53, TypeScript 5.8, Jest 29 with `jest-expo`, React Native Testing Library 13.

## Global Constraints

- Production changes are limited to the `WorkoutCompleteDialog` branch and workout-specific styles in `src/components/ui/CustomDialog.tsx`.
- Create only `src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx` for focused regression coverage.
- Preserve modal animation, overlay, card surface, icon, copy, statistics, rating appearance, notes trim behavior, button order, callback payloads/order, and touch targets.
- Keep generic `CustomDialog`, other exports, `WorkoutSessionScreen`, shared `Card`/`Button`, theme tokens, navigation, and persistence unchanged.
- Use a numeric height cap from window height, safe-area insets, and two `spacing.lg` margins; do not use percentage `maxHeight`.
- Use keyboard behavior `padding` on iOS, `height` on Android, and `undefined` elsewhere.
- Keep `View Progress` and `Done` outside the body `ScrollView` but inside the constrained card.
- Add no dependency and create no commit.

---

### Task 1: Add failing resilience and behavior tests

**Files:**

- Create: `src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx`
- Read: `src/components/ui/CustomDialog.tsx:330-339,495-651`

**Interfaces:**

- Consumes: existing `WorkoutCompleteDialogProps`, including `onViewProgress: () => void` and `onDone: (rating?: number, notes?: string) => void`.
- Produces: regression expectations for Android keyboard avoidance, safe-area height, scroll-body ownership, fixed actions, and callbacks.

- [ ] **Step 1: Create the Android harness**

Mock `Platform.OS` as `android`, `useWindowDimensions` as `{ width: 320, height: 568, scale: 1, fontScale: 2 }`, insets as `{ top: 24, bottom: 16, left: 0, right: 0 }`, and keyboard/scroll/safe-area primitives as named host nodes. Retain the real dialog, `Card`, and `Button`.

- [ ] **Step 2: Add the failing layout assertions**

```tsx
expect(screen.UNSAFE_getByType("KeyboardAvoidingView").props.behavior).toBe(
  "height",
);
expect(
  StyleSheet.flatten(screen.UNSAFE_getByType("SafeAreaView").props.style),
).toMatchObject({
  flexShrink: 1,
  maxHeight: 568 - 24 - 16 - spacing.lg * 2,
});
const bodyScroll = screen.UNSAFE_getByType("ScrollView");
expect(bodyScroll.props.keyboardShouldPersistTaps).toBe("handled");
expect(within(bodyScroll).queryByText("View Progress")).toBeNull();
expect(within(bodyScroll).queryByText("Done")).toBeNull();
expect(screen.getByPlaceholderText("Any notes? (optional)")).toBeTruthy();
expect(screen.getByText("View Progress")).toBeTruthy();
expect(screen.getByText("Done")).toBeTruthy();
```

- [ ] **Step 3: Add callback-preservation assertions**

Select rating 4, enter `"  Felt strong  "`, press `Done`, and expect `onDone(4, "Felt strong")` without progress. Separately enter `"  Recovery session  "`, press `View Progress`, and expect exact order `onDone(undefined, "Recovery session")`, then `onViewProgress()`.

- [ ] **Step 4: Run and record RED**

Run: `npx jest src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx --runInBand`

Expected: exit 1 because the keyboard-aware constrained scroll structure is absent; callback assertions remain valid.

### Task 2: Implement the minimal constrained layout

**Files:**

- Modify: `src/components/ui/CustomDialog.tsx:1-17,495-651`
- Test: `src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx`

**Interfaces:**

- Consumes: `useWindowDimensions`, `useSafeAreaInsets`, `Platform.OS`, `spacing.lg`, and existing dialog props.
- Produces: local `dialogMaxHeight: number`; workout-specific `safeArea`, `dialogCard`, `bodyScroll`, and `bodyContent` styles; unchanged export API.

- [ ] **Step 1: Add imports**

Add `KeyboardAvoidingView`, `Platform`, and `useWindowDimensions` to React Native imports and `useSafeAreaInsets` to safe-area imports.

- [ ] **Step 2: Derive the numeric height cap**

```tsx
const { height: windowHeight } = useWindowDimensions();
const insets = useSafeAreaInsets();
const dialogMaxHeight = Math.max(
  0,
  windowHeight - insets.top - insets.bottom - spacing.lg * 2,
);
```

- [ ] **Step 3: Add platform keyboard avoidance**

Replace only the workout overlay root with `KeyboardAvoidingView`, preserve `styles.overlay`, and use:

```tsx
behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
```

Apply `[styles.safeArea, completeStyles.safeArea, { maxHeight: dialogMaxHeight }]` to `SafeAreaView` and `[styles.dialogCard, completeStyles.dialogCard]` to `Card`.

- [ ] **Step 4: Add the scroll body and fixed footer**

Wrap only icon, title, stats, rating, and notes in:

```tsx
<ScrollView
  style={completeStyles.bodyScroll}
  contentContainerStyle={completeStyles.bodyContent}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
  {/* Existing content unchanged */}
</ScrollView>
```

Keep the existing action container immediately after the scroll view.

- [ ] **Step 5: Add workout-only shrink styles**

```tsx
safeArea: { flexShrink: 1 },
dialogCard: { flexShrink: 1 },
bodyScroll: { width: "100%", flexShrink: 1 },
bodyContent: { alignItems: "center", paddingBottom: spacing.sm },
```

- [ ] **Step 6: Run and record GREEN**

Run: `npx jest src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx --runInBand`

Expected: exit 0; 1 suite and 3 tests pass.

### Task 3: Verify scope and record evidence

**Files:**

- Create: `.superpowers/sdd/workout-complete-dialog-resilience-report.md`
- Review: `src/components/ui/CustomDialog.tsx`
- Review: `src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx`

**Interfaces:**

- Consumes: fresh command output and the final scoped diff.
- Produces: report sections `Files changed`, `RED evidence`, `GREEN evidence`, `Verification`, `Visual QA`, and `Concerns`.

- [ ] **Step 1: Run fresh verification**

Run these exact commands:

```powershell
npx jest src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx --runInBand
npm run type-check
npx eslint src/components/ui/CustomDialog.tsx src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx
npx prettier --check src/components/ui/CustomDialog.tsx src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx docs/superpowers/specs/2026-07-23-workout-complete-dialog-resilience-design.md docs/superpowers/plans/2026-07-23-workout-complete-dialog-resilience.md
git diff --check
```

Expected: 3 tests pass, type-check exits 0, and diff check has no whitespace errors. Record pre-existing lint/format diagnostics separately without unrelated rewrites.

- [ ] **Step 2: Review exact scope**

```powershell
git diff -- src/components/ui/CustomDialog.tsx src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx
git status --short -- src/components/ui/CustomDialog.tsx src/__tests__/components/modals/WorkoutCompleteDialog.test.tsx docs/superpowers/specs/2026-07-23-workout-complete-dialog-resilience-design.md docs/superpowers/plans/2026-07-23-workout-complete-dialog-resilience.md .superpowers/sdd/workout-complete-dialog-resilience-report.md
```

Confirm no other dialog or shared style changed.

- [ ] **Step 3: Write the report**

Record exact RED/GREEN and verification output. Mark Android device checks at 320 x 568, 393 x 852, 200% font, and keyboard open as pending if no device is available; do not infer visual geometry from Jest.
