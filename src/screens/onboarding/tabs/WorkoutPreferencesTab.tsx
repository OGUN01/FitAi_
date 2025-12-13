import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { rf, rp, rh, rw } from '../../../utils/responsive';
import { ResponsiveTheme } from '../../../utils/constants';
import { Button, Slider, SwipeableCardStack, type SwipeableCard } from '../../../components/ui';
import { GlassCard, AnimatedPressable, AnimatedSection, HeroSection } from '../../../components/ui/aurora';
import { gradients, toLinearGradientProps } from '../../../theme/gradients';
import { MultiSelect } from '../../../components/advanced/MultiSelect';
import { WorkoutPreferencesData, BodyAnalysisData, PersonalInfoData, TabValidationResult } from '../../../types/onboarding';
import { MetabolicCalculations } from '../../../utils/healthCalculations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

interface WorkoutPreferencesTabProps {
  data: WorkoutPreferencesData | null;
  bodyAnalysisData?: BodyAnalysisData | null; // For auto-population
  personalInfoData?: PersonalInfoData | null; // For intensity calculation
  validationResult?: TabValidationResult;
  onNext: (currentData?: WorkoutPreferencesData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<WorkoutPreferencesData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const FITNESS_GOALS = [
  { id: 'weight-loss', title: 'Weight Loss', iconName: 'flame-outline', description: 'Burn fat and lose weight' },
  { id: 'weight-gain', title: 'Weight Gain', iconName: 'trending-up-outline', description: 'Gain healthy weight (muscle and mass)' },
  { id: 'muscle-gain', title: 'Muscle Gain', iconName: 'barbell-outline', description: 'Build lean muscle mass' },
  { id: 'strength', title: 'Strength', iconName: 'fitness-outline', description: 'Increase overall strength' },
  { id: 'endurance', title: 'Endurance', iconName: 'speedometer-outline', description: 'Improve cardiovascular fitness' },
  { id: 'flexibility', title: 'Flexibility', iconName: 'body-outline', description: 'Enhance mobility and flexibility' },
  { id: 'general_fitness', title: 'General Fitness', iconName: 'flash-outline', description: 'Overall health and wellness' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise', iconName: 'bed-outline' },
  { value: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', iconName: 'walk-outline' },
  { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', iconName: 'walk-outline' },
  { value: 'active', label: 'Very Active', description: 'Hard exercise 6-7 days/week', iconName: 'barbell-outline' },
  { value: 'extreme', label: 'Extremely Active', description: 'Very hard exercise, physical job', iconName: 'flame-outline' },
];

const LOCATION_OPTIONS = [
  { id: 'home', title: 'Home', iconName: 'home-outline', description: 'Workout from the comfort of your home' },
  { id: 'gym', title: 'Gym', iconName: 'fitness-outline', description: 'Access to full gym equipment' },
  { id: 'both', title: 'Both', iconName: 'repeat-outline', description: 'Flexible workouts anywhere' },
];

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight', value: 'bodyweight', iconName: 'body-outline' },
  { id: 'dumbbells', label: 'Dumbbells', value: 'dumbbells', iconName: 'barbell-outline' },
  { id: 'resistance-bands', label: 'Resistance Bands', value: 'resistance-bands', iconName: 'resize-outline' },
  { id: 'kettlebells', label: 'Kettlebells', value: 'kettlebells', iconName: 'barbell-outline' },
  { id: 'barbell', label: 'Barbell', value: 'barbell', iconName: 'barbell-outline' },
  { id: 'pull-up-bar', label: 'Pull-up Bar', value: 'pull-up-bar', iconName: 'remove-outline' },
  { id: 'yoga-mat', label: 'Yoga Mat', value: 'yoga-mat', iconName: 'body-outline' },
  { id: 'treadmill', label: 'Treadmill', value: 'treadmill', iconName: 'speedometer-outline' },
  { id: 'stationary-bike', label: 'Stationary Bike', value: 'stationary-bike', iconName: 'bicycle-outline' },
];

// Standard gym equipment - auto-populated when gym is selected
const STANDARD_GYM_EQUIPMENT = [
  'bodyweight',
  'dumbbells', 
  'barbell',
  'kettlebells',
  'pull-up-bar',
  'treadmill',
  'stationary-bike',
  'yoga-mat'
];

const INTENSITY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', description: 'New to fitness or returning after a break', iconName: 'leaf-outline' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience with regular exercise', iconName: 'barbell-outline' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced with consistent training', iconName: 'flame-outline' },
];

const WORKOUT_TYPE_OPTIONS = [
  { id: 'strength', label: 'Strength Training', value: 'strength', iconName: 'barbell-outline' },
  { id: 'cardio', label: 'Cardio', value: 'cardio', iconName: 'heart-outline' },
  { id: 'hiit', label: 'HIIT', value: 'hiit', iconName: 'flash-outline' },
  { id: 'yoga', label: 'Yoga', value: 'yoga', iconName: 'body-outline' },
  { id: 'pilates', label: 'Pilates', value: 'pilates', iconName: 'body-outline' },
  { id: 'flexibility', label: 'Flexibility', value: 'flexibility', iconName: 'body-outline' },
  { id: 'functional', label: 'Functional Training', value: 'functional', iconName: 'walk-outline' },
  { id: 'sports', label: 'Sports Training', value: 'sports', iconName: 'football-outline' },
];

const FLEXIBILITY_LEVELS = [
  { value: 'poor', label: 'Poor', description: 'Limited range of motion', iconName: 'lock-closed-outline' },
  { value: 'fair', label: 'Fair', description: 'Average flexibility', iconName: 'resize-outline' },
  { value: 'good', label: 'Good', description: 'Above average flexibility', iconName: 'checkmark-circle-outline' },
  { value: 'excellent', label: 'Excellent', description: 'Very flexible', iconName: 'body-outline' },
];

const WORKOUT_TIMES = [
  { value: 'morning', label: 'Morning', iconName: 'sunny-outline', description: '6AM - 10AM' },
  { value: 'afternoon', label: 'Afternoon', iconName: 'sunny-outline', description: '12PM - 4PM' },
  { value: 'evening', label: 'Evening', iconName: 'moon-outline', description: '6PM - 9PM' },
];

const OCCUPATION_OPTIONS = [
  { value: 'desk_job', label: 'Desk Job' },
  { value: 'light_active', label: 'Light Activity' },
  { value: 'moderate_active', label: 'Moderate Activity' },
  { value: 'heavy_labor', label: 'Heavy Labor' },
  { value: 'very_active', label: 'Very Active' },
];

// ============================================================================
// COMPONENT
// ============================================================================

const WorkoutPreferencesTab: React.FC<WorkoutPreferencesTabProps> = ({
  data,
  bodyAnalysisData,
  personalInfoData,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  onNavigateToTab,
  isLoading = false,
  isAutoSaving = false,
}) => {
  // No longer creating separate state instances - using props from parent
  
  // Intensity recommendation state
  const [intensityRecommendation, setIntensityRecommendation] = useState<{
    level: 'beginner' | 'intermediate' | 'advanced';
    reasoning: string;
  } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<WorkoutPreferencesData>({
    // Existing data
    location: data?.location || 'both',
    equipment: data?.equipment || [],
    time_preference: data?.time_preference || 30,
    intensity: data?.intensity || 'beginner',
    workout_types: data?.workout_types || [],
    
    // Enhanced data
    primary_goals: data?.primary_goals || [],
    activity_level: data?.activity_level || 'sedentary',
    
    // Current fitness assessment
    workout_experience_years: data?.workout_experience_years || 0,
    workout_frequency_per_week: data?.workout_frequency_per_week || 0,
    can_do_pushups: data?.can_do_pushups || 0,
    can_run_minutes: data?.can_run_minutes || 0,
    flexibility_level: data?.flexibility_level || 'fair',
    
    // Weight goals (auto-populated from body analysis)
    weekly_weight_loss_goal: data?.weekly_weight_loss_goal || undefined,
    
    // Preferences
    preferred_workout_times: data?.preferred_workout_times || [],
    enjoys_cardio: data?.enjoys_cardio ?? true,
    enjoys_strength_training: data?.enjoys_strength_training ?? true,
    enjoys_group_classes: data?.enjoys_group_classes ?? false,
    prefers_outdoor_activities: data?.prefers_outdoor_activities ?? false,
    needs_motivation: data?.needs_motivation ?? false,
    prefers_variety: data?.prefers_variety ?? true,
  });
  
  // Sync formData with data prop when it changes (e.g., when navigating back to this tab)
  useEffect(() => {
    if (data) {
      setFormData({
        location: data.location || 'both',
        equipment: data.equipment || [],
        time_preference: data.time_preference || 30,
        intensity: data.intensity || 'beginner',
        workout_types: data.workout_types || [],
        primary_goals: data.primary_goals || [],
        activity_level: data.activity_level || 'sedentary',
        workout_experience_years: data.workout_experience_years || 0,
        workout_frequency_per_week: data.workout_frequency_per_week || 0,
        can_do_pushups: data.can_do_pushups || 0,
        can_run_minutes: data.can_run_minutes || 0,
        flexibility_level: data.flexibility_level || 'fair',
        weekly_weight_loss_goal: data.weekly_weight_loss_goal || undefined,
        preferred_workout_times: data.preferred_workout_times || [],
        enjoys_cardio: data.enjoys_cardio ?? true,
        enjoys_strength_training: data.enjoys_strength_training ?? true,
        enjoys_group_classes: data.enjoys_group_classes ?? false,
        prefers_outdoor_activities: data.prefers_outdoor_activities ?? false,
        needs_motivation: data.needs_motivation ?? false,
        prefers_variety: data.prefers_variety ?? true,
      });
    }
  }, [data]);
  
  // Auto-populate gym equipment when location is gym
  useEffect(() => {
    if (formData.location === 'gym' && formData.equipment.length === 0) {
      setFormData(prev => ({
        ...prev,
        equipment: STANDARD_GYM_EQUIPMENT,
      }));
    }
  }, [formData.location]);
  
  // Auto-calculate activity level from occupation type (NEW APPROACH)
  useEffect(() => {
    if (personalInfoData?.occupation_type) {
      // Map occupation to activity level
      const OCCUPATION_TO_ACTIVITY: Record<string, WorkoutPreferencesData['activity_level']> = {
        desk_job: 'sedentary',
        light_active: 'light',
        moderate_active: 'moderate',
        heavy_labor: 'active',
        very_active: 'extreme',
      };
      
      const calculatedActivityLevel = OCCUPATION_TO_ACTIVITY[personalInfoData.occupation_type] || 'sedentary';
      
      // Only update if it's different to avoid unnecessary re-renders
      if (formData.activity_level !== calculatedActivityLevel) {
        setFormData(prev => ({
          ...prev,
          activity_level: calculatedActivityLevel,
        }));
      }
    }
  }, [personalInfoData?.occupation_type]);
  
  // Auto-populate from body analysis data
  useEffect(() => {
    if (bodyAnalysisData && !data?.weekly_weight_loss_goal) {
      const { current_weight_kg, target_weight_kg, target_timeline_weeks } = bodyAnalysisData;
      
      if (current_weight_kg && target_weight_kg && target_timeline_weeks) {
        const weightDifference = Math.abs(current_weight_kg - target_weight_kg);
        const weeklyRate = Math.min(1.0, weightDifference / target_timeline_weeks); // Max 1kg/week
        
        setFormData(prev => ({
          ...prev,
          weekly_weight_loss_goal: Math.round(weeklyRate * 100) / 100,
        }));
      }
      
      // Auto-suggest goals based on body analysis
      if (bodyAnalysisData.ai_body_type && formData.primary_goals.length === 0) {
        let suggestedGoals: string[] = [];
        
        switch (bodyAnalysisData.ai_body_type) {
          case 'ectomorph':
            suggestedGoals = ['muscle_gain', 'strength'];
            break;
          case 'endomorph':
            suggestedGoals = ['weight_loss', 'endurance'];
            break;
          case 'mesomorph':
            suggestedGoals = ['strength', 'muscle_gain'];
            break;
        }
        
        if (suggestedGoals.length > 0) {
          setFormData(prev => ({ ...prev, primary_goals: suggestedGoals }));
        }
      }
    }
  }, [bodyAnalysisData, data?.weekly_weight_loss_goal, formData.primary_goals.length]);
  
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  const updateField = <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K]
  ) => {
    let updated = { ...formData, [field]: value };
    
    // Auto-populate equipment when gym is selected
    if (field === 'location') {
      if (value === 'gym') {
        updated.equipment = STANDARD_GYM_EQUIPMENT;
      } else if (value === 'home') {
        // Reset to empty when switching to home, let user select
        updated.equipment = [];
      } else if (value === 'both') {
        // For both, keep current selection or reset to empty
        updated.equipment = formData.equipment.length > 0 ? formData.equipment : [];
      }
    }
    
    setFormData(updated);
    onUpdate(updated);
  };
  
  const toggleGoal = (goalId: string) => {
    const currentGoals = formData.primary_goals;
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter(id => id !== goalId)
      : [...currentGoals, goalId];
    updateField('primary_goals', newGoals);
  };
  
  const toggleWorkoutTime = (timeId: string) => {
    const currentTimes = formData.preferred_workout_times;
    const newTimes = currentTimes.includes(timeId)
      ? currentTimes.filter(id => id !== timeId)
      : [...currentTimes, timeId];
    updateField('preferred_workout_times', newTimes);
  };
  
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };
  
  // ============================================================================
  // FITNESS LEVEL AUTO-DETERMINATION (NEW - Using MetabolicCalculations)
  // ============================================================================
  
  // Auto-calculate and show intensity recommendation when fitness assessment changes
  React.useEffect(() => {
    // Only calculate if we have all required data
    if (
      formData.workout_experience_years !== undefined &&
      formData.can_do_pushups !== undefined &&
      formData.can_run_minutes !== undefined &&
      personalInfoData?.age &&
      personalInfoData?.gender
    ) {
      
      const { recommendedIntensity, reasoning } = 
        MetabolicCalculations.calculateRecommendedIntensity(
          formData.workout_experience_years,
          formData.can_do_pushups,
          formData.can_run_minutes,
          personalInfoData.age,
          personalInfoData.gender
        );
      
      // Set recommendation for display
      setIntensityRecommendation({
        level: recommendedIntensity,
        reasoning
      });
      
      // Auto-set intensity (user can override)
      if (formData.intensity !== recommendedIntensity) {
        setFormData(prev => ({
          ...prev,
          intensity: recommendedIntensity
        }));
      }
    }
  }, [
    formData.workout_experience_years,
    formData.can_do_pushups,
    formData.can_run_minutes,
    personalInfoData?.age,
    personalInfoData?.gender
  ]);

  // ============================================================================
  // WORKOUT TYPE AUTO-RECOMMENDATION
  // ============================================================================
  
  const calculateRecommendedWorkoutTypes = (): string[] => {
    const recommendedTypes: string[] = [];
    const { primary_goals, intensity, time_preference, location, equipment } = formData;
    
    // Base recommendations for everyone
    recommendedTypes.push('strength'); // Everyone benefits from strength training
    
    // Goal-based recommendations
    if (primary_goals.includes('weight-loss') || primary_goals.includes('endurance')) {
      recommendedTypes.push('cardio');
      if (time_preference >= 30) {
        recommendedTypes.push('hiit'); // HIIT for efficient fat burning
      }
    }
    
    if (primary_goals.includes('muscle-gain') || primary_goals.includes('strength')) {
      recommendedTypes.push('strength');
      if (intensity === 'advanced') {
        recommendedTypes.push('functional'); // Advanced functional training
      }
    }
    
    if (primary_goals.includes('flexibility') || primary_goals.includes('general-fitness')) {
      recommendedTypes.push('yoga');
      recommendedTypes.push('flexibility');
    }
    
    // Fitness level adjustments
    if (intensity === 'beginner') {
      recommendedTypes.push('yoga'); // Gentle start
      recommendedTypes.push('flexibility');
    } else if (intensity === 'intermediate') {
      recommendedTypes.push('hiit');
      recommendedTypes.push('functional');
    } else if (intensity === 'advanced') {
      recommendedTypes.push('hiit');
      recommendedTypes.push('functional');
      recommendedTypes.push('pilates');
    }
    
    // Equipment-based adjustments
    if (location === 'home' && equipment.includes('yoga-mat')) {
      recommendedTypes.push('yoga', 'pilates');
    }
    
    if (equipment.includes('resistance-bands')) {
      recommendedTypes.push('functional');
    }
    
    // Body analysis integration (if available)
    if (bodyAnalysisData?.ai_body_type) {
      if (bodyAnalysisData.ai_body_type === 'ectomorph') {
        // Focus on muscle building
        recommendedTypes.push('strength', 'functional');
      } else if (bodyAnalysisData.ai_body_type === 'endomorph') {
        // Focus on fat burning
        recommendedTypes.push('cardio', 'hiit');
      } else if (bodyAnalysisData.ai_body_type === 'mesomorph') {
        // Balanced approach
        recommendedTypes.push('strength', 'hiit', 'functional');
      }
    }
    
    // Remove duplicates and return top 4-5 recommendations
    const uniqueTypes = [...new Set(recommendedTypes)];
    return uniqueTypes.slice(0, 5);
  };

  // Auto-update workout types when relevant data changes
  React.useEffect(() => {
    const recommendedTypes = calculateRecommendedWorkoutTypes();
    setFormData(prev => ({ ...prev, workout_types: recommendedTypes }));
  }, [
    formData.primary_goals,
    formData.intensity,
    formData.time_preference,
    formData.location,
    formData.equipment,
    bodyAnalysisData?.ai_body_type
  ]);
  
  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================
  
  const getFieldError = (fieldName: string): string | undefined => {
    return validationResult?.errors.find(error => 
      error.toLowerCase().includes(fieldName.toLowerCase())
    );
  };
  
  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderGoalsAndActivitySection = () => {
    // Get activity level info for display
    const currentActivityLevel = ACTIVITY_LEVELS.find(level => level.value === formData.activity_level);
    const occupationType = personalInfoData?.occupation_type || 'desk_job';
    const occupationLabel = OCCUPATION_OPTIONS.find(opt => opt.value === occupationType)?.label || 'Unknown';

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>Fitness Goals</Text>
        
        {/* Primary Goals */}
        <View style={styles.goalField}>
          <Text style={styles.fieldLabel}>What are your fitness goals? (Select all that apply)</Text>
          {bodyAnalysisData?.ai_body_type && (
            <View style={styles.autoSuggestText}>
              <Ionicons name="bulb-outline" size={rf(16)} color={ResponsiveTheme.colors.primary} style={{ marginRight: ResponsiveTheme.spacing.xs }} />
              <Text style={styles.autoSuggestTextContent}>
                Based on your {bodyAnalysisData.ai_body_type} body type, we suggest focusing on{' '}
                {bodyAnalysisData.ai_body_type === 'ectomorph' ? 'muscle gain and strength' :
                 bodyAnalysisData.ai_body_type === 'endomorph' ? 'weight loss and endurance' :
                 'strength and muscle gain'}
              </Text>
            </View>
          )}
          
          <View style={styles.goalsGrid}>
            {FITNESS_GOALS.map((goal) => (
              <AnimatedPressable
                key={goal.id}
                onPress={() => toggleGoal(goal.id)}
                style={styles.goalItem}
                scaleValue={0.95}
              >
                <GlassCard
                  elevation={formData.primary_goals.includes(goal.id) ? 3 : 1}
                  blurIntensity="light"
                  padding="md"
                  borderRadius="lg"
                  style={StyleSheet.flatten([
                    styles.goalCard,
                    ...(formData.primary_goals.includes(goal.id) ? [styles.goalCardSelected] : []),
                  ])}
                >
                  <View style={styles.goalContent}>
                    <Ionicons
                      name={goal.iconName as any}
                      size={rf(32)}
                      color={formData.primary_goals.includes(goal.id) ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary}
                      style={{ marginBottom: ResponsiveTheme.spacing.sm }}
                    />
                    <Text style={[
                      styles.goalTitle,
                      ...(formData.primary_goals.includes(goal.id) ? [styles.goalTitleSelected] : []),
                    ]}>
                      {goal.title}
                    </Text>
                    <Text style={styles.goalDescription}>{goal.description}</Text>
                  </View>
                </GlassCard>
              </AnimatedPressable>
            ))}
          </View>
          {hasFieldError('goals') && (
            <Text style={styles.errorText}>{getFieldError('goals')}</Text>
          )}
        </View>
        
        {/* Activity Level - Display Only (Auto-calculated from occupation) */}
        <View style={styles.activityField}>
          <Text style={styles.fieldLabel}>Daily Activity Level</Text>
          <Text style={styles.fieldSubtitle}>
            Auto-calculated based on your occupation ({occupationLabel})
          </Text>
          
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.calculatedActivityCard}
          >
            <View style={styles.calculatedActivityContent}>
              <Ionicons
                name={(currentActivityLevel?.iconName as any) || 'bed-outline'}
                size={rf(32)}
                color={ResponsiveTheme.colors.textSecondary}
                style={{ marginRight: ResponsiveTheme.spacing.md }}
              />
              <View style={styles.calculatedActivityText}>
                <Text style={styles.calculatedActivityTitle}>
                  {currentActivityLevel?.label || 'Sedentary'}
                </Text>
                <Text style={styles.calculatedActivityDescription}>
                  {currentActivityLevel?.description || 'Little to no exercise'}
                </Text>
                <View style={styles.calculatedActivityNote}>
                  <Ionicons name="bulb-outline" size={rf(16)} color={ResponsiveTheme.colors.primary} style={{ marginRight: ResponsiveTheme.spacing.xs }} />
                  <Text style={styles.calculatedActivityNoteText}>
                    Activity level is automatically determined by your occupation type from Personal Info (Tab 1).
                    This represents your daily movement outside of planned workouts.
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </View>
      </GlassCard>
    );
  };
  
  const renderCurrentFitnessSection = () => {
    const levelInfo = INTENSITY_OPTIONS.find(opt => opt.value === formData.intensity);

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <Text style={styles.sectionTitle}>Current Fitness Assessment</Text>
        <Text style={styles.sectionSubtitle}>Help us understand your starting point</Text>
        
        {/* Intensity Recommendation with Reasoning */}
        {intensityRecommendation && (
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.calculatedLevelCard}
          >
            <View style={styles.calculatedLevelContent}>
              <Ionicons
                name={(levelInfo?.iconName as any) || 'leaf-outline'}
                size={rf(24)}
                color={ResponsiveTheme.colors.primary}
                style={{ marginRight: ResponsiveTheme.spacing.sm }}
              />
              <View style={styles.calculatedLevelText}>
                <Text style={styles.calculatedLevelTitle}>
                  Recommended Intensity: {intensityRecommendation.level.charAt(0).toUpperCase() + intensityRecommendation.level.slice(1)}
                </Text>
                <Text style={styles.calculatedLevelDescription}>
                  {intensityRecommendation.reasoning}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: ResponsiveTheme.spacing.xs }}>
                  <Ionicons name="bulb-outline" size={rf(12)} color={ResponsiveTheme.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.calculatedLevelHint}>
                    You can change this below if you feel differently
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Recommended Workout Types */}
        <GlassCard
          elevation={2}
          blurIntensity="default"
          padding="md"
          borderRadius="lg"
          style={styles.recommendedTypesCard}
        >
          <View style={styles.recommendedTypesHeader}>
            <Ionicons name="target-outline" size={rf(20)} color={ResponsiveTheme.colors.primary} style={{ marginRight: ResponsiveTheme.spacing.xs }} />
            <Text style={styles.recommendedTypesTitle}>Recommended Workout Types</Text>
          </View>
          <Text style={styles.recommendedTypesDescription}>
            Based on your goals, fitness level, and available equipment
          </Text>
          <View style={styles.recommendedTypesList}>
            {calculateRecommendedWorkoutTypes().map((typeId) => {
              const workoutType = WORKOUT_TYPE_OPTIONS.find(opt => opt.value === typeId);
              return workoutType ? (
                <View key={typeId} style={styles.recommendedTypeItem}>
                  <Ionicons name={workoutType.iconName as any} size={rf(16)} color={ResponsiveTheme.colors.text} style={{ marginRight: ResponsiveTheme.spacing.xs }} />
                  <Text style={styles.recommendedTypeLabel}>{workoutType.label}</Text>
                </View>
              ) : null;
            })}
          </View>
        </GlassCard>

        {/* Interactive Workout Type Explorer */}
        <GlassCard
          elevation={2}
          blurIntensity="medium"
          padding="lg"
          borderRadius="lg"
          style={styles.workoutExplorerCard}
        >
          <Text style={styles.sectionTitle}>Explore Workout Styles</Text>
          <Text style={styles.sectionSubtitle}>
            Swipe right to add, swipe left to skip
          </Text>

          <SwipeableCardStack
            cards={WORKOUT_TYPE_OPTIONS.map((type): SwipeableCard => ({
              id: type.id,
              title: type.label,
              description: `Swipe right to add ${type.label} to your routine`,
              iconName: type.iconName,
            }))}
            onSwipeRight={(cardId) => {
              const currentTypes = formData.workout_types || [];
              if (!currentTypes.includes(cardId)) {
                updateField('workout_types', [...currentTypes, cardId]);
              }
            }}
            onSwipeLeft={(cardId) => {
              // Just skip - do nothing
              console.log(`Skipped ${cardId}`);
            }}
            style={styles.swipeableCards}
          />

          {/* Selected Workout Types */}
          {formData.workout_types && formData.workout_types.length > 0 && (
            <View style={styles.selectedTypesContainer}>
              <Text style={styles.selectedTypesTitle}>Your Selected Workouts:</Text>
              <View style={styles.selectedTypesList}>
                {formData.workout_types.map((typeId) => {
                  const type = WORKOUT_TYPE_OPTIONS.find(opt => opt.value === typeId);
                  return type ? (
                    <AnimatedPressable
                      key={typeId}
                      style={styles.selectedTypeChip}
                      onPress={() => {
                        const newTypes = formData.workout_types.filter(t => t !== typeId);
                        updateField('workout_types', newTypes);
                      }}
                      scaleValue={0.95}
                    >
                      <Ionicons name={type.iconName as any} size={rf(16)} color={ResponsiveTheme.colors.primary} style={{ marginRight: ResponsiveTheme.spacing.xs }} />
                      <Text style={styles.selectedTypeLabel}>{type.label}</Text>
                      <Ionicons name="close-outline" size={rf(16)} color={ResponsiveTheme.colors.error} />
                    </AnimatedPressable>
                  ) : null;
                })}
              </View>
            </View>
          )}
        </GlassCard>

        <View style={styles.fitnessGrid}>
        <View style={styles.fitnessItem}>
          <Slider
            value={formData.workout_experience_years || 0}
            onValueChange={(value) => updateField('workout_experience_years', value)}
            minimumValue={0}
            maximumValue={20}
            step={1}
            label="Workout Experience"
            showTooltip={true}
            formatValue={(val) => val === 0 ? 'New' : `${val} year${val > 1 ? 's' : ''}`}
            style={styles.experienceSlider}
          />
        </View>
        
        <View style={styles.fitnessItem}>
          <Slider
            value={formData.workout_frequency_per_week || 0}
            onValueChange={(value) => updateField('workout_frequency_per_week', value)}
            minimumValue={0}
            maximumValue={7}
            step={1}
            label="Current Workout Frequency"
            showTooltip={true}
            formatValue={(val) => val === 0 ? 'None' : `${val}x per week`}
            style={styles.frequencySlider}
          />
        </View>
        
        <View style={styles.fitnessItem}>
          <Slider
            value={formData.can_do_pushups || 0}
            onValueChange={(value) => updateField('can_do_pushups', value)}
            minimumValue={0}
            maximumValue={100}
            step={5}
            label="Max Pushups"
            showTooltip={true}
            formatValue={(val) => val === 0 ? 'None' : `${val} pushups`}
            style={styles.pushupsSlider}
          />
        </View>
        
        <View style={styles.fitnessItem}>
          <Slider
            value={formData.can_run_minutes || 0}
            onValueChange={(value) => updateField('can_run_minutes', value)}
            minimumValue={0}
            maximumValue={60}
            step={5}
            label="Continuous Running"
            showTooltip={true}
            formatValue={(val) => val === 0 ? 'None' : `${val} minutes`}
            style={styles.runningSlider}
          />
        </View>
        
        <View style={styles.fitnessItem}>
          <Slider
            value={
              formData.flexibility_level === 'poor' ? 2 :
              formData.flexibility_level === 'fair' ? 5 :
              formData.flexibility_level === 'good' ? 7 :
              formData.flexibility_level === 'excellent' ? 10 : 5
            }
            onValueChange={(value) => {
              let level: 'poor' | 'fair' | 'good' | 'excellent' = 'fair';
              if (value <= 3) level = 'poor';
              else if (value <= 6) level = 'fair';
              else if (value <= 8) level = 'good';
              else level = 'excellent';
              updateField('flexibility_level', level);
            }}
            minimumValue={1}
            maximumValue={10}
            step={1}
            label="Flexibility Level"
            showTooltip={true}
            formatValue={(val) => {
              if (val <= 3) return 'Poor';
              if (val <= 6) return 'Fair';
              if (val <= 8) return 'Good';
              return 'Excellent';
            }}
            style={styles.flexibilitySlider}
          />
        </View>
      </View>
      </GlassCard>
    );
  };

  const renderWorkoutPreferencesSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Workout Preferences</Text>
      
      {/* Location */}
      <View style={styles.preferenceField}>
        <Text style={styles.fieldLabel}>Where do you prefer to workout?</Text>
        <View style={styles.locationGrid}>
          {LOCATION_OPTIONS.map((option) => (
            <AnimatedPressable
              key={option.id}
              onPress={() => updateField('location', option.id as WorkoutPreferencesData['location'])}
              style={styles.locationItem}
              scaleValue={0.95}
            >
              <GlassCard
                elevation={formData.location === option.id ? 3 : 1}
                blurIntensity="light"
                padding="md"
                borderRadius="lg"
                style={StyleSheet.flatten([
                  styles.locationCard,
                  ...(formData.location === option.id ? [styles.locationCardSelected] : []),
                ])}
              >
                <View style={styles.locationContent}>
                  <Ionicons
                    name={option.iconName as any}
                    size={rf(24)}
                    color={formData.location === option.id ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary}
                    style={{ marginBottom: ResponsiveTheme.spacing.sm }}
                  />
                  <Text style={[
                    styles.locationTitle,
                    ...(formData.location === option.id ? [styles.locationTitleSelected] : []),
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={styles.locationDescription}>{option.description}</Text>
                </View>
              </GlassCard>
            </AnimatedPressable>
          ))}
        </View>
      </View>
      
      {/* Equipment - Hidden for gym, shown for home/both */}
      {formData.location !== 'gym' ? (
        <View style={styles.preferenceField}>
          <MultiSelect
            options={EQUIPMENT_OPTIONS}
            selectedValues={formData.equipment}
            onSelectionChange={(values) => updateField('equipment', values)}
            label="Available Equipment"
            placeholder="Select equipment you have access to"
            searchable={true}
          />
        </View>
      ) : (
        <View style={styles.preferenceField}>
          <Text style={styles.fieldLabel}>Available Equipment</Text>
          <GlassCard
            elevation={2}
            blurIntensity="default"
            padding="md"
            borderRadius="lg"
            style={styles.gymEquipmentCard}
          >
            <View style={styles.gymEquipmentContent}>
              <Ionicons name="fitness-outline" size={rf(24)} color={ResponsiveTheme.colors.primary} style={{ marginBottom: ResponsiveTheme.spacing.sm }} />
              <Text style={styles.gymEquipmentTitle}>Full Gym Access</Text>
              <Text style={styles.gymEquipmentDescription}>
                All standard gym equipment is available including dumbbells, barbells,
                cardio machines, and more. Equipment selection is automatically configured.
              </Text>
              <View style={styles.gymEquipmentList}>
                {STANDARD_GYM_EQUIPMENT.map((equipmentId, index) => {
                  const equipment = EQUIPMENT_OPTIONS.find(opt => opt.value === equipmentId);
                  return equipment ? (
                    <View key={equipmentId} style={styles.gymEquipmentItem}>
                      <Ionicons name={equipment.iconName as any} size={rf(16)} color={ResponsiveTheme.colors.text} style={{ marginRight: ResponsiveTheme.spacing.xs }} />
                      <Text style={styles.gymEquipmentItemLabel}>{equipment.label}</Text>
                    </View>
                  ) : null;
                })}
              </View>
            </View>
          </GlassCard>
        </View>
      )}
      
      {/* Workout Duration */}
      <View style={styles.preferenceField}>
        <Text style={styles.fieldLabel}>
          Workout Duration: {formatTime(formData.time_preference)}
        </Text>
        <View style={styles.durationSlider}>
          {[15, 30, 45, 60, 75, 90, 120].map((minutes) => (
            <AnimatedPressable
              key={minutes}
              style={StyleSheet.flatten([
                styles.durationOption,
                ...(formData.time_preference === minutes ? [styles.durationOptionSelected] : []),
              ])}
              onPress={() => updateField('time_preference', minutes)}
              scaleValue={0.95}
            >
              <Text style={[
                styles.durationText,
                ...(formData.time_preference === minutes ? [styles.durationTextSelected] : []),
              ]}>
                {formatTime(minutes)}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>
      
      
      
      {/* Preferred Workout Times */}
      <View style={styles.preferenceField}>
        <Text style={styles.fieldLabel}>Preferred Workout Times</Text>
        <View style={styles.workoutTimesGrid}>
          {WORKOUT_TIMES.map((time) => (
            <AnimatedPressable
              key={time.value}
              onPress={() => toggleWorkoutTime(time.value)}
              style={styles.workoutTimeItem}
              scaleValue={0.95}
            >
              <GlassCard
                elevation={formData.preferred_workout_times.includes(time.value) ? 3 : 1}
                blurIntensity="light"
                padding="md"
                borderRadius="lg"
                style={StyleSheet.flatten([
                  styles.workoutTimeCard,
                  ...(formData.preferred_workout_times.includes(time.value) ? [styles.workoutTimeCardSelected] : []),
                ])}
              >
                <View style={styles.workoutTimeContent}>
                  <Ionicons
                    name={time.iconName as any}
                    size={rf(20)}
                    color={formData.preferred_workout_times.includes(time.value) ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary}
                    style={{ marginBottom: ResponsiveTheme.spacing.sm }}
                  />
                  <Text style={StyleSheet.flatten([
                    styles.workoutTimeTitle,
                    ...(formData.preferred_workout_times.includes(time.value) ? [styles.workoutTimeTitleSelected] : []),
                  ])}>
                    {time.label}
                  </Text>
                  <Text style={styles.workoutTimeDescription}>{time.description}</Text>
                </View>
              </GlassCard>
            </AnimatedPressable>
          ))}
        </View>
      </View>
    </GlassCard>
  );

  const renderWorkoutStyleSection = () => (
    <GlassCard
      style={styles.section}
      elevation={2}
      blurIntensity="medium"
      padding="lg"
      borderRadius="lg"
    >
      <Text style={styles.sectionTitle}>Workout Style Preferences</Text>
      <Text style={styles.sectionSubtitle}>Tell us about your workout preferences</Text>
      
      <View style={styles.stylePreferencesGrid}>
        {[
          { key: 'enjoys_cardio', title: 'Enjoys Cardio', iconName: 'heart-outline', description: 'Running, cycling, aerobic exercises' },
          { key: 'enjoys_strength_training', title: 'Enjoys Strength Training', iconName: 'barbell-outline', description: 'Weight lifting, resistance exercises' },
          { key: 'enjoys_group_classes', title: 'Enjoys Group Classes', iconName: 'people-outline', description: 'Fitness classes, group workouts' },
          { key: 'prefers_outdoor_activities', title: 'Prefers Outdoor Activities', iconName: 'leaf-outline', description: 'Hiking, outdoor sports, fresh air' },
          { key: 'needs_motivation', title: 'Needs External Motivation', iconName: 'megaphone-outline', description: 'Coaching, accountability, encouragement' },
          { key: 'prefers_variety', title: 'Prefers Workout Variety', iconName: 'shuffle-outline', description: 'Different exercises, avoiding routine' },
        ].map((preference) => {
          const isActive = formData[preference.key as keyof WorkoutPreferencesData] as boolean;
          
          return (
            <AnimatedPressable
              key={preference.key}
              onPress={() => updateField(preference.key as keyof WorkoutPreferencesData, !isActive as any)}
              style={styles.stylePreferenceItem}
              scaleValue={0.95}
            >
              <GlassCard
                elevation={isActive ? 3 : 1}
                blurIntensity="light"
                padding="md"
                borderRadius="lg"
                style={StyleSheet.flatten([
                  styles.stylePreferenceCard,
                  ...(isActive ? [styles.stylePreferenceCardSelected] : []),
                ])}
              >
                <View style={styles.stylePreferenceContent}>
                  <View style={styles.stylePreferenceHeader}>
                    <Ionicons
                      name={preference.iconName as any}
                      size={rf(20)}
                      color={isActive ? ResponsiveTheme.colors.primary : ResponsiveTheme.colors.textSecondary}
                    />
                    <View style={styles.stylePreferenceToggle}>
                      <View style={StyleSheet.flatten([
                        styles.toggleSwitch,
                        ...(isActive ? [styles.toggleSwitchActive] : []),
                      ])}>
                        <View style={StyleSheet.flatten([
                          styles.toggleThumb,
                          ...(isActive ? [styles.toggleThumbActive] : []),
                        ])} />
                      </View>
                    </View>
                  </View>

                  <Text style={StyleSheet.flatten([
                    styles.stylePreferenceTitle,
                    ...(isActive ? [styles.stylePreferenceTitleSelected] : []),
                  ])}>
                    {preference.title}
                  </Text>

                  <Text style={styles.stylePreferenceDescription}>
                    {preference.description}
                  </Text>
                </View>
              </GlassCard>
            </AnimatedPressable>
          );
        })}
      </View>
    </GlassCard>
  );

  const renderWeightGoalsSection = () => {
    if (!bodyAnalysisData) return null;

    return (
      <GlassCard
        style={styles.section}
        elevation={2}
        blurIntensity="medium"
        padding="lg"
        borderRadius="lg"
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weight Goals Summary</Text>
          <View style={styles.readOnlyBadge}>
            <Ionicons name="document-text-outline" size={rf(12)} color={ResponsiveTheme.colors.warning} style={{ marginRight: 4 }} />
            <Text style={styles.readOnlyText}>READ ONLY - FROM TAB 3</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>This information was entered in your Body Analysis (Tab 3)</Text>
        
        <GlassCard
          elevation={2}
          blurIntensity="default"
          padding="md"
          borderRadius="lg"
          style={styles.weightGoalsCard}
        >
          <View style={styles.weightGoalsContent}>
            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Current Weight</Text>
              <Text style={styles.weightGoalValue}>{bodyAnalysisData.current_weight_kg}kg</Text>
            </View>

            <Ionicons name="arrow-forward-outline" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />

            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Target Weight</Text>
              <Text style={styles.weightGoalValue}>{bodyAnalysisData.target_weight_kg}kg</Text>
            </View>

            <Ionicons name="time-outline" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />

            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Timeline</Text>
              <Text style={styles.weightGoalValue}>{bodyAnalysisData.target_timeline_weeks}w</Text>
            </View>
          </View>

          {formData.weekly_weight_loss_goal && (
            <View style={styles.weeklyRateInfo}>
              <Text style={styles.weeklyRateText}>
                Safe weekly rate: {formData.weekly_weight_loss_goal}kg/week
              </Text>
            </View>
          )}
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
        {/* Hero Section - Simplified Modern Design */}
        <HeroSection
          image={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80' }}
          overlayGradient={gradients.overlay.dark}
          contentPosition="center"
          height={160}
        >
          <Text style={styles.title}>Workout Preferences</Text>
          <Text style={styles.subtitle}>
            Customize your fitness routine
          </Text>

          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Ionicons name="save-outline" size={rf(14)} color={ResponsiveTheme.colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.autoSaveText}>Saving...</Text>
            </View>
          )}
        </HeroSection>
        
        {/* Form Sections */}
        <View style={styles.content}>
          <AnimatedSection delay={0}>
            {renderGoalsAndActivitySection()}
          </AnimatedSection>

          <AnimatedSection delay={100}>
            {renderCurrentFitnessSection()}
          </AnimatedSection>

          <AnimatedSection delay={200}>
            {renderWorkoutPreferencesSection()}
          </AnimatedSection>

          <AnimatedSection delay={300}>
            {renderWorkoutStyleSection()}
          </AnimatedSection>

          <AnimatedSection delay={400}>
            {renderWeightGoalsSection()}
          </AnimatedSection>
        </View>
        
        {/* Validation Summary */}
        {validationResult && (
          <View style={styles.validationSummary}>
            <GlassCard
              elevation={3}
              blurIntensity="default"
              padding="md"
              borderRadius="lg"
              style={styles.validationCard}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ResponsiveTheme.spacing.xs }}>
                <Ionicons
                  name={validationResult.is_valid ? 'checkmark-circle-outline' : 'warning-outline'}
                  size={rf(20)}
                  color={validationResult.is_valid ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.warning}
                  style={{ marginRight: ResponsiveTheme.spacing.xs }}
                />
                <Text style={styles.validationTitle}>
                  {validationResult.is_valid ? 'Ready to Continue' : 'Please Complete'}
                </Text>
              </View>
              <Text style={styles.validationPercentage}>
                {validationResult.completion_percentage}% Complete
              </Text>

              {validationResult.errors.length > 0 && (
                <View style={styles.validationErrors}>
                  <Text style={styles.validationErrorTitle}>Required:</Text>
                  {validationResult.errors.map((error, index) => (
                    <Text key={index} style={styles.validationErrorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}

              {validationResult.warnings.length > 0 && (
                <View style={styles.validationWarnings}>
                  <Text style={styles.validationWarningTitle}>Recommendations:</Text>
                  {validationResult.warnings.map((warning, index) => (
                    <Text key={index} style={styles.validationWarningText}>
                      • {warning}
                    </Text>
                  ))}
                </View>
              )}
            </GlassCard>
          </View>
        )}
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
          {onNavigateToTab && (
            <Button
              title="Jump to Review"
              onPress={() => {
                // Save current changes before navigating
                onUpdate(formData);
                onNavigateToTab(5);
              }}
              variant="outline"
              style={styles.jumpButton}
            />
          )}
          <Button
            title="Next: Advanced Review"
            onPress={() => {
              // Update parent state and pass current form data to validation
              onUpdate(formData);
              // Small delay to ensure state is updated before validation
              setTimeout(() => {
                onNext(formData);
              }, 100);
            }}
            variant="primary"
            style={styles.nextButton}
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
    backgroundColor: 'transparent',
  },

  scrollView: {
    flex: 1,
  },

  header: {
    marginBottom: 12,
  },

  headerGradient: {
    paddingHorizontal: rw(16),
    paddingTop: rh(20),
    paddingBottom: rh(16),
    borderBottomLeftRadius: rw(24),
    borderBottomRightRadius: rw(24),
  },

  title: {
    fontSize: rf(24),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: rh(4),
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: rf(13),
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: rf(18),
    textAlign: 'center',
  },

  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: rw(12),
    paddingVertical: rh(4),
    borderRadius: rw(16),
    marginTop: rh(8),
  },

  autoSaveText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  content: {
    paddingHorizontal: rw(16),
    width: '100%',
  },

  section: {
    marginBottom: rh(16),
    width: '100%',
  },

  sectionTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: rh(12),
    letterSpacing: -0.3,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rh(8),
  },

  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${ResponsiveTheme.colors.warning}20`,
    paddingHorizontal: rw(8),
    paddingVertical: rh(4),
    borderRadius: rw(6),
  },

  readOnlyText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.warning,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  sectionSubtitle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(12),
    lineHeight: rf(18),
  },

  fieldLabel: {
    fontSize: rf(14),
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: 8,
  },

  fieldSubtitle: {
    fontSize: 12,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 12,
  },

  // Goals Section
  goalField: {
    marginBottom: 16,
  },

  autoSuggestText: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },

  autoSuggestTextContent: {
    flex: 1,
    fontSize: 12,
    color: ResponsiveTheme.colors.primary,
    lineHeight: 16,
  },

  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rw(8),
  },

  goalItem: {
    width: '48%',
    minWidth: 0,
  },

  goalCard: {
    marginBottom: rh(8),
  },

  goalCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  goalContent: {
    alignItems: 'center',
    padding: rw(12),
  },

  goalIcon: {
    fontSize: rf(26),
    marginBottom: rh(8),
  },

  goalTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: rh(4),
  },

  goalTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  goalDescription: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Activity Level Section
  activityField: {
    marginBottom: rh(16),
  },

  activityCard: {
    marginBottom: rh(8),
  },

  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rw(12),
  },

  activityIcon: {
    fontSize: rf(21),
    marginRight: rw(12),
  },

  activityText: {
    flex: 1,
    minWidth: 0,
  },

  activityTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(4),
  },

  activityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  activityDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Fitness Assessment Section
  fitnessGrid: {
    gap: rh(16),
  },

  fitnessItem: {
    marginBottom: 12,
  },

  fitnessLabel: {
    fontSize: 13,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: 8,
  },

  // Sliders
  experienceSlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  experienceOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  experienceOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  experienceText: {
    fontSize: 12,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  experienceTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  frequencySlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  frequencyOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  frequencyOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  frequencyText: {
    fontSize: 12,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  frequencyTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  pushupsSlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  pushupsOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  pushupsOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  pushupsText: {
    fontSize: 12,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  pushupsTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  runningSlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  runningOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  runningOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  runningText: {
    fontSize: 12,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  runningTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  flexibilityGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  flexibilityItem: {
    flex: 1,
  },

  flexibilityCard: {
    padding: 12,
    alignItems: 'center',
  },

  flexibilityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  flexibilityIcon: {
    fontSize: 18,
    marginBottom: 4,
  },

  flexibilityTitle: {
    fontSize: 12,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },

  flexibilityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  // Workout Preferences Section
  preferenceField: {
    marginBottom: 16,
  },

  locationGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  locationItem: {
    flex: 1,
  },

  locationCard: {
    padding: rw(12),
  },

  locationCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  locationContent: {
    alignItems: 'center',
  },

  locationIcon: {
    fontSize: rf(21),
    marginBottom: rh(8),
  },

  locationTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(4),
  },

  locationTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  locationDescription: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  durationSlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rw(6),
  },

  durationOption: {
    paddingVertical: rh(8),
    paddingHorizontal: rw(12),
    borderRadius: rw(8),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  durationOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  durationText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  durationTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  intensityCard: {
    marginBottom: 8,
  },

  intensityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  intensityContent: {
    padding: rw(12),
  },

  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rh(4),
  },

  intensityIcon: {
    fontSize: rf(21),
    marginRight: rw(8),
  },

  intensityTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  intensityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  intensityDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Workout Times Section
  workoutTimesGrid: {
    flexDirection: 'row',
    gap: rw(8),
  },

  workoutTimeItem: {
    flex: 1,
    minWidth: 0,
  },

  workoutTimeCard: {
    padding: rw(12),
  },

  workoutTimeCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  workoutTimeContent: {
    alignItems: 'center',
  },

  workoutTimeIcon: {
    fontSize: rf(18),
    marginBottom: rh(8),
  },

  workoutTimeTitle: {
    fontSize: 12,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: 4,
  },

  workoutTimeTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  workoutTimeDescription: {
    fontSize: 10,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Style Preferences Section
  stylePreferencesGrid: {
    gap: 8,
  },

  stylePreferenceItem: {
    marginBottom: 8,
  },

  stylePreferenceCard: {
    padding: 12,
  },

  stylePreferenceCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  stylePreferenceContent: {
    flex: 1,
  },

  stylePreferenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  stylePreferenceIcon: {
    fontSize: 18,
  },

  stylePreferenceToggle: {
    marginLeft: 12,
  },

  stylePreferenceTitle: {
    fontSize: 13,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: 4,
  },

  stylePreferenceTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  stylePreferenceDescription: {
    fontSize: 11,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 16,
  },

  // Toggle Switch Styles
  toggleSwitch: {
    width: 40,
    height: 20,
    borderRadius: 10,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  toggleSwitchActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ResponsiveTheme.colors.white,
    alignSelf: 'flex-start',
  },

  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Weight Goals Section
  weightGoalsCard: {
    padding: 16,
    backgroundColor: `${ResponsiveTheme.colors.secondary}10`,
    borderColor: ResponsiveTheme.colors.secondary,
    borderWidth: 1,
  },

  weightGoalsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  weightGoalItem: {
    alignItems: 'center',
  },

  weightGoalLabel: {
    fontSize: 12,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 4,
  },

  weightGoalValue: {
    fontSize: 16,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.secondary,
  },

  weightGoalArrow: {
    fontSize: 18,
    color: ResponsiveTheme.colors.textSecondary,
  },

  weeklyRateInfo: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  weeklyRateText: {
    fontSize: 12,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Validation Section
  validationSummary: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  validationCard: {
    padding: 12,
  },

  validationTitle: {
    fontSize: 14,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: 4,
  },

  validationPercentage: {
    fontSize: 13,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: 12,
  },

  validationErrors: {
    marginBottom: 12,
  },

  validationErrorTitle: {
    fontSize: 12,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: 4,
  },

  validationErrorText: {
    fontSize: 12,
    color: ResponsiveTheme.colors.error,
    lineHeight: 16,
  },

  validationWarnings: {
    marginBottom: 12,
  },

  validationWarningTitle: {
    fontSize: 12,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: 4,
  },

  validationWarningText: {
    fontSize: 12,
    color: ResponsiveTheme.colors.warning,
    lineHeight: 16,
  },

  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 15, 26, 0.95)',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },

  backButton: {
    flex: 0.8,
  },

  jumpButton: {
    flex: 1,
  },

  nextButton: {
    flex: 1.5,
  },

  // Gym Equipment Styles
  gymEquipmentCard: {
    padding: rw(12),
    backgroundColor: `${ResponsiveTheme.colors.success}08`,
    borderColor: `${ResponsiveTheme.colors.success}30`,
    borderWidth: 1,
  },

  gymEquipmentContent: {
    alignItems: 'center',
  },

  gymEquipmentIcon: {
    fontSize: rf(26),
    marginBottom: rh(8),
  },

  gymEquipmentTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.success,
    marginBottom: rh(4),
    textAlign: 'center',
  },

  gymEquipmentDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: rh(12),
    lineHeight: rf(16),
  },

  gymEquipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: rw(8),
  },

  gymEquipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: rw(8),
    paddingVertical: rh(4),
    borderRadius: rw(6),
    marginBottom: rh(4),
  },

  gymEquipmentItemIcon: {
    fontSize: rf(14),
    marginRight: rw(4),
  },

  gymEquipmentItemLabel: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Calculated Level Styles
  calculatedLevelCard: {
    padding: rw(12),
    backgroundColor: `${ResponsiveTheme.colors.primary}08`,
    borderColor: `${ResponsiveTheme.colors.primary}30`,
    borderWidth: 1,
    marginBottom: rh(12),
  },

  calculatedLevelContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  calculatedLevelIcon: {
    fontSize: rf(21),
    marginRight: rw(8),
  },

  calculatedLevelText: {
    flex: 1,
    minWidth: 0,
  },

  calculatedLevelTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: rh(4),
  },

  calculatedLevelDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  calculatedLevelHint: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.primary,
    marginTop: rh(4),
    fontStyle: 'italic',
  },

  // Recommended Workout Types Styles
  recommendedTypesCard: {
    padding: rw(12),
    backgroundColor: `${ResponsiveTheme.colors.secondary}08`,
    borderColor: `${ResponsiveTheme.colors.secondary}30`,
    borderWidth: 1,
    marginBottom: rh(12),
  },

  recommendedTypesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rh(4),
  },

  recommendedTypesIcon: {
    fontSize: rf(18),
    marginRight: rw(4),
  },

  recommendedTypesTitle: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.secondary,
  },

  recommendedTypesDescription: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(12),
    lineHeight: rf(16),
  },

  recommendedTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rw(8),
  },

  recommendedTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },

  recommendedTypeIcon: {
    fontSize: 14,
    marginRight: 4,
  },

  recommendedTypeLabel: {
    fontSize: 11,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Workout Explorer Styles (SwipeableCardStack)
  workoutExplorerCard: {
    marginBottom: 16,
  },

  swipeableCards: {
    marginVertical: 12,
    height: Math.min(rh(320), 280),
  },

  selectedTypesContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${ResponsiveTheme.colors.border}40`,
  },

  selectedTypesTitle: {
    fontSize: 13,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: 8,
  },

  selectedTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  selectedTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.primary}40`,
  },

  selectedTypeIcon: {
    fontSize: 14,
    marginRight: 4,
  },

  selectedTypeLabel: {
    fontSize: 11,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginRight: 4,
  },

  selectedTypeRemove: {
    fontSize: 12,
    color: ResponsiveTheme.colors.error,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Calculated Activity Level Styles (Read-only display)
  calculatedActivityCard: {
    padding: 12,
    backgroundColor: `${ResponsiveTheme.colors.info}08`,
    borderColor: `${ResponsiveTheme.colors.info || ResponsiveTheme.colors.primary}30`,
    borderWidth: 1,
    marginTop: 12,
  },

  calculatedActivityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  calculatedActivityIcon: {
    fontSize: rf(32),
    marginRight: ResponsiveTheme.spacing.md,
  },

  calculatedActivityText: {
    flex: 1,
  },

  calculatedActivityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  calculatedActivityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: rf(18),
  },

  calculatedActivityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${ResponsiveTheme.colors.warning}10`,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },

  calculatedActivityNoteIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  calculatedActivityNoteText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
});

export default WorkoutPreferencesTab;
