# PRD: UX Linkage Audit

Date: 2026-03-19
Owner: Ralph
Scope: FitAI mobile app UX correctness and UI linkage audit/fix loop

## Goal

Make the app trustworthy and predictable by removing confirmed UX correctness problems, stale truths, broken navigation/linkage, misleading state, and inconsistent cross-screen behavior without doing visual redesign work.

## Non-Goals

- Visual polish, spacing, color, or typography redesign
- New features unrelated to fixing UX correctness
- Dependency additions unless explicitly required

## User Stories

1. As a user, I want navigation and back behavior to be predictable so I do not lose context or land on the wrong screen.
2. As a user, I want each screen to reflect the same truth for the same entity so I can trust what the app shows me.
3. As a user, I want forms and actions to respect the current state so I do not submit invalid, duplicate, or misleading actions.
4. As a user, I want daily and weekly data to line up with my local day so progress, meals, hydration, and workouts are not misattributed.
5. As a user, I want premium gates and initialization states to be honest so I know whether a feature is available before I act.
6. As a user, I want loading, empty, success, and error states to match reality so the app never says something worked when it did not.

## Acceptance Criteria

- Canonical UX audit doc exists at `docs/ux-linkage-audit-2026-03-19.md`.
- Canonical scenario-validation doc exists at `docs/ux-scenario-validation-2026-03-19.md`.
- Each confirmed issue documents severity, symptom, root cause, source-of-truth impact, affected files, and fix plan or implemented fix.
- Highest-risk confirmed issues are fixed in code, not merely documented.
- Relevant tests/typecheck/lint or targeted suites are run after each fix batch.
- A final reviewer explicitly approves the remaining state.

## Risks

- Dirty working tree may include overlapping in-progress fixes.
- Cross-store/state issues may require multi-file changes and careful non-reversion.
- Some integration scenarios may still be limited by local environment or external credentials.
