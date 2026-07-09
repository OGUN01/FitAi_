# Follow-up Fixes — PaywallModal Features + LocationFields Label

**Agent:** Wave-Final code-only (subscription/onboarding partition)
**Date:** 2026-07-09
**Scope:** P2-11 (UI wiring), P2-17 (label/validation consistency)
**Files owned (partition):** `src/components/subscription/PaywallModal.tsx`, `src/hooks/usePaywall.ts` (confirm-only), `src/components/onboarding/LocationFields.tsx`

---

## P2-11 — Wire PaywallModal to read server-owned `features_list`

**Root cause:** The data layer was already complete (Wave E: migration `20260709000001_add_subscription_plans_features_list.sql` seeds `subscription_plans.features_list`; `usePaywall.ts:401-409` exposes `planFeaturesByTier: Record<string, string[]>` at line 425). The UI layer (`PaywallModal.tsx`) still read the hardcoded `TIER_FEATURES` map directly — never consulting the server-owned copy.

**Fix:** `src/components/subscription/PaywallModal.tsx`
1. **Line 60** — Destructured `planFeaturesByTier` from `usePaywall()` return (added with explanatory comment, lines 57-60). The hook is called directly inside `PaywallModal` (no parent prop threading needed — `usePaywall()` is invoked at line 48).
2. **Line 251** — Free-tier feature list: `{(TIER_FEATURES.free ?? []).map(...)}` → `{(planFeaturesByTier.free ?? TIER_FEATURES.free ?? []).map(...)}`. Server copy preferred; `TIER_FEATURES` kept as fallback (column is nullable by design — NULL = use app-side fallback).
3. **Line 263-264** — Per-plan feature list: `const features = TIER_FEATURES[plan.tier] ?? [];` → `const features = planFeaturesByTier[plan.tier] ?? TIER_FEATURES[plan.tier] ?? [];`. Server-first lookup, same fallback chain.

**`TIER_FEATURES` constant (lines 22-41):** Kept intact as the app-side fallback. Per Wave E note, the migration's `features_list` is nullable by design — NULL means use app-side fallback, and the fallback is required when plans came from the fallback set (`plansSource !== "server"`).

**`usePaywall.ts` (confirm-only):** Verified `planFeaturesByTier` is exposed at line 425 (already implemented by Wave E). The `useMemo` (lines 401-409) maps `tier -> features_list` from fetched `planRows`; empty object when plans came from fallback. No rewrite performed — confirmed correct as-is.

**Verification:** `tsc --noEmit` exit 0 (no unused-var warning — `planFeaturesByTier` is read at lines 251 and 263). `expo export` exit 0 (11.2 MB bundle). Both render paths now prefer server-owned copy; when `features_list` is NULL or plans are fallback, `TIER_FEATURES` provides the copy.

---

## P2-17 — Region/City label vs validation mismatch

**Root cause:** `src/components/onboarding/LocationFields.tsx` renders the `state` field two ways:
- State button grid (line 124-158): label `"State/Province *"` (correctly marked required).
- Custom-country text Input (line 160-168): label `"State/Province"` (NO asterisk — reads as optional).

But `src/services/onboardingService.ts:1136` validates `if (!data.state?.trim()) errors.push("State is required")` unconditionally — state is required regardless of country. So the custom-country text Input misled users into leaving it blank, then threw "State is required" on Next.

The `region` field (line 173, label `"Region/City (Optional)"`) is genuinely optional (`ConsistencyChecker.ts:138` marks `state` required, `region` is not validated) and correctly labeled — no change needed there.

**Fix:** `src/components/onboarding/LocationFields.tsx:163`
- Changed `label="State/Province"` → `label="State/Province *"` to match the button-grid label (line 127) and the validation requirement.

**Direction reconciled:** Made the label honest about the requirement (added asterisk) rather than weakening validation. State is genuinely required by `onboardingService.ts:1136`, so the label now reflects that. This matches the existing required-field convention used elsewhere in the form (Country `*`, State/Province `*` in the button grid).

**Verification:** `tsc --noEmit` exit 0. `expo export` exit 0. Label now consistent with both the button-grid variant and the validation logic.

---

## Gate Results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | EXIT 0 |
| Jest | `npx jest` | 86 suites passed, 1 skipped, 1 **pre-existing** failure (`ProductDetailsModal.test.tsx` — `TypeError: (0, _responsive.rh) is not a function` at `ProductDetailsModal.tsx:466`); 469 tests passed |
| Expo export | `npx expo export --platform android` | EXIT 0 (11.2 MB bundle) |

### Jest failure analysis (pre-existing, not a regression)

The single failing suite is `src/__tests__/components/diet/ProductDetailsModal.test.tsx`, which fails at module load with `TypeError: (0, _responsive.rh) is not a function` originating in `src/components/diet/ProductDetailsModal.tsx:466`. This is a test-environment mock gap (`rh` from `src/utils/responsive.ts` not mocked) in a file **outside this agent's partition**.

**Proof it is not a regression from my edits:** Stashed my two changed files (`PaywallModal.tsx`, `LocationFields.tsx`) and re-ran the failing suite in isolation — it failed identically (1 failed, 0 tests run). Restored my edits afterward (`git stash pop` — 9 insertions, 4 deletions restored). Neither `ProductDetailsModal.tsx` nor its test imports `PaywallModal` or `LocationFields`.

The baseline per the catalog was "87 suites passed, 471 tests passed". The 2-test delta (469 vs 471) is accounted for by this one suite failing to load (0 tests run instead of its usual count). This suite was broken by a prior agent's modification to `ProductDetailsModal.tsx` (adding `rh(750)` without a test mock), not by any change in this task.

---

## Files Changed (this agent)

| File | Finding | Change |
|------|---------|--------|
| `src/components/subscription/PaywallModal.tsx` | P2-11 | Destructured `planFeaturesByTier` (line 60); wired server-first lookup at free-tier (line 251) + plan-tier (line 263) reads; `TIER_FEATURES` kept as fallback |
| `src/components/onboarding/LocationFields.tsx` | P2-17 | Custom-country state Input label `"State/Province"` → `"State/Province *"` (line 163) to match validation |

---

## Follow-ups

| Item | Location | Action |
|------|----------|--------|
| Pre-existing test failure (NOT mine) | `src/components/diet/ProductDetailsModal.tsx:466` + `src/__tests__/components/diet/ProductDetailsModal.test.tsx` | The test mock for `src/utils/responsive.ts` (`rh`) needs adding/fixing. `ProductDetailsModal.tsx` uses `rh(750)` at module-load time; the jest mock must provide `rh`. Out of this agent's partition — owning agent to fix. |
| `TIER_FEATURES` removal (optional, future) | `src/components/subscription/PaywallModal.tsx:22-41` | Once `features_list` is confirmed populated on remote for ALL tiers (free/basic/pro) and the fallback path is no longer needed in production, `TIER_FEATURES` can be removed and reads simplified to `planFeaturesByTier[...] ?? []`. Keep for now — column is nullable by design. |
| P2-11 device verification | PaywallModal | On-device visual check that server copy renders (requires `features_list` populated on remote — confirmed by Wave E migration). Not done here (code-only agent, no device). |
