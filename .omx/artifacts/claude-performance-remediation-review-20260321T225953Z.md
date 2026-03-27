## Original User Task

Investigate and fix application speed issues so the app feels super fast, especially around first click / first open latency, without breaking behavior.

## Final Prompt Sent to Claude CLI

Review this React Native performance-oriented diff as a strict architect reviewer.

Context:
- Goal: reduce first-tap / first-open latency without breaking behavior.
- Changed files: App.tsx, src/components/navigation/MainNavigation.tsx, src/hooks/useHomeLogic.ts, src/__tests__/navigation/MainNavigation.test.tsx
- Validation so far: targeted MainNavigation Jest tests pass; file-level TypeScript diagnostics are clean; repo-wide typecheck has unrelated existing failures outside these files.

Task:
1. Identify any remaining correctness, regression, or performance risks in this diff.
2. State whether the approach is acceptable for a safe performance remediation.
3. Keep the answer concise and evidence-based.
4. If there are no material findings, say APPROVED.

## Claude Output (Raw)

Here's my review:

---

## Findings

### 1. `DietScreen.isActive` semantics changed — LOW RISK

**Before:** `isActive={activeTab === "diet"}` (true whenever Diet is the selected tab, even with overlays open).
**After:** `isActive={activeTab === "diet" && !hasActiveOverlay}`.

DietScreen uses `isActive` to gate a FAB pulse animation. The new behavior pauses the animation when an overlay is open, which is arguably correct (no point animating behind a modal). **No regression**, minor behavior improvement.

### 2. `useHomeLogic` health/analytics effect has a large dependency array — LOW RISK

The new `InteractionManager.runAfterInteractions` effect for health sync + analytics lists 11 dependencies. Most are stable store selectors/callbacks, so in practice it won't re-fire spuriously. But if any of `syncHealthData`, `initializeHealthKit`, etc. are not referentially stable (not wrapped in `useCallback` or not store-bound), this could cause repeated re-initialization after interactions. Worth verifying those are stable, but unlikely to regress given they come from Zustand.

### 3. `runAfterInteractions` in App.tsx doesn't return a cancellable handle — LOW RISK

The `void runAfterInteractions(...)` call in App.tsx fires-and-forgets. If the component unmounts before `InteractionManager` fires, the inner `if (!mounted) return` guards handle it. This is correct. However, the `runAfterInteractions` wrapper in `performance.ts` doesn't expose `InteractionManager`'s `.cancel()` — so there's no way to cancel the pending interaction from outside. The `mounted` guard is sufficient here, but it means the callback still executes (and immediately bails). Acceptable for cleanup tasks.

### 4. `display: "none"` for hidden tabs — ACCEPTABLE

Using `display: "none"` keeps the React tree mounted (preserving state) without layout cost. This is the standard keep-alive pattern in RN. `pointerEvents: "none"` on hidden tabs prevents ghost touches. Correct.

### 5. `startTransition` usage — CORRECT

Wrapping tab switches in `startTransition` is appropriate — it marks the state update as non-urgent so the current frame can complete before the tab renders. Good for first-tap latency.

### 6. Settings navigation duplicates `transitionToTab` logic — MINOR

The `"Settings"` branch in `navigation.navigate` manually calls `startTransition` + `ensureTabMounted` + `setActiveTab` + `setTabParams` instead of using `transitionToTab`. This works but is a maintenance smell — if `transitionToTab` evolves, this branch won't get the update. Not a correctness issue.

### 7. `refreshMetrics` removal from useHomeLogic — VERIFY

The `useEffect` calling `refreshMetrics()` on mount was removed entirely. If `useCalculatedMetrics` already computes eagerly (via its own `useEffect` or selector), this is safe. If it relied on an explicit `refreshMetrics()` call to populate, the home screen could show stale metrics on first mount. Given that the hook is still consumed (`calculatedMetrics`), the reactive path likely handles it, but worth confirming.

### 8. Test quality — GOOD

The new tests cover tab switching and the keep-alive mount count invariant. The `waitFor` additions correctly handle `startTransition` deferrals.

---

## Verdict

**APPROVED** — with one advisory:

Confirm that `useCalculatedMetrics` populates reactively without the removed `refreshMetrics()` call (finding #7). If it does, this diff is safe to ship. The approach — keep-alive tabs via `display: "none"`, `startTransition` for tab switches, `InteractionManager` deferral of non-critical init — is a sound, low-risk performance remediation.

## Concise Summary

Claude approved the final diff. The only advisory was to confirm `useCalculatedMetrics` refreshes reactively without the removed mount-time `refreshMetrics()` call; local inspection confirmed the hook already calls `refreshMetrics()` in its own `useEffect`.

## Action Items / Next Steps

- Keep the performance changes as implemented.
- Note the remaining advisory about `transitionToTab` duplication in future cleanup work.
- Preserve awareness that repo-wide `npm run type-check` currently fails in unrelated profile/integration files outside this remediation.
