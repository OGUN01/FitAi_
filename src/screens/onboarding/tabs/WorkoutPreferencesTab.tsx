import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw } from '../../../utils/responsive';
import { ResponsiveTheme } from '../../../utils/constants';
import { Button, Card } from '../../../components/ui';
import { MultiSelect } from '../../../components/advanced/MultiSelect';
import { WorkoutPreferencesData, BodyAnalysisData, TabValidationResult } from '../../../types/onboarding';
import { useOnboardingState } from '../../../hooks/useOnboardingState';

// ============================================================================
// TYPES
// ============================================================================

interface WorkoutPreferencesTabProps {
  data: WorkoutPreferencesData | null;
  bodyAnalysisData?: BodyAnalysisData | null; // For auto-population
  validationResult?: TabValidationResult;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
}

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const FITNESS_GOALS = [
  { id: 'weight_loss', title: 'Weight Loss', icon: '🔥', description: 'Burn fat and lose weight' },
  { id: 'muscle_gain', title: 'Muscle Gain', icon: '💪', description: 'Build lean muscle mass' },
  { id: 'strength', title: 'Strength', icon: '🏋️', description: 'Increase overall strength' },
  { id: 'endurance', title: 'Endurance', icon: '🏃', description: 'Improve cardiovascular fitness' },
  { id: 'flexibility', title: 'Flexibility', icon: '🧘', description: 'Enhance mobility and flexibility' },
  { id: 'general_fitness', title: 'General Fitness', icon: '⚡', description: 'Overall health and wellness' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise', icon: '🪑' },
  { value: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', icon: '🚶' },
  { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', icon: '🏃‍♂️' },
  { value: 'active', label: 'Very Active', description: 'Hard exercise 6-7 days/week', icon: '🏋️‍♂️' },
  { value: 'extreme', label: 'Extremely Active', description: 'Very hard exercise, physical job', icon: '🔥' },
];

const LOCATION_OPTIONS = [
  { id: 'home', title: 'Home', icon: '🏠', description: 'Workout from the comfort of your home' },
  { id: 'gym', title: 'Gym', icon: '🏋️', description: 'Access to full gym equipment' },
  { id: 'both', title: 'Both', icon: '🔄', description: 'Flexible workouts anywhere' },
];

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight', value: 'bodyweight', icon: '🤸' },
  { id: 'dumbbells', label: 'Dumbbells', value: 'dumbbells', icon: '🏋️' },
  { id: 'resistance-bands', label: 'Resistance Bands', value: 'resistance-bands', icon: '🎗️' },
  { id: 'kettlebells', label: 'Kettlebells', value: 'kettlebells', icon: '⚖️' },
  { id: 'barbell', label: 'Barbell', value: 'barbell', icon: '🏋️‍♂️' },
  { id: 'pull-up-bar', label: 'Pull-up Bar', value: 'pull-up-bar', icon: '🏗️' },
  { id: 'yoga-mat', label: 'Yoga Mat', value: 'yoga-mat', icon: '🧘' },
  { id: 'treadmill', label: 'Treadmill', value: 'treadmill', icon: '🏃' },
  { id: 'stationary-bike', label: 'Stationary Bike', value: 'stationary-bike', icon: '🚴' },
];

const INTENSITY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', description: 'New to fitness or returning after a break', icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience with regular exercise', icon: '💪' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced with consistent training', icon: '🔥' },
];

const WORKOUT_TYPE_OPTIONS = [
  { id: 'strength', label: 'Strength Training', value: 'strength', icon: '💪' },
  { id: 'cardio', label: 'Cardio', value: 'cardio', icon: '❤️' },
  { id: 'hiit', label: 'HIIT', value: 'hiit', icon: '⚡' },
  { id: 'yoga', label: 'Yoga', value: 'yoga', icon: '🧘' },
  { id: 'pilates', label: 'Pilates', value: 'pilates', icon: '🤸‍♀️' },
  { id: 'flexibility', label: 'Flexibility', value: 'flexibility', icon: '🤸' },
  { id: 'functional', label: 'Functional Training', value: 'functional', icon: '🏃‍♂️' },
  { id: 'sports', label: 'Sports Training', value: 'sports', icon: '⚽' },
];

const FLEXIBILITY_LEVELS = [
  { value: 'poor', label: 'Poor', description: 'Limited range of motion', icon: '🔒' },
  { value: 'fair', label: 'Fair', description: 'Average flexibility', icon: '📏' },
  { value: 'good', label: 'Good', description: 'Above average flexibility', icon: '✅' },
  { value: 'excellent', label: 'Excellent', description: 'Very flexible', icon: '🤸' },
];

const WORKOUT_TIMES = [
  { value: 'morning', label: 'Morning', icon: '🌅', description: '6AM - 10AM' },
  { value: 'afternoon', label: 'Afternoon', icon: '☀️', description: '12PM - 4PM' },
  { value: 'evening', label: 'Evening', icon: '🌆', description: '6PM - 9PM' },
];

// ============================================================================
// COMPONENT
// ============================================================================

const WorkoutPreferencesTab: React.FC<WorkoutPreferencesTabProps> = ({
  data,
  bodyAnalysisData,
  validationResult,
  onNext,
  onBack,
  isLoading = false,
  isAutoSaving = false,
}) => {
  const { updateWorkoutPreferences } = useOnboardingState();
  
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
  
  // Update parent state when form data changes
  useEffect(() => {
    updateWorkoutPreferences(formData);
  }, [formData, updateWorkoutPreferences]);
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  const updateField = <K extends keyof WorkoutPreferencesData>(
    field: K,
    value: WorkoutPreferencesData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
  
  const renderGoalsAndActivitySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Fitness Goals & Activity Level</Text>
      
      {/* Primary Goals */}
      <View style={styles.goalField}>
        <Text style={styles.fieldLabel}>What are your fitness goals? (Select all that apply)</Text>
        {bodyAnalysisData?.ai_body_type && (
          <Text style={styles.autoSuggestText}>
            💡 Based on your {bodyAnalysisData.ai_body_type} body type, we suggest focusing on{' '}
            {bodyAnalysisData.ai_body_type === 'ectomorph' ? 'muscle gain and strength' :
             bodyAnalysisData.ai_body_type === 'endomorph' ? 'weight loss and endurance' :
             'strength and muscle gain'}
          </Text>
        )}
        
        <View style={styles.goalsGrid}>
          {FITNESS_GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              onPress={() => toggleGoal(goal.id)}
              style={styles.goalItem}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.goalCard,
                  formData.primary_goals.includes(goal.id) ? styles.goalCardSelected : null,
                ])}
                variant="outlined"
              >
                <View style={styles.goalContent}>
                  <Text style={styles.goalIcon}>{goal.icon}</Text>
                  <Text style={[
                    styles.goalTitle,
                    formData.primary_goals.includes(goal.id) ? styles.goalTitleSelected : null,
                  ]}>
                    {goal.title}
                  </Text>
                  <Text style={styles.goalDescription}>{goal.description}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
        {hasFieldError('goals') && (
          <Text style={styles.errorText}>{getFieldError('goals')}</Text>
        )}
      </View>
      
      {/* Activity Level */}
      <View style={styles.activityField}>
        <Text style={styles.fieldLabel}>Current Activity Level</Text>
        <Text style={styles.fieldSubtitle}>Your physical activity outside of planned workouts</Text>
        
        {ACTIVITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.value}
            onPress={() => updateField('activity_level', level.value as WorkoutPreferencesData['activity_level'])}
          >
            <Card
              style={StyleSheet.flatten([
                styles.activityCard,
                formData.activity_level === level.value ? styles.activityCardSelected : null,
              ])}
              variant="outlined"
            >
              <View style={styles.activityContent}>
                <Text style={styles.activityIcon}>{level.icon}</Text>
                <View style={styles.activityText}>
                  <Text style={[
                    styles.activityTitle,
                    formData.activity_level === level.value ? styles.activityTitleSelected : null,
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={styles.activityDescription}>{level.description}</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        {hasFieldError('activity') && (
          <Text style={styles.errorText}>{getFieldError('activity')}</Text>
        )}
      </View>
    </View>
  );
  
  const renderCurrentFitnessSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Current Fitness Assessment</Text>
      <Text style={styles.sectionSubtitle}>Help us understand your starting point</Text>
      
      <View style={styles.fitnessGrid}>
        <View style={styles.fitnessItem}>
          <Text style={styles.fitnessLabel}>Workout Experience</Text>
          <View style={styles.experienceSlider}>
            {[0, 1, 2, 5, 10, 15, 20].map((years) => (
              <TouchableOpacity
                key={years}
                style={StyleSheet.flatten([
                  styles.experienceOption,
                  formData.workout_experience_years === years ? styles.experienceOptionSelected : null,
                ])}
                onPress={() => updateField('workout_experience_years', years)}
              >
                <Text style={[
                  styles.experienceText,
                  formData.workout_experience_years === years ? styles.experienceTextSelected : null,
                ]}>
                  {years === 0 ? 'New' : `${years}y`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.fitnessItem}>
          <Text style={styles.fitnessLabel}>Current Workout Frequency</Text>
          <View style={styles.frequencySlider}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((days) => (
              <TouchableOpacity
                key={days}
                style={StyleSheet.flatten([
                  styles.frequencyOption,
                  formData.workout_frequency_per_week === days ? styles.frequencyOptionSelected : null,
                ])}
                onPress={() => updateField('workout_frequency_per_week', days)}
              >
                <Text style={[
                  styles.frequencyText,
                  formData.workout_frequency_per_week === days ? styles.frequencyTextSelected : null,
                ]}>
                  {days === 0 ? 'None' : `${days}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.fitnessItem}>
          <Text style={styles.fitnessLabel}>Max Pushups: {formData.can_do_pushups}</Text>
          <View style={styles.pushupsSlider}>
            {[0, 5, 10, 15, 20, 30, 50, 100].map((pushups) => (
              <TouchableOpacity
                key={pushups}
                style={StyleSheet.flatten([
                  styles.pushupsOption,
                  formData.can_do_pushups === pushups ? styles.pushupsOptionSelected : null,
                ])}
                onPress={() => updateField('can_do_pushups', pushups)}
              >
                <Text style={[
                  styles.pushupsText,
                  formData.can_do_pushups === pushups ? styles.pushupsTextSelected : null,
                ]}>
                  {pushups === 0 ? 'None' : pushups}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.fitnessItem}>
          <Text style={styles.fitnessLabel}>Continuous Running: {formData.can_run_minutes} minutes</Text>
          <View style={styles.runningSlider}>
            {[0, 5, 10, 15, 20, 30, 45, 60].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={StyleSheet.flatten([
                  styles.runningOption,
                  formData.can_run_minutes === minutes ? styles.runningOptionSelected : null,
                ])}
                onPress={() => updateField('can_run_minutes', minutes)}
              >
                <Text style={[
                  styles.runningText,
                  formData.can_run_minutes === minutes ? styles.runningTextSelected : null,
                ]}>
                  {minutes === 0 ? 'None' : `${minutes}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.fitnessItem}>
          <Text style={styles.fitnessLabel}>Flexibility Level</Text>
          <View style={styles.flexibilityGrid}>
            {FLEXIBILITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => updateField('flexibility_level', level.value as WorkoutPreferencesData['flexibility_level'])}
                style={styles.flexibilityItem}
              >
                <Card
                  style={StyleSheet.flatten([
                    styles.flexibilityCard,
                    formData.flexibility_level === level.value ? styles.flexibilityCardSelected : null,
                  ])}
                  variant="outlined"
                >
                  <Text style={styles.flexibilityIcon}>{level.icon}</Text>
                  <Text style={[
                    styles.flexibilityTitle,
                    formData.flexibility_level === level.value ? styles.flexibilityTitleSelected : null,
                  ]}>
                    {level.label}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
  
  const renderWorkoutPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Workout Preferences</Text>
      
      {/* Location */}
      <View style={styles.preferenceField}>
        <Text style={styles.fieldLabel}>Where do you prefer to workout?</Text>
        <View style={styles.locationGrid}>
          {LOCATION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => updateField('location', option.id as WorkoutPreferencesData['location'])}
              style={styles.locationItem}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.locationCard,
                  formData.location === option.id ? styles.locationCardSelected : null,
                ])}
                variant="outlined"
              >
                <View style={styles.locationContent}>
                  <Text style={styles.locationIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.locationTitle,
                    formData.location === option.id ? styles.locationTitleSelected : null,
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={styles.locationDescription}>{option.description}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Equipment */}
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
      
      {/* Workout Duration */}
      <View style={styles.preferenceField}>
        <Text style={styles.fieldLabel}>
          Workout Duration: {formatTime(formData.time_preference)}
        </Text>
        <View style={styles.durationSlider}>
          {[15, 30, 45, 60, 75, 90, 120].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={StyleSheet.flatten([
                styles.durationOption,
                formData.time_preference === minutes ? styles.durationOptionSelected : null,
              ])}
              onPress={() => updateField('time_preference', minutes)}
            >
              <Text style={[
                styles.durationText,
                formData.time_preference === minutes ? styles.durationTextSelected : null,
              ]}>
                {formatTime(minutes)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Intensity Level */}
      <View style={styles.preferenceField}>
        <Text style={styles.fieldLabel}>Fitness Level</Text>
        {INTENSITY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => updateField('intensity', option.value as WorkoutPreferencesData['intensity'])}
          >
            <Card
              style={StyleSheet.flatten([
                styles.intensityCard,
                formData.intensity === option.value ? styles.intensityCardSelected : null,
              ])}
              variant="outlined"
            >
              <View style={styles.intensityContent}>
                <View style={styles.intensityHeader}>
                  <Text style={styles.intensityIcon}>{option.icon}</Text>
                  <Text style={StyleSheet.flatten([
                    styles.intensityTitle,
                    formData.intensity === option.value ? styles.intensityTitleSelected : null,
                  ])}>
                    {option.label}
                  </Text>
                </View>
                <Text style={styles.intensityDescription}>{option.description}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Workout Types */}
      <View style={styles.preferenceField}>
        <MultiSelect
          options={WORKOUT_TYPE_OPTIONS}
          selectedValues={formData.workout_types}
          onSelectionChange={(values) => updateField('workout_types', values)}
          label="Preferred Workout Types"
          placeholder="Select your favorite workout types"
          searchable={true}
          maxSelections={5}
        />
        {hasFieldError('workout types') && (
          <Text style={styles.errorText}>{getFieldError('workout types')}</Text>
        )}
      </View>
      
      {/* Preferred Workout Times */}
      <View style={styles.preferenceField}>
        <Text style={styles.fieldLabel}>Preferred Workout Times</Text>
        <View style={styles.workoutTimesGrid}>
          {WORKOUT_TIMES.map((time) => (
            <TouchableOpacity
              key={time.value}
              onPress={() => toggleWorkoutTime(time.value)}
              style={styles.workoutTimeItem}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.workoutTimeCard,
                  formData.preferred_workout_times.includes(time.value) ? styles.workoutTimeCardSelected : null,
                ])}
                variant="outlined"
              >
                <View style={styles.workoutTimeContent}>
                  <Text style={styles.workoutTimeIcon}>{time.icon}</Text>
                  <Text style={StyleSheet.flatten([
                    styles.workoutTimeTitle,
                    formData.preferred_workout_times.includes(time.value) ? styles.workoutTimeTitleSelected : null,
                  ])}>
                    {time.label}
                  </Text>
                  <Text style={styles.workoutTimeDescription}>{time.description}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
  
  const renderWorkoutStyleSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Workout Style Preferences</Text>
      <Text style={styles.sectionSubtitle}>Tell us about your workout preferences</Text>
      
      <View style={styles.stylePreferencesGrid}>
        {[
          { key: 'enjoys_cardio', title: 'Enjoys Cardio', icon: '❤️', description: 'Running, cycling, aerobic exercises' },
          { key: 'enjoys_strength_training', title: 'Enjoys Strength Training', icon: '💪', description: 'Weight lifting, resistance exercises' },
          { key: 'enjoys_group_classes', title: 'Enjoys Group Classes', icon: '👥', description: 'Fitness classes, group workouts' },
          { key: 'prefers_outdoor_activities', title: 'Prefers Outdoor Activities', icon: '🌳', description: 'Hiking, outdoor sports, fresh air' },
          { key: 'needs_motivation', title: 'Needs External Motivation', icon: '📢', description: 'Coaching, accountability, encouragement' },
          { key: 'prefers_variety', title: 'Prefers Workout Variety', icon: '🔄', description: 'Different exercises, avoiding routine' },
        ].map((preference) => {
          const isActive = formData[preference.key as keyof WorkoutPreferencesData] as boolean;
          
          return (
            <TouchableOpacity
              key={preference.key}
              onPress={() => updateField(preference.key as keyof WorkoutPreferencesData, !isActive as any)}
              style={styles.stylePreferenceItem}
            >
              <Card
                style={StyleSheet.flatten([
                  styles.stylePreferenceCard,
                  isActive ? styles.stylePreferenceCardSelected : null,
                ])}
                variant="outlined"
              >
                <View style={styles.stylePreferenceContent}>
                  <View style={styles.stylePreferenceHeader}>
                    <Text style={styles.stylePreferenceIcon}>{preference.icon}</Text>
                    <View style={styles.stylePreferenceToggle}>
                      <View style={StyleSheet.flatten([
                        styles.toggleSwitch,
                        isActive ? styles.toggleSwitchActive : null,
                      ])}>
                        <View style={StyleSheet.flatten([
                          styles.toggleThumb,
                          isActive ? styles.toggleThumbActive : null,
                        ])} />
                      </View>
                    </View>
                  </View>
                  
                  <Text style={StyleSheet.flatten([
                    styles.stylePreferenceTitle,
                    isActive ? styles.stylePreferenceTitleSelected : null,
                  ])}>
                    {preference.title}
                  </Text>
                  
                  <Text style={styles.stylePreferenceDescription}>
                    {preference.description}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
  
  const renderWeightGoalsSection = () => {
    if (!bodyAnalysisData) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weight Goals Summary</Text>
        <Text style={styles.sectionSubtitle}>Auto-populated from your body analysis</Text>
        
        <Card style={styles.weightGoalsCard}>
          <View style={styles.weightGoalsContent}>
            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Current Weight</Text>
              <Text style={styles.weightGoalValue}>{bodyAnalysisData.current_weight_kg}kg</Text>
            </View>
            
            <Text style={styles.weightGoalArrow}>→</Text>
            
            <View style={styles.weightGoalItem}>
              <Text style={styles.weightGoalLabel}>Target Weight</Text>
              <Text style={styles.weightGoalValue}>{bodyAnalysisData.target_weight_kg}kg</Text>
            </View>
            
            <Text style={styles.weightGoalArrow}>⏱️</Text>
            
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
          <Text style={styles.title}>Let's create your fitness profile</Text>
          <Text style={styles.subtitle}>
            Tell us about your goals, current fitness level, and workout preferences
          </Text>
          
          {/* Auto-save Indicator */}
          {isAutoSaving && (
            <View style={styles.autoSaveIndicator}>
              <Text style={styles.autoSaveText}>💾 Saving...</Text>
            </View>
          )}
        </View>
        
        {/* Form Sections */}
        <View style={styles.content}>
          {renderGoalsAndActivitySection()}
          {renderCurrentFitnessSection()}
          {renderWorkoutPreferencesSection()}
          {renderWeightGoalsSection()}
        </View>
        
        {/* Validation Summary */}
        {validationResult && (
          <View style={styles.validationSummary}>
            <Card style={styles.validationCard}>
              <Text style={styles.validationTitle}>
                {validationResult.is_valid ? '✅ Ready to Continue' : '⚠️ Please Complete'}
              </Text>
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
            </Card>
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
          <Button
            title="Next: Advanced Review"
            onPress={onNext}
            variant="primary"
            style={styles.nextButton}
            disabled={!validationResult?.is_valid}
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
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  sectionSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },

  fieldLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  fieldSubtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  // Goals Section
  goalField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  autoSuggestText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(18),
  },

  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },

  goalItem: {
    width: '48%',
  },

  goalCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  goalCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  goalContent: {
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.md,
  },

  goalIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  goalTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  goalTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  goalDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Activity Level Section
  activityField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.md,
  },

  activityIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.md,
  },

  activityText: {
    flex: 1,
  },

  activityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  activityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  activityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Fitness Assessment Section
  fitnessGrid: {
    gap: ResponsiveTheme.spacing.lg,
  },

  fitnessItem: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  fitnessLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  // Sliders
  experienceSlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.xs,
  },

  experienceOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  experienceOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  experienceText: {
    fontSize: ResponsiveTheme.fontSize.sm,
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
    gap: ResponsiveTheme.spacing.xs,
  },

  frequencyOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  frequencyOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  frequencyText: {
    fontSize: ResponsiveTheme.fontSize.sm,
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
    gap: ResponsiveTheme.spacing.xs,
  },

  pushupsOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  pushupsOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  pushupsText: {
    fontSize: ResponsiveTheme.fontSize.sm,
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
    gap: ResponsiveTheme.spacing.xs,
  },

  runningOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  runningOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  runningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  runningTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  flexibilityGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },

  flexibilityItem: {
    flex: 1,
  },

  flexibilityCard: {
    padding: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },

  flexibilityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  flexibilityIcon: {
    fontSize: rf(20),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  flexibilityTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },

  flexibilityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  // Workout Preferences Section
  preferenceField: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  locationGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },

  locationItem: {
    flex: 1,
  },

  locationCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  locationCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  locationContent: {
    alignItems: 'center',
  },

  locationIcon: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  locationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  locationTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  locationDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  durationSlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.xs,
  },

  durationOption: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  durationOptionSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
  },

  durationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  durationTextSelected: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  intensityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  intensityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  intensityContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  intensityIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  intensityTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  intensityTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  intensityDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Workout Times Section
  workoutTimesGrid: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
  },

  workoutTimeItem: {
    flex: 1,
  },

  workoutTimeCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  workoutTimeCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  workoutTimeContent: {
    alignItems: 'center',
  },

  workoutTimeIcon: {
    fontSize: rf(20),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  workoutTimeTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  workoutTimeTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  workoutTimeDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Style Preferences Section
  stylePreferencesGrid: {
    gap: ResponsiveTheme.spacing.sm,
  },

  stylePreferenceItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  stylePreferenceCard: {
    padding: ResponsiveTheme.spacing.md,
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
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  stylePreferenceIcon: {
    fontSize: rf(20),
  },

  stylePreferenceToggle: {
    marginLeft: ResponsiveTheme.spacing.md,
  },

  stylePreferenceTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  stylePreferenceTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  stylePreferenceDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },

  // Toggle Switch Styles
  toggleSwitch: {
    width: rw(40),
    height: rh(20),
    borderRadius: rh(10),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: rp(2),
  },

  toggleSwitchActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  toggleThumb: {
    width: rw(16),
    height: rh(16),
    borderRadius: rh(8),
    backgroundColor: ResponsiveTheme.colors.white,
    alignSelf: 'flex-start',
  },

  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Weight Goals Section
  weightGoalsCard: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: `${ResponsiveTheme.colors.secondary}10`,
    borderColor: ResponsiveTheme.colors.secondary,
    borderWidth: 1,
  },

  weightGoalsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ResponsiveTheme.spacing.md,
  },

  weightGoalItem: {
    alignItems: 'center',
  },

  weightGoalLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  weightGoalValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.secondary,
  },

  weightGoalArrow: {
    fontSize: rf(20),
    color: ResponsiveTheme.colors.textSecondary,
  },

  weeklyRateInfo: {
    alignItems: 'center',
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  weeklyRateText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Validation Section
  validationSummary: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  validationCard: {
    padding: ResponsiveTheme.spacing.md,
  },

  validationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationPercentage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrors: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationErrorTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.error,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationErrorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    lineHeight: rf(18),
  },

  validationWarnings: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  validationWarningTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.warning,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  validationWarningText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.warning,
    lineHeight: rf(18),
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
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

  nextButton: {
    flex: 2,
  },
});

export default WorkoutPreferencesTab;
