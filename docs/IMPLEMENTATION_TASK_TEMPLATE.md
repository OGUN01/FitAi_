# 🛠️ VALIDATION SYSTEM - IMPLEMENTATION TASK TEMPLATE

**Parent Document:** `VALIDATION_SYSTEM_COMPLETE.md`  
**Purpose:** Step-by-step implementation guide with EXACTLY what to change and where  
**Approach:** Research → Understand → Implement (for each task)

---

## 📋 IMPLEMENTATION PHILOSOPHY

For **EVERY task**, follow this 3-step process:

### Step 1: GET DETAILS 🔍
- Read relevant existing code
- Understand current implementation
- Identify exact files/lines to change

### Step 2: SEARCH & VERIFY ✅
- Search for latest best practices
- Verify approach is correct
- Check for edge cases

### Step 3: IMPLEMENT PRECISELY 🎯
- Make exact changes
- Test the change
- Verify no regressions

**NEVER skip any step. Be 100% confident before changing code.**

---

## 🗺️ TASK BREAKDOWN

### PHASE 1: Database & Type Updates

#### Task 1.1: Add Occupation to Personal Info

**Files to Change:**
1. `src/types/onboarding.ts` - PersonalInfoData interface
2. `src/types/onboarding.ts` - ProfilesRow interface
3. Database migration (create new migration file)
4. `src/screens/onboarding/tabs/PersonalInfoTab.tsx` - Add UI field

**Exact Changes:**

**File 1:** `src/types/onboarding.ts`
```typescript
// Line ~7-30 - PersonalInfoData interface
// SEARCH FOR: sleep_time: string;
// ADD AFTER:
  
  // Occupation (for activity level guidance)
  occupation_type: 'desk_job' | 'light_active' | 'moderate_active' | 'heavy_labor' | 'very_active';
```

```typescript
// Line ~347-366 - ProfilesRow interface  
// SEARCH FOR: sleep_time?: string;
// ADD AFTER:
  
  occupation_type?: 'desk_job' | 'light_active' | 'moderate_active' | 'heavy_labor' | 'very_active';
```

**File 2:** Create `database_migrations/add_occupation_field.sql`
```sql
-- Add occupation_type column to profiles table
ALTER TABLE profiles
ADD COLUMN occupation_type TEXT
CHECK (occupation_type IN ('desk_job', 'light_active', 'moderate_active', 'heavy_labor', 'very_active'));

-- Add comment
COMMENT ON COLUMN profiles.occupation_type IS 'User occupation type for NEAT calculation and activity level guidance';
```

**File 3:** `src/screens/onboarding/tabs/PersonalInfoTab.tsx`

**Research First:**
- [ ] Read PersonalInfoTab.tsx completely
- [ ] Find where sleep_time field is rendered
- [ ] Understand form state management pattern
- [ ] Check validation rules

**Then Add:**
```typescript
// After sleep section, add Occupation section
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Daily Activity</Text>
  <Text style={styles.sectionSubtitle}>
    This helps us understand your daily movement beyond exercise
  </Text>
  
  <Picker
    label="Occupation Type"
    value={formData.occupation_type}
    onValueChange={(value) => updateField('occupation_type', value)}
    items={[
      { 
        label: 'Desk Job (office worker, programmer, student)', 
        value: 'desk_job' 
      },
      { 
        label: 'Light Activity (teacher, retail, light housework)', 
        value: 'light_active' 
      },
      { 
        label: 'Moderate Activity (nurse, server, active parent)', 
        value: 'moderate_active' 
      },
      { 
        label: 'Heavy Labor (construction, farming, warehouse)', 
        value: 'heavy_labor' 
      },
      { 
        label: 'Very Active (athlete, trainer, manual labor)', 
        value: 'very_active' 
      }
    ]}
  />
</View>
```

**Validation:**
```typescript
// Add to validation rules
if (!formData.occupation_type) {
  errors.occupation_type = 'Please select your occupation type';
}
```

---

#### Task 1.2: Add Pregnancy/Breastfeeding to Body Analysis

**Files to Change:**
1. `src/types/onboarding.ts` - BodyAnalysisData interface
2. `src/types/onboarding.ts` - BodyAnalysisRow interface
3. Database migration
4. `src/screens/onboarding/tabs/BodyAnalysisTab.tsx` - Add UI fields

**Exact Changes:**

**File 1:** `src/types/onboarding.ts`
```typescript
// Line ~136-140 - BodyAnalysisData interface
// SEARCH FOR: physical_limitations: string[];
// ADD AFTER:
  
  // Pregnancy/Breastfeeding status (CRITICAL for safety)
  pregnancy_status: boolean;
  pregnancy_trimester?: 1 | 2 | 3;  // Only if pregnancy_status = true
  breastfeeding_status: boolean;
```

**File 2:** Database Migration
```sql
-- Add pregnancy and breastfeeding columns to body_analysis table
ALTER TABLE body_analysis
ADD COLUMN pregnancy_status BOOLEAN DEFAULT false,
ADD COLUMN pregnancy_trimester INTEGER CHECK (pregnancy_trimester IN (1, 2, 3)),
ADD COLUMN breastfeeding_status BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN body_analysis.pregnancy_status IS 'Whether user is currently pregnant (blocks calorie deficit)';
COMMENT ON COLUMN body_analysis.pregnancy_trimester IS 'Trimester if pregnant (1, 2, or 3) for calorie adjustments';
COMMENT ON COLUMN body_analysis.breastfeeding_status IS 'Whether user is breastfeeding (requires +500 cal)';
```

**File 3:** `src/screens/onboarding/tabs/BodyAnalysisTab.tsx`

**Research First:**
- [ ] Find medical information section (around line 691)
- [ ] Check how other medical fields are rendered
- [ ] Understand conditional rendering patterns

**Then Add (after medical conditions section):**
```typescript
{/* Women-specific health status */}
{personalInfoData?.gender === 'female' && (
  <View style={styles.medicalField}>
    <Text style={styles.fieldLabel}>Pregnancy & Breastfeeding Status</Text>
    <Text style={styles.fieldHint}>
      Critical for safe calorie recommendations
    </Text>
    
    <Checkbox
      label="Currently Pregnant"
      checked={formData.pregnancy_status}
      onCheck={(checked) => {
        updateField('pregnancy_status', checked);
        if (!checked) updateField('pregnancy_trimester', undefined);
      }}
    />
    
    {formData.pregnancy_status && (
      <Picker
        label="Trimester"
        value={formData.pregnancy_trimester}
        onValueChange={(value) => updateField('pregnancy_trimester', value)}
        items={[
          { label: 'First Trimester (1-13 weeks)', value: 1 },
          { label: 'Second Trimester (14-26 weeks)', value: 2 },
          { label: 'Third Trimester (27-40 weeks)', value: 3 }
        ]}
      />
    )}
    
    <Checkbox
      label="Currently Breastfeeding"
      checked={formData.breastfeeding_status}
      onCheck={(checked) => updateField('breastfeeding_status', checked)}
    />
  </View>
)}
```

---

#### Task 1.3: Add "Weight Gain" to Primary Goals

**Files to Change:**
1. `src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx` - Add to goals list

**Research First:**
- [ ] Find where primary_goals are defined (GOAL_OPTIONS constant)
- [ ] Check icon pattern used

**Then Add:**
```typescript
// In GOAL_OPTIONS array
{ 
  id: 'weight-gain', 
  label: 'Weight Gain', 
  value: 'weight-gain', 
  icon: '📈',
  description: 'Gain healthy weight (muscle and mass)'
}
```

---

### PHASE 2: Calculation Engine Updates

#### Task 2.1: Fix TDEE Calculation (Remove Stacking)

**File:** `src/utils/healthCalculations.ts`

**Research First:**
- [ ] Read current `calculateTDEE()` function (around line 36-45)
- [ ] Check where it's called from
- [ ] Verify parameters passed

**Current Code (FIND):**
```typescript
static calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    extreme: 1.9
  };
  return bmr * (multipliers[activityLevel] || 1.55);
}
```

**Keep As-Is** ✅ (Already correct - single multiplier, no stacking)

---

#### Task 2.2: Add Occupation Validation Function

**File:** `src/utils/healthCalculations.ts`

**Add NEW function:**
```typescript
/**
 * Validate that selected activity level matches occupation requirements
 */
static validateActivityForOccupation(
  occupation: string,
  selectedActivity: string
): { isValid: boolean, minimumRequired?: string, message?: string } {
  
  const OCCUPATION_MIN_ACTIVITY = {
    desk_job: null,
    light_active: 'light',
    moderate_active: 'moderate',
    heavy_labor: 'active',
    very_active: 'extreme'
  };
  
  const minRequired = OCCUPATION_MIN_ACTIVITY[occupation];
  if (!minRequired) return { isValid: true };
  
  const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'extreme'];
  const minIndex = activityLevels.indexOf(minRequired);
  const selectedIndex = activityLevels.indexOf(selectedActivity);
  
  if (selectedIndex < minIndex) {
    return {
      isValid: false,
      minimumRequired: minRequired,
      message: `Your occupation (${occupation}) requires at least "${minRequired}" activity level. Please adjust.`
    };
  }
  
  return { isValid: true };
}
```

**Use in WorkoutPreferencesTab:**
```typescript
// When user selects activity_level, validate against occupation
const validation = MetabolicCalculations.validateActivityForOccupation(
  personalInfo.occupation_type,
  selectedActivityLevel
);

if (!validation.isValid) {
  showError(validation.message);
}
```

---

#### Task 2.3: Add Intensity Auto-Calculation

**File:** `src/utils/healthCalculations.ts`

**Add NEW class method:**
```typescript
/**
 * Calculate recommended intensity based on experience and fitness tests
 * Returns recommendation + reasoning (user can override)
 */
static calculateRecommendedIntensity(
  workoutExperience: number,
  canDoPushups: number,
  canRunMinutes: number,
  age: number,
  gender: string
): { recommendedIntensity: 'beginner' | 'intermediate' | 'advanced', reasoning: string } {
  
  // Primary factor: Experience (most reliable)
  if (workoutExperience >= 3) {
    return {
      recommendedIntensity: 'advanced',
      reasoning: '3+ years training experience indicates advanced level'
    };
  }
  
  if (workoutExperience < 1) {
    return {
      recommendedIntensity: 'beginner',
      reasoning: 'Less than 1 year experience - starting with beginner intensity for safety'
    };
  }
  
  // For 1-3 years experience, use fitness assessment
  const pushupThreshold = gender === 'male' ?
    (age < 40 ? 25 : 20) :
    (age < 40 ? 15 : 10);
  
  const runThreshold = 15;  // 15 minutes continuous run
  
  const meetsStrengthStandard = canDoPushups >= pushupThreshold;
  const meetsCardioStandard = canRunMinutes >= runThreshold;
  
  if (meetsStrengthStandard && meetsCardioStandard) {
    return {
      recommendedIntensity: 'advanced',
      reasoning: 'Strong fitness test results indicate advanced level capability'
    };
  }
  
  if (meetsStrengthStandard || meetsCardioStandard) {
    return {
      recommendedIntensity: 'intermediate',
      reasoning: '1-3 years experience with solid fitness test results'
    };
  }
  
  return {
    recommendedIntensity: 'beginner',
    reasoning: 'Building foundation strength and cardio base recommended'
  };
}
```

**Use in WorkoutPreferencesTab:**
```typescript
// After user enters fitness tests, auto-calculate intensity
useEffect(() => {
  if (formData.workout_experience_years !== undefined && 
      formData.can_do_pushups !== undefined && 
      formData.can_run_minutes !== undefined) {
    
    const { recommendedIntensity, reasoning } = 
      MetabolicCalculations.calculateRecommendedIntensity(
        formData.workout_experience_years,
        formData.can_do_pushups,
        formData.can_run_minutes,
        personalInfo.age,
        personalInfo.gender
      );
    
    // Set as default, but user can change
    setFormData(prev => ({
      ...prev,
      intensity: recommendedIntensity
    }));
    
    // Show reasoning to user
    setIntensityRecommendation(reasoning);
  }
}, [formData.workout_experience_years, formData.can_do_pushups, formData.can_run_minutes]);

// UI: Show recommendation with override option
<View>
  <Text>Recommended Intensity: {recommendedIntensity}</Text>
  <Text style={styles.hint}>{reasoning}</Text>
  <Text style={styles.hint}>You can change this if you prefer</Text>
  
  <Picker
    value={formData.intensity}
    onValueChange={(value) => updateField('intensity', value)}
    items={[
      { label: 'Beginner', value: 'beginner' },
      { label: 'Intermediate', value: 'intermediate' },
      { label: 'Advanced', value: 'advanced' }
    ]}
  />
</View>
```

---

#### Task 2.4: Add Medical Condition Adjustment Logic

**File:** `src/utils/healthCalculations.ts`

**Add NEW class method:**
```typescript
/**
 * Apply medical condition adjustments (NO STACKING - most impactful only)
 */
static applyMedicalAdjustments(
  tdee: number,
  macros: { protein: number, carbs: number, fat: number },
  medicalConditions: string[]
): {
  adjustedTDEE: number,
  adjustedMacros: { protein: number, carbs: number, fat: number },
  notes: string[]
} {
  
  let adjustedTDEE = tdee;
  let adjustedMacros = { ...macros };
  const notes: string[] = [];
  
  // 1. METABOLIC conditions (affects TDEE)
  if (medicalConditions.includes('hypothyroid') || medicalConditions.includes('thyroid')) {
    adjustedTDEE = tdee * 0.90;
    notes.push('⚠️ TDEE reduced 10% due to thyroid disorder');
    notes.push('💊 Consider thyroid medication optimization with doctor');
  }
  
  // 2. INSULIN RESISTANCE conditions (affects macros)
  const hasInsulinResistance = 
    medicalConditions.includes('pcos') || 
    medicalConditions.includes('diabetes-type2') ||
    medicalConditions.includes('diabetes-type1');
  
  if (hasInsulinResistance) {
    const originalCarbs = adjustedMacros.carbs;
    adjustedMacros.carbs = Math.round(originalCarbs * 0.75);  // -25% carbs
    const carbsRemoved = originalCarbs - adjustedMacros.carbs;
    adjustedMacros.fat = Math.round(adjustedMacros.fat + (carbsRemoved * 4 / 9));
    
    if (medicalConditions.includes('pcos')) {
      notes.push('⚠️ Lower carb (75%) for PCOS insulin resistance');
    }
    if (medicalConditions.includes('diabetes-type1') || medicalConditions.includes('diabetes-type2')) {
      notes.push('⚠️ Lower carb (75%) for blood sugar management');
      notes.push('🩺 Monitor glucose regularly, adjust insulin with doctor');
    }
  }
  
  // 3. CARDIOVASCULAR conditions (warnings only, no calc changes)
  if (medicalConditions.includes('hypertension') || medicalConditions.includes('heart-disease')) {
    notes.push('⚠️ Limit high-intensity exercise without medical clearance');
    notes.push('🩺 Monitor blood pressure regularly');
  }
  
  // 4. Safety caps
  adjustedTDEE = Math.max(adjustedTDEE, tdee * 0.85);  // Never reduce more than 15%
  adjustedMacros.carbs = Math.max(adjustedMacros.carbs, macros.carbs * 0.70);  // Never reduce more than 30%
  
  return { adjustedTDEE, adjustedMacros, notes };
}
```

---

#### Task 2.5: Add Refeed & Diet Break Calculator

**File:** `src/utils/healthCalculations.ts`

**Add NEW class method:**
```typescript
/**
 * Calculate refeed and diet break schedule for long diets
 */
static calculateRefeedSchedule(
  timelineWeeks: number,
  deficitPercent: number,
  goalType: string
): {
  needsRefeeds: boolean,
  refeedFrequency?: 'weekly',
  needsDietBreak: boolean,
  dietBreakWeek?: number,
  explanation: string[]
} {
  
  const needsRefeeds = timelineWeeks >= 12 && deficitPercent >= 0.20 && goalType === 'weight-loss';
  const needsDietBreak = timelineWeeks >= 16 && goalType === 'weight-loss';
  
  const explanation: string[] = [];
  
  if (needsRefeeds) {
    explanation.push('📅 WEEKLY REFEED DAYS PLANNED');
    explanation.push('• One day per week: Eat at maintenance calories');
    explanation.push('• Increase carbs by 100-150g on refeed days');
    explanation.push('• Keep protein same, reduce fat slightly');
    explanation.push('• Benefits: Prevents metabolic adaptation, restores leptin');
  }
  
  if (needsDietBreak) {
    const breakWeek = Math.floor(timelineWeeks / 2);
    explanation.push('');
    explanation.push('🔄 DIET BREAK SCHEDULED');
    explanation.push(`• Week ${breakWeek}: Full week at maintenance calories`);
    explanation.push('• Benefits: Metabolic reset, prevents plateaus');
  }
  
  return {
    needsRefeeds,
    refeedFrequency: needsRefeeds ? 'weekly' : undefined,
    needsDietBreak,
    dietBreakWeek: needsDietBreak ? Math.floor(timelineWeeks / 2) : undefined,
    explanation
  };
}
```

---

### PHASE 3: Validation Engine (NEW FILE)

#### Task 3.1: Create Validation Engine Service

**File:** Create `src/services/validationEngine.ts`

**Complete File Structure:**
```typescript
import { 
  PersonalInfoData, 
  DietPreferencesData, 
  BodyAnalysisData, 
  WorkoutPreferencesData 
} from '../types/onboarding';
import { MetabolicCalculations } from '../utils/healthCalculations';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  status: 'OK' | 'WARNING' | 'BLOCKED';
  code?: string;
  message?: string;
  recommendations?: string[];
  alternatives?: any[];
  impact?: string;
  risks?: string[];
  canProceed?: boolean;
}

export interface ValidationResults {
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  canProceed: boolean;
  calculatedMetrics: {
    bmr: number;
    tdee: number;
    targetCalories: number;
    weeklyRate: number;
    protein: number;
    carbs: number;
    fat: number;
    timeline: number;
  };
  adjustments?: {
    refeedSchedule?: any;
    medicalNotes?: string[];
  };
}

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

export class ValidationEngine {
  
  /**
   * Main validation function - validates entire onboarding data
   */
  static validateUserPlan(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData
  ): ValidationResults {
    
    const errors: ValidationResult[] = [];
    const warnings: ValidationResult[] = [];
    
    // STEP 1: Calculate base metrics
    const bmr = MetabolicCalculations.calculateBMR(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm,
      personalInfo.age,
      personalInfo.gender
    );
    
    const tdee = MetabolicCalculations.calculateTDEE(
      bmr,
      workoutPreferences.activity_level
    );
    
    // STEP 2: Determine goal direction
    const isWeightLoss = bodyAnalysis.current_weight_kg > bodyAnalysis.target_weight_kg;
    const isWeightGain = bodyAnalysis.current_weight_kg < bodyAnalysis.target_weight_kg;
    
    // STEP 3: Calculate required weekly rate
    const weightDifference = Math.abs(bodyAnalysis.target_weight_kg - bodyAnalysis.current_weight_kg);
    const requiredWeeklyRate = weightDifference / bodyAnalysis.target_timeline_weeks;
    
    // STEP 4: Calculate target calories
    let targetCalories: number;
    let weeklyRate: number;
    
    if (isWeightLoss) {
      const dailyDeficit = (requiredWeeklyRate * 7700) / 7;
      targetCalories = tdee - dailyDeficit;
      weeklyRate = requiredWeeklyRate;
    } else if (isWeightGain) {
      const dailySurplus = (requiredWeeklyRate * 7700) / 7;
      targetCalories = tdee + dailySurplus;
      weeklyRate = requiredWeeklyRate;
    } else {
      targetCalories = tdee;
      weeklyRate = 0;
    }
    
    // STEP 5: Run all blocking validations
    if (isWeightLoss) {
      const bmrCheck = this.validateBMRSafety(targetCalories, bmr);
      if (bmrCheck.status === 'BLOCKED') errors.push(bmrCheck);
      
      const minCheck = this.validateAbsoluteMinimum(targetCalories, personalInfo.gender);
      if (minCheck.status === 'BLOCKED') errors.push(minCheck);
      
      const timelineCheck = this.validateTimeline(
        bodyAnalysis.current_weight_kg,
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.target_timeline_weeks
      );
      if (timelineCheck.status === 'BLOCKED') errors.push(timelineCheck);
    }
    
    const pregnancyCheck = this.validatePregnancyBreastfeeding(
      bodyAnalysis.pregnancy_status,
      bodyAnalysis.breastfeeding_status,
      targetCalories,
      tdee
    );
    if (pregnancyCheck.status === 'BLOCKED') errors.push(pregnancyCheck);
    
    const goalCheck = this.validateGoalConflict(workoutPreferences.primary_goals);
    if (goalCheck.status === 'BLOCKED') errors.push(goalCheck);
    
    // STEP 6: If no errors, check warnings
    if (errors.length === 0) {
      // Sleep warning
      const sleepHours = this.calculateSleepDuration(
        personalInfo.wake_time,
        personalInfo.sleep_time
      );
      const sleepWarn = this.warnLowSleep(sleepHours);
      if (sleepWarn.status === 'WARNING') warnings.push(sleepWarn);
      
      // Medical warnings
      const medicalWarn = this.warnMedicalConditions(
        bodyAnalysis.medical_conditions,
        requiredWeeklyRate > (bodyAnalysis.current_weight_kg * 0.0075)
      );
      if (medicalWarn.status === 'WARNING') warnings.push(medicalWarn);
      
      // Body recomp warning/info
      const recompWarn = this.warnBodyRecomp(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
        bodyAnalysis.body_fat_percentage
      );
      if (recompWarn.status !== 'OK') warnings.push(recompWarn);
      
      // Substance warnings
      const substanceWarns = this.warnSubstanceImpact(
        dietPreferences.drinks_alcohol,
        dietPreferences.smokes_tobacco,
        requiredWeeklyRate > (bodyAnalysis.current_weight_kg * 0.0075)
      );
      warnings.push(...substanceWarns);
    }
    
    // STEP 7: Calculate final macros
    const proteinGoal = isWeightLoss ? 'cutting' : 
                       (isWeightGain ? 'bulking' : 'maintenance');
    const protein = this.calculateProtein(bodyAnalysis.current_weight_kg, proteinGoal);
    const macros = this.calculateMacros(
      targetCalories,
      protein,
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.intensity
    );
    
    // STEP 8: Apply medical adjustments if needed
    const { adjustedTDEE, adjustedMacros, notes } = 
      this.applyMedicalAdjustments(tdee, macros, bodyAnalysis.medical_conditions);
    
    // STEP 9: Calculate refeed schedule
    const deficitPercent = isWeightLoss ? ((tdee - targetCalories) / tdee) : 0;
    const refeedSchedule = this.calculateRefeedSchedule(
      bodyAnalysis.target_timeline_weeks,
      deficitPercent,
      isWeightLoss ? 'weight-loss' : (isWeightGain ? 'weight-gain' : 'maintenance')
    );
    
    return {
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
      calculatedMetrics: {
        bmr: Math.round(bmr),
        tdee: Math.round(adjustedTDEE || tdee),
        targetCalories: Math.round(targetCalories),
        weeklyRate: Math.round(weeklyRate * 100) / 100,
        protein: adjustedMacros.protein,
        carbs: adjustedMacros.carbs,
        fat: adjustedMacros.fat,
        timeline: bodyAnalysis.target_timeline_weeks
      },
      adjustments: {
        refeedSchedule: refeedSchedule.needsRefeeds || refeedSchedule.needsDietBreak ? refeedSchedule : undefined,
        medicalNotes: notes.length > 0 ? notes : undefined
      }
    };
  }
  
  // ========================================================================
  // BLOCKING VALIDATIONS
  // ========================================================================
  
  private static validateBMRSafety(targetCalories: number, bmr: number): ValidationResult {
    if (targetCalories < bmr) {
      return {
        status: 'BLOCKED',
        code: 'BELOW_BMR',
        message: `Target calories (${Math.round(targetCalories)}) is below your BMR (${Math.round(bmr)})`,
        recommendations: [
          'Extend timeline to increase daily calories',
          'Increase workout frequency to burn more calories',
          'Accept slower, healthier weight loss rate'
        ]
      };
    }
    return { status: 'OK' };
  }
  
  private static validateAbsoluteMinimum(targetCalories: number, gender: string): ValidationResult {
    const absoluteMin = gender === 'female' ? 1200 : 1500;
    if (targetCalories < absoluteMin) {
      return {
        status: 'BLOCKED',
        code: 'BELOW_ABSOLUTE_MINIMUM',
        message: `Target (${Math.round(targetCalories)}) is below safe minimum (${absoluteMin} cal)`,
        recommendations: ['Extend timeline or reduce deficit']
      };
    }
    return { status: 'OK' };
  }
  
  private static validateTimeline(
    currentWeight: number,
    targetWeight: number,
    timelineWeeks: number
  ): ValidationResult {
    
    const weightDifference = Math.abs(targetWeight - currentWeight);
    const requiredWeeklyRate = weightDifference / timelineWeeks;
    const extremeLimit = currentWeight * 0.015;  // 1.5%
    
    if (requiredWeeklyRate > extremeLimit) {
      const safeWeeks = Math.ceil(weightDifference / (currentWeight * 0.0075));
      return {
        status: 'BLOCKED',
        code: 'EXTREMELY_UNREALISTIC',
        message: `Rate ${requiredWeeklyRate.toFixed(2)}kg/week is dangerous`,
        alternatives: [
          {
            option: 'extend_timeline',
            newWeeks: safeWeeks,
            description: `Extend to ${safeWeeks} weeks (safe rate)`
          }
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
  private static validatePregnancyBreastfeeding(
    pregnancy: boolean,
    breastfeeding: boolean,
    targetCalories: number,
    tdee: number
  ): ValidationResult {
    
    if ((pregnancy || breastfeeding) && targetCalories < tdee) {
      return {
        status: 'BLOCKED',
        code: 'UNSAFE_PREGNANCY_BREASTFEEDING',
        message: 'Weight loss during pregnancy/breastfeeding is not safe',
        recommendations: [
          'Switched to maintenance or surplus calories',
          'Focus on nutrient-dense foods',
          'Consult doctor before any dietary changes'
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
  private static validateGoalConflict(primaryGoals: string[]): ValidationResult {
    const hasWeightLoss = primaryGoals.includes('weight-loss');
    const hasWeightGain = primaryGoals.includes('weight-gain');
    
    if (hasWeightLoss && hasWeightGain) {
      return {
        status: 'BLOCKED',
        code: 'CONFLICTING_GOALS',
        message: 'Cannot lose weight and gain weight simultaneously',
        recommendations: ['Choose your primary goal: weight loss OR weight gain']
      };
    }
    
    return { status: 'OK' };
  }
  
  // ========================================================================
  // WARNING VALIDATIONS
  // ========================================================================
  
  private static warnLowSleep(sleepHours: number): ValidationResult {
    if (sleepHours < 7) {
      const impactPercent = Math.round((7 - sleepHours) * 10);
      return {
        status: 'WARNING',
        code: 'INSUFFICIENT_SLEEP',
        message: `Sleep ${sleepHours}hrs/night. Optimal: 7-9hrs`,
        impact: `Fat loss ~${impactPercent}% slower`,
        risks: [
          'Increased hunger hormones',
          'Decreased satiety hormones',
          'Elevated cortisol',
          'Poor recovery'
        ],
        canProceed: true
      };
    }
    return { status: 'OK' };
  }
  
  private static warnMedicalConditions(conditions: string[], aggressive: boolean): ValidationResult {
    const HIGH_RISK = ['diabetes-type1', 'diabetes-type2', 'heart-disease', 'hypertension'];
    const hasHighRisk = conditions.some(c => HIGH_RISK.includes(c));
    
    if (hasHighRisk && aggressive) {
      return {
        status: 'WARNING',
        code: 'MEDICAL_SUPERVISION',
        message: `Medical condition detected: ${conditions.filter(c => HIGH_RISK.includes(c)).join(', ')}`,
        recommendations: [
          '🩺 Consult doctor before starting',
          'Using conservative deficit (15% max)',
          'Monitor health markers regularly'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnBodyRecomp(
    goals: string[],
    experience: number,
    bodyFat?: number
  ): ValidationResult {
    
    const wantsMusclePlusFatLoss = 
      goals.includes('muscle-gain') && goals.includes('weight-loss');
    
    if (!wantsMusclePlusFatLoss) return { status: 'OK' };
    
    const isNovice = experience < 2;
    const isOverweight = bodyFat ? (bodyFat > 20) : false;  // Simplified
    
    if (isNovice || isOverweight) {
      return {
        status: 'INFO',
        code: 'BODY_RECOMP_POSSIBLE',
        message: 'Body recomposition is possible!',
        recommendations: [
          'Eat at maintenance calories',
          'Very high protein (2.4g/kg)',
          'Progressive strength training 4-5x/week',
          'Expect: Slow fat loss + muscle gains'
        ],
        canProceed: true
      };
    } else {
      return {
        status: 'WARNING',
        code: 'BODY_RECOMP_SLOW',
        message: 'Body recomposition will be very slow',
        recommendations: [
          'Recommend: Cut to goal weight first, then bulk',
          'Or: Accept very slow progress with recomp'
        ],
        canProceed: true
      };
    }
  }
  
  private static warnSubstanceImpact(
    alcohol: boolean,
    tobacco: boolean,
    aggressive: boolean
  ): ValidationResult[] {
    
    const warnings: ValidationResult[] = [];
    
    if (alcohol && aggressive) {
      warnings.push({
        status: 'WARNING',
        code: 'ALCOHOL_IMPACT',
        message: 'Alcohol will slow progress 10-15%',
        recommendations: ['Limit to 1-2 drinks/week maximum'],
        canProceed: true
      });
    }
    
    if (tobacco) {
      warnings.push({
        status: 'WARNING',
        code: 'TOBACCO_IMPACT',
        message: 'Smoking reduces cardio capacity ~20-30%',
        recommendations: [
          'Consider quitting',
          'Start with lower-intensity cardio'
        ],
        canProceed: true
      });
    }
    
    return warnings;
  }
  
  // Helper method
  private static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    const [sleepH, sleepM] = sleepTime.split(':').map(Number);
    
    const wakeMinutes = wakeH * 60 + wakeM;
    const sleepMinutes = sleepH * 60 + sleepM;
    
    let durationMinutes = wakeMinutes - sleepMinutes;
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    
    return durationMinutes / 60;
  }
}
```

---

### PHASE 4: Review Tab Integration

#### Task 4.1: Update AdvancedReviewTab to Use Validation Engine

**File:** `src/screens/onboarding/tabs/AdvancedReviewTab.tsx`

**Research First:**
- [ ] Read current AdvancedReviewTab implementation
- [ ] Find where `performCalculations()` is called (line ~83)
- [ ] Understand state management

**Change the calculation logic:**

```typescript
// FIND: performCalculations function (around line 83)
// REPLACE WITH:

const performCalculations = async () => {
  setIsCalculating(true);
  setCalculationError(null);
  
  try {
    if (!personalInfo || !dietPreferences || !bodyAnalysis || !workoutPreferences) {
      throw new Error('Missing required data');
    }
    
    // Use ValidationEngine instead of HealthCalculationEngine
    const validationResults = ValidationEngine.validateUserPlan(
      personalInfo,
      dietPreferences,
      bodyAnalysis,
      workoutPreferences
    );
    
    setCalculatedData(validationResults.calculatedMetrics);
    setValidationResults(validationResults);  // NEW state
    
    // Auto-save to database
    await onUpdate(validationResults.calculatedMetrics);
    
  } catch (error) {
    console.error('Calculation error:', error);
    setCalculationError(error.message);
  } finally {
    setIsCalculating(false);
  }
};
```

**Add NEW state:**
```typescript
const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
```

**Update UI to show errors/warnings:**
```typescript
return (
  <ScrollView>
    {/* Errors Section */}
    {validationResults?.hasErrors && (
      <ErrorCard 
        errors={validationResults.errors}
        onAdjust={(option) => handleAdjustment(option)}
      />
    )}
    
    {/* Warnings Section */}
    {validationResults?.hasWarnings && (
      <WarningCard warnings={validationResults.warnings} />
    )}
    
    {/* Metrics Section */}
    {calculatedData && (
      <MetricsDisplay data={calculatedData} />
    )}
    
    {/* Generate Plan Button */}
    <Button
      disabled={!validationResults?.canProceed}
      onPress={handleGeneratePlan}
    >
      {validationResults?.canProceed ? 
        'Generate My Personalized Plan' : 
        'Fix Issues to Continue'}
    </Button>
  </ScrollView>
);
```

---

### PHASE 5: UI Components

#### Task 5.1: Create ErrorCard Component

**File:** Create `src/components/onboarding/ErrorCard.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from '../ui';
import { ValidationResult } from '../../services/validationEngine';

interface ErrorCardProps {
  errors: ValidationResult[];
  onAdjust: (alternative: any) => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ errors, onAdjust }) => {
  return (
    <Card style={{ backgroundColor: '#FEE', borderColor: '#F00' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#C00' }}>
        ⛔ Action Required
      </Text>
      
      {errors.map((error, index) => (
        <View key={index} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#900' }}>
            {error.message}
          </Text>
          
          {error.recommendations && (
            <View style={{ marginTop: 8 }}>
              {error.recommendations.map((rec, i) => (
                <Text key={i} style={{ color: '#666', marginTop: 4 }}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
          
          {error.alternatives && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '600', marginBottom: 8 }}>
                Choose an option:
              </Text>
              {error.alternatives.map((alt, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => onAdjust(alt)}
                  style={styles.alternativeButton}
                >
                  <Text>{alt.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </Card>
  );
};
```

---

#### Task 5.2: Create WarningCard Component

**File:** Create `src/components/onboarding/WarningCard.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Card, Checkbox } from '../ui';
import { ValidationResult } from '../../services/validationEngine';

interface WarningCardProps {
  warnings: ValidationResult[];
}

export const WarningCard: React.FC<WarningCardProps> = ({ warnings }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  
  return (
    <Card style={{ backgroundColor: '#FFC', borderColor: '#F90' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#C60' }}>
        ⚠️ Important Considerations
      </Text>
      
      {warnings.map((warning, index) => (
        <View key={index} style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#963' }}>
            {warning.message}
          </Text>
          
          {warning.impact && (
            <Text style={{ color: '#666', marginTop: 4, fontStyle: 'italic' }}>
              Impact: {warning.impact}
            </Text>
          )}
          
          {warning.recommendations && (
            <View style={{ marginTop: 8 }}>
              {warning.recommendations.map((rec, i) => (
                <Text key={i} style={{ color: '#666', marginTop: 4 }}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
      
      <Checkbox
        label="I understand these considerations and want to proceed"
        checked={acknowledged}
        onCheck={setAcknowledged}
        style={{ marginTop: 16 }}
      />
    </Card>
  );
};
```

---

### PHASE 6: Database Schema Changes

**Create Migration File:** `database_migrations/add_validation_system_fields.sql`

```sql
-- ============================================================================
-- VALIDATION SYSTEM: Add missing fields
-- ============================================================================

-- 1. Add occupation_type to profiles
ALTER TABLE profiles
ADD COLUMN occupation_type TEXT
CHECK (occupation_type IN ('desk_job', 'light_active', 'moderate_active', 'heavy_labor', 'very_active'));

COMMENT ON COLUMN profiles.occupation_type IS 'User occupation for activity level guidance (no TDEE stacking)';

-- 2. Add pregnancy/breastfeeding to body_analysis
ALTER TABLE body_analysis
ADD COLUMN pregnancy_status BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN pregnancy_trimester INTEGER CHECK (pregnancy_trimester IN (1, 2, 3)),
ADD COLUMN breastfeeding_status BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN body_analysis.pregnancy_status IS 'Whether user is currently pregnant (blocks deficit)';
COMMENT ON COLUMN body_analysis.pregnancy_trimester IS 'Pregnancy trimester (1-3) for calorie adjustments';
COMMENT ON COLUMN body_analysis.breastfeeding_status IS 'Whether user is breastfeeding (requires +500 cal)';

-- 3. Add validation results storage to advanced_review
ALTER TABLE advanced_review
ADD COLUMN validation_status TEXT CHECK (validation_status IN ('passed', 'warnings', 'blocked')),
ADD COLUMN validation_errors JSONB,
ADD COLUMN validation_warnings JSONB,
ADD COLUMN refeed_schedule JSONB,
ADD COLUMN medical_adjustments TEXT[];

COMMENT ON COLUMN advanced_review.validation_status IS 'Result of validation: passed, warnings, or blocked';
COMMENT ON COLUMN advanced_review.validation_errors IS 'Array of blocking errors if any';
COMMENT ON COLUMN advanced_review.validation_warnings IS 'Array of warnings if any';
COMMENT ON COLUMN advanced_review.refeed_schedule IS 'Refeed and diet break schedule if applicable';
COMMENT ON COLUMN advanced_review.medical_adjustments IS 'Notes about medical condition adjustments';
```

---

## 📊 COMPLETE TASK CHECKLIST

### Database Tasks
- [ ] Task 1.1: Create and run migration for occupation_type
- [ ] Task 1.2: Create and run migration for pregnancy/breastfeeding fields
- [ ] Task 1.3: Create and run migration for validation result storage

### Type Definition Tasks
- [ ] Task 2.1: Update PersonalInfoData with occupation_type
- [ ] Task 2.2: Update ProfilesRow with occupation_type
- [ ] Task 2.3: Update BodyAnalysisData with pregnancy fields
- [ ] Task 2.4: Update BodyAnalysisRow with pregnancy fields
- [ ] Task 2.5: Add 'weight-gain' to primary_goals type
- [ ] Task 2.6: Create ValidationResult and ValidationResults types

### Calculation Engine Tasks
- [ ] Task 3.1: Verify calculateTDEE doesn't stack (should be correct already)
- [ ] Task 3.2: Add validateActivityForOccupation() method
- [ ] Task 3.3: Add calculateRecommendedIntensity() method
- [ ] Task 3.4: Add applyMedicalAdjustments() method
- [ ] Task 3.5: Add calculateRefeedSchedule() method
- [ ] Task 3.6: Add calculatePregnancyCalories() method

### Validation Engine Tasks
- [ ] Task 4.1: Create src/services/validationEngine.ts
- [ ] Task 4.2: Implement ValidationEngine class
- [ ] Task 4.3: Implement all blocking validation methods
- [ ] Task 4.4: Implement all warning validation methods
- [ ] Task 4.5: Implement main validateUserPlan() method

### UI Component Tasks
- [ ] Task 5.1: Update PersonalInfoTab - add occupation field
- [ ] Task 5.2: Update BodyAnalysisTab - add pregnancy/breastfeeding fields
- [ ] Task 5.3: Update WorkoutPreferencesTab - add weight-gain goal
- [ ] Task 5.4: Update WorkoutPreferencesTab - show intensity recommendation
- [ ] Task 5.5: Create ErrorCard component
- [ ] Task 5.6: Create WarningCard component
- [ ] Task 5.7: Update AdvancedReviewTab - integrate ValidationEngine
- [ ] Task 5.8: Create AdjustmentWizard component

### Service Tasks
- [ ] Task 6.1: Update PersonalInfoService to save occupation_type
- [ ] Task 6.2: Update BodyAnalysisService to save pregnancy fields
- [ ] Task 6.3: Update AdvancedReviewService to save validation results

### Testing Tasks
- [ ] Task 7.1: Unit test all validation functions
- [ ] Task 7.2: Integration test full validation flow
- [ ] Task 7.3: Test all blocking scenarios
- [ ] Task 7.4: Test all warning scenarios
- [ ] Task 7.5: Test adjustment wizard flow
- [ ] Task 7.6: Test with real user data scenarios

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

**Week 1: Foundation**
1. Database migrations (Tasks 1.1-1.3)
2. Type definitions (Tasks 2.1-2.6)
3. Calculation engine updates (Tasks 3.1-3.6)

**Week 2: Validation Core**
4. Validation engine (Tasks 4.1-4.5)
5. Unit tests for validation (Task 7.1)

**Week 3: UI Integration**
6. Update onboarding tabs (Tasks 5.1-5.4)
7. Create error/warning cards (Tasks 5.5-5.6)
8. Update review tab (Task 5.7)

**Week 4: Polish & Test**
9. Adjustment wizard (Task 5.8)
10. Service updates (Tasks 6.1-6.3)
11. Integration testing (Tasks 7.2-7.6)

---

## ✅ DEFINITION OF DONE

Each task is complete when:
1. ✅ Code matches specification exactly
2. ✅ TypeScript compiles with no errors
3. ✅ Unit tests pass (if applicable)
4. ✅ Manual testing confirms behavior
5. ✅ Documentation updated (if needed)
6. ✅ Reviewed by second person (you)

---

**END OF IMPLEMENTATION TEMPLATE**

**Next Action:** Review both documents, then start implementation

