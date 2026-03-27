# Test Spec: Performance Remediation 2026-03-21

## Verification Targets

1. Main navigation still renders primary tabs and session screens correctly.
2. Home and Diet screen flows still respond to navigation props and route-triggered actions.
3. TypeScript diagnostics remain clean for affected files.
4. Project verification commands complete successfully or are reported with pre-existing failures.

## Planned Checks

- `npm run type-check`
- `npm test -- --runInBand`
- `npx eslint App.tsx src/components/navigation/MainNavigation.tsx src/screens/main/HomeScreen.tsx src/screens/main/DietScreen.tsx`

## Focused Review Areas

- Lazy/deferred loading logic for screens or heavy work
- Route param handling in `DietScreen`
- Navigation/session branching in `MainNavigation`
- Startup behavior in `App.tsx`
