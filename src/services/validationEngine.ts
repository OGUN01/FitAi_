// 🎯 VALIDATION & RECOMMENDATION ENGINE
// Complete mathematical validation and safety checking for fitness plans
// Evidence-based formulas, conservative safety margins, 100% deterministic

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
   * Returns comprehensive validation results with errors, warnings, and calculated metrics
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
    
    const bmi = MetabolicCalculations.calculateBMI(
      bodyAnalysis.current_weight_kg,
      bodyAnalysis.height_cm
    );
    
    // Get final body fat percentage using priority logic
    const bodyFatData = MetabolicCalculations.getFinalBodyFatPercentage(
      bodyAnalysis.body_fat_percentage,
      bodyAnalysis.ai_estimated_body_fat,
      bodyAnalysis.ai_confidence_score,
      bmi,
      personalInfo.gender,
      personalInfo.age
    );
    
    // Calculate sleep duration
    const sleepHours = this.calculateSleepDuration(
      personalInfo.wake_time,
      personalInfo.sleep_time
    );
    
    // STEP 2: Calculate TDEE (Occupation-based + Exercise) - NEW APPROACH
    const baseTDEE = MetabolicCalculations.calculateBaseTDEE(bmr, personalInfo.occupation_type);
    const exerciseBurn = MetabolicCalculations.calculateDailyExerciseBurn(
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.time_preference,
      workoutPreferences.intensity,
      bodyAnalysis.current_weight_kg,
      workoutPreferences.workout_types
    );
    let tdee = baseTDEE + exerciseBurn;
    
    // Apply age modifier
    tdee = MetabolicCalculations.applyAgeModifier(tdee, personalInfo.age, personalInfo.gender);
    
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
      const dailyDeficit = (requiredWeeklyRate * 7700) / 7;  // 7700 cal per kg
      const initialTargetCalories = tdee - dailyDeficit;
      
      // Apply deficit limits based on stress level and medical conditions
      const deficitLimitResult = this.applyDeficitLimit(
        initialTargetCalories,
        tdee,
        bmr,
        bodyAnalysis.stress_level || 'moderate',  // Default to moderate if not provided
        bodyAnalysis.medical_conditions.length > 0
      );
      
      targetCalories = deficitLimitResult.adjustedCalories;
      
      // If deficit was limited, add a warning and recalculate weekly rate
      if (deficitLimitResult.wasLimited) {
        const actualDailyDeficit = tdee - targetCalories;
        weeklyRate = (actualDailyDeficit * 7) / 7700;  // Recalculate based on adjusted calories
        
        warnings.push({
          status: 'WARNING',
          code: 'DEFICIT_LIMITED_FOR_SAFETY',
          message: `Calorie deficit reduced from ${Math.round(deficitLimitResult.originalDeficitPercent * 100)}% to ${Math.round(deficitLimitResult.adjustedDeficitPercent * 100)}% due to ${deficitLimitResult.limitReason}`,
          recommendations: [
            `🛡️ Your deficit was capped at ${Math.round(deficitLimitResult.adjustedDeficitPercent * 100)}% for your safety`,
            `Original target: ${Math.round(initialTargetCalories)} cal/day`,
            `Adjusted target: ${Math.round(targetCalories)} cal/day`,
            deficitLimitResult.limitReason === 'high stress level' 
              ? '😰 High stress increases cortisol, making aggressive deficits counterproductive'
              : deficitLimitResult.limitReason === 'medical conditions'
                ? '🩺 Medical conditions require conservative approach'
                : '📊 Deficits over 20% are generally unsafe and unsustainable',
            '💡 This will extend your timeline but protect your health and hormones',
            deficitLimitResult.limitReason === 'high stress level'
              ? '✅ Consider stress management techniques (meditation, sleep, etc.)'
              : deficitLimitResult.limitReason === 'medical conditions'
                ? '✅ Consult your doctor before starting'
                : '✅ Focus on consistency over aggressive timelines'
          ],
          canProceed: true
        });
      } else {
        weeklyRate = requiredWeeklyRate;
      }
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
      // Check body fat first (most critical for weight loss)
      const bodyFatCheck = this.validateMinimumBodyFat(
        bodyAnalysis.body_fat_percentage,
        personalInfo.gender
      );
      if (bodyFatCheck.status === 'BLOCKED') errors.push(bodyFatCheck);
      
      // Check minimum BMI
      const bmiCheck = this.validateMinimumBMI(
        bodyAnalysis.bmi || 0,
        bodyAnalysis.target_weight_kg,
        bodyAnalysis.height_cm
      );
      if (bmiCheck.status === 'BLOCKED') errors.push(bmiCheck);
      
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
      
      // Check insufficient exercise (aggressive goal with < 2 workouts/week)
      const exerciseCheck = this.validateInsufficientExercise(
        workoutPreferences.workout_frequency_per_week,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg,
        tdee,
        bmr
      );
      if (exerciseCheck.status === 'BLOCKED') errors.push(exerciseCheck);
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
    
    const mealsCheck = this.validateMealsEnabled(
      dietPreferences.breakfast_enabled,
      dietPreferences.lunch_enabled,
      dietPreferences.dinner_enabled,
      dietPreferences.snacks_enabled
    );
    if (mealsCheck.status === 'BLOCKED') errors.push(mealsCheck);
    
    const sleepComboCheck = this.validateSleepAggressiveCombo(
      this.calculateSleepDuration(personalInfo.wake_time, personalInfo.sleep_time),
      requiredWeeklyRate,
      bodyAnalysis.current_weight_kg
    );
    if (sleepComboCheck.status === 'BLOCKED') errors.push(sleepComboCheck);
    
    const volumeCheck = this.validateTrainingVolume(
      workoutPreferences.workout_frequency_per_week,
      workoutPreferences.time_preference,
      workoutPreferences.intensity,
      personalInfo.occupation_type
    );
    if (volumeCheck.status === 'BLOCKED') errors.push(volumeCheck);
    
    // STEP 6: If no errors, check warnings
    if (errors.length === 0) {
      const isAggressive = requiredWeeklyRate > (bodyAnalysis.current_weight_kg * 0.0075);
      
      // Warning 1: Aggressive timeline
      if (isWeightLoss || isWeightGain) {
        const timelineWarn = this.warnAggressiveTimeline(requiredWeeklyRate, bodyAnalysis.current_weight_kg);
        if (timelineWarn.status === 'WARNING') warnings.push(timelineWarn);
      }
      
      // Warning 2: Low sleep
      const sleepWarn = this.warnLowSleep(sleepHours);
      if (sleepWarn.status === 'WARNING') warnings.push(sleepWarn);
      
      // Warning 3: Medical conditions
      const medicalWarn = this.warnMedicalConditions(bodyAnalysis.medical_conditions, isAggressive);
      if (medicalWarn.status === 'WARNING') warnings.push(medicalWarn);
      
      // Warning 4: Body recomp
      const recompWarn = this.warnBodyRecomp(
        workoutPreferences.primary_goals,
        workoutPreferences.workout_experience_years,
        bodyFatData.value
      );
      if (recompWarn.status !== 'OK') warnings.push(recompWarn);
      
      // Warning 5: Substances
      const substanceWarns = this.warnSubstanceImpact(
        dietPreferences.drinks_alcohol,
        dietPreferences.smokes_tobacco,
        isAggressive
      );
      warnings.push(...substanceWarns);
      
      // Warning 6: Elderly
      const elderlyWarn = this.warnElderlyUser(personalInfo.age);
      if (elderlyWarn.status === 'WARNING') warnings.push(elderlyWarn);
      
      // Warning 7: Teen athletes
      const teenWarn = this.warnTeenAthlete(personalInfo.age, workoutPreferences.activity_level, isWeightLoss ? 'weight-loss' : 'other');
      if (teenWarn.status === 'WARNING') warnings.push(teenWarn);
      
      // Warning 8: Heart disease
      const heartWarn = this.warnHeartDisease(bodyAnalysis.medical_conditions, workoutPreferences.intensity);
      if (heartWarn.status === 'WARNING') warnings.push(heartWarn);
      
      // Warning 9: Concurrent training interference
      const interferenceWarn = this.warnConcurrentTrainingInterference(workoutPreferences.primary_goals);
      if (interferenceWarn.status === 'WARNING') warnings.push(interferenceWarn);
      
      // Warning 10: Obesity guidance
      const obesityWarn = this.warnObesitySpecialGuidance(bmi, requiredWeeklyRate, bodyAnalysis.current_weight_kg);
      if (obesityWarn.status === 'WARNING') warnings.push(obesityWarn);
      
      // Warning 11: No exercise
      const zeroExerciseWarn = this.warnZeroExercise(workoutPreferences.workout_frequency_per_week, isWeightLoss ? 'weight-loss' : 'other');
      if (zeroExerciseWarn.status === 'WARNING') warnings.push(zeroExerciseWarn);
      
      // Warning 12: High training volume
      const highVolumeWarn = this.warnHighTrainingVolume(
        workoutPreferences.workout_frequency_per_week,
        workoutPreferences.time_preference,
        workoutPreferences.intensity
      );
      if (highVolumeWarn.status === 'WARNING') warnings.push(highVolumeWarn);
      
      // Warning 13: Menopause
      const menopauseWarn = this.warnMenopause(personalInfo.gender, personalInfo.age);
      if (menopauseWarn.status === 'WARNING') warnings.push(menopauseWarn);
      
      // Warning 14: Equipment limitations
      const equipmentWarn = this.warnEquipmentLimitations(
        workoutPreferences.primary_goals,
        workoutPreferences.location,
        workoutPreferences.equipment
      );
      if (equipmentWarn.status === 'WARNING') warnings.push(equipmentWarn);
      
      // Warning 15: Physical limitations
      const limitationsWarn = this.warnPhysicalLimitationsVsIntensity(
        bodyAnalysis.physical_limitations,
        workoutPreferences.intensity
      );
      if (limitationsWarn.status === 'WARNING') warnings.push(limitationsWarn);
      
      // Warning 16: Diet readiness
      const dietReadinessScore = MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
      const readinessWarn = this.warnLowDietReadiness(
        dietReadinessScore,
        requiredWeeklyRate,
        bodyAnalysis.current_weight_kg
      );
      if (readinessWarn.status === 'WARNING') warnings.push(readinessWarn);
      
      // Warning 17: Vegan protein limitations
      const proteinTarget = this.calculateProtein(bodyAnalysis.current_weight_kg, isWeightLoss ? 'cutting' : (isWeightGain ? 'bulking' : 'maintenance'));
      const veganWarn = this.warnVeganProteinLimitations(
        dietPreferences.diet_type,
        dietPreferences.allergies,
        proteinTarget
      );
      if (veganWarn.status === 'WARNING') warnings.push(veganWarn);
      
      // Warning 18: Medication effects
      const medWarn = this.warnMedicationEffects(bodyAnalysis.medications);
      if (medWarn.status === 'WARNING') warnings.push(medWarn);
      
      // Warning 19: Excessive weight gain rate
      if (isWeightGain) {
        const gainWarn = this.warnExcessiveWeightGain(requiredWeeklyRate, bodyAnalysis.current_weight_kg);
        if (gainWarn.status === 'WARNING') warnings.push(gainWarn);
      }
      
      // Warning 20: Multiple bad habits
      const habitsWarn = this.warnMultipleBadHabits(
        sleepHours,
        dietPreferences.smokes_tobacco,
        dietPreferences.drinks_alcohol
      );
      if (habitsWarn.status === 'WARNING') warnings.push(habitsWarn);
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
  
  private static validateMinimumBodyFat(
    bodyFat: number | undefined,
    gender: string
  ): ValidationResult {
    
    // Only check if user has body fat data
    if (!bodyFat) return { status: 'OK' };
    
    const MIN_ESSENTIAL_FAT = gender === 'female' ? 12 : 5;
    
    if (bodyFat <= MIN_ESSENTIAL_FAT) {
      return {
        status: 'BLOCKED',
        code: 'AT_ESSENTIAL_BODY_FAT',
        message: `Body fat (${bodyFat}%) is at essential minimum for ${gender}`,
        recommendations: [
          'Essential fat required for organ function',
          'Hormone production needs minimum fat',
          'Immune system requires fat stores',
          'Switch to maintenance or lean bulk instead'
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
  private static validateMinimumBMI(
    currentBMI: number,
    targetWeight: number,
    height: number
  ): ValidationResult {
    
    // Calculate target BMI
    const heightM = height / 100;
    const targetBMI = targetWeight / (heightM * heightM);
    
    const UNDERWEIGHT_THRESHOLD = 17.5;
    
    if (targetBMI < UNDERWEIGHT_THRESHOLD) {
      const minSafeWeight = 18.5 * heightM * heightM;
      return {
        status: 'BLOCKED',
        code: 'TARGET_BMI_UNDERWEIGHT',
        message: `Target BMI (${targetBMI.toFixed(1)}) is clinically underweight`,
        recommendations: [
          'Minimum safe BMI: 18.5',
          `Minimum safe weight: ${Math.round(minSafeWeight)}kg`,
          'Adjust target weight to healthy range'
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
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
  
  private static validateMealsEnabled(
    breakfast: boolean,
    lunch: boolean,
    dinner: boolean,
    snacks: boolean
  ): ValidationResult {
    
    const anyMealEnabled = breakfast || lunch || dinner || snacks;
    
    if (!anyMealEnabled) {
      return {
        status: 'BLOCKED',
        code: 'NO_MEALS_ENABLED',
        message: 'At least one meal must be enabled to create a meal plan',
        recommendations: [
          'Enable at least breakfast, lunch, or dinner',
          'Meal plans require at least one meal slot'
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
  private static validateSleepAggressiveCombo(
    sleepHours: number,
    weeklyRate: number,
    currentWeight: number
  ): ValidationResult {
    
    const isAggressive = weeklyRate > (currentWeight * 0.0075);
    
    if (sleepHours < 5 && isAggressive) {
      return {
        status: 'BLOCKED',
        code: 'SEVERE_SLEEP_DEPRIVATION',
        message: `Sleep (${sleepHours.toFixed(1)}hrs) + aggressive goal is dangerous`,
        recommendations: [
          'Severe sleep deprivation impairs fat loss by 55%',
          'Dramatically increases muscle loss',
          'Impossible to recover from workouts',
          'Either improve sleep to 6+ hours OR reduce goal aggressiveness'
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
  private static validateTrainingVolume(
    frequency: number,
    duration: number,
    intensity: string,
    occupation: string
  ): ValidationResult {
    
    const totalWeeklyHours = (frequency * duration) / 60;
    const ABSOLUTE_MAX_HOURS = occupation === 'very_active' ? 20 : 15;
    
    if (totalWeeklyHours > ABSOLUTE_MAX_HOURS) {
      return {
        status: 'BLOCKED',
        code: 'EXCESSIVE_TRAINING_VOLUME',
        message: `Training volume (${totalWeeklyHours.toFixed(1)} hrs/week) exceeds safe limits`,
        recommendations: [
          `Maximum safe: ${ABSOLUTE_MAX_HOURS} hours/week for non-athletes`,
          'Risk: Overtraining syndrome, chronic fatigue',
          'Risk: Suppressed immune function, injury',
          'Reduce frequency or session duration'
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
  private static validateInsufficientExercise(
    frequency: number,
    weeklyRate: number,
    currentWeight: number,
    tdee: number,
    bmr: number
  ): ValidationResult {
    
    // Check if rate is aggressive (> 0.75% BW/week)
    const isAggressive = weeklyRate > (currentWeight * 0.0075);
    
    // Calculate what target calories would be
    const dailyDeficit = (weeklyRate * 7700) / 7;
    const targetCalories = tdee - dailyDeficit;
    
    // BLOCK if frequency < 2 AND aggressive goal AND target would be < BMR
    if (frequency < 2 && isAggressive && targetCalories < bmr) {
      return {
        status: 'BLOCKED',
        code: 'INSUFFICIENT_EXERCISE',
        message: `Your aggressive goal with only ${frequency} workout(s)/week requires unsafe calorie restriction`,
        recommendations: [
          `📊 Current plan: ${Math.round(targetCalories)} cal/day (below your BMR of ${Math.round(bmr)})`,
          `🏋️ Increase to at least 3 workouts/week to create deficit via exercise`,
          `⏰ OR: Extend timeline to reduce required daily deficit`,
          `🚶 OR: Add daily walking (10,000 steps = ~300-400 cal/day)`,
          `⚠️ Without more activity, this goal requires starvation-level calories`
        ],
        risks: [
          'Calories below BMR will cause muscle loss',
          'Extreme fatigue and low energy',
          'Hormonal disruption',
          'Unsustainable long-term'
        ]
      };
    }
    
    return { status: 'OK' };
  }
  
  // ========================================================================
  // WARNING VALIDATIONS
  // ========================================================================
  
  private static warnAggressiveTimeline(
    requiredRate: number,
    currentWeight: number
  ): ValidationResult {
    
    const safeMax = currentWeight * 0.01;  // 1% max
    const optimal = currentWeight * 0.0075;  // 0.75% optimal
    
    if (requiredRate > optimal && requiredRate <= safeMax) {
      return {
        status: 'WARNING',
        code: 'AGGRESSIVE_TIMELINE',
        message: `Rate (${requiredRate.toFixed(2)}kg/week) is aggressive`,
        impact: `Recommended: ${optimal.toFixed(2)}kg/week for optimal results`,
        risks: [
          'Increased muscle loss',
          'Metabolic adaptation',
          'Harder to maintain long-term'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnElderlyUser(age: number): ValidationResult {
    
    if (age >= 75) {
      return {
        status: 'WARNING',
        code: 'ELDERLY_USER',
        message: 'Age 75+ requires special considerations for safe exercise',
        recommendations: [
          '🩺 Consult doctor before starting exercise program',
          '💪 Resistance training critical for bone density',
          '⚖️ Balance exercises prevent falls',
          '🧘 Flexibility work for mobility',
          'Protein: 2.0g/kg minimum (sarcopenia prevention)',
          'Intensity: Start beginner, progress slowly'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnTeenAthlete(
    age: number,
    activityLevel: string,
    goalType: string
  ): ValidationResult {
    
    if (age >= 13 && age <= 17 && activityLevel === 'extreme' && goalType === 'weight-loss') {
      return {
        status: 'WARNING',
        code: 'TEEN_ATHLETE_RESTRICTION',
        message: 'Teen athletes should NEVER restrict calories during growth',
        recommendations: [
          'Still growing (growth plates open until ~18)',
          'High energy needs for development',
          'Hormonal development critical',
          'Athletic performance needs fuel',
          'Recommended: Maintenance or surplus calories only'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnZeroExercise(frequency: number, goalType: string): ValidationResult {
    
    if (frequency === 0 && goalType === 'weight-loss') {
      return {
        status: 'WARNING',
        code: 'NO_EXERCISE_PLANNED',
        message: 'No exercise planned - weight loss relies entirely on diet',
        recommendations: [
          'Add at least 2 resistance sessions/week',
          'Benefits: Preserves muscle mass',
          'Benefits: Improves health beyond weight',
          'Benefits: Creates larger calorie deficit',
          'Benefits: Increases metabolism long-term'
        ],
        impact: 'Slower progress, increased muscle loss',
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnHighTrainingVolume(
    frequency: number,
    duration: number,
    intensity: string
  ): ValidationResult {
    
    const totalWeeklyHours = (frequency * duration) / 60;
    
    if (totalWeeklyHours > 12 && intensity === 'advanced') {
      return {
        status: 'WARNING',
        code: 'HIGH_TRAINING_VOLUME',
        message: `High volume (${totalWeeklyHours.toFixed(1)} hrs/week) increases overtraining risk`,
        risks: [
          'Overtraining syndrome',
          'Elevated resting heart rate',
          'Mood disturbances',
          'Performance decline',
          'Injury risk',
          'Immune suppression'
        ],
        recommendations: [
          '😴 Ensure 8-9 hours sleep (critical)',
          '📅 Include 1-2 full rest days',
          '📊 Monitor fatigue and performance',
          '🔄 Consider periodization'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnMenopause(gender: string, age: number): ValidationResult {
    
    if (gender === 'female' && age >= 45 && age <= 55) {
      return {
        status: 'WARNING',
        code: 'MENOPAUSE_AGE_RANGE',
        message: 'Potential perimenopause/menopause - special considerations apply',
        recommendations: [
          'Metabolism may slow by additional 5-10%',
          '💪 Resistance training 3-4×/week (bone density)',
          '🥩 Higher protein (2.0g/kg for muscle preservation)',
          '🧘 Include balance and flexibility work',
          '😴 Prioritize sleep (hormonal changes affect it)',
          'Timeline may need 10-15% longer than younger women'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
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
        status: 'WARNING',
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
  
  private static warnHeartDisease(
    medicalConditions: string[],
    intensity: string
  ): ValidationResult {
    
    if (medicalConditions.includes('heart-disease')) {
      return {
        status: 'WARNING',
        code: 'HEART_DISEASE_CLEARANCE',
        message: 'Heart disease detected - medical clearance REQUIRED before starting',
        recommendations: [
          '🩺 Get doctor approval before beginning exercise',
          'May need cardiac stress test',
          'Start with cardiac rehabilitation if available',
          'Monitor heart rate during all sessions',
          'Stop immediately if chest pain, dizziness, or shortness of breath',
          'Focus on moderate-intensity continuous exercise',
          `Intensity capped at: intermediate (max)`
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnConcurrentTrainingInterference(goals: string[]): ValidationResult {
    
    if (goals.includes('muscle-gain') && goals.includes('endurance')) {
      return {
        status: 'WARNING',
        code: 'CONCURRENT_TRAINING_INTERFERENCE',
        message: 'Cardio + muscle building: Interference effect may slow progress',
        recommendations: [
          '✅ Prioritize ONE goal as primary for faster results',
          '✅ If both: Do strength first, cardio after (same session)',
          '✅ Limit cardio to 2-3 moderate sessions/week (20-30 min)',
          '✅ Ensure calorie surplus if bulking',
          '✅ Consider separating sessions by 6+ hours'
        ],
        impact: 'Optimal: Focus muscle gain first (12 weeks), then endurance (8 weeks)',
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnObesitySpecialGuidance(
    bmi: number,
    weeklyRate: number,
    currentWeight: number
  ): ValidationResult {
    
    if (bmi >= 35) {
      const adjustedMaxRate = currentWeight * 0.015;  // 1.5% vs normal 1%
      return {
        status: 'WARNING',
        code: 'OBESITY_ADJUSTED_RATES',
        message: 'Higher BMI allows for faster initial weight loss',
        recommendations: [
          `Class II obesity (BMI ≥ 35) can tolerate larger deficits safely`,
          `Up to ${adjustedMaxRate.toFixed(2)}kg/week is safe for you`,
          'Rate will naturally slow as you lose weight',
          'Initial rapid loss is mostly water - expect slower after 2-4 weeks',
          'Consider medical supervision for best results'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnEquipmentLimitations(
    goals: string[],
    location: string,
    equipment: string[]
  ): ValidationResult {
    
    if (goals.includes('muscle-gain') && location === 'home' && equipment.length === 0) {
      return {
        status: 'WARNING',
        code: 'LIMITED_EQUIPMENT_MUSCLE_GAIN',
        message: 'Building muscle at home with no equipment is challenging',
        recommendations: [
          'Add basic equipment: Adjustable dumbbells, resistance bands, pull-up bar',
          'OR: Focus on calisthenics progression (slower but effective)',
          'OR: Join gym for optimal muscle building equipment'
        ],
        impact: 'Bodyweight exercises have progression limits',
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnPhysicalLimitationsVsIntensity(
    limitations: string[],
    intensity: string
  ): ValidationResult {
    
    const HIGH_IMPACT = ['knee-issues', 'back-pain', 'arthritis', 'joint-problems'];
    const hasHighImpact = limitations.some(lim => 
      HIGH_IMPACT.some(high => lim.toLowerCase().includes(high))
    );
    
    if (hasHighImpact && intensity === 'advanced') {
      return {
        status: 'WARNING',
        code: 'PHYSICAL_LIMITATION_INTENSITY',
        message: 'Physical limitations detected with high intensity selected',
        recommendations: [
          'Auto-reducing to intermediate intensity for safety',
          'Focus on low-impact exercises',
          'Emphasize proper form over weight/speed',
          'Include mobility and flexibility work',
          'Consider physical therapy assessment'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnLowDietReadiness(
    dietReadinessScore: number,
    weeklyRate: number,
    currentWeight: number
  ): ValidationResult {
    
    const isAggressive = weeklyRate > (currentWeight * 0.0075);
    
    if (dietReadinessScore < 40 && isAggressive) {
      return {
        status: 'WARNING',
        code: 'LOW_DIET_READINESS',
        message: `Low diet readiness score (${dietReadinessScore}/100) with aggressive goal`,
        recommendations: [
          'Current habits indicate low adherence likelihood',
          'Option 1: Habit Building Phase First (4 weeks)',
          'Option 2: Reduce goal aggressiveness',
          'Option 3: Get accountability support (nutritionist/group)',
          `Success prediction: ${dietReadinessScore}% adherence probability`
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnVeganProteinLimitations(
    dietType: string,
    allergies: string[],
    protein: number
  ): ValidationResult {
    
    const VEGAN_SOURCES = ['soy', 'tofu', 'legumes', 'beans', 'nuts', 'peanuts', 'seeds'];
    const hasProteinAllergies = allergies.some(a => 
      VEGAN_SOURCES.some(source => a.toLowerCase().includes(source))
    );
    
    if (dietType === 'vegan' && hasProteinAllergies && protein > 150) {
      return {
        status: 'WARNING',
        code: 'LIMITED_VEGAN_PROTEIN',
        message: 'Limited vegan protein sources due to allergies',
        recommendations: [
          `Target protein (${protein}g) may be difficult - adjusted to ${Math.round(protein * 0.9)}g`,
          '💊 Consider pea/rice protein powder',
          '🌾 Focus on quinoa, hemp, chia',
          '🥦 Combine incomplete proteins',
          '🩺 May need B12, iron, omega-3 supplements'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnMedicationEffects(medications: string[]): ValidationResult {
    
    const METABOLISM_MEDS = ['levothyroxine', 'synthroid', 'antidepressant', 'beta-blocker', 'prednisone', 'insulin'];
    const hasMetabolismMeds = medications.some(med => 
      METABOLISM_MEDS.some(known => med.toLowerCase().includes(known))
    );
    
    if (hasMetabolismMeds) {
      return {
        status: 'WARNING',
        code: 'MEDICATION_EFFECTS',
        message: 'Medications may affect metabolism and weight management',
        recommendations: [
          '💊 Discuss plans with prescribing doctor',
          '📊 Dosages may need adjustment as weight changes',
          '⚖️ Some weight changes may be water weight',
          'Using conservative TDEE estimates to account for variability'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnExcessiveWeightGain(
    weeklyGainRate: number,
    currentWeight: number
  ): ValidationResult {
    
    const maxOptimal = currentWeight * 0.005;  // 0.5% max
    const extremeLimit = currentWeight * 0.01;  // 1% extreme
    
    if (weeklyGainRate > extremeLimit) {
      return {
        status: 'WARNING',
        code: 'EXCESSIVE_GAIN_RATE',
        message: `Gain rate (${weeklyGainRate.toFixed(2)}kg/week) will be mostly fat, not muscle`,
        recommendations: [
          'Novice: Max ~0.5-1kg muscle per MONTH',
          'Intermediate: Max ~0.25-0.5kg muscle per MONTH',
          'Advanced: Max ~0.125-0.25kg muscle per MONTH',
          `Optimal rate: ${maxOptimal.toFixed(2)}kg/week for lean gain`
        ],
        impact: 'Anything above these rates is primarily fat gain',
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  private static warnMultipleBadHabits(
    sleepHours: number,
    tobacco: boolean,
    alcohol: boolean
  ): ValidationResult {
    
    let count = 0;
    const habits: string[] = [];
    
    if (sleepHours < 6) { count++; habits.push('Low sleep'); }
    if (tobacco) { count++; habits.push('Tobacco use'); }
    if (alcohol) { count++; habits.push('Alcohol consumption'); }
    
    if (count >= 2) {
      return {
        status: 'WARNING',
        code: 'MULTIPLE_LIFESTYLE_FACTORS',
        message: `${count} lifestyle factors will significantly impact results`,
        recommendations: [
          `Factors detected: ${habits.join(', ')}`,
          'Timeline may extend by 40-60%',
          '🎯 Fix ONE habit at a time',
          '😴 Sleep has biggest impact - start there',
          'Success still possible but requires commitment'
        ],
        canProceed: true
      };
    }
    
    return { status: 'OK' };
  }
  
  // ========================================================================
  // HELPER CALCULATIONS
  // ========================================================================
  
  /**
   * Calculate sleep duration from wake and sleep times
   */
  private static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    const [sleepH, sleepM] = sleepTime.split(':').map(Number);
    
    const wakeMinutes = wakeH * 60 + wakeM;
    const sleepMinutes = sleepH * 60 + sleepM;
    
    let durationMinutes = wakeMinutes - sleepMinutes;
    if (durationMinutes < 0) durationMinutes += 24 * 60;
    
    return durationMinutes / 60;
  }
  
  /**
   * Calculate protein requirements based on goal
   */
  private static calculateProtein(weight: number, goalDirection: string): number {
    const PROTEIN_REQUIREMENTS: Record<string, number> = {
      cutting: 2.2,           // Muscle preservation in deficit
      recomp: 2.4,            // Body recomposition (high needs)
      maintenance: 1.6,       // Standard maintenance
      bulking: 1.8,           // Muscle building (lean mass focus)
      weight_gain: 1.6,       // General weight gain (fat + muscle)
    };
    
    const multiplier = PROTEIN_REQUIREMENTS[goalDirection] || 1.6;
    return Math.round(weight * multiplier);
  }
  
  /**
   * Calculate macronutrient distribution
   */
  private static calculateMacros(
    dailyCalories: number,
    proteinGrams: number,
    workoutFrequency: number,
    intensity: string
  ): { protein: number; carbs: number; fat: number } {
    
    // Protein calories (4 cal/g)
    const proteinCalories = proteinGrams * 4;
    const remainingCalories = dailyCalories - proteinCalories;
    
    // Carb percentage based on workout intensity
    let carbPercent: number;
    if (intensity === 'advanced' && workoutFrequency >= 4) {
      carbPercent = 0.50;  // 50% carbs for high volume training
    } else if (workoutFrequency >= 3) {
      carbPercent = 0.45;  // 45% carbs for moderate training
    } else {
      carbPercent = 0.40;  // 40% carbs for light training
    }
    
    const carbCalories = remainingCalories * carbPercent;
    const fatCalories = remainingCalories - carbCalories;
    
    return {
      protein: proteinGrams,
      carbs: Math.round(carbCalories / 4),   // 4 cal/g
      fat: Math.round(fatCalories / 9)       // 9 cal/g
    };
  }
  
  /**
   * Apply medical condition adjustments (NO STACKING - most impactful only)
   */
  private static applyMedicalAdjustments(
    tdee: number,
    macros: { protein: number; carbs: number; fat: number },
    medicalConditions: string[]
  ): {
    adjustedTDEE: number;
    adjustedMacros: { protein: number; carbs: number; fat: number };
    notes: string[];
  } {
    
    let adjustedTDEE = tdee;
    let adjustedMacros = { ...macros };
    const notes: string[] = [];
    
    // 1. METABOLIC conditions (affects TDEE)
    if (medicalConditions.includes('hypothyroid') || medicalConditions.includes('thyroid')) {
      adjustedTDEE = tdee * 0.90;  // -10% for underactive thyroid
      notes.push('⚠️ TDEE reduced 10% due to hypothyroidism');
      notes.push('💊 Consider thyroid medication optimization with doctor');
    } else if (medicalConditions.includes('hyperthyroid') || medicalConditions.includes('graves-disease')) {
      adjustedTDEE = tdee * 1.15;  // +15% for overactive thyroid
      notes.push('⚠️ TDEE increased 15% due to hyperthyroidism');
      notes.push('💊 Monitor thyroid levels regularly - may change with treatment');
      notes.push('🩺 Consult doctor before starting - metabolism may be unstable');
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
  
  /**
   * Apply deficit limits based on stress level and medical conditions
   * High stress or medical conditions cap deficit at 15% for safety
   */
  private static applyDeficitLimit(
    targetCalories: number,
    tdee: number,
    bmr: number,
    stressLevel: 'low' | 'moderate' | 'high',
    hasMedicalConditions: boolean
  ): { 
    adjustedCalories: number; 
    wasLimited: boolean; 
    limitReason?: string;
    originalDeficitPercent: number;
    adjustedDeficitPercent: number;
  } {
    const MAX_DEFICIT_PERCENT = {
      standard: 0.25,              // 25% max (aggressive)
      recommended: 0.20,           // 20% (optimal)
      conservative: 0.15           // 15% (high stress or medical)
    };
    
    // Calculate current deficit percentage
    const currentDeficit = tdee - targetCalories;
    const currentDeficitPercent = currentDeficit / tdee;
    
    // Determine max allowed deficit
    let maxDeficit = MAX_DEFICIT_PERCENT.recommended;
    let limitReason: string = 'recommended safety limits';
    
    if (stressLevel === 'high') {
      maxDeficit = MAX_DEFICIT_PERCENT.conservative;
      limitReason = 'high stress level';
    } else if (hasMedicalConditions) {
      maxDeficit = MAX_DEFICIT_PERCENT.conservative;
      limitReason = 'medical conditions';
    }
    
    // Check if we need to limit the deficit
    if (currentDeficitPercent > maxDeficit) {
      const adjustedCalories = Math.round(tdee * (1 - maxDeficit));
      // Ensure we never go below BMR
      const finalCalories = Math.max(adjustedCalories, bmr);
      
      return {
        adjustedCalories: finalCalories,
        wasLimited: true,
        limitReason,
        originalDeficitPercent: currentDeficitPercent,
        adjustedDeficitPercent: maxDeficit
      };
    }
    
    // No limiting needed
    return {
      adjustedCalories: targetCalories,
      wasLimited: false,
      originalDeficitPercent: currentDeficitPercent,
      adjustedDeficitPercent: currentDeficitPercent
    };
  }
  
  /**
   * Calculate refeed and diet break schedule for long diets
   */
  private static calculateRefeedSchedule(
    timelineWeeks: number,
    deficitPercent: number,
    goalType: string
  ): {
    needsRefeeds: boolean;
    refeedFrequency?: 'weekly';
    needsDietBreak: boolean;
    dietBreakWeek?: number;
    explanation: string[];
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
}

