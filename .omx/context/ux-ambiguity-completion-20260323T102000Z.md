Task statement
- Continue the FitAI UI/UX ambiguity audit and fix loop until the reviewed main-surface issues are completed with verification evidence.

Desired outcome
- Main surfaces stop advertising fake actions, fake states, or misleading copy.
- Analytics, Home, Profile, and Diet feel trustworthy and internally consistent.
- Empty/loading/disabled states are honest and compact.
- Each completed batch has file-level diagnostics and clear verification evidence.

Known facts/evidence
- The Ralph planning gate is satisfied because both PRD and test-spec artifacts already exist under `.omx/plans/`.
- A first audit/fix loop already improved Analytics period honesty, empty chart behavior, achievement loading/empty states, Profile setting honesty, and the Home health empty-state layout.
- The worktree is heavily dirty, so edits must stay narrowly scoped and avoid reverting unrelated in-flight changes.
- Home health metric detail taps currently route to placeholder alerts instead of real detail surfaces.
- `MetricItem` is only used by the Home health intelligence surface, so shared press-honesty changes there are low risk.

Constraints
- Follow `CLAUDE.md`: trace root cause first, keep fixes minimal, no new dependencies, no silent failures.
- Respect existing dirty changes and do not overwrite unrelated user work.
- Prefer inline verification on affected files and targeted commands over ceremony.
- Full-project typecheck is currently noisy from unrelated pre-existing repo issues; use file-level diagnostics as the clean regression signal.

Unknowns/open questions
- Whether remaining “coming soon” and alert-based interactions on Home should be routed to real destinations or made clearly non-interactive.
- Whether additional profile/diet follow-up should happen in this same loop after the next Home batch is verified.

Likely codebase touchpoints
- `src/screens/main/HomeScreen.tsx`
- `src/components/home/MetricItem.tsx`
- `src/screens/main/home/HealthIntelligenceHub.tsx`
- `src/hooks/useProfileLogic.ts`
- `src/components/home/HealthIntelligencePlaceholder.tsx`
- `src/screens/main/analytics/*`
