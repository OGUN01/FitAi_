# BottomSheet Accessibility Fix — Finalization

**Date:** 2026-07-09
**Owner file:** `src/components/ui/aurora/BottomSheet.tsx`
**Root-cause memory:** `~/.claude/projects/D--FitAi-FitAI/memory/bottomsheet-uiautomator-stall.md`

## Verdict

The in-tree fix is **CORRECT and COMPLETE** for option (a). No edits were required —
the working tree already implements the intended structure. This agent made **zero
code changes**; only this report was written.

## Verified JSX structure (`BottomSheet.tsx`)

The render tree (lines 172–261) is now:

```
RNModal (line 173)
└─ GestureHandlerRootView  (line 181)              ← gesture root, not a content wrapper
   ├─ Pressable / Animated.View                     ← backdrop (line 183)
   └─ Animated.View  sheetWrapper + sheetAnimatedStyle  (line 196)  ← carries translateY
      └─ GlassCard  (line 206)
         ├─ PanGestureHandler  (line 216)           ← wraps ONLY the handle region
         │  └─ Animated.View  (line 220)
         │     ├─ Animated.View  grabberRow         (line 222)  ← grabber bar
         │     └─ View  header                      (line 228)  ← title + close button
         └─ KeyboardAvoidingView  (line 250)        ← SIBLING of PanGestureHandler
            └─ {children}                            (line 254)  ← sheet content
```

### Why content bridges to a11y

`{children}` (the consumer content — e.g. SetLogModal's RPE buttons, EditTexts)
lives inside `KeyboardAvoidingView` (line 250), which is a **sibling** of
`PanGestureHandler`, both children of `GlassCard`. The content is **not** a
descendant of `PanGestureHandler` or any gesture-handling subtree. On Android,
`react-native-gesture-handler`'s `PanGestureHandler` does not bridge the
accessibility tree to its descendants; by keeping content outside it, the
content's interactive nodes (buttons, inputs, text) are exposed to
`uiautomator` normally. This matches the confirmed diagnostic finding: a build
with the wrapper stripped made the full SetLogModal subtree appear
(`[0,652][1080,2337]`, RPE/Reps/Weight EditTexts).

### Why drag-to-dismiss is preserved

The `useAnimatedGestureHandler` (`gestureHandler`, lines 135–157) is still
attached to the `PanGestureHandler` on the grabber/header region. It drives
`translateY.value` (start → lock baseline; active → drag down only;
end → dismiss past `DISMISS_THRESHOLD` via `withTiming` + `runOnJS(handleClose)`,
else spring back to 0). `sheetAnimatedStyle` (lines 159–161) applies
`transform: [{ translateY: translateY.value }]` to the **sheetWrapper**
`Animated.View` at line 196 — the **parent** of both the handle and the
content. So a pan on the grabber still slides the entire sheet (handle + content)
and dismisses it. The gesture target is narrower (grabber/header only, not the
whole sheet body), which is the accepted trade-off of option (a) and the
expected interaction model for a bottom-sheet grabber.

## Other gesture-handler-wrapped modals

A repo-wide grep for `GestureHandlerRootView`, `PanGestureHandler`,
`gestureHandlerRootHOC` across `src/` found:

| Location | Kind | Blocks a11y? | Action |
|---|---|---|---|
| `BottomSheet.tsx` (line 181) | `GestureHandlerRootView` (modal root) | **Was** the defect — now fixed | Done |
| `SwipeableCardStack.tsx` (line 310) | `PanGestureHandler` wrapping card content | Not a modal — swipeable card stack component. Potential a11y concern if used in an a11y-critical flow, but out of this fix's scope. | Follow-up only |
| `Slider.tsx` (line 258) | `PanGestureHandler` wrapping the slider track | Not a modal — slider control. Standard pattern for slider gestures. | No action |
| `swipeable/SwipeCard.tsx` (line 101) | `PanGestureHandler` wrapping a card | Not a modal — single swipe card. | Follow-up only |
| `hooks/useSwipeableCardStack.ts` | Imports `PanGestureHandlerGestureEvent` type only — no wrapper | N/A | No action |

**No other modal** wraps sheet/modal content in `GestureHandlerRootView` or a
content-spanning `PanGestureHandler`. `BottomSheet.tsx` is the only
`GestureHandlerRootView` in the app. The three `PanGestureHandler` components
above are interactive controls (cards/sliders), not full-screen modal portals,
so they do not fall under the "modal invisible to a11y" defect category. They
are noted for a future a11y audit if any becomes reachable in a screen-reader
flow.

## Gate results

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **PASS** (exit 0) |
| Jest | `npx jest` | 470 passed, **1 failed**, 9 skipped, 87/88 suites |
| Expo export | `npx expo export --platform android` | **PASS** (exit 0) |

### Jest failure — NOT caused by this fix

The single failure is
`src/__tests__/components/diet/LogMealModal.test.tsx` ("loads direct-entry fiber
from a scan and saves it into item-level and meal-level totals"). The test
renders `LogMealModal` (a `BottomSheet` consumer) and:

1. **Render assertion passes** — `waitFor(() => expect(screen.getByDisplayValue("7.5")).toBeTruthy())`
   (line 163–165) succeeds. This proves `BottomSheet` renders the consumer
   content correctly after the JSX restructure; the a11y fix did not break
   rendering or content mounting.
2. **Save-path assertion fails** — after `fireEvent.press("Log Meal")` (line 167),
   `mockSaveWeeklyMealPlan` / `mockCompleteMeal` are never called (line 169–171).
   These are meal-planning save/complete functions mocked from the
   `useMealPlanning` / `nutritionStore` / `nutritionData` domain — files modified
   by the **parallel data-integrity agent**, not by this a11y fix.

This is a regression in the meal-plan save flow (data-integrity agent's scope),
not in `BottomSheet.tsx`. The BottomSheet render path is verified working by the
test's own first assertion. The data-integrity agent owns resolving this
failure; it is outside this agent's edit scope (`src/services/*`, `src/stores/*`,
consumer files).

## What remains for final sign-off (Wave F — out of scope now)

1. **Release-APK rebuild + reinstall** — the fix was verified at the
   dev-client/hot-reload level (per the root-cause memory, 2026-06-23). A
   production release build is a different bundle and must be rebuilt/reinstalled
   before a real-device sign-off.
2. **Maestro swipe-to-dismiss test** — drag-to-dismiss is structurally sound
   (see above) but has not been confirmed via an automated/physical swipe on a
   release APK. The dev-client build cannot validate adb-swipe reliably. This is
   the explicit Wave F on-device verification step.
3. **Re-run `uiautomator dump`** on the release APK after opening `SetLogModal`
   to confirm RPE buttons / EditTexts appear with non-full-screen bounds.

These are device/CI steps and are explicitly out of scope for this code-only
agent.
