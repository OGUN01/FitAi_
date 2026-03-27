Task statement
- Fix touch reliability issues across the app so cards, options, and nested actions respond instantly and consistently without regressions.

Desired outcome
- Visible touch surfaces match actual hit targets.
- Nested child actions do not accidentally trigger parent card actions.
- Main onboarding, diet, fitness, and settings interactions feel reliable.
- Regression tests protect the shared interaction contract.

Known facts/evidence
- `src/components/ui/aurora/AnimatedPressable.tsx` applies `style` to the outer animated wrapper, not the inner `Pressable`, so visible card dimensions can exceed the real press area.
- Many high-traffic surfaces use `AnimatedPressable`, including onboarding, diet, fitness, analytics, home, help, settings, and profile.
- Several onboarding selectors place small info buttons inside tappable cards (`CurrentDietSection`, `GoalsSection`, `PreferencesSection`, `LocationSelector`).
- Some cards include nested quick actions (`TodaysMealsSection`, `HydrationCard`), creating likely parent/child press conflicts.
- Existing test coverage is strong in services and flows but thin for touch-target and nested-press behavior.

Constraints
- No new dependencies.
- Keep behavior intact except for touch reliability improvements.
- Verify with lint, typecheck, targeted tests, and affected-file diagnostics before completion.
- User requested a complete pass while away; proceed autonomously.

Unknowns/open questions
- Which card variants are currently most visible in production flows versus legacy duplicates.
- Whether any web-specific press handling quirks need follow-up after the shared primitive fix.

Likely codebase touchpoints
- `src/components/ui/aurora/AnimatedPressable.tsx`
- `src/components/onboarding/diet/CurrentDietSection.tsx`
- `src/components/onboarding/workout/GoalsSection.tsx`
- `src/components/onboarding/workout/PreferencesSection.tsx`
- `src/components/onboarding/workout/preferences/LocationSelector.tsx`
- `src/components/diet/TodaysMealsSection.tsx`
- `src/components/diet/HydrationCard.tsx`
- `src/__tests__/...` new interaction regression tests
