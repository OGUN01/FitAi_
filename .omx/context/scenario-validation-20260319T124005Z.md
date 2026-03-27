## Task Statement

Run a scenario-matrix validation pass against the architecture audit before starting the fix implementation phase.

## Desired Outcome

Produce one canonical validation artifact that maps the highest-risk user scenarios to concrete evidence, test coverage, observed results, blockers, and remaining blind spots. Confirm which architecture issues are reinforced by runtime/test evidence and which still need post-fix validation.

## Known Facts / Evidence

- The architecture audit is written in `docs/architecture-audit-2026-03-19.md`.
- The audit already identified root-cause classes in nutrition identity, offline sync, date boundaries, workout regeneration identity, subscription/config truth, and health/profile duplication.
- `package.json` includes Jest, onboarding tests, health test scripts, and worker tests.
- The workspace contains app tests, worker tests, and test-plans artifacts, but the scenario-matrix pass still needs to determine which are executable and relevant.

## Constraints

- Do not start architecture fixes yet; validate scenarios first.
- Prefer real executable evidence where possible.
- Be explicit about blockers and unverified paths instead of overstating certainty.
- Use maximum practical parallelism.

## Unknowns / Open Questions

- Which scenario suites are actually runnable in this environment?
- Which high-risk flows have direct automated coverage versus static evidence only?
- Which runtime scenarios still require manual/native or multi-device validation?

## Likely Codebase Touchpoints

- `package.json`
- `src/__tests__`
- `src/tests`
- `scripts/`
- `fitai-workers/test`
- `fitai-workers/e2e`
- `test-plans`
- `docs/architecture-audit-2026-03-19.md`

## Validation Lanes

1. Nutrition and meal-plan identity scenarios
2. Offline sync, hydration, guest migration, and rollback scenarios
3. Date-boundary, analytics, week-scope, and streak scenarios
4. Workout regeneration and plan-slot identity scenarios
5. Subscription/config/auth scenarios
6. Health/profile/weight scenarios
