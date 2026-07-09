# Followup: Alert.alert → crossPlatformAlert Cleanup

**Date:** 2026-07-09
**Agent:** code-only Alert.alert cleanup agent
**Scope:** Find ALL remaining direct `Alert.alert(...)` invocations across `src/**/*.{ts,tsx}` and replace each with `crossPlatformAlert` from `src/utils/crossPlatformAlert.ts`.

---

## Result: ZERO call sites to convert — codebase already clean

A comprehensive grep for `Alert\.alert\s*\(` (and a looser `Alert\.alert` + multiline variant) across all of `src/` found **no actual `Alert.alert(...)` invocations** outside the wrapper itself. Prior agents already completed the conversion. No source edits were made by this agent.

## API verification

`src/utils/crossPlatformAlert.ts` exports:

```ts
export function crossPlatformAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
): void
```

Signature is **identical** to `Alert.alert` (positional: title, message?, buttons?, options?). Button shape matches too: `{ text?, onPress?, style?: "default"|"cancel"|"destructive" }`. So any future swap is a pure 1:1 rename of the callee (`Alert.alert` → `crossPlatformAlert`) with no arg restructuring needed.

## Every grep hit — classified

All hits are non-calls (comments / the wrapper itself / type mocks / identifier names):

| File:Line | Text | Classification |
|---|---|---|
| `src/utils/crossPlatformAlert.ts:38` | `Alert.alert(title, message, buttons, options);` | **Wrapper internal** — legitimate native delegation. MUST stay. Not touched. |
| `src/utils/crossPlatformAlert.ts:5` | `* - Native (iOS/Android): Delegates to React Native's Alert.alert` | Doc comment |
| `src/components/ui/CustomDialog.tsx:156` | `// Convenience functions to replace Alert.alert()` | Comment (false positive — per task brief) |
| `src/screens/main/profile/modals/ClearCacheConfirmModal.tsx:4` | `* Uses Modal instead of Alert.alert (which silently fails on Expo web` | Doc comment |
| `src/screens/main/profile/modals/SettingsSelectionModal.tsx:5` | `* Web-safe (no Alert.alert), uses Modal + GlassCard...` | Doc comment |
| `src/__tests__/services/offline.rollback.test.ts:21` | `Alert: {` | Type mock object key (mocking the `Alert` import for a skipped test block) |
| `src/__tests__/services/offline.rollback.test.ts:64` | `// 1. Alert.alert notification not implemented` | Comment inside a `describe.skip` block |
| `src/utils/testQuickActions.ts:288` | `// Display results in React Native Alert` | Comment |
| `src/hooks/usePaywall.ts:384` | `// Unknown error — surfaced via Alert below` | Comment |
| `src/components/diet/ValidationAlert.tsx:196,217` | `// HELPER: Convert ValidationError/Warning to Alert Props` | Comments (component is named `ValidationAlert`) |
| `src/components/onboarding/AdjustmentWizard.tsx:120` | `{/* Error Alert */}` | JSX comment |

**Conclusion:** No `Alert.alert(` invocations exist in `src/`. Nothing to fix, nothing to note for other agents.

### Prior-fix confirmation

`src/docs/visual-qa-achievements.md:133` documents that the last known direct call site (`useProfileLogic.ts:382` Profile stat-tap) was already converted to delegate through `crossPlatformAlert`. That conversion is in place — no regression.

## Files NOT touched (per constraints)

The task brief listed files being edited concurrently by other agents: `PaywallModal.tsx`, `LocationFields.tsx`, `data-loaders.ts`, `SyncEngine.ts`, `validation.ts`, `validation/utils.ts`, `useProfileLogic.ts`, `userStore.ts`, and ~19 modal files in the maxHeight sweep. Grep confirmed **none** of these contain an `Alert.alert(` call, so there is nothing to note back to those agents.

## Gate results

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | **PASS** (exit 0) |
| Jest | `npx jest` | 469 passed, 9 skipped, **1 suite failed** (see note) |
| Expo export | `npx expo export --platform android` | **PASS** (exit 0, `dist/` written) |

### Jest failure — PRE-EXISTING, not caused by this agent

The single failing suite is `src/__tests__/components/diet/ProductDetailsModal.test.tsx`:

```
TypeError: (0 , _responsive.rh) is not a function
  at src/components/diet/ProductDetailsModal.tsx:466:18  (maxHeight: rh(750))
```

`ProductDetailsModal.tsx:466` calls `rh(750)` — a responsive-height helper from the **maxHeight-sweep** work another agent is performing concurrently on the ~19 modal files. The `rh` import is broken because that agent's work is mid-flight. This agent made **zero** source edits (verified: no files changed in this session), so the regression cannot originate here. Once the maxHeight-sweep agent completes the `rh` import path, this suite should pass again. The failure is entirely unrelated to `Alert.alert`.

Baseline was stated as ≥471 passed / 87 suites. Current run is 469 passed / 88 suites (86 passed + 1 failed + 1 skipped). The delta is accounted for entirely by the `rh` breakage in `ProductDetailsModal`, not by any Alert.alert work.

## Summary

- **Call sites found:** 0 actual `Alert.alert(...)` invocations.
- **Fixed:** 0 (nothing to fix).
- **Noted for other agents:** 0 (no concurrent-edit file contained a call).
- **Source edits by this agent:** 0.
- **Gates:** TSC pass, Expo export pass, Jest 1 pre-existing unrelated failure (maxHeight-sweep `rh` breakage in `ProductDetailsModal.tsx`, not this agent's work).
