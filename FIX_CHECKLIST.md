# FIX IMPLEMENTATION CHECKLIST

**Quick Reference Guide**
**Estimated Time:** 2.5 days (20 hours)

---

## PHASE 1: CRITICAL DATA FLOW (2-3 hours)

### Fix 1: Name Field Resolution (1 hour)
- [ ] 1.1 Add name loading to `src/services/onboardingService.ts:88-99`
- [ ] 1.2 Create `getUserDisplayName()` in `src/utils/validation.ts`
- [ ] 1.3 Update `src/screens/main/HomeScreen.tsx:346-347`
- [ ] 1.4 Update `src/screens/main/FitnessScreen.tsx:347`
- [ ] 1.5 Update `src/screens/main/DietScreen.tsx:216`
- [ ] 1.6 Update `src/screens/main/DietScreenNew.tsx:215`
- [ ] 1.7 Update `src/screens/main/ProfileScreen.tsx:124`
- [ ] 1.8 Update `src/screens/onboarding/OnboardingContainer.tsx:504`
- [ ] 1.9 Fix `src/contexts/EditContext.tsx:181`
- [ ] 1.10 Fix `src/screens/onboarding/ReviewScreen.tsx:119`

### Fix 2: Type System (15 minutes)
- [ ] 2.1 Verify `src/types/user.ts:10` (already fixed)
- [ ] 2.2 Fix `src/contexts/EditContext.tsx:183`
- [ ] 2.3 Fix `src/screens/main/HomeScreen.tsx:180`
- [ ] 2.4 Fix `src/services/onboardingService.ts:91`
- [ ] 2.5 Fix `src/services/userProfile.ts:444`

### Fix 3: Table Mapping (30 minutes)
- [ ] 3.1 Verify `src/types/user.ts` (already fixed)
- [ ] 3.2 Verify `src/screens/main/HomeScreen.tsx:186-188` (already correct)
- [ ] 3.3 Verify `src/screens/main/AnalyticsScreen.tsx:98` (already correct)
- [ ] 3.4 Search & replace all `personalInfo.height/weight` → `bodyMetrics.height_cm/current_weight_kg`

### Fix 4: Required Fields (30 minutes)
- [ ] 4.1 Update `src/types/user.ts:3-24` PersonalInfo interface
- [ ] 4.2 Update `src/types/user.ts:28-57` BodyMetrics interface
- [ ] 4.3 Update `src/types/user.ts:59-73` FitnessGoals interface
- [ ] 4.4 Update `src/types/user.ts:76-84` DietPreferences interface
- [ ] 4.5 Update `src/types/user.ts:86-106` WorkoutPreferences interface

---

## PHASE 2: REMOVE FALLBACKS (3-4 hours)

### Fix 5: Critical Health/Safety (1 hour)
- [ ] 5.1 Fix `src/contexts/EditContext.tsx:208` (dietType)
- [ ] 5.2 Fix `src/contexts/EditContext.tsx:184` (gender)
- [ ] 5.3 Add pregnancy validation to `src/utils/validation.ts`
- [ ] 5.4 Fix `src/contexts/EditContext.tsx:185` (activityLevel)
- [ ] 5.5 Search & replace all weight/height `|| 0` fallbacks

### Fix 6: Profile Display (already done)
- [x] 6.1 Name fallbacks (done in Fix 1)
- [x] 6.2 Anonymous fallbacks (done in Fix 1)
- [x] 6.3 "there" fallbacks (done in Fix 1)

### Fix 7: Remove Defaults (1h 45min)
- [ ] 7.1 Search & replace all `|| 0` patterns (45 min)
- [ ] 7.2 Search & replace all `|| ''` patterns (45 min)
- [ ] 7.3 Audit all `|| []` patterns (15 min)

**Commands to run:**
```bash
grep -rn " || 0" src/contexts/EditContext.tsx src/services/onboardingService.ts src/services/userProfile.ts
grep -rn " || ''" src/contexts/EditContext.tsx src/services/onboardingService.ts src/services/userProfile.ts
grep -rn " || \[\]" src/contexts/EditContext.tsx src/services/onboardingService.ts
```

---

## PHASE 3: VALIDATION (2 hours)

### Fix 8: Validation Functions (1h 15min)
- [ ] 8.1 Create `src/utils/profileValidation.ts` (45 min)
  - [ ] `validatePersonalInfo()`
  - [ ] `validateBodyMetrics()`
  - [ ] `validateFitnessGoals()`
  - [ ] `validateDietPreferences()`
  - [ ] `validateWorkoutPreferences()`
  - [ ] `validateProfileComplete()`
  - [ ] `requireOnboardingComplete()`
- [ ] 8.2 Add validation to screens (30 min)
  - [ ] `src/screens/main/FitnessScreen.tsx`
  - [ ] `src/screens/main/DietScreen.tsx`
  - [ ] `src/screens/main/AnalyticsScreen.tsx`
  - [ ] `src/screens/main/HomeScreen.tsx`

### Fix 9: Error UI (50 minutes)
- [ ] 9.1 Create `src/components/ui/IncompleteProfileScreen.tsx` (30 min)
- [ ] 9.2 Use in screens (20 min)
  - [ ] FitnessScreen
  - [ ] DietScreen
  - [ ] AnalyticsScreen
  - [ ] HomeScreen

---

## PHASE 4: DATABASE CONSTRAINTS (1 hour)

### Fix 10: Migration (1 hour)
- [ ] 10.1 Create `supabase/migrations/20250130000000_add_required_field_constraints.sql` (30 min)
  - [ ] Profiles table constraints
  - [ ] Body analysis constraints
  - [ ] Diet preferences constraints
  - [ ] Workout preferences constraints
  - [ ] Pregnancy trimester trigger
  - [ ] Indexes
- [ ] 10.2 Test migration (20 min)
  - [ ] Run `supabase db reset`
  - [ ] Verify constraints created
  - [ ] Test invalid data (should fail)
  - [ ] Test valid data (should succeed)

---

## PHASE 5: TESTING (4 hours)

### Test 11: Unit Tests (1 hour)
- [ ] Create `src/__tests__/validation/profileValidation.test.ts`
  - [ ] Test validatePersonalInfo
  - [ ] Test validateBodyMetrics
  - [ ] Test validateFitnessGoals
  - [ ] Test validateDietPreferences
  - [ ] Test validateWorkoutPreferences
  - [ ] Test validateProfileComplete

### Test 12: E2E Tests (2 hours)
- [ ] Create `src/__tests__/e2e/onboardingFlow.test.ts`
  - [ ] Complete flow test
  - [ ] Skip field test
  - [ ] Invalid age test
  - [ ] Vegan diet test
  - [ ] Name display test
  - [ ] Edit profile test
  - [ ] Database constraint test

### Test 13: Manual Verification (1 hour)
- [ ] Test name "John Doe" → displays "John"
- [ ] Test age 25 → BMR uses 25
- [ ] Test gender "female" → BMR uses female formula
- [ ] Test weight 70kg → calculations use 70kg
- [ ] Test "vegetarian" → no meat in meals
- [ ] Test allergies ["nuts"] → no nuts in recipes
- [ ] Test edit name → updates immediately
- [ ] Test app restart → data persists

---

## VERIFICATION CHECKLIST

After completing all phases, verify:

### Data Flow
- [ ] Name displays correctly (no "Champion")
- [ ] Age is a number (not string)
- [ ] Weight/height from bodyMetrics (not personalInfo)
- [ ] All required fields are non-optional in types

### Fallbacks Removed
- [ ] No `|| 'Champion'` in codebase
- [ ] No `|| 'non-veg'` in codebase
- [ ] No `|| 'male'` in codebase
- [ ] No `|| 30` for age
- [ ] No `|| 0` for required fields

### Validation Working
- [ ] Incomplete profile shows error screen
- [ ] Missing name blocks onboarding
- [ ] Invalid age shows error
- [ ] Missing diet type blocks meal generation

### Database Constraints
- [ ] Cannot insert profile without name
- [ ] Cannot insert age < 13 or > 120
- [ ] Cannot insert invalid gender
- [ ] Cannot insert invalid diet type
- [ ] Pregnancy trimester trigger works

### Tests Passing
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Manual tests pass

---

## COMMANDS TO RUN

### Search for remaining fallbacks:
```bash
# Name fallbacks
grep -rn "|| 'Champion'" src/
grep -rn "|| 'there'" src/
grep -rn "|| 'Anonymous'" src/

# Critical fallbacks
grep -rn "|| 'non-veg'" src/
grep -rn "|| 'male'" src/
grep -rn "age.*|| 0" src/
grep -rn "age.*|| 30" src/

# Weight/height fallbacks
grep -rn "weight.*|| 0" src/
grep -rn "height.*|| 0" src/

# Table mapping issues
grep -rn "personalInfo\\.height" src/
grep -rn "personalInfo\\.weight" src/
```

### Test migration:
```bash
cd supabase
supabase db reset
supabase db diff
```

### Run tests:
```bash
npm test -- profileValidation.test.ts
npm test -- onboardingFlow.test.ts
npm test
```

---

## DAILY PROGRESS TRACKING

### Day 1 Target (8 hours)
- [ ] Complete Phase 1 (2.5 hours)
- [ ] Complete Phase 2 (3.5 hours)
- [ ] Start Phase 3 (2 hours)

**End of Day 1 Check:**
- [ ] Name displays correctly
- [ ] No critical fallbacks remain
- [ ] Validation utilities created

---

### Day 2 Target (8 hours)
- [ ] Complete Phase 3 (0 hours remaining)
- [ ] Complete Phase 4 (1 hour)
- [ ] Complete Phase 5 (4 hours)
- [ ] Bug fixes (3 hours)

**End of Day 2 Check:**
- [ ] All tests pass
- [ ] Database constraints work
- [ ] Validation shows errors

---

### Day 3 Target (4 hours)
- [ ] Final testing (2 hours)
- [ ] Documentation (1 hour)
- [ ] Cleanup (1 hour)

**End of Day 3 Check:**
- [ ] All 132 fields work
- [ ] Zero fallbacks
- [ ] Production ready

---

## QUICK WINS (Do First)

### Top 5 High-Impact Fixes (1 hour)
1. [ ] Fix dietType fallback (EditContext.tsx:208) - **5 minutes**
2. [ ] Fix name display (HomeScreen.tsx:346-347) - **10 minutes**
3. [ ] Create getUserDisplayName utility - **15 minutes**
4. [ ] Fix age type (remove all age || 0) - **15 minutes**
5. [ ] Fix gender fallback (EditContext.tsx:184) - **5 minutes**

**After these 5 fixes:**
- Users see their name
- No dietary violations
- Better calculation accuracy

---

## HELP & REFERENCES

### Key Files
- **Main Plan:** `COMPREHENSIVE_FIX_IMPLEMENTATION_PLAN.md`
- **Summary:** `FIX_PLAN_EXECUTIVE_SUMMARY.md`
- **Audit Reports:**
  - `FALLBACK_VALUE_AUDIT.md` (287 instances)
  - `ONBOARDING_FIELD_MAPPING_COMPLETE.md` (132 fields)
  - `COMPLETE_FIELD_MAPPING.md` (103 fields)

### Code Patterns
```typescript
// Pattern 1: Safe field access
const name = getUserDisplayName(profile);

// Pattern 2: Required field
const age = getRequiredField(profile?.personalInfo?.age, 'age', 'context');

// Pattern 3: Validation check
const validation = validateProfileComplete(profile);
if (!validation.isValid) {
  return <IncompleteProfileScreen validation={validation} />;
}
```

---

**Last Updated:** 2025-12-29
**Status:** READY TO EXECUTE ✅
**Estimated Completion:** 2.5 days
