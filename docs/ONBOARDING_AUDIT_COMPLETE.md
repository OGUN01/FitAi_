# 🔍 FitAI Onboarding System - Complete Audit Report

**Date**: 2025-10-06  
**Status**: 16 Issues Found (2 Critical, 6 High, 6 Medium, 1 Low, 1 Good)  
**User Reported Issue**: Ideal weight showing 54-72kg for Male 172cm 86kg (should be 63-80kg)

📖 **Companion File**: [DATABASE_CODE_MAPPING.md](./DATABASE_CODE_MAPPING.md) - Complete field-by-field mapping reference

---

## 📋 EXECUTIVE SUMMARY

**Total Issues**: 16
- **🔴 Critical (2)**: Will cause crashes - #8 Database constraint, #1 Formula accuracy
- **🟠 High (6)**: Data integrity & accuracy issues  
- **🟡 Medium (6)**: UX & feature gaps
- **🟢 Low (1)**: Documentation only
- **✅ Good (1)**: Validation working correctly

**Top 5 Priorities**:
1. Fix database constraint for cooking_skill_level (will crash app)
2. Fix ideal weight formula (gender-based calculation)
3. Fix BMR hardcoded age/gender
4. Fix height_cm data type mismatch
5. Fix activity_level duplication

---

## 🗂️ DATABASE SCHEMA MAPPING

### **Tables & Columns Overview**

| Table | TypeScript Interface | Database Columns | Status |
|-------|---------------------|------------------|--------|
| `profiles` | `PersonalInfoData` | 21 columns | ⚠️ Has duplicates |
| `diet_preferences` | `DietPreferencesData` | 34 columns | ⚠️ Missing constraint value |
| `body_analysis` | `BodyAnalysisData` | 28 columns | ⚠️ Data type mismatch |
| `workout_preferences` | `WorkoutPreferencesData` | 24 columns | ⚠️ Has duplicate field |
| `advanced_review` | `AdvancedReviewData` | 43 columns | ✅ Good |
| `onboarding_progress` | `OnboardingProgressData` | 9 columns | ✅ Good |

### **Critical Schema Issues**

#### **1. Data Type Mismatch - height_cm**
```sql
profiles.height_cm          → INTEGER (no decimals)      ❌
body_analysis.height_cm     → NUMERIC(5,2) (2 decimals)  ✅
```
**Impact**: Data precision loss, sync issues

#### **2. Duplicate Field - activity_level**
```sql
profiles.activity_level          → Exists (WRONG per plan)  ❌
workout_preferences.activity_level → Exists (CORRECT)      ✅
```
**Impact**: Data redundancy, sync issues, confusion

#### **3. Missing Enum Value - cooking_skill_level**
```typescript
// TypeScript allows:
'beginner' | 'intermediate' | 'advanced' | 'not_applicable'

// Database constraint only allows:
CHECK (cooking_skill_level = ANY (ARRAY['beginner', 'intermediate', 'advanced']))
// ❌ MISSING 'not_applicable' → WILL CRASH!
```

---

## 🐛 COMPLETE ISSUES LIST

### **ISSUE #1: Ideal Weight Formula No Gender** ❌ CRITICAL
- **File**: `src/utils/healthCalculations.ts:160-166`
- **Problem**: Uses BMI formula only, ignores gender
- **User Impact**: Male 172cm shows 54-72kg instead of 63-80kg
- **Fix**: Add gender-based formulas (Devine, Robinson, Miller)
```typescript
// CURRENT - WRONG:
static calculateIdealWeightRange(heightCm: number) {
  const heightM = heightCm / 100;
  return {
    min: 18.5 * heightM * heightM,  // No gender!
    max: 24.9 * heightM * heightM,
  };
}

// NEEDED - Add gender parameter
static calculateIdealWeightRange(heightCm: number, gender: string, age: number)
```

---

### **ISSUE #2: BMR Hardcoded Age & No Gender** ❌ HIGH
- **File**: `src/screens/onboarding/tabs/BodyAnalysisTab.tsx:204-208`
- **Problem**: Age hardcoded to 25, no gender parameter
- **User Impact**: Wrong BMR for everyone except 25-year-old males
- **Fix**: Pull age/gender from PersonalInfo, use correct Mifflin-St Jeor
```typescript
// CURRENT - WRONG:
const calculateBMR = (weightKg: number, heightCm: number): number => {
  return 10 * weightKg + 6.25 * heightCm - 5 * 25; // Age=25, no gender!
};

// NEEDED:
// Add personalInfoData prop to BodyAnalysisTab
// Use: MetabolicCalculations.calculateBMR(weight, height, age, gender)
```

---

### **ISSUE #3: VO2 Max Negative Age Bug** ⚠️ MEDIUM
- **File**: `src/utils/healthCalculations.ts:269-277`
- **Problem**: Age < 20 gets bonus instead of penalty
- **User Impact**: Incorrect VO2 Max for users under 20
```typescript
// CURRENT:
const baseVO2 = gender === 'male' 
  ? 50 - (age - 20) * 0.5  // If age=18: 50 - (-2)*0.5 = 51 (too high!)
  : 40 - (age - 20) * 0.4;

// FIX: Add bounds or adjust formula
```

---

### **ISSUE #4: Metabolic Age Rough Approximation** ⚠️ MEDIUM
- **File**: `src/utils/healthCalculations.ts:56-64`
- **Problem**: Linear approximation, comment admits "rough"
- **User Impact**: Unreliable metabolic age calculations
- **Fix**: Implement proper metabolic age formula

---

### **ISSUE #5: Weight Loss Rate No Gender** ⚠️ MEDIUM
- **File**: `src/utils/healthCalculations.ts:172-177`
- **Problem**: Same rate for male/female, ignores body composition
- **User Impact**: Females get incorrect safe weight loss rate
```typescript
// CURRENT - WRONG:
static calculateHealthyWeightLossRate(currentWeight: number) {
  if (currentWeight > 100) return 1.0;
  if (currentWeight > 80) return 0.8;
  return 0.5;  // No gender!
}

// NEEDED: Add gender, body fat %, height, age
```

---

### **ISSUE #6: height_cm Data Type Mismatch** ❌ HIGH
- **Database**: Schema inconsistency
- **Problem**: INTEGER in profiles, NUMERIC(5,2) in body_analysis
- **User Impact**: Precision loss, sync issues
- **Fix**: Standardize to NUMERIC(5,2) in both tables
```sql
-- Migration needed:
ALTER TABLE profiles ALTER COLUMN height_cm TYPE NUMERIC(5,2);
```

---

### **ISSUE #7: activity_level Duplication** ❌ HIGH
- **Database**: Redundant column
- **Problem**: Exists in profiles AND workout_preferences
- **Per Plan**: Should ONLY be in workout_preferences
- **User Impact**: Data can become out of sync
- **Fix**: Remove from profiles, migrate data
```sql
-- Migration needed:
-- 1. Copy data from profiles to workout_preferences
-- 2. DROP COLUMN profiles.activity_level
```

---

### **ISSUE #8: cooking_skill_level Missing 'not_applicable'** ❌ HIGH - WILL CRASH!
- **Database**: Constraint too restrictive
- **Problem**: TypeScript has 4 values, DB constraint only allows 3
- **User Impact**: App crashes when user selects "Not Applicable"
- **Fix**: Add to CHECK constraint
```sql
-- CURRENT:
CHECK (cooking_skill_level = ANY (ARRAY['beginner', 'intermediate', 'advanced']))

-- NEEDED:
ALTER TABLE diet_preferences DROP CONSTRAINT check_cooking_skill_level;
ALTER TABLE diet_preferences ADD CONSTRAINT check_cooking_skill_level 
  CHECK (cooking_skill_level = ANY (ARRAY['beginner', 'intermediate', 'advanced', 'not_applicable']));
```

---

### **ISSUE #9: max_prep_time_minutes Can't Be NULL** ⚠️ MEDIUM
- **Database**: Constraint vs TypeScript mismatch
- **Problem**: DB requires 5-180, TypeScript allows null
- **User Impact**: Can't save null when cooking_skill = 'not_applicable'
- **Fix**: Allow NULL in constraint
```sql
ALTER TABLE diet_preferences DROP CONSTRAINT check_prep_time_range;
ALTER TABLE diet_preferences ADD CONSTRAINT check_prep_time_range 
  CHECK (max_prep_time_minutes IS NULL OR (max_prep_time_minutes >= 5 AND max_prep_time_minutes <= 180));
```

---

### **ISSUE #10: Naming Convention Mismatch** ⚠️ LOW
- **Documentation**: Comprehensive plan uses camelCase
- **Implementation**: Uses snake_case (correct for SQL)
- **User Impact**: None (documentation only)
- **Fix**: Update documentation to match implementation

---

### **ISSUE #11: Weight Goals Redundant Display** ⚠️ MEDIUM
- **File**: `src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx:707-747`
- **Problem**: Shows weight data already entered in Tab 3
- **User Impact**: Confusion - "Did I already enter this?"
- **Fix**: Add "READ ONLY - FROM TAB 3" label or remove section

---

### **ISSUE #12: Workout Style Section Never Rendered** ⚠️ MEDIUM
- **File**: `WorkoutPreferencesTab.tsx:643-705` (defined) vs Line 776 (not called)
- **Problem**: Function exists but never called in render
- **User Impact**: 6 preferences never collected (enjoys_cardio, etc.)
- **Fix**: Add `{renderWorkoutStyleSection()}` after line 775
```typescript
// CURRENT:
{renderGoalsAndActivitySection()}
{renderCurrentFitnessSection()}
{renderWorkoutPreferencesSection()}
{renderWeightGoalsSection()}

// NEEDED:
{renderGoalsAndActivitySection()}
{renderCurrentFitnessSection()}
{renderWorkoutPreferencesSection()}
{renderWorkoutStyleSection()}  // ← ADD THIS
{renderWeightGoalsSection()}
```

---

### **ISSUE #13: BMR Can't Access Gender/Age** ❌ HIGH
- **File**: `BodyAnalysisTab.tsx:204`
- **Problem**: Tab 3 needs Tab 1 data but doesn't receive it
- **User Impact**: Wrong BMR calculations
- **Fix**: Pass personalInfoData as prop
```typescript
// CURRENT:
interface BodyAnalysisTabProps {
  data: BodyAnalysisData | null;
  // ❌ No personalInfo!
}

// NEEDED:
interface BodyAnalysisTabProps {
  data: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;  // ← ADD THIS
}
```

---

### **ISSUE #14: Auto-Populate Missing Null Checks** ⚠️ LOW
- **File**: `WorkoutPreferencesTab.tsx:174-186`
- **Problem**: No validation if bodyAnalysisData fields are undefined
- **User Impact**: NaN calculations if user skips body analysis
- **Fix**: Add null checks
```typescript
// ADD:
if (!current_weight_kg || !target_weight_kg || !target_timeline_weeks) {
  return; // Skip auto-population
}
```

---

### **ISSUE #15: Meal Validation ✓** ✅ GOOD
- **File**: `DietPreferencesTab.tsx:429-443`
- **Status**: CORRECTLY IMPLEMENTED
- **Feature**: Prevents disabling all meals

---

### **ISSUE #16: Waist-Hip Ratio Gender Threshold** ⚠️ MEDIUM
- **File**: `BodyAnalysisTab.tsx:744`
- **Problem**: Uses male threshold (0.9) for all genders
- **User Impact**: Females get wrong health assessment
- **Fix**: Use 0.85 for females, 0.9 for males
```typescript
// CURRENT:
{formData.waist_hip_ratio < 0.9 ? 'Healthy' : 'High Risk'}

// NEEDED:
{formData.waist_hip_ratio < (gender === 'female' ? 0.85 : 0.9) ? 'Healthy' : 'High Risk'}
```

---

## 📊 COMPLETE ISSUES TABLE

| # | Issue | File/Location | Type | Severity | Users Affected | Fix Complexity |
|---|-------|---------------|------|----------|----------------|----------------|
| 1 | Ideal weight no gender | healthCalculations.ts:160 | Formula | ❌ CRITICAL | 100% | Medium |
| 2 | BMR hardcoded | BodyAnalysisTab.tsx:204 | Formula | ❌ HIGH | 100% | Easy |
| 3 | VO2 Max negative age | healthCalculations.ts:269 | Formula | ⚠️ MEDIUM | <20yo | Easy |
| 4 | Metabolic age approx | healthCalculations.ts:56 | Formula | ⚠️ MEDIUM | 100% | Hard |
| 5 | Weight loss no gender | healthCalculations.ts:172 | Formula | ⚠️ MEDIUM | 50% | Easy |
| 6 | height_cm type mismatch | Database schema | Database | ❌ HIGH | 100% | Medium |
| 7 | activity_level dup | Database schema | Database | ❌ HIGH | 100% | Medium |
| 8 | cooking_skill missing | Database constraint | Database | ❌ HIGH | N/A users | Easy |
| 9 | prep_time not null | Database constraint | Database | ⚠️ MEDIUM | N/A users | Easy |
| 10 | Naming mismatch | Documentation | Docs | ⚠️ LOW | 0% | Easy |
| 11 | Weight goals redundant | WorkoutTab.tsx:707 | UX | ⚠️ MEDIUM | 100% | Easy |
| 12 | Workout style hidden | WorkoutTab.tsx:776 | Feature | ⚠️ MEDIUM | 100% | Easy |
| 13 | BMR no access | BodyAnalysisTab props | Cross-tab | ❌ HIGH | 100% | Easy |
| 14 | Auto-pop null check | WorkoutTab.tsx:174 | Validation | ⚠️ LOW | Skip users | Easy |
| 15 | Meal validation ✓ | DietTab.tsx:429 | Validation | ✅ GOOD | N/A | N/A |
| 16 | Waist-hip gender | BodyAnalysisTab.tsx:744 | Formula | ⚠️ MEDIUM | 50% | Easy |

---

## 🎯 PRIORITY FIX ORDER

### **🔴 PHASE 1: CRITICAL - FIX IMMEDIATELY** (Day 1)
1. **#8** - Add 'not_applicable' to cooking_skill constraint (PREVENTS CRASH)
2. **#1** - Fix ideal weight formula with gender (USER REPORTED BUG: 54-72kg)
3. **#2** - Fix BMR hardcoded age/gender
4. **#13** - Pass personalInfo to BodyAnalysisTab

### **🟠 PHASE 2: HIGH PRIORITY** (Day 2-3)
5. **#6** - Fix height_cm data type mismatch
6. **#7** - Remove activity_level from profiles
7. **#12** - Show workout style section (6 preferences missing!)

### **🟡 PHASE 3: MEDIUM PRIORITY** (Day 4-5)
8. **#5** - Add gender to weight loss rate
9. **#11** - Fix weight goals redundancy UX
10. **#16** - Fix waist-hip ratio gender threshold
11. **#9** - Allow NULL for max_prep_time
12. **#3** - Fix VO2 Max age bounds

### **🟢 PHASE 4: LOW PRIORITY** (Week 2)
13. **#4** - Improve metabolic age formula
14. **#14** - Add auto-populate null checks
15. **#10** - Update documentation naming

---

## 🗺️ FILE LOCATIONS QUICK REFERENCE

```
FORMULAS:
src/utils/healthCalculations.ts
  - Line 31:   calculateBMR (✅ correct with gender)
  - Line 56:   calculateMetabolicAge (⚠️ rough approximation)
  - Line 160:  calculateIdealWeightRange (❌ NO GENDER)
  - Line 172:  calculateHealthyWeightLossRate (❌ NO GENDER)
  - Line 182:  getHealthyBodyFatRange (✅ has gender)
  - Line 269:  estimateVO2Max (⚠️ negative age bug)

TABS:
src/screens/onboarding/tabs/
  - PersonalInfoTab.tsx (Tab 1)
  - DietPreferencesTab.tsx (Tab 2)
  - BodyAnalysisTab.tsx (Tab 3) ← Line 204: BMR issue
  - WorkoutPreferencesTab.tsx (Tab 4) ← Line 776: Missing render
  - AdvancedReviewTab.tsx (Tab 5)

TYPES:
src/types/onboarding.ts
  - PersonalInfoData (Line 7)
  - DietPreferencesData (Line 38)
  - BodyAnalysisData (Line 117)
  - WorkoutPreferencesData (Line 170)
  - AdvancedReviewData (Line 205)

DATABASE:
Supabase tables:
  - profiles (21 cols) ← activity_level duplicate
  - diet_preferences (34 cols) ← cooking_skill constraint
  - body_analysis (28 cols) ← height_cm type mismatch
  - workout_preferences (24 cols)
  - advanced_review (43 cols)
  - onboarding_progress (9 cols)
```

---

## 🔧 QUICK FIX CHECKLIST

- [ ] **#8** Database: Add 'not_applicable' to cooking_skill constraint
- [ ] **#9** Database: Allow NULL for max_prep_time_minutes
- [ ] **#6** Database: Change profiles.height_cm to NUMERIC(5,2)
- [ ] **#7** Database: Remove profiles.activity_level column
- [ ] **#1** Code: Add gender to calculateIdealWeightRange()
- [ ] **#2** Code: Pass personalInfo to BodyAnalysisTab, fix BMR
- [ ] **#13** Code: Add personalInfoData prop to BodyAnalysisTab
- [ ] **#12** Code: Add {renderWorkoutStyleSection()} to render
- [ ] **#5** Code: Add gender to calculateHealthyWeightLossRate()
- [ ] **#16** Code: Use gender-specific waist-hip threshold
- [ ] **#11** UX: Add "READ ONLY" label to weight goals section
- [ ] **#3** Code: Fix VO2 Max age bounds
- [ ] **#14** Code: Add null checks to auto-populate
- [ ] **#4** Code: Improve metabolic age formula
- [ ] **#10** Docs: Update COMPREHENSIVE_ONBOARDING_PLAN.md naming

---

## 📝 NEXT STEPS FOR NEW CHAT

**Start with**: "I have the ONBOARDING_AUDIT_COMPLETE.md file. Let's fix the issues in priority order starting with Phase 1 (Critical issues #8, #1, #2, #13)."

**Context Needed**: This file + codebase (no additional explanation required)

**Testing After Each Fix**:
1. Database changes: Test with actual data insertion
2. Formula changes: Test with your stats (Male, 172cm, 86kg, age)
3. UI changes: Verify all sections render correctly

---

**END OF AUDIT REPORT**
