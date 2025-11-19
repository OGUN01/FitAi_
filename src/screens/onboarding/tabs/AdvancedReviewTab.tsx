import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp, rh, rw } from '../../../utils/responsive';
import { ResponsiveTheme } from '../../../utils/constants';
import { Button, InfoTooltip } from '../../../components/ui';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { AnimatedSection } from '../../../components/ui/aurora/AnimatedSection';
import { HeroSection, ProgressRing } from '../../../components/ui/aurora';
import { gradients, toLinearGradientProps } from '../../../theme/gradients';
import { 
  PersonalInfoData, 
  DietPreferencesData, 
  BodyAnalysisData, 
  WorkoutPreferencesData, 
  AdvancedReviewData 
} from '../../../types/onboarding';
import { HealthCalculationEngine, MetabolicCalculations } from '../../../utils/healthCalculations';
import { ValidationEngine, ValidationResults } from '../../../services/validationEngine';
import { ErrorCard } from '../../../components/onboarding/ErrorCard';
import { WarningCard } from '../../../components/onboarding/WarningCard';
import { AdjustmentWizard, Alternative } from '../../../components/onboarding/AdjustmentWizard';
import { METRIC_DESCRIPTIONS } from '../../../constants/metricDescriptions';

// ============================================================================
// TYPES
// ============================================================================

interface AdvancedReviewTabProps {
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  onUpdate: (data: Partial<AdvancedReviewData>) => void;
  onUpdateBodyAnalysis?: (data: Partial<BodyAnalysisData>) => void;
  onUpdateWorkoutPreferences?: (data: Partial<WorkoutPreferencesData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isComplete: boolean;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdvancedReviewTab: React.FC<AdvancedReviewTabProps> = ({
  personalInfo,
  dietPreferences,
  bodyAnalysis,
  workoutPreferences,
  advancedReview,
  onNext,
  onBack,
  onComplete,
  onUpdate,
  onUpdateBodyAnalysis,
  onUpdateWorkoutPreferences,
  onNavigateToTab,
  isComplete,
  isLoading = false,
  isAutoSaving = false,
}) => {
  // No longer creating separate state instances - using props from parent
  
  const [calculatedData, setCalculatedData] = useState<AdvancedReviewData | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [showAdjustmentWizard, setShowAdjustmentWizard] = useState(false);
  const [currentError, setCurrentError] = useState<any | null>(null);
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  
  // Calculate all metrics when component mounts or data changes
  useEffect(() => {
    if (personalInfo && dietPreferences && bodyAnalysis && workoutPreferences) {
      performCalculations();
    }
  }, [personalInfo, dietPreferences, bodyAnalysis, workoutPreferences]);

  // Reset acknowledgment when warnings change
  useEffect(() => {
    setWarningsAcknowledged(false);
  }, [validationResults?.warnings]);
  
  // Helper functions for scoring
  const getScoreColor = (score: number) => {
    if (score >= 80) return ResponsiveTheme.colors.success;
    if (score >= 60) return ResponsiveTheme.colors.warning;
    return ResponsiveTheme.colors.error;
  };
  
  const getScoreCategory = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };
  
  const performCalculations = async () => {
    if (!personalInfo || !dietPreferences || !bodyAnalysis || !workoutPreferences) {
      setCalculationError('Missing required data for calculations');
      return;
    }
    
    setIsCalculating(true);
    setCalculationError(null);
    
    try {
      console.log('🧮 AdvancedReviewTab: Running validation and calculations...');
      
      // Use ValidationEngine for comprehensive validation
      const validationResults = ValidationEngine.validateUserPlan(
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences
      );
      
      setValidationResults(validationResults);
      
      // Also run legacy calculations for additional metrics
      const calculations = HealthCalculationEngine.calculateAllMetrics(
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences
      );
      
      // Merge validation metrics with legacy calculations
      const completionMetrics = calculateCompletionMetrics();
      
      // Calculate additional metrics using new helper functions
      const waterIntake = MetabolicCalculations.calculateWaterIntake(bodyAnalysis.current_weight_kg);
      const fiberIntake = MetabolicCalculations.calculateFiber(validationResults.calculatedMetrics.targetCalories);
      const dietReadinessScore = MetabolicCalculations.calculateDietReadinessScore(dietPreferences);
      
      const finalCalculations: AdvancedReviewData = {
        ...calculations,
        ...completionMetrics,
        // Override with validation engine results (more accurate)
        calculated_bmr: validationResults.calculatedMetrics.bmr,
        calculated_tdee: validationResults.calculatedMetrics.tdee,
        daily_calories: validationResults.calculatedMetrics.targetCalories,
        daily_protein_g: validationResults.calculatedMetrics.protein,
        daily_carbs_g: validationResults.calculatedMetrics.carbs,
        daily_fat_g: validationResults.calculatedMetrics.fat,
        daily_water_ml: waterIntake,
        daily_fiber_g: fiberIntake,
        weekly_weight_loss_rate: validationResults.calculatedMetrics.weeklyRate,
        estimated_timeline_weeks: validationResults.calculatedMetrics.timeline,
        diet_readiness_score: dietReadinessScore,
        // Add validation results for storage
        validation_status: validationResults.hasErrors ? 'blocked' : (validationResults.hasWarnings ? 'warnings' : 'passed'),
        validation_errors: validationResults.errors.length > 0 ? validationResults.errors : undefined,
        validation_warnings: validationResults.warnings.length > 0 ? validationResults.warnings : undefined,
        refeed_schedule: validationResults.adjustments?.refeedSchedule,
        medical_adjustments: validationResults.adjustments?.medicalNotes,
      };
      
      setCalculatedData(finalCalculations);
      onUpdate(finalCalculations);
      
      console.log('✅ AdvancedReviewTab: Validation and calculations completed');
      console.log('  - Can Proceed:', validationResults.canProceed);
      console.log('  - Errors:', validationResults.errors.length);
      console.log('  - Warnings:', validationResults.warnings.length);
    } catch (error) {
      console.error('❌ AdvancedReviewTab: Calculation error:', error);
      setCalculationError('Failed to calculate health metrics. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };
  
  const calculateCompletionMetrics = () => {
    let totalFields = 0;
    let completedFields = 0;
    
    // Count personal info completion
    if (personalInfo) {
      const requiredPersonal = ['first_name', 'last_name', 'age', 'gender', 'country', 'state', 'wake_time', 'sleep_time'];
      totalFields += requiredPersonal.length;
      completedFields += requiredPersonal.filter(field => personalInfo[field as keyof PersonalInfoData]).length;
    }
    
    // Count diet preferences completion
    if (dietPreferences) {
      totalFields += 35; // Total diet preference fields
      completedFields += Object.values(dietPreferences).filter(value => 
        value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true)
      ).length;
    }
    
    // Count body analysis completion
    if (bodyAnalysis) {
      const requiredBody = ['height_cm', 'current_weight_kg', 'target_weight_kg', 'target_timeline_weeks'];
      const optionalBody = ['body_fat_percentage', 'waist_cm', 'hip_cm', 'front_photo_url', 'medical_conditions'];
      totalFields += requiredBody.length + optionalBody.length;
      
      completedFields += requiredBody.filter(field => bodyAnalysis[field as keyof BodyAnalysisData]).length;
      completedFields += optionalBody.filter(field => {
        const value = bodyAnalysis[field as keyof BodyAnalysisData];
        return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined;
      }).length;
    }
    
    // Count workout preferences completion
    if (workoutPreferences) {
      totalFields += 24; // Total workout preference fields
      completedFields += Object.values(workoutPreferences).filter(value => 
        value !== null && value !== undefined && value !== '' && 
        (Array.isArray(value) ? value.length > 0 : true)
      ).length;
    }
    
    const dataCompletenessPercentage = Math.round((completedFields / totalFields) * 100);
    const reliabilityScore = calculateReliabilityScore();
    const personalizationLevel = Math.min(100, Math.round(completedFields * 1.2)); // Boost for comprehensive data
    
    return {
      data_completeness_percentage: dataCompletenessPercentage,
      reliability_score: reliabilityScore,
      personalization_level: personalizationLevel,
    };
  };
  
  const calculateReliabilityScore = (): number => {
    let score = 100;
    
    // Reduce score for missing critical data
    if (!bodyAnalysis?.height_cm || !bodyAnalysis?.current_weight_kg) score -= 20;
    if (!workoutPreferences?.primary_goals?.length) score -= 15;
    
    // Reduce score for unrealistic goals
    if (bodyAnalysis && bodyAnalysis.current_weight_kg && bodyAnalysis.target_weight_kg && bodyAnalysis.target_timeline_weeks) {
      const weeklyRate = Math.abs(bodyAnalysis.current_weight_kg - bodyAnalysis.target_weight_kg) / bodyAnalysis.target_timeline_weeks;
      if (weeklyRate > 1.5) score -= 25; // Very unrealistic
      if (weeklyRate > 1) score -= 10;   // Slightly unrealistic
    }
    
    return Math.max(0, score);
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderDataSummary = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>📋 Data Summary</Text>

      <View style={styles.summaryGrid}>
        {/* Personal Info Summary */}
        <AnimatedPressable onPress={() => onNavigateToTab?.(1)} scaleValue={0.95}>
          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryIcon}>👤</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Personal Info</Text>
                <Text style={styles.summaryDetails}>
                  {personalInfo?.first_name} {personalInfo?.last_name}, {personalInfo?.age}y
                </Text>
                <Text style={styles.summaryDetails}>
                  {personalInfo?.country}, {personalInfo?.state}
                </Text>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </GlassCard>
        </AnimatedPressable>

        {/* Diet Summary */}
        <AnimatedPressable onPress={() => onNavigateToTab?.(2)} scaleValue={0.95}>
          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryIcon}>🍽️</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Diet Preferences</Text>
                <Text style={styles.summaryDetails}>
                  {dietPreferences?.diet_type}
                </Text>
                <Text style={styles.summaryDetails}>
                  {dietPreferences?.breakfast_enabled ? '✓' : '✗'} Breakfast,
                  {dietPreferences?.lunch_enabled ? '✓' : '✗'} Lunch,
                  {dietPreferences?.dinner_enabled ? '✓' : '✗'} Dinner
                </Text>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </GlassCard>
        </AnimatedPressable>

        {/* Body Analysis Summary */}
        <AnimatedPressable onPress={() => onNavigateToTab?.(3)} scaleValue={0.95}>
          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryIcon}>📊</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Body Analysis</Text>
                <Text style={styles.summaryDetails}>
                  {bodyAnalysis?.current_weight_kg}kg → {bodyAnalysis?.target_weight_kg}kg
                </Text>
                <Text style={styles.summaryDetails}>
                  BMI: {calculatedData?.calculated_bmi}, {bodyAnalysis?.ai_body_type || 'Not analyzed'}
                </Text>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </GlassCard>
        </AnimatedPressable>

        {/* Workout Summary */}
        <AnimatedPressable onPress={() => onNavigateToTab?.(4)} scaleValue={0.95}>
          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryIcon}>💪</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Workout Preferences</Text>
                <Text style={styles.summaryDetails}>
                  {workoutPreferences?.intensity}, {workoutPreferences?.location}
                </Text>
                <Text style={styles.summaryDetails}>
                  {workoutPreferences?.primary_goals?.length || 0} goals, {workoutPreferences?.workout_types?.length || 0} types
                </Text>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </GlassCard>
        </AnimatedPressable>
      </View>
    </GlassCard>
  );

  const renderMetabolicProfile = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>🔥 Metabolic Profile</Text>

        <View style={styles.metricsGrid}>
          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>BMI</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.BMI.title}
                description={METRIC_DESCRIPTIONS.BMI.description}
              />
            </View>
            <View style={styles.metricProgressContainer}>
              <ProgressRing
                value={calculatedData.calculated_bmi || 0}
                maxValue={40}
                size={rf(100)}
                strokeWidth={rf(8)}
                gradient={
                  calculatedData.calculated_bmi! < 18.5 ? ['#FFC107', '#FF9800'] :
                  calculatedData.calculated_bmi! < 25 ? ['#4CAF50', '#45A049'] :
                  calculatedData.calculated_bmi! < 30 ? ['#FF9800', '#FF5722'] :
                  ['#F44336', '#D32F2F']
                }
                animationDuration={1000}
              />
            </View>
            <Text style={styles.metricValue}>{calculatedData.calculated_bmi}</Text>
            <Text style={styles.metricCategory}>
              {calculatedData.calculated_bmi! < 18.5 ? 'Underweight' :
               calculatedData.calculated_bmi! < 25 ? 'Normal' :
               calculatedData.calculated_bmi! < 30 ? 'Overweight' : 'Obese'}
            </Text>
          </GlassCard>

          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>BMR</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.BMR.title}
                description={METRIC_DESCRIPTIONS.BMR.description}
              />
            </View>
            <View style={styles.metricProgressContainer}>
              <ProgressRing
                value={((calculatedData.calculated_bmr || 1200) - 1200) / 13}
                maxValue={100}
                size={rf(100)}
                strokeWidth={rf(8)}
                gradient={['#2196F3', '#1976D2']}
                animationDuration={1000}
              />
            </View>
            <Text style={styles.metricValue}>{calculatedData.calculated_bmr}</Text>
            <Text style={styles.metricCategory}>cal/day</Text>
          </GlassCard>

          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>TDEE</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.TDEE.title}
                description={METRIC_DESCRIPTIONS.TDEE.description}
              />
            </View>
            <View style={styles.metricProgressContainer}>
              <ProgressRing
                value={((calculatedData.calculated_tdee || 1500) - 1500) / 20}
                maxValue={100}
                size={rf(100)}
                strokeWidth={rf(8)}
                gradient={['#9C27B0', '#7B1FA2']}
                animationDuration={1000}
              />
            </View>
            <Text style={styles.metricValue}>{calculatedData.calculated_tdee}</Text>
            <Text style={styles.metricCategory}>cal/day</Text>
          </GlassCard>

          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>Metabolic Age</Text>
              <InfoTooltip
                title={METRIC_DESCRIPTIONS.METABOLIC_AGE.title}
                description={METRIC_DESCRIPTIONS.METABOLIC_AGE.description}
              />
            </View>
            <View style={styles.metricProgressContainer}>
              <ProgressRing
                value={calculatedData.metabolic_age || 25}
                maxValue={80}
                size={rf(100)}
                strokeWidth={rf(8)}
                gradient={
                  calculatedData.metabolic_age! < 30 ? ['#4CAF50', '#45A049'] :
                  calculatedData.metabolic_age! < 50 ? ['#FFC107', '#FF9800'] :
                  ['#FF5722', '#D32F2F']
                }
                animationDuration={1000}
              />
            </View>
            <Text style={styles.metricValue}>{calculatedData.metabolic_age}</Text>
            <Text style={styles.metricCategory}>years</Text>
          </GlassCard>
        </View>
      </GlassCard>
    );
  };

  const renderNutritionalNeeds = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>🥗 Daily Nutritional Needs</Text>

        <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.nutritionCard}>
          <View style={styles.nutritionHeader}>
            <Text style={styles.nutritionTitle}>Daily Targets</Text>
            <Text style={styles.calorieTarget}>{calculatedData.daily_calories} calories</Text>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{calculatedData.daily_protein_g}g</Text>
              <Text style={styles.macroPercentage}>
                {Math.round((calculatedData.daily_protein_g! * 4) / calculatedData.daily_calories! * 100)}%
              </Text>
            </View>

            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{calculatedData.daily_carbs_g}g</Text>
              <Text style={styles.macroPercentage}>
                {Math.round((calculatedData.daily_carbs_g! * 4) / calculatedData.daily_calories! * 100)}%
              </Text>
            </View>

            <View style={styles.macroItem}>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{calculatedData.daily_fat_g}g</Text>
              <Text style={styles.macroPercentage}>
                {Math.round((calculatedData.daily_fat_g! * 9) / calculatedData.daily_calories! * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.otherNutrients}>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientIcon}>💧</Text>
              <Text style={styles.nutrientText}>Water: {(calculatedData.daily_water_ml! / 1000).toFixed(1)}L</Text>
            </View>
            <View style={styles.nutrientItem}>
              <Text style={styles.nutrientIcon}>🌾</Text>
              <Text style={styles.nutrientText}>Fiber: {calculatedData.daily_fiber_g}g</Text>
            </View>
          </View>
        </GlassCard>
      </GlassCard>
    );
  };

  const renderWeightManagement = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>⚖️ Weight Management Plan</Text>

        <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.weightCard}>
          <View style={styles.weightHeader}>
            <Text style={styles.weightTitle}>Goal Timeline</Text>
            <Text style={styles.timelineWeeks}>{calculatedData.estimated_timeline_weeks} weeks</Text>
          </View>

          <View style={styles.weightProgress}>
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Current</Text>
              <Text style={styles.weightValue}>{bodyAnalysis?.current_weight_kg}kg</Text>
            </View>

            <Text style={styles.weightArrow}>→</Text>

            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Target</Text>
              <Text style={styles.weightValue}>{bodyAnalysis?.target_weight_kg}kg</Text>
            </View>

            <Text style={styles.weightArrow}>📈</Text>

            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Weekly Rate</Text>
              <Text style={styles.weightValue}>{calculatedData.weekly_weight_loss_rate}kg</Text>
            </View>
          </View>

          <View style={styles.idealWeightInfo}>
            <Text style={styles.idealWeightTitle}>Ideal Weight Range</Text>
            <Text style={styles.idealWeightRange}>
              {calculatedData.healthy_weight_min}kg - {calculatedData.healthy_weight_max}kg
            </Text>
          </View>

          <View style={styles.calorieDeficitInfo}>
            <Text style={styles.deficitTitle}>Weekly Calorie Deficit</Text>
            <Text style={styles.deficitValue}>{calculatedData.total_calorie_deficit} calories</Text>
            <Text style={styles.deficitDaily}>({Math.round(calculatedData.total_calorie_deficit! / 7)} cal/day)</Text>
          </View>
        </GlassCard>
      </GlassCard>
    );
  };

  const renderFitnessMetrics = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>💓 Fitness & Cardiovascular Metrics</Text>

        <View style={styles.fitnessGrid}>
          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.fitnessCard}>
            <Text style={styles.fitnessCardTitle}>VO₂ Max</Text>
            <Text style={styles.fitnessCardValue}>{calculatedData.estimated_vo2_max}</Text>
            <Text style={styles.fitnessCardUnit}>ml/kg/min</Text>
            <Text style={styles.fitnessCardCategory}>
              {calculatedData.estimated_vo2_max! > 50 ? 'Excellent' :
               calculatedData.estimated_vo2_max! > 40 ? 'Good' :
               calculatedData.estimated_vo2_max! > 30 ? 'Fair' : 'Poor'}
            </Text>
          </GlassCard>

          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.fitnessCard}>
            <Text style={styles.fitnessCardTitle}>Heart Rate Zones</Text>
            <View style={styles.heartRateZones}>
              <Text style={styles.heartRateZone}>
                Fat Burn: {calculatedData.target_hr_fat_burn_min}-{calculatedData.target_hr_fat_burn_max} bpm
              </Text>
              <Text style={styles.heartRateZone}>
                Cardio: {calculatedData.target_hr_cardio_min}-{calculatedData.target_hr_cardio_max} bpm
              </Text>
              <Text style={styles.heartRateZone}>
                Peak: {calculatedData.target_hr_peak_min}-{calculatedData.target_hr_peak_max} bpm
              </Text>
            </View>
          </GlassCard>
        </View>

        <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>🎯 Weekly Workout Recommendations</Text>
          <View style={styles.recommendationsList}>
            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationIcon}>🏋️</Text>
              <Text style={styles.recommendationText}>
                Workout Frequency: {calculatedData.recommended_workout_frequency} sessions/week
              </Text>
            </View>
            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationIcon}>❤️</Text>
              <Text style={styles.recommendationText}>
                Cardio: {calculatedData.recommended_cardio_minutes} minutes/week
              </Text>
            </View>
            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationIcon}>💪</Text>
              <Text style={styles.recommendationText}>
                Strength Training: {calculatedData.recommended_strength_sessions} sessions/week
              </Text>
            </View>
          </View>
        </GlassCard>
      </GlassCard>
    );
  };

  const renderHealthScores = () => {
    if (!calculatedData) return null;

    // Check if all required scores are available
    const hasAllScores =
      calculatedData.overall_health_score !== undefined &&
      calculatedData.diet_readiness_score !== undefined &&
      calculatedData.fitness_readiness_score !== undefined &&
      calculatedData.goal_realistic_score !== undefined;

    if (!hasAllScores) {
      console.warn('⚠️ Health scores not fully calculated');
      return null;
    }

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>📊 Health Assessment Scores</Text>
        <Text style={styles.sectionSubtitle}>
          Your readiness scores based on current health status and goals
        </Text>

        <View style={styles.scoresGrid}>
          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Overall Health</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.overall_health_score) }]}>
              {calculatedData.overall_health_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.overall_health_score)}</Text>
            <Text style={styles.scoreDescription}>Combined health assessment</Text>
          </GlassCard>

          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Diet Readiness</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.diet_readiness_score) }]}>
              {calculatedData.diet_readiness_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.diet_readiness_score)}</Text>
            <Text style={styles.scoreDescription}>Nutrition habits & readiness</Text>
          </GlassCard>

          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Fitness Readiness</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.fitness_readiness_score) }]}>
              {calculatedData.fitness_readiness_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.fitness_readiness_score)}</Text>
            <Text style={styles.scoreDescription}>Exercise experience & capacity</Text>
          </GlassCard>

          <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg" style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Goal Realistic</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.goal_realistic_score) }]}>
              {calculatedData.goal_realistic_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.goal_realistic_score)}</Text>
            <Text style={styles.scoreDescription}>Timeline & target feasibility</Text>
          </GlassCard>
        </View>
      </GlassCard>
    );
  };

  const renderSleepAnalysis = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>😴 Sleep Analysis</Text>

        <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.sleepCard}>
          <View style={styles.sleepMetrics}>
            <View style={styles.sleepMetric}>
              <Text style={styles.sleepLabel}>Current Sleep</Text>
              <Text style={styles.sleepValue}>{calculatedData.current_sleep_duration}h</Text>
            </View>

            <Text style={styles.sleepArrow}>vs</Text>

            <View style={styles.sleepMetric}>
              <Text style={styles.sleepLabel}>Recommended</Text>
              <Text style={styles.sleepValue}>{calculatedData.recommended_sleep_hours}h</Text>
            </View>
          </View>

          <View style={styles.sleepEfficiency}>
            <Text style={styles.sleepEfficiencyTitle}>Sleep Efficiency Score</Text>
            <Text style={[
              styles.sleepEfficiencyScore,
              { color: getScoreColor(calculatedData.sleep_efficiency_score!) }
            ]}>
              {calculatedData.sleep_efficiency_score}/100
            </Text>
          </View>

          <Text style={styles.sleepRecommendation}>
            {calculatedData.current_sleep_duration! >= 7 && calculatedData.current_sleep_duration! <= 9
              ? '✅ Your sleep duration is optimal for fitness goals'
              : calculatedData.current_sleep_duration! < 7
                ? '⚠️ Consider getting more sleep for better recovery and results'
                : '⚠️ Very long sleep duration - ensure it\'s quality sleep'
            }
          </Text>
        </GlassCard>
      </GlassCard>
    );
  };

  const renderPersonalizationMetrics = () => {
    if (!calculatedData) return null;

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>🎯 Personalization Summary</Text>

        <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg" style={styles.personalizationCard}>
          <View style={styles.personalizationGrid}>
            <View style={styles.personalizationItem}>
              <Text style={styles.personalizationLabel}>Data Completeness</Text>
              <Text style={styles.personalizationValue}>
                {calculatedData.data_completeness_percentage}%
              </Text>
              <View style={styles.personalizationBar}>
                <View style={[
                  styles.personalizationFill,
                  { width: `${calculatedData.data_completeness_percentage || 0}%` }
                ]} />
              </View>
            </View>

            <View style={styles.personalizationItem}>
              <Text style={styles.personalizationLabel}>Reliability Score</Text>
              <Text style={styles.personalizationValue}>
                {calculatedData.reliability_score}%
              </Text>
              <View style={styles.personalizationBar}>
                <View style={[
                  styles.personalizationFill,
                  { width: `${calculatedData.reliability_score || 0}%` }
                ]} />
              </View>
            </View>

            <View style={styles.personalizationItem}>
              <Text style={styles.personalizationLabel}>Personalization Level</Text>
              <Text style={styles.personalizationValue}>
                {calculatedData.personalization_level}%
              </Text>
              <View style={styles.personalizationBar}>
                <View style={[
                  styles.personalizationFill,
                  { width: `${calculatedData.personalization_level || 0}%` }
                ]} />
              </View>
            </View>
          </View>

          <Text style={styles.personalizationSummary}>
            {calculatedData.data_completeness_percentage! >= 90
              ? '🎉 Excellent! Your profile is comprehensive and ready for highly personalized recommendations.'
              : calculatedData.data_completeness_percentage! >= 70
                ? '👍 Good profile completeness. Consider adding more details for better personalization.'
                : '📝 Consider completing more sections for enhanced personalization.'
            }
          </Text>
        </GlassCard>
      </GlassCard>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section with Background Image */}
        <HeroSection
          image={{ uri: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80' }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          height={rh(220)}
        >
          <Text style={styles.title}>Advanced Review & Insights</Text>
          <Text style={styles.subtitle}>
            Comprehensive analysis based on your complete profile
          </Text>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Text style={styles.autoSaveText}>💾 Saving...</Text>
            </View>
          )}

          {/* Calculation Status */}
          {isCalculating && (
            <View style={styles.calculatingIndicator}>
              <Text style={styles.calculatingText}>🧮 Calculating health metrics...</Text>
            </View>
          )}

          {calculationError && (
            <View style={styles.errorIndicator}>
              <Text style={styles.errorText}>❌ {calculationError}</Text>
              <AnimatedPressable onPress={performCalculations} style={styles.retryButton} scaleValue={0.95}>
                <Text style={styles.retryText}>🔄 Retry Calculations</Text>
              </AnimatedPressable>
            </View>
          )}
        </HeroSection>
        
        {/* Content */}
        <View style={styles.content}>
          {/* Validation Errors Section */}
          {validationResults?.hasErrors && (
            <ErrorCard 
              errors={validationResults.errors}
              onAdjust={(error) => {
                console.log('🔧 Opening adjustment wizard for error:', error);
                setCurrentError(validationResults.errors[0]); // Use first error
                setShowAdjustmentWizard(true);
              }}
            />
          )}
          
          {/* Validation Warnings Section */}
          {validationResults?.hasWarnings && (
            <WarningCard
              warnings={validationResults.warnings}
              onAcknowledgmentChange={setWarningsAcknowledged}
            />
          )}
          
          {/* Existing Sections */}
          <AnimatedSection delay={0}>
            {renderDataSummary()}
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {renderMetabolicProfile()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderNutritionalNeeds()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderWeightManagement()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderFitnessMetrics()}
          </AnimatedSection>

          <AnimatedSection delay={500}>
            {renderHealthScores()}
          </AnimatedSection>

          <AnimatedSection delay={600}>
            {renderSleepAnalysis()}
          </AnimatedSection>

          <AnimatedSection delay={700}>
            {renderPersonalizationMetrics()}
          </AnimatedSection>
          
          {/* Completion Status */}
          {calculatedData && (
            <GlassCard
              elevation={3}
              blurIntensity="light"
              padding="xl"
              borderRadius="lg"
              style={[
                styles.completionCard,
                isComplete ? styles.completionCardComplete : styles.completionCardIncomplete
              ] as any}
            >
              <Text style={styles.completionIcon}>
                {isComplete ? '🎉' : '📋'}
              </Text>
              <Text style={styles.completionTitle}>
                {isComplete ? 'Profile Complete!' : 'Review Complete!'}
              </Text>
              <Text style={styles.completionText}>
                {isComplete
                  ? 'Your personalized fitness journey is ready to begin with AI-powered recommendations.'
                  : 'All calculations completed. Ready to start your personalized fitness journey!'
                }
              </Text>
            </GlassCard>
          )}
        </View>
      </ScrollView>
      
      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title={
              validationResults?.hasErrors
                ? "⛔ Fix Issues to Continue"
                : isComplete
                  ? "🚀 Start FitAI Journey"
                  : "Complete Setup"
            }
            onPress={() => {
              const buttonTitle = validationResults?.hasErrors
                ? "Fix Issues"
                : isComplete
                  ? "Start Journey"
                  : "Complete Setup";
              console.log(`🔘 AdvancedReviewTab: "${buttonTitle}" button clicked`);
              console.log('🔘 AdvancedReviewTab: isComplete:', isComplete);
              console.log('🔘 AdvancedReviewTab: Calling handler:', isComplete ? 'onNext' : 'onComplete');
              console.log('🔘 AdvancedReviewTab: Button disabled:', !calculatedData || isCalculating || !validationResults?.canProceed || (validationResults?.hasWarnings && !warningsAcknowledged));

              if (isComplete) {
                console.log('✅ AdvancedReviewTab: Calling onNext()...');
                onNext();
              } else {
                console.log('✅ AdvancedReviewTab: Calling onComplete()...');
                onComplete();
              }
            }}
            variant="primary"
            style={styles.completeButton}
            disabled={
              !calculatedData ||
              isCalculating ||
              !validationResults?.canProceed ||
              (validationResults?.hasWarnings && !warningsAcknowledged)
            }
            loading={isLoading}
          />
        </View>
      </View>
      
      {/* Adjustment Wizard Modal */}
      {showAdjustmentWizard && currentError && bodyAnalysis && (
        <AdjustmentWizard
          visible={showAdjustmentWizard}
          error={currentError}
          currentData={{
            bmr: calculatedData?.calculated_bmr || 0,
            tdee: calculatedData?.calculated_tdee || 0,
            currentWeight: bodyAnalysis.current_weight_kg,
            targetWeight: bodyAnalysis.target_weight_kg,
            currentTimeline: bodyAnalysis.target_timeline_weeks,
            currentFrequency: workoutPreferences?.workout_frequency_per_week || 0,
          }}
          onSelectAlternative={(alternative: Alternative) => {
            console.log('✅ Alternative selected:', alternative);
            
            // Determine which tab to navigate to based on what changed
            let targetTab: number | null = null;
            
            // Update body analysis if timeline or target weight changed
            if (alternative.newTimeline !== undefined || alternative.newTargetWeight !== undefined) {
              const updates: Partial<BodyAnalysisData> = {};
              
              if (alternative.newTimeline !== undefined) {
                updates.target_timeline_weeks = alternative.newTimeline;
                console.log(`📅 Updating timeline: ${bodyAnalysis?.target_timeline_weeks} → ${alternative.newTimeline} weeks`);
              }
              
              if (alternative.newTargetWeight !== undefined) {
                updates.target_weight_kg = alternative.newTargetWeight;
                console.log(`🎯 Updating target weight: ${bodyAnalysis?.target_weight_kg} → ${alternative.newTargetWeight} kg`);
              }
              
              onUpdateBodyAnalysis?.(updates);
              targetTab = 3; // Navigate to Body Analysis tab to show changes
            }
            
            // Update workout preferences if frequency changed
            if (alternative.newWorkoutFrequency !== undefined) {
              onUpdateWorkoutPreferences?.({
                workout_frequency_per_week: alternative.newWorkoutFrequency
              });
              console.log(`🏋️ Updating workout frequency: ${workoutPreferences?.workout_frequency_per_week} → ${alternative.newWorkoutFrequency}/week`);
              
              // If only frequency changed (not timeline), navigate to Workout tab
              if (targetTab === null) {
                targetTab = 4; // Navigate to Workout Preferences tab
              }
            }
            
            // Close wizard
            setShowAdjustmentWizard(false);
            
            // Navigate to the relevant tab to show the changes
            if (targetTab !== null && onNavigateToTab) {
              setTimeout(() => {
                onNavigateToTab(targetTab!);
                console.log(`🧭 Navigated to tab ${targetTab} to review changes`);
              }, 300);
            } else {
              // If no navigation, just re-calculate on current tab
              setTimeout(() => performCalculations(), 500);
            }
          }}
          onClose={() => setShowAdjustmentWizard(false)}
        />
      )}
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  scrollView: {
    flex: 1,
  },

  header: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  headerGradient: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
    borderBottomLeftRadius: ResponsiveTheme.borderRadius.xxl,
    borderBottomRightRadius: ResponsiveTheme.borderRadius.xxl,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: rf(22),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  autoSaveIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: `${ResponsiveTheme.colors.success}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  autoSaveText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  calculatingIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  calculatingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  errorIndicator: {
    backgroundColor: `${ResponsiveTheme.colors.error}20`,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  retryButton: {
    alignSelf: 'flex-start',
  },

  retryText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textDecorationLine: 'underline',
  },

  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },

  section: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },

  // Data Summary Section
  summaryGrid: {
    gap: ResponsiveTheme.spacing.md,
  },

  summaryCard: {
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.md,
  },

  summaryContent: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  summaryDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  editIcon: {
    fontSize: rf(18),
    color: ResponsiveTheme.colors.primary,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },

  metricCard: {
    width: '48%',
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  metricProgressContainer: {
    marginVertical: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  metricValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  metricCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
  },

  // Nutrition Section
  nutritionCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  nutritionHeader: {
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  nutritionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  calorieTarget: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  macroItem: {
    alignItems: 'center',
  },

  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  macroValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  macroPercentage: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  otherNutrients: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  nutrientItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  nutrientIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  nutrientText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Weight Management Section
  weightCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  weightHeader: {
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  weightTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  timelineWeeks: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.secondary,
  },

  weightProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  weightItem: {
    alignItems: 'center',
  },

  weightLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  weightValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  weightArrow: {
    fontSize: rf(20),
    color: ResponsiveTheme.colors.textSecondary,
  },

  idealWeightInfo: {
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  idealWeightTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  idealWeightRange: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
  },

  calorieDeficitInfo: {
    alignItems: 'center',
  },

  deficitTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  deficitValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  deficitDaily: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
  },

  // Fitness Section
  fitnessGrid: {
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  fitnessCard: {
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  fitnessCardTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fitnessCardValue: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  fitnessCardUnit: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fitnessCardCategory: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.success,
  },

  heartRateZones: {
    alignItems: 'center',
  },

  heartRateZone: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  recommendationsCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  recommendationsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: 'center',
  },

  recommendationsList: {
    gap: ResponsiveTheme.spacing.sm,
  },

  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  recommendationIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  recommendationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Health Scores Section
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },

  scoreCard: {
    width: '48%',
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  scoreTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: 'center',
  },

  scoreValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  scoreCategory: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'center',
  },

  scoreDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: ResponsiveTheme.spacing.xs,
    fontStyle: 'italic',
  },

  // Sleep Section
  sleepCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  sleepMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sleepMetric: {
    alignItems: 'center',
  },

  sleepLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  sleepValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  sleepArrow: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    marginHorizontal: ResponsiveTheme.spacing.lg,
  },

  sleepEfficiency: {
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  sleepEfficiencyTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  sleepEfficiencyScore: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  sleepRecommendation: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
  },

  // Personalization Section
  personalizationCard: {
    padding: ResponsiveTheme.spacing.lg,
  },

  personalizationGrid: {
    gap: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  personalizationItem: {
    alignItems: 'center',
  },

  personalizationLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  personalizationValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  personalizationBar: {
    width: '100%',
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
  },

  personalizationFill: {
    height: '100%',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },

  personalizationSummary: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    lineHeight: rf(20),
  },

  // Completion Section
  completionCard: {
    padding: ResponsiveTheme.spacing.xl,
    alignItems: 'center',
    marginTop: ResponsiveTheme.spacing.lg,
  },

  completionCardComplete: {
    backgroundColor: `${ResponsiveTheme.colors.success}10`,
    borderColor: ResponsiveTheme.colors.success,
    borderWidth: 2,
  },

  completionCardIncomplete: {
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 2,
  },

  completionIcon: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  completionTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: 'center',
  },

  completionText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(22),
  },

  // Footer
  footer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },

  backButton: {
    flex: 1,
  },

  completeButton: {
    flex: 2,
  },
});

export default AdvancedReviewTab;
