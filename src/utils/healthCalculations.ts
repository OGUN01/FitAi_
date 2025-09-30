// 🧮 COMPREHENSIVE HEALTH CALCULATIONS ENGINE
// 50+ Mathematical Formulas for Fitness and Health Metrics

import { 
  PersonalInfoData, 
  DietPreferencesData, 
  BodyAnalysisData, 
  WorkoutPreferencesData, 
  AdvancedReviewData 
} from '../types/onboarding';

// ============================================================================
// BASIC METABOLIC CALCULATIONS
// ============================================================================

export class MetabolicCalculations {
  /**
   * Calculate BMI (Body Mass Index)
   * Formula: weight(kg) / height(m)²
   */
  static calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }
  
  /**
   * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
   * Men: 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
   * Women: 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
   */
  static calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === 'male' ? base + 5 : base - 161;
  }
  
  /**
   * Calculate TDEE (Total Daily Energy Expenditure)
   * Formula: BMR × Activity Factor
   */
  static calculateTDEE(bmr: number, activityLevel: string): number {
    const activityFactors = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      extreme: 1.9,
    };
    
    return bmr * (activityFactors[activityLevel as keyof typeof activityFactors] || 1.2);
  }
  
  /**
   * Calculate Metabolic Age
   * Compare BMR to average BMR for age group
   */
  static calculateMetabolicAge(bmr: number, chronologicalAge: number, gender: string): number {
    // Average BMR by age ranges
    const averageBMR = gender === 'male' 
      ? 1800 - (chronologicalAge - 25) * 10 // Rough approximation
      : 1400 - (chronologicalAge - 25) * 8;
    
    const metabolicAgeAdjustment = (averageBMR - bmr) / 50; // 50 cal difference ≈ 1 year
    return Math.max(18, Math.min(80, chronologicalAge + metabolicAgeAdjustment));
  }
}

// ============================================================================
// NUTRITIONAL CALCULATIONS
// ============================================================================

export class NutritionalCalculations {
  /**
   * Calculate daily calorie needs for weight goal
   * Formula: TDEE ± calorie deficit/surplus
   */
  static calculateDailyCaloriesForGoal(
    tdee: number, 
    weeklyWeightChangeKg: number, 
    isWeightLoss: boolean = true
  ): number {
    // 1 kg fat ≈ 7700 calories
    const weeklyCalorieChange = weeklyWeightChangeKg * 7700;
    const dailyCalorieChange = weeklyCalorieChange / 7;
    
    return isWeightLoss ? tdee - dailyCalorieChange : tdee + dailyCalorieChange;
  }
  
  /**
   * Calculate macronutrient distribution based on goals and diet type
   */
  static calculateMacronutrients(
    dailyCalories: number, 
    primaryGoals: string[], 
    dietReadiness: any
  ): { protein: number; carbs: number; fat: number } {
    let proteinPercent = 0.25; // Default 25%
    let carbPercent = 0.45;    // Default 45%
    let fatPercent = 0.30;     // Default 30%
    
    // Adjust based on diet readiness
    if (dietReadiness.keto_ready) {
      proteinPercent = 0.25;
      carbPercent = 0.05;
      fatPercent = 0.70;
    } else if (dietReadiness.high_protein_ready) {
      proteinPercent = 0.35;
      carbPercent = 0.35;
      fatPercent = 0.30;
    } else if (dietReadiness.low_carb_ready) {
      proteinPercent = 0.30;
      carbPercent = 0.25;
      fatPercent = 0.45;
    }
    
    // Adjust based on goals
    if (primaryGoals.includes('muscle_gain')) {
      proteinPercent = Math.max(proteinPercent, 0.30);
    }
    
    return {
      protein: Math.round((dailyCalories * proteinPercent) / 4), // 4 cal/g
      carbs: Math.round((dailyCalories * carbPercent) / 4),     // 4 cal/g
      fat: Math.round((dailyCalories * fatPercent) / 9),        // 9 cal/g
    };
  }
  
  /**
   * Calculate daily water needs
   * Formula: 35ml × body weight(kg) + exercise adjustments
   */
  static calculateDailyWaterNeeds(
    weightKg: number, 
    workoutMinutes: number = 0, 
    activityLevel: string = 'sedentary'
  ): number {
    const baseWater = weightKg * 35; // ml
    const exerciseWater = workoutMinutes * 15; // 15ml per minute of exercise
    const activityBonus = activityLevel === 'active' || activityLevel === 'extreme' ? 500 : 0;
    
    return baseWater + exerciseWater + activityBonus;
  }
  
  /**
   * Calculate daily fiber needs
   * Formula: 14g per 1000 calories
   */
  static calculateDailyFiberNeeds(dailyCalories: number): number {
    return Math.round((dailyCalories / 1000) * 14);
  }
}

// ============================================================================
// BODY COMPOSITION CALCULATIONS
// ============================================================================

export class BodyCompositionCalculations {
  /**
   * Calculate ideal weight range (BMI 18.5-24.9)
   */
  static calculateIdealWeightRange(heightCm: number): { min: number; max: number } {
    const heightM = heightCm / 100;
    return {
      min: Math.round(18.5 * heightM * heightM * 100) / 100,
      max: Math.round(24.9 * heightM * heightM * 100) / 100,
    };
  }
  
  /**
   * Calculate healthy weight loss rate
   * Formula: 0.5-1kg per week based on current weight
   */
  static calculateHealthyWeightLossRate(currentWeight: number): number {
    // Heavier individuals can safely lose more per week
    if (currentWeight > 100) return 1.0;
    if (currentWeight > 80) return 0.8;
    return 0.5;
  }
  
  /**
   * Calculate body fat percentage ranges (healthy ranges by age/gender)
   */
  static getHealthyBodyFatRange(age: number, gender: string): { min: number; max: number } {
    const ranges = {
      male: {
        '18-24': { min: 6, max: 17 },
        '25-34': { min: 7, max: 18 },
        '35-44': { min: 12, max: 21 },
        '45-54': { min: 14, max: 23 },
        '55+': { min: 16, max: 25 },
      },
      female: {
        '18-24': { min: 16, max: 24 },
        '25-34': { min: 16, max: 25 },
        '35-44': { min: 17, max: 28 },
        '45-54': { min: 18, max: 30 },
        '55+': { min: 18, max: 31 },
      },
    };
    
    const ageGroup = age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : age < 55 ? '45-54' : '55+';
    return ranges[gender as keyof typeof ranges]?.[ageGroup as keyof typeof ranges.male] || ranges.male['25-34'];
  }
  
  /**
   * Calculate lean body mass and fat mass
   */
  static calculateBodyComposition(weightKg: number, bodyFatPercentage: number): {
    leanMass: number;
    fatMass: number;
  } {
    const fatMass = (weightKg * bodyFatPercentage) / 100;
    const leanMass = weightKg - fatMass;
    
    return {
      leanMass: Math.round(leanMass * 100) / 100,
      fatMass: Math.round(fatMass * 100) / 100,
    };
  }
  
  /**
   * Calculate waist-to-hip ratio
   */
  static calculateWaistHipRatio(waistCm: number, hipCm: number): number {
    return Math.round((waistCm / hipCm) * 100) / 100;
  }
}

// ============================================================================
// CARDIOVASCULAR FITNESS CALCULATIONS
// ============================================================================

export class CardiovascularCalculations {
  /**
   * Calculate maximum heart rate
   * Formula: 220 - age
   */
  static calculateMaxHeartRate(age: number): number {
    return 220 - age;
  }
  
  /**
   * Calculate heart rate training zones
   */
  static calculateHeartRateZones(maxHeartRate: number): {
    fatBurn: { min: number; max: number };
    cardio: { min: number; max: number };
    peak: { min: number; max: number };
  } {
    return {
      fatBurn: {
        min: Math.round(maxHeartRate * 0.60),
        max: Math.round(maxHeartRate * 0.70),
      },
      cardio: {
        min: Math.round(maxHeartRate * 0.70),
        max: Math.round(maxHeartRate * 0.85),
      },
      peak: {
        min: Math.round(maxHeartRate * 0.85),
        max: Math.round(maxHeartRate * 0.95),
      },
    };
  }
  
  /**
   * Estimate VO2 Max based on fitness assessment
   * Simplified estimation based on running ability and age
   */
  static estimateVO2Max(canRunMinutes: number, age: number, gender: string): number {
    // Base VO2 Max by gender and age
    const baseVO2 = gender === 'male' ? 50 - (age - 20) * 0.5 : 40 - (age - 20) * 0.4;
    
    // Adjust based on running ability
    const runningBonus = canRunMinutes * 0.3; // 0.3 points per minute of running
    
    return Math.max(20, Math.min(80, baseVO2 + runningBonus));
  }
}

// ============================================================================
// FITNESS RECOMMENDATIONS
// ============================================================================

export class FitnessRecommendations {
  /**
   * Calculate recommended workout frequency based on goals and experience
   */
  static calculateWorkoutFrequency(
    primaryGoals: string[], 
    experienceYears: number, 
    currentFrequency: number
  ): number {
    let recommendedFrequency = 3; // Default 3x per week
    
    // Adjust based on goals
    if (primaryGoals.includes('weight_loss')) recommendedFrequency = Math.max(recommendedFrequency, 4);
    if (primaryGoals.includes('muscle_gain')) recommendedFrequency = Math.max(recommendedFrequency, 4);
    if (primaryGoals.includes('endurance')) recommendedFrequency = Math.max(recommendedFrequency, 5);
    
    // Adjust based on experience
    if (experienceYears === 0) recommendedFrequency = Math.min(recommendedFrequency, 3);
    if (experienceYears > 2) recommendedFrequency = Math.min(recommendedFrequency + 1, 6);
    
    // Don't recommend more than 50% increase from current
    if (currentFrequency > 0) {
      const maxIncrease = Math.ceil(currentFrequency * 1.5);
      recommendedFrequency = Math.min(recommendedFrequency, maxIncrease);
    }
    
    return recommendedFrequency;
  }
  
  /**
   * Calculate recommended cardio minutes per week
   */
  static calculateCardioMinutes(primaryGoals: string[], intensity: string): number {
    let baseMinutes = 150; // WHO recommendation
    
    if (primaryGoals.includes('weight_loss')) baseMinutes = 250;
    if (primaryGoals.includes('endurance')) baseMinutes = 300;
    if (intensity === 'advanced') baseMinutes = Math.min(baseMinutes + 50, 400);
    
    return baseMinutes;
  }
  
  /**
   * Calculate recommended strength training sessions
   */
  static calculateStrengthSessions(primaryGoals: string[], experienceYears: number): number {
    let sessions = 2; // Minimum recommendation
    
    if (primaryGoals.includes('muscle_gain')) sessions = 4;
    if (primaryGoals.includes('strength')) sessions = 3;
    if (experienceYears > 2) sessions = Math.min(sessions + 1, 5);
    
    return sessions;
  }
}

// ============================================================================
// HEALTH SCORING SYSTEM
// ============================================================================

export class HealthScoring {
  /**
   * Calculate overall health score (0-100)
   */
  static calculateOverallHealthScore(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData
  ): number {
    let score = 100;
    
    // BMI penalty/bonus
    if (bodyAnalysis.bmi) {
      if (bodyAnalysis.bmi < 18.5 || bodyAnalysis.bmi > 25) score -= 10;
      if (bodyAnalysis.bmi > 30) score -= 20;
      if (bodyAnalysis.bmi >= 18.5 && bodyAnalysis.bmi <= 24.9) score += 5;
    }
    
    // Activity level bonus/penalty
    const activityBonus = {
      sedentary: -15,
      light: -5,
      moderate: 5,
      active: 10,
      extreme: 15,
    };
    score += activityBonus[workoutPreferences.activity_level as keyof typeof activityBonus] || 0;
    
    // Diet habits
    if (dietPreferences.drinks_enough_water) score += 5;
    if (dietPreferences.eats_5_servings_fruits_veggies) score += 10;
    if (dietPreferences.limits_refined_sugar) score += 5;
    if (dietPreferences.eats_processed_foods) score -= 10;
    if (dietPreferences.smokes_tobacco) score -= 25;
    if (dietPreferences.drinks_alcohol) score -= 5;
    
    // Sleep quality
    if (personalInfo.wake_time && personalInfo.sleep_time) {
      const sleepHours = this.calculateSleepDuration(personalInfo.wake_time, personalInfo.sleep_time);
      if (sleepHours >= 7 && sleepHours <= 9) score += 10;
      if (sleepHours < 6) score -= 15;
    }
    
    // Workout experience bonus
    if (workoutPreferences.workout_experience_years > 0) score += 5;
    if (workoutPreferences.workout_frequency_per_week >= 3) score += 10;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Calculate diet readiness score (0-100)
   */
  static calculateDietReadinessScore(dietPreferences: DietPreferencesData): number {
    let score = 50; // Base score
    
    // Positive habits
    if (dietPreferences.drinks_enough_water) score += 10;
    if (dietPreferences.eats_regular_meals) score += 8;
    if (dietPreferences.avoids_late_night_eating) score += 8;
    if (dietPreferences.controls_portion_sizes) score += 10;
    if (dietPreferences.reads_nutrition_labels) score += 5;
    if (dietPreferences.eats_5_servings_fruits_veggies) score += 15;
    if (dietPreferences.limits_refined_sugar) score += 10;
    if (dietPreferences.includes_healthy_fats) score += 8;
    
    // Negative habits
    if (dietPreferences.eats_processed_foods) score -= 10;
    if (dietPreferences.smokes_tobacco) score -= 20;
    if (dietPreferences.drinks_alcohol) score -= 5;
    if (!dietPreferences.limits_sugary_drinks) score -= 8;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Calculate fitness readiness score (0-100)
   */
  static calculateFitnessReadinessScore(
    workoutPreferences: WorkoutPreferencesData,
    bodyAnalysis: BodyAnalysisData
  ): number {
    let score = 50; // Base score
    
    // Experience bonus
    score += Math.min(workoutPreferences.workout_experience_years * 3, 15);
    
    // Current fitness level
    score += Math.min(workoutPreferences.can_do_pushups * 0.5, 15);
    score += Math.min(workoutPreferences.can_run_minutes * 0.3, 15);
    
    // Activity level
    const activityBonus = {
      sedentary: -10,
      light: 0,
      moderate: 10,
      active: 15,
      extreme: 20,
    };
    score += activityBonus[workoutPreferences.activity_level as keyof typeof activityBonus] || 0;
    
    // Medical conditions penalty
    if (bodyAnalysis.medical_conditions && bodyAnalysis.medical_conditions.length > 0) {
      score -= bodyAnalysis.medical_conditions.length * 5;
    }
    
    // Physical limitations penalty
    if (bodyAnalysis.physical_limitations && bodyAnalysis.physical_limitations.length > 0) {
      score -= bodyAnalysis.physical_limitations.length * 3;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Calculate goal realistic score (0-100)
   */
  static calculateGoalRealisticScore(
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData
  ): number {
    let score = 80; // Start optimistic
    
    // Check weight loss rate
    if (bodyAnalysis.current_weight_kg && bodyAnalysis.target_weight_kg && bodyAnalysis.target_timeline_weeks) {
      const weeklyRate = Math.abs(bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg) / bodyAnalysis.target_timeline_weeks;
      
      if (weeklyRate > 1.5) score -= 30; // Very aggressive
      else if (weeklyRate > 1) score -= 15; // Slightly aggressive
      else if (weeklyRate >= 0.5) score += 10; // Perfect range
      else if (weeklyRate < 0.25) score -= 10; // Too slow
    }
    
    // Experience vs goals alignment
    const hasAmbitiousGoals = workoutPreferences.primary_goals.includes('muscle_gain') || 
                             workoutPreferences.primary_goals.includes('strength');
    const isExperienced = workoutPreferences.workout_experience_years > 1;
    
    if (hasAmbitiousGoals && !isExperienced) score -= 15;
    if (!hasAmbitiousGoals && isExperienced) score += 5;
    
    // Medical conditions impact
    if (bodyAnalysis.medical_conditions && bodyAnalysis.medical_conditions.length > 2) {
      score -= 20;
    }
    
    return Math.max(20, Math.min(100, Math.round(score)));
  }
  
  /**
   * Calculate sleep duration from wake and sleep times
   */
  private static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);
    
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;
    
    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60;
    
    return duration / 60;
  }
}

// ============================================================================
// SLEEP ANALYSIS
// ============================================================================

export class SleepAnalysis {
  /**
   * Calculate recommended sleep hours by age
   */
  static getRecommendedSleepHours(age: number): number {
    if (age < 18) return 8.5;
    if (age < 26) return 8.0;
    if (age < 65) return 7.5;
    return 7.0;
  }
  
  /**
   * Calculate current sleep duration
   */
  static calculateSleepDuration(wakeTime: string, sleepTime: string): number {
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);
    
    const wakeMinutes = wakeHour * 60 + wakeMin;
    const sleepMinutes = sleepHour * 60 + sleepMin;
    
    let duration = wakeMinutes - sleepMinutes;
    if (duration <= 0) duration += 24 * 60;
    
    return Math.round((duration / 60) * 10) / 10;
  }
  
  /**
   * Calculate sleep efficiency score
   */
  static calculateSleepEfficiencyScore(
    currentSleep: number, 
    recommendedSleep: number, 
    healthHabits: any
  ): number {
    let score = 50;
    
    // Sleep duration score
    const sleepDifference = Math.abs(currentSleep - recommendedSleep);
    if (sleepDifference <= 0.5) score += 30;
    else if (sleepDifference <= 1) score += 20;
    else if (sleepDifference <= 2) score += 10;
    else score -= 10;
    
    // Sleep quality factors
    if (healthHabits.avoids_late_night_eating) score += 10;
    if (!healthHabits.drinks_coffee) score += 5; // No late caffeine
    if (!healthHabits.drinks_alcohol) score += 10;
    if (healthHabits.eats_regular_meals) score += 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

// ============================================================================
// MASTER CALCULATION ENGINE
// ============================================================================

export class HealthCalculationEngine {
  /**
   * Calculate all health metrics for advanced review
   */
  static calculateAllMetrics(
    personalInfo: PersonalInfoData,
    dietPreferences: DietPreferencesData,
    bodyAnalysis: BodyAnalysisData,
    workoutPreferences: WorkoutPreferencesData
  ): AdvancedReviewData {
    // Basic metabolic calculations
    const bmi = MetabolicCalculations.calculateBMI(bodyAnalysis.current_weight_kg, bodyAnalysis.height_cm);
    const bmr = MetabolicCalculations.calculateBMR(
      bodyAnalysis.current_weight_kg, 
      bodyAnalysis.height_cm, 
      personalInfo.age, 
      personalInfo.gender
    );
    const tdee = MetabolicCalculations.calculateTDEE(bmr, workoutPreferences.activity_level);
    const metabolicAge = MetabolicCalculations.calculateMetabolicAge(bmr, personalInfo.age, personalInfo.gender);
    
    // Weight management
    const idealWeightRange = BodyCompositionCalculations.calculateIdealWeightRange(bodyAnalysis.height_cm);
    const weeklyWeightLossRate = BodyCompositionCalculations.calculateHealthyWeightLossRate(bodyAnalysis.current_weight_kg);
    const isWeightLoss = bodyAnalysis.current_weight_kg > bodyAnalysis.target_weight_kg;
    const dailyCalories = NutritionalCalculations.calculateDailyCaloriesForGoal(
      tdee, 
      workoutPreferences.weekly_weight_loss_goal || weeklyWeightLossRate, 
      isWeightLoss
    );
    
    // Nutritional needs
    const macros = NutritionalCalculations.calculateMacronutrients(
      dailyCalories, 
      workoutPreferences.primary_goals, 
      dietPreferences
    );
    const dailyWater = NutritionalCalculations.calculateDailyWaterNeeds(
      bodyAnalysis.current_weight_kg, 
      workoutPreferences.time_preference, 
      workoutPreferences.activity_level
    );
    const dailyFiber = NutritionalCalculations.calculateDailyFiberNeeds(dailyCalories);
    
    // Body composition
    const bodyFatRange = BodyCompositionCalculations.getHealthyBodyFatRange(personalInfo.age, personalInfo.gender);
    const bodyComposition = bodyAnalysis.body_fat_percentage 
      ? BodyCompositionCalculations.calculateBodyComposition(bodyAnalysis.current_weight_kg, bodyAnalysis.body_fat_percentage)
      : { leanMass: 0, fatMass: 0 };
    
    // Cardiovascular metrics
    const maxHeartRate = CardiovascularCalculations.calculateMaxHeartRate(personalInfo.age);
    const heartRateZones = CardiovascularCalculations.calculateHeartRateZones(maxHeartRate);
    const estimatedVO2Max = CardiovascularCalculations.estimateVO2Max(
      workoutPreferences.can_run_minutes, 
      personalInfo.age, 
      personalInfo.gender
    );
    
    // Fitness recommendations
    const recommendedWorkoutFrequency = FitnessRecommendations.calculateWorkoutFrequency(
      workoutPreferences.primary_goals, 
      workoutPreferences.workout_experience_years, 
      workoutPreferences.workout_frequency_per_week
    );
    const recommendedCardioMinutes = FitnessRecommendations.calculateCardioMinutes(
      workoutPreferences.primary_goals, 
      workoutPreferences.intensity
    );
    const recommendedStrengthSessions = FitnessRecommendations.calculateStrengthSessions(
      workoutPreferences.primary_goals, 
      workoutPreferences.workout_experience_years
    );
    
    // Health scores
    const overallHealthScore = HealthScoring.calculateOverallHealthScore(
      personalInfo, dietPreferences, bodyAnalysis, workoutPreferences
    );
    const dietReadinessScore = HealthScoring.calculateDietReadinessScore(dietPreferences);
    const fitnessReadinessScore = HealthScoring.calculateFitnessReadinessScore(workoutPreferences, bodyAnalysis);
    const goalRealisticScore = HealthScoring.calculateGoalRealisticScore(bodyAnalysis, workoutPreferences);
    
    // Sleep analysis
    const recommendedSleepHours = SleepAnalysis.getRecommendedSleepHours(personalInfo.age);
    const currentSleepDuration = SleepAnalysis.calculateSleepDuration(personalInfo.wake_time, personalInfo.sleep_time);
    const sleepEfficiencyScore = SleepAnalysis.calculateSleepEfficiencyScore(
      currentSleepDuration, 
      recommendedSleepHours, 
      dietPreferences
    );
    
    // Timeline calculations
    const estimatedTimelineWeeks = bodyAnalysis.target_timeline_weeks;
    const totalCalorieDeficit = Math.round(weeklyWeightLossRate * 7700); // Weekly deficit
    
    return {
      // Basic metabolic calculations
      calculated_bmi: Math.round(bmi * 100) / 100,
      calculated_bmr: Math.round(bmr),
      calculated_tdee: Math.round(tdee),
      metabolic_age: Math.round(metabolicAge),
      
      // Daily nutritional needs
      daily_calories: Math.round(dailyCalories),
      daily_protein_g: macros.protein,
      daily_carbs_g: macros.carbs,
      daily_fat_g: macros.fat,
      daily_water_ml: Math.round(dailyWater),
      daily_fiber_g: dailyFiber,
      
      // Weight management
      healthy_weight_min: idealWeightRange.min,
      healthy_weight_max: idealWeightRange.max,
      weekly_weight_loss_rate: weeklyWeightLossRate,
      estimated_timeline_weeks: estimatedTimelineWeeks,
      total_calorie_deficit: totalCalorieDeficit,
      
      // Body composition
      ideal_body_fat_min: bodyFatRange.min,
      ideal_body_fat_max: bodyFatRange.max,
      lean_body_mass: bodyComposition.leanMass,
      fat_mass: bodyComposition.fatMass,
      
      // Fitness metrics
      estimated_vo2_max: Math.round(estimatedVO2Max * 10) / 10,
      target_hr_fat_burn_min: heartRateZones.fatBurn.min,
      target_hr_fat_burn_max: heartRateZones.fatBurn.max,
      target_hr_cardio_min: heartRateZones.cardio.min,
      target_hr_cardio_max: heartRateZones.cardio.max,
      target_hr_peak_min: heartRateZones.peak.min,
      target_hr_peak_max: heartRateZones.peak.max,
      recommended_workout_frequency: recommendedWorkoutFrequency,
      recommended_cardio_minutes: recommendedCardioMinutes,
      recommended_strength_sessions: recommendedStrengthSessions,
      
      // Health scores
      overall_health_score: overallHealthScore,
      diet_readiness_score: dietReadinessScore,
      fitness_readiness_score: fitnessReadinessScore,
      goal_realistic_score: goalRealisticScore,
      
      // Sleep analysis
      recommended_sleep_hours: recommendedSleepHours,
      current_sleep_duration: currentSleepDuration,
      sleep_efficiency_score: sleepEfficiencyScore,
      
      // Completion metrics (will be calculated by validation)
      data_completeness_percentage: 0,
      reliability_score: 0,
      personalization_level: 0,
    };
  }
}

// Export all calculation classes
// Note: All classes are already exported with their class declarations above
// No need for duplicate export statements
