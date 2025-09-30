import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw } from '../../../utils/responsive';
import { ResponsiveTheme } from '../../../utils/constants';
import { Button, Card } from '../../../components/ui';
import { 
  PersonalInfoData, 
  DietPreferencesData, 
  BodyAnalysisData, 
  WorkoutPreferencesData, 
  AdvancedReviewData 
} from '../../../types/onboarding';
import { useOnboardingState } from '../../../hooks/useOnboardingState';
import { HealthCalculationEngine } from '../../../utils/healthCalculations';

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
  isComplete,
  isLoading = false,
  isAutoSaving = false,
}) => {
  const { updateAdvancedReview } = useOnboardingState();
  
  const [calculatedData, setCalculatedData] = useState<AdvancedReviewData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  
  // Calculate all metrics when component mounts or data changes
  useEffect(() => {
    if (personalInfo && dietPreferences && bodyAnalysis && workoutPreferences) {
      performCalculations();
    }
  }, [personalInfo, dietPreferences, bodyAnalysis, workoutPreferences]);
  
  const performCalculations = async () => {
    if (!personalInfo || !dietPreferences || !bodyAnalysis || !workoutPreferences) {
      setCalculationError('Missing required data for calculations');
      return;
    }
    
    setIsCalculating(true);
    setCalculationError(null);
    
    try {
      console.log('🧮 AdvancedReviewTab: Performing comprehensive health calculations...');
      
      // Simulate calculation time for better UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const calculations = HealthCalculationEngine.calculateAllMetrics(
        personalInfo,
        dietPreferences,
        bodyAnalysis,
        workoutPreferences
      );
      
      // Add completion metrics
      const completionMetrics = calculateCompletionMetrics();
      const finalCalculations = {
        ...calculations,
        ...completionMetrics,
      };
      
      setCalculatedData(finalCalculations);
      updateAdvancedReview(finalCalculations);
      
      console.log('✅ AdvancedReviewTab: All calculations completed successfully');
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
    if (!dietPreferences?.cuisine_preferences?.length) score -= 10;
    
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📋 Data Summary</Text>
      
      <View style={styles.summaryGrid}>
        {/* Personal Info Summary */}
        <TouchableOpacity onPress={() => {/* Navigate to tab 1 */}}>
          <Card style={styles.summaryCard}>
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
          </Card>
        </TouchableOpacity>
        
        {/* Diet Summary */}
        <TouchableOpacity onPress={() => {/* Navigate to tab 2 */}}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryIcon}>🍽️</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryTitle}>Diet Preferences</Text>
                <Text style={styles.summaryDetails}>
                  {dietPreferences?.diet_type}, {dietPreferences?.cuisine_preferences?.length || 0} cuisines
                </Text>
                <Text style={styles.summaryDetails}>
                  {dietPreferences?.breakfast_enabled ? '✓' : '✗'} Breakfast, 
                  {dietPreferences?.lunch_enabled ? '✓' : '✗'} Lunch, 
                  {dietPreferences?.dinner_enabled ? '✓' : '✗'} Dinner
                </Text>
              </View>
              <Text style={styles.editIcon}>✏️</Text>
            </View>
          </Card>
        </TouchableOpacity>
        
        {/* Body Analysis Summary */}
        <TouchableOpacity onPress={() => {/* Navigate to tab 3 */}}>
          <Card style={styles.summaryCard}>
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
          </Card>
        </TouchableOpacity>
        
        {/* Workout Summary */}
        <TouchableOpacity onPress={() => {/* Navigate to tab 4 */}}>
          <Card style={styles.summaryCard}>
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
          </Card>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderMetabolicProfile = () => {
    if (!calculatedData) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Metabolic Profile</Text>
        
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>BMI</Text>
            <Text style={styles.metricValue}>{calculatedData.calculated_bmi}</Text>
            <Text style={styles.metricCategory}>
              {calculatedData.calculated_bmi! < 18.5 ? 'Underweight' :
               calculatedData.calculated_bmi! < 25 ? 'Normal' :
               calculatedData.calculated_bmi! < 30 ? 'Overweight' : 'Obese'}
            </Text>
          </Card>
          
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>BMR</Text>
            <Text style={styles.metricValue}>{calculatedData.calculated_bmr}</Text>
            <Text style={styles.metricCategory}>cal/day</Text>
          </Card>
          
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>TDEE</Text>
            <Text style={styles.metricValue}>{calculatedData.calculated_tdee}</Text>
            <Text style={styles.metricCategory}>cal/day</Text>
          </Card>
          
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Metabolic Age</Text>
            <Text style={styles.metricValue}>{calculatedData.metabolic_age}</Text>
            <Text style={styles.metricCategory}>years</Text>
          </Card>
        </View>
      </View>
    );
  };
  
  const renderNutritionalNeeds = () => {
    if (!calculatedData) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🥗 Daily Nutritional Needs</Text>
        
        <Card style={styles.nutritionCard}>
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
        </Card>
      </View>
    );
  };
  
  const renderWeightManagement = () => {
    if (!calculatedData) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚖️ Weight Management Plan</Text>
        
        <Card style={styles.weightCard}>
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
        </Card>
      </View>
    );
  };
  
  const renderFitnessMetrics = () => {
    if (!calculatedData) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💓 Fitness & Cardiovascular Metrics</Text>
        
        <View style={styles.fitnessGrid}>
          <Card style={styles.fitnessCard}>
            <Text style={styles.fitnessCardTitle}>VO₂ Max</Text>
            <Text style={styles.fitnessCardValue}>{calculatedData.estimated_vo2_max}</Text>
            <Text style={styles.fitnessCardUnit}>ml/kg/min</Text>
            <Text style={styles.fitnessCardCategory}>
              {calculatedData.estimated_vo2_max! > 50 ? 'Excellent' :
               calculatedData.estimated_vo2_max! > 40 ? 'Good' :
               calculatedData.estimated_vo2_max! > 30 ? 'Fair' : 'Poor'}
            </Text>
          </Card>
          
          <Card style={styles.fitnessCard}>
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
          </Card>
        </View>
        
        <Card style={styles.recommendationsCard}>
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
        </Card>
      </View>
    );
  };
  
  const renderHealthScores = () => {
    if (!calculatedData) return null;
    
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
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Health Assessment Scores</Text>
        
        <View style={styles.scoresGrid}>
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Overall Health</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.overall_health_score!) }]}>
              {calculatedData.overall_health_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.overall_health_score!)}</Text>
          </Card>
          
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Diet Readiness</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.diet_readiness_score!) }]}>
              {calculatedData.diet_readiness_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.diet_readiness_score!)}</Text>
          </Card>
          
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Fitness Readiness</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.fitness_readiness_score!) }]}>
              {calculatedData.fitness_readiness_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.fitness_readiness_score!)}</Text>
          </Card>
          
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreTitle}>Goal Realistic</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(calculatedData.goal_realistic_score!) }]}>
              {calculatedData.goal_realistic_score}/100
            </Text>
            <Text style={styles.scoreCategory}>{getScoreCategory(calculatedData.goal_realistic_score!)}</Text>
          </Card>
        </View>
      </View>
    );
  };
  
  const renderSleepAnalysis = () => {
    if (!calculatedData) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>😴 Sleep Analysis</Text>
        
        <Card style={styles.sleepCard}>
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
        </Card>
      </View>
    );
  };
  
  const renderPersonalizationMetrics = () => {
    if (!calculatedData) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Personalization Summary</Text>
        
        <Card style={styles.personalizationCard}>
          <View style={styles.personalizationGrid}>
            <View style={styles.personalizationItem}>
              <Text style={styles.personalizationLabel}>Data Completeness</Text>
              <Text style={styles.personalizationValue}>
                {calculatedData.data_completeness_percentage}%
              </Text>
              <View style={styles.personalizationBar}>
                <View style={[
                  styles.personalizationFill,
                  { width: `${calculatedData.data_completeness_percentage}%` }
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
                  { width: `${calculatedData.reliability_score}%` }
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
                  { width: `${calculatedData.personalization_level}%` }
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
        </Card>
      </View>
    );
  };
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
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
              <TouchableOpacity onPress={performCalculations} style={styles.retryButton}>
                <Text style={styles.retryText}>🔄 Retry Calculations</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {renderDataSummary()}
          {renderMetabolicProfile()}
          {renderNutritionalNeeds()}
          {renderWeightManagement()}
          {renderFitnessMetrics()}
          {renderHealthScores()}
          {renderSleepAnalysis()}
          {renderPersonalizationMetrics()}
          
          {/* Completion Status */}
          {calculatedData && (
            <Card style={[
              styles.completionCard,
              isComplete ? styles.completionCardComplete : styles.completionCardIncomplete
            ]}>
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
            </Card>
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
            title={isComplete ? "🚀 Start FitAI Journey" : "Complete Setup"}
            onPress={isComplete ? onNext : onComplete}
            variant="primary"
            style={styles.completeButton}
            disabled={!calculatedData || isCalculating}
            loading={isLoading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.xl,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
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

  metricLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
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
