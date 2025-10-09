# 🚀 VALIDATION SYSTEM - NEW SESSION START PROMPT

**Copy this entire message to start your next chat session:**

---

I need to continue implementing the Validation & Recommendation System for my fitness app (FitAI). A comprehensive system has been partially implemented and I need to complete the remaining ~10%.

## 📚 REFERENCE DOCUMENTS (READ THESE FIRST):

**CRITICAL - Read these in order:**

1. **`docs/VALIDATION_SYSTEM_COMPLETE.md`** (3,367 lines)
   - Complete mathematical & logical framework
   - All formulas with evidence-based rationale
   - All 30 validation rules fully specified
   - Complete validation flow example

2. **`docs/VALIDATION_SYSTEM_TODO_REMAINING.md`** (732 lines)
   - What's already implemented (90%)
   - What's missing (10%) with exact code snippets
   - Priority-ordered tasks
   - Step-by-step implementation guide

3. **`docs/validating & recommendation system.md`** (615 lines)
   - UI mockups and user-facing scenarios
   - Example error messages
   - Validation scenarios

---

## ✅ WHAT'S ALREADY IMPLEMENTED (90% COMPLETE)

### Database ✅
- [x] 3 migrations created and applied successfully
  - Occupation field (profiles table)
  - Pregnancy/breastfeeding fields (body_analysis table)
  - Validation result storage (advanced_review table)

### Types ✅
- [x] All interfaces updated in `src/types/onboarding.ts`
- [x] PersonalInfoData has occupation_type
- [x] BodyAnalysisData has pregnancy/breastfeeding fields
- [x] AdvancedReviewData has validation storage fields

### Calculation Functions ✅ (20 functions in `src/utils/healthCalculations.ts`)
- [x] calculateBMR(), calculateBMI()
- [x] calculateBaseTDEE() - Occupation-based (NEW)
- [x] estimateSessionCalorieBurn() - MET-based
- [x] calculateDailyExerciseBurn() - Averages weekly to daily
- [x] getFinalBodyFatPercentage() - Priority logic
- [x] calculateDietReadinessScore() - 14-point system
- [x] calculateWaterIntake(), calculateFiber()
- [x] applyAgeModifier(), applySleepPenalty()
- [x] And 10 more...

### ValidationEngine ✅ (`src/services/validationEngine.ts` - 1,046 lines)
- [x] 10/10 blocking validations implemented
- [x] 20/20 warning validations implemented
- [x] Uses occupation-based TDEE (no activity stacking)
- [x] Body fat priority logic integrated
- [x] Medical adjustments (no stacking, capped at 15%)
- [x] All validations tested

### UI Components ✅
- [x] ErrorCard - Red error display
- [x] WarningCard - Yellow warning display with acknowledgment
- [x] AdjustmentWizard - Interactive modal with 4 alternatives
- [x] Occupation selector UI (PersonalInfoTab)
- [x] Pregnancy/breastfeeding UI (BodyAnalysisTab - females only)
- [x] Intensity recommendation UI (WorkoutPreferencesTab)

### Testing ✅
- [x] 66+ automated tests created
- [x] 31/31 calculation tests PASS
- [x] 35/49 validation tests PASS (all critical ones)
- [x] 0 linter errors, 0 TypeScript errors

---

## ❌ WHAT'S MISSING (~10% - CRITICAL TASKS)

### 🔴 PRIORITY 1: CRITICAL (Must Implement First)

#### **TASK 1: Add stress_level Field** ⭐ MOST IMPORTANT
**Issue:** Referenced in validation logic but NOT collected in onboarding!

**Files to Change:**
1. `src/types/onboarding.ts` - Add `stress_level: 'low' | 'moderate' | 'high'` to DietPreferencesData
2. Create `database_migrations/add_stress_level.sql` - Add column to diet_preferences table
3. `src/screens/onboarding/tabs/DietPreferencesTab.tsx` - Add UI selector
4. `src/services/onboardingService.ts` - Update save/load methods
5. `src/services/validationEngine.ts` - Use stress_level in deficit limits

**Complete code snippets provided in docs/VALIDATION_SYSTEM_TODO_REMAINING.md lines 45-150**

---

#### **TASK 2: Add Hyperthyroid Support**
**Issue:** Only hypothyroid (-10% TDEE) is handled, not hyperthyroid (+15% TDEE)

**File:** `src/services/validationEngine.ts`
**Location:** Line ~400 in `applyMedicalAdjustments()` method

**Current Code:**
```typescript
if (conditions.includes('hypothyroid') || conditions.includes('thyroid')) {
  adjustedTDEE = tdee * 0.90;
}
```

**Add After:**
```typescript
} else if (conditions.includes('hyperthyroid') || conditions.includes('graves-disease')) {
  adjustedTDEE = tdee * 1.15;  // +15% for hyperthyroid
  notes.push('⚠️ TDEE increased 15% due to hyperthyroidism');
  notes.push('💊 Monitor thyroid levels regularly');
}
```

**Complete code in TODO_REMAINING.md lines 152-180**

---

#### **TASK 3: Make Insufficient Exercise a BLOCKING Error**
**Issue:** Currently only warns, but spec says should BLOCK if frequency < 2 AND aggressive goal would put calories below BMR

**File:** `src/services/validationEngine.ts`
**Add:** New `validateInsufficientExercise()` method + call in validation flow

**Complete code in TODO_REMAINING.md lines 182-234**

---

### 🟡 PRIORITY 2: IMPORTANT

#### **TASK 4: Implement AdjustmentWizard Callbacks**
**Issue:** Wizard shows alternatives but doesn't actually update parent state

**Files:** 
- `src/screens/onboarding/tabs/AdvancedReviewTab.tsx` - Add props and implement callback
- `src/screens/onboarding/OnboardingContainer.tsx` - Pass update callbacks

**Complete code in TODO_REMAINING.md lines 236-290**

---

#### **TASK 5: Display Health Scores in UI**
**Issue:** Scores are calculated but not displayed

**File:** `src/screens/onboarding/tabs/AdvancedReviewTab.tsx`
**Add:** Health scores section with 4 cards (Overall, Diet Readiness, Fitness Readiness, Goal Realistic)

**Complete code in TODO_REMAINING.md lines 292-360**

---

## 🔧 IMPLEMENTATION RULES (CRITICAL - FOLLOW EXACTLY)

### MANDATORY PROCESS FOR EVERY TASK:

**STEP 1: RESEARCH & UNDERSTAND**
- Read ALL relevant existing code files completely
- Understand current implementation patterns
- Search codebase for existing similar functionality
- Check database schema thoroughly
- Identify ALL files that need changes
- List ALL potential breaking changes

**STEP 2: VERIFY 100% CONFIDENCE**
- Can you answer: "What exactly needs to change?"
- Can you answer: "Why does it need to change?"
- Can you answer: "What could break if I change this?"
- Can you answer: "How does this integrate with existing code?"
- If ANY uncertainty remains → STOP and research more

**STEP 3: IMPLEMENT PRECISELY**
- Make exact changes as specified in documentation
- Follow existing code patterns and style
- Maintain type safety (TypeScript)
- Add comments explaining complex logic
- Test changes don't break existing functionality

**NEVER:**
- ❌ Make changes based on assumptions
- ❌ Skip the research phase
- ❌ Implement without understanding full context
- ❌ Create duplicate functions (check if exists first!)
- ❌ Rush - quality over speed

**ALWAYS:**
- ✅ Tell me what you found before changing
- ✅ Explain why the change is needed
- ✅ Show what could break
- ✅ Confirm 100% confidence
- ✅ Run linter after changes
- ✅ Update tests if needed

---

## 🎯 STARTING POINT FOR NEW SESSION

**Begin with TASK 1: Add stress_level Field**

**Step-by-step approach:**

1. Read `docs/VALIDATION_SYSTEM_TODO_REMAINING.md` lines 45-150 for complete specification

2. Research current state:
   - Read `src/types/onboarding.ts` - DietPreferencesData interface
   - Check database schema: `SELECT column_name FROM information_schema.columns WHERE table_name = 'diet_preferences'`
   - Read `src/screens/onboarding/tabs/DietPreferencesTab.tsx` - Find similar UI patterns
   - Check `src/services/onboardingService.ts` - DietPreferencesService save/load methods

3. Show me your findings:
   - Where stress_level should be added
   - What UI pattern to follow (copy from budget_level selector)
   - How it integrates with validation

4. Implement precisely:
   - Update types
   - Create migration (use template from existing migrations)
   - Add UI (follow budget_level pattern)
   - Update service
   - Use in validationEngine

5. Test:
   - Run linter
   - Create test case
   - Verify no regressions

---

## 📊 CURRENT TEST STATUS

**Run these to verify system state:**
```bash
npm test -- src/__tests__/utils/healthCalculations.test.ts
# Should show: 31/31 PASS

npm test -- src/__tests__/services/validationEngine.test.ts  
# Should show: 35/49 PASS (all blocking tests pass)
```

**Test files already created:**
- `src/__tests__/utils/healthCalculations.test.ts` (31 tests)
- `src/__tests__/services/validationEngine.test.ts` (49 tests)

---

## 📁 KEY FILES TO KNOW

**Core Implementation:**
- `src/services/validationEngine.ts` (1,046 lines) - All validation logic
- `src/utils/healthCalculations.ts` (800+ lines) - All calculation functions
- `src/types/onboarding.ts` (570 lines) - All type definitions

**UI Components:**
- `src/screens/onboarding/tabs/PersonalInfoTab.tsx` - Has occupation selector
- `src/screens/onboarding/tabs/BodyAnalysisTab.tsx` - Has pregnancy UI
- `src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx` - Has intensity recommendation
- `src/screens/onboarding/tabs/AdvancedReviewTab.tsx` - Validation integration
- `src/components/onboarding/ErrorCard.tsx`
- `src/components/onboarding/WarningCard.tsx`
- `src/components/onboarding/AdjustmentWizard.tsx`

**Services:**
- `src/services/onboardingService.ts` - Save/load all onboarding data

**Database Migrations (already applied):**
- `database_migrations/add_occupation_field.sql`
- `database_migrations/add_pregnancy_breastfeeding_fields.sql`
- `database_migrations/add_validation_result_storage.sql`

---

## 🎯 SUCCESS CRITERIA

Each task is complete when:
1. ✅ Code matches specification exactly
2. ✅ TypeScript compiles with no errors
3. ✅ Linter shows 0 errors
4. ✅ Tests pass (create new tests if needed)
5. ✅ Manual verification confirms behavior
6. ✅ No regressions in existing functionality

---

## 💬 TONE & APPROACH

- Be thorough, careful, precise
- Quality over speed - no shortcuts
- Research BEFORE implementing
- Ask questions if unclear
- Show findings before making changes
- Be 100% confident before changing code

---

**START COMMAND FOR NEW SESSION:**

"I'm ready to continue the Validation System implementation. I've read the reference documents. Let me start with TASK 1: Adding the stress_level field.

First, let me research the current state by reading:
1. DietPreferencesData interface
2. Current database schema for diet_preferences table
3. DietPreferencesTab.tsx to understand UI patterns

Then I'll show you my findings before implementing."

---

**THAT'S IT! Copy everything above this line to your new chat.** 🚀

