# Ralph Context Snapshot

- Task statement:
  Conduct a brutal product UX audit and fix all confirmed UX correctness, UI linkage, stale-state, trust, navigation, flow, form, entitlement, date-boundary, and reliability issues in FitAI without redesigning the visual language.
- Desired outcome:
  Reach a reviewed state where no confirmed UX/linkage issues remain in reviewed surfaces, with a current canonical audit at `docs/ux-linkage-audit-2026-03-19.md`, a current scenario-validation ledger at `docs/ux-scenario-validation-2026-03-19.md`, green relevant verification, and final reviewer approval.
- Known facts/evidence:
  - Prior architecture and scenario docs for 2026-03-19 exist and already identify SSOT, date-boundary, subscription, nutrition, workout, and profile drift risks.
  - `docs/shared/agent-tiers.md` and `.codex/prompts/*` are referenced by guidance but absent in the workspace.
  - The working tree is already dirty across many app/store/service files; edits must be additive and must not revert unrelated existing changes.
  - The app entrypoint (`App.tsx`) already contains several UX-related fixes around onboarding loading, subscription bootstrapping, maintenance/update gating, and sign-out welcome state.
- Constraints:
  - Focus on UX correctness and source-of-truth behavior, not cosmetic polish.
  - Preserve existing design language unless a small UI change is required for usability/trust.
  - Use Ralph persistence and verifier review before completion.
  - Max 6 concurrent child agents.
  - Run verification after each fix batch.
- Unknowns/open questions:
  - Which previously modified files already contain partial fixes that should be preserved versus extended.
  - Which user-visible flows still fail after the earlier architecture-oriented work from today.
  - Which gaps are best addressed by tightening existing tests versus adding new targeted regression tests.
- Likely codebase touchpoints:
  - `App.tsx`
  - `src/components/navigation/**`
  - `src/screens/main/**`
  - `src/screens/onboarding/**`
  - `src/screens/profile/**`
  - `src/hooks/**`
  - `src/stores/**`
  - `src/services/**`
  - `src/utils/weekUtils.ts`
  - `src/__tests__/**`
