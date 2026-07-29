# Draft: Comprehensive UI/UX Audit — FitAI

## Requirements (confirmed)
- User wants **"best in the world"** quality UI/UX
- Focus on: layout bugs, theme inconsistencies, mock data, diet preference violations, SSOT violations
- User is vegetarian — app MUST never show non-veg meals
- Everything must have proper single source of truth
- "don't hold back" — find ALL issues, not just obvious ones

## Audit Complete — All 6 Background Agents Returned

### Agent 1: Screen Layout Issues ✅ — 24 screens audited
### Agent 2: Hardcoded/Mock Data ✅ — 10+ violations found
### Agent 3: Theme/Styling Inconsistencies ✅ — 14 violations found
### Agent 4: Diet Preference Logic ✅ — 6 bugs found
### Agent 5: Text/Button/Cropping Issues ✅ — 7+ issues found
### Agent 6: SSOT Violations ✅ — **14 violations confirmed**

## SSOT Violations Summary (Agent 6 — Final Results)

1. `ActivityLevel` type defined in **4 places** with different values
2. `DietType` type defined in **2 places** with mismatched values
3. `MealType` type defined in **5+ places** (4-value vs 6-value)
4. `MEAL_TYPES` constant in **3 places** with different shapes
5. BMR Calculation in **4 places** with different approaches
6. `MetabolicCalculations` class defined **twice** (identical code)
7. MET values hardcoded in **2 places** + separate calculator
8. Calorie targets hardcoded (2000, 1500) in **4 places**
9. Workers API URL hardcoded in **3 places** (one bypasses config entirely)
10. YouTube API URL defined in **2 places**
11. Exercise data in **2 separate databases** (UI vs AI)
12. User profile data in **2 competing stores** (userStore vs profileStore)
13. User type definitions: `PersonalInfo` vs `PersonalInfoData` in multiple files
14. Brand color `#667eea` hardcoded **81 times** instead of using theme system

## Total Issue Count (All Categories)
| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Layout (SafeArea/Bottom) | 8 | 4 | 6 | 18 |
| Theme Violations | 6 | 6 | 2 | 14 |
| Mock/Hardcoded Data | 2 | 4 | 4 | 10 |
| Diet Preference Gaps | 3 | 0 | 3 | 6 |
| Text/Button/Cropping | 2 | 2 | 3 | 7 |
| SSOT Violations | 14 | 0 | 0 | 14 |
| **TOTAL** | **35** | **16** | **18** | **69** |

## Test Strategy Decision
- **Infrastructure exists**: YES (bun test / jest config likely present)
- **Automated tests**: TBD — need to ask user
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

## Open Questions
- Test strategy: TDD, tests-after, or none for this UI/UX fix pass?
- Priority ordering: Fix layout first? Theme first? SSOT first?
- Commit strategy: One commit per category? Per wave?

## Scope Boundaries
- INCLUDE: All UI/UX fixes, theme consolidation, mock data removal, SSOT fixes, diet preference logic
- EXCLUDE: New features, backend changes (beyond SSOT), performance optimization, new screens
