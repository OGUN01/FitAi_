import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Card, THEME } from '../../components/ui';
import { MultiSelect } from '../../components/advanced/MultiSelect';
import { Slider } from '../../components/advanced/Slider';
import { useEditMode, useEditData, useEditActions } from '../../contexts/EditContext';

export interface WorkoutPreferences {
  location: 'home' | 'gym' | 'both';
  equipment: string[];
  timePreference: number; // minutes
  intensity: 'beginner' | 'intermediate' | 'advanced';
  workoutTypes: string[];
  // Added from GoalsScreen
  primaryGoals: string[];
  // Added from PersonalInfoScreen
  activityLevel: string;
}

interface WorkoutPreferencesScreenProps {
  onNext?: (data: WorkoutPreferences) => void;
  onBack?: () => void;
  initialData?: Partial<WorkoutPreferences>;
  bodyAnalysis?: any; // For auto-population from body analysis
  // Edit mode props
  isEditMode?: boolean;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

export const WorkoutPreferencesScreen: React.FC<WorkoutPreferencesScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
  bodyAnalysis,
  isEditMode: propIsEditMode = false,
  onEditComplete,
  onEditCancel,
}) => {
  // Detect edit mode from context or props
  const isInEditContext = (() => {
    try {
      const { isEditMode } = useEditMode();
      return isEditMode;
    } catch {
      return false;
    }
  })();

  const isEditMode = isInEditContext || propIsEditMode;

  // Get edit data if in edit context
  const editContextData = (() => {
    try {
      const { currentData, updateData } = useEditData();
      const { saveChanges, cancelEdit } = useEditActions();
      return { currentData, updateData, saveChanges, cancelEdit };
    } catch {
      return null;
    }
  })();

  // Determine initial data source
  const getInitialData = () => {
    if (isEditMode && editContextData?.currentData) {
      return editContextData.currentData;
    }
    return initialData;
  };

  const data = getInitialData();
  const [location, setLocation] = useState<WorkoutPreferences['location']>(data.location || 'both');
  const [equipment, setEquipment] = useState<string[]>(data.equipment || []);
  const [timePreference, setTimePreference] = useState<number>(data.timePreference || 30);
  const [intensity, setIntensity] = useState<WorkoutPreferences['intensity']>(
    data.intensity || 'beginner'
  );
  const [workoutTypes, setWorkoutTypes] = useState<string[]>(data.workoutTypes || []);
  const [primaryGoals, setPrimaryGoals] = useState<string[]>(data.primaryGoals || []);
  const [activityLevel, setActivityLevel] = useState<string>(data.activityLevel || '');

  const [errors, setErrors] = useState<{
    location?: string;
    workoutTypes?: string;
    primaryGoals?: string;
    activityLevel?: string;
  }>({});

  // Track if data has been populated to prevent loops
  const [isDataPopulated, setIsDataPopulated] = useState(false);

  // Create form data object for syncing
  const formData = {
    location,
    equipment,
    timePreference,
    intensity,
    workoutTypes,
    primaryGoals,
    activityLevel,
  };

  // Update form data when edit context data changes (only once)
  useEffect(() => {
    if (
      isEditMode &&
      editContextData?.currentData &&
      Object.keys(editContextData.currentData).length > 0 &&
      !isDataPopulated
    ) {
      const data = editContextData.currentData;
      setLocation(data.location || 'both');
      setEquipment(data.equipment || []);
      setTimePreference(data.timePreference || 30);
      setIntensity(data.intensity || 'beginner');
      setWorkoutTypes(data.workoutTypes || []);
      setPrimaryGoals(data.primaryGoals || []);
      setActivityLevel(data.activityLevel || '');
      setIsDataPopulated(true);
    }
  }, [isEditMode, editContextData?.currentData, isDataPopulated]);

  // Sync form data with edit context (but not on initial load)
  useEffect(() => {
    if (isEditMode && editContextData?.updateData && isDataPopulated) {
      const timeoutId = setTimeout(() => {
        editContextData.updateData(formData);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [location, equipment, timePreference, intensity, workoutTypes, primaryGoals, activityLevel, isEditMode, isDataPopulated]);

  // Auto-populate from body analysis if available
  useEffect(() => {
    if (bodyAnalysis?.analysis && !isDataPopulated) {
      const analysis = bodyAnalysis.analysis;
      
      // Auto-set intensity based on fitness level
      if (analysis.fitnessLevel) {
        const fitnessMapping: Record<string, WorkoutPreferences['intensity']> = {
          'Beginner': 'beginner',
          'Intermediate': 'intermediate',
          'Advanced': 'advanced'
        };
        setIntensity(fitnessMapping[analysis.fitnessLevel] || 'beginner');
      }
      
      // Suggest goals based on body type
      if (analysis.bodyType === 'Ectomorph' && primaryGoals.length === 0) {
        setPrimaryGoals(['muscle_gain', 'strength']);
      } else if (analysis.bodyType === 'Endomorph' && primaryGoals.length === 0) {
        setPrimaryGoals(['weight_loss', 'endurance']);
      }
    }
  }, [bodyAnalysis, isDataPopulated, primaryGoals.length]);

  const fitnessGoals = [
    {
      id: 'weight_loss',
      title: 'Weight Loss',
      icon: '🔥',
      description: 'Burn fat and lose weight',
    },
    { id: 'muscle_gain', title: 'Muscle Gain', icon: '💪', description: 'Build lean muscle mass' },
    { id: 'strength', title: 'Strength', icon: '🏋️', description: 'Increase overall strength' },
    {
      id: 'endurance',
      title: 'Endurance',
      icon: '🏃',
      description: 'Improve cardiovascular fitness',
    },
    {
      id: 'flexibility',
      title: 'Flexibility',
      icon: '🧘',
      description: 'Enhance mobility and flexibility',
    },
    {
      id: 'general_fitness',
      title: 'General Fitness',
      icon: '⚡',
      description: 'Overall health and wellness',
    },
  ];

  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
    { value: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
    {
      value: 'moderate',
      label: 'Moderately Active',
      description: 'Moderate exercise 3-5 days/week',
    },
    { value: 'active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
    {
      value: 'extreme',
      label: 'Extremely Active',
      description: 'Very hard exercise, physical job',
    },
  ];

  const locationOptions = [
    {
      id: 'home',
      title: 'Home',
      icon: '🏠',
      description: 'Workout from the comfort of your home',
    },
    {
      id: 'gym',
      title: 'Gym',
      icon: '🏋️',
      description: 'Access to full gym equipment',
    },
    {
      id: 'both',
      title: 'Both',
      icon: '🔄',
      description: 'Flexible workouts anywhere',
    },
  ];

  const equipmentOptions = [
    { id: 'bodyweight', label: 'Bodyweight', value: 'bodyweight', icon: '🤸' },
    { id: 'dumbbells', label: 'Dumbbells', value: 'dumbbells', icon: '🏋️' },
    { id: 'resistance-bands', label: 'Resistance Bands', value: 'resistance-bands', icon: '🎗️' },
    { id: 'kettlebells', label: 'Kettlebells', value: 'kettlebells', icon: '⚖️' },
    { id: 'barbell', label: 'Barbell', value: 'barbell', icon: '🏋️‍♂️' },
    { id: 'pull-up-bar', label: 'Pull-up Bar', value: 'pull-up-bar', icon: '🏗️' },
    { id: 'yoga-mat', label: 'Yoga Mat', value: 'yoga-mat', icon: '🧘' },
    { id: 'bench', label: 'Bench', value: 'bench', icon: '🪑' },
    { id: 'cable-machine', label: 'Cable Machine', value: 'cable-machine', icon: '🔗' },
    { id: 'treadmill', label: 'Treadmill', value: 'treadmill', icon: '🏃' },
    { id: 'stationary-bike', label: 'Stationary Bike', value: 'stationary-bike', icon: '🚴' },
    { id: 'rowing-machine', label: 'Rowing Machine', value: 'rowing-machine', icon: '🚣' },
  ];

  const intensityOptions = [
    {
      value: 'beginner',
      label: 'Beginner',
      description: 'New to fitness or returning after a break',
      icon: '🌱',
    },
    {
      value: 'intermediate',
      label: 'Intermediate',
      description: 'Some experience with regular exercise',
      icon: '💪',
    },
    {
      value: 'advanced',
      label: 'Advanced',
      description: 'Experienced with consistent training',
      icon: '🔥',
    },
  ];

  const workoutTypeOptions = [
    { id: 'strength', label: 'Strength Training', value: 'strength', icon: '💪' },
    { id: 'cardio', label: 'Cardio', value: 'cardio', icon: '❤️' },
    { id: 'hiit', label: 'HIIT', value: 'hiit', icon: '⚡' },
    { id: 'yoga', label: 'Yoga', value: 'yoga', icon: '🧘' },
    { id: 'pilates', label: 'Pilates', value: 'pilates', icon: '🤸‍♀️' },
    { id: 'flexibility', label: 'Flexibility', value: 'flexibility', icon: '🤸' },
    { id: 'functional', label: 'Functional Training', value: 'functional', icon: '🏃‍♂️' },
    { id: 'sports', label: 'Sports Training', value: 'sports', icon: '⚽' },
    { id: 'dance', label: 'Dance Fitness', value: 'dance', icon: '💃' },
    { id: 'martial-arts', label: 'Martial Arts', value: 'martial-arts', icon: '🥋' },
  ];

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (workoutTypes.length === 0) {
      newErrors.workoutTypes = 'Please select at least one workout type';
    }
    
    if (primaryGoals.length === 0) {
      newErrors.primaryGoals = 'Please select at least one fitness goal';
    }
    
    if (!activityLevel) {
      newErrors.activityLevel = 'Please select your activity level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    const workoutData = {
      location,
      equipment,
      timePreference,
      intensity,
      workoutTypes,
      primaryGoals,
      activityLevel,
    };

    if (isEditMode) {
      // In edit mode, save the changes
      if (editContextData?.saveChanges) {
        const success = await editContextData.saveChanges();
        if (success && onEditComplete) {
          onEditComplete();
        }
      }
    } else {
      // In onboarding mode, proceed to next step
      if (onNext) {
        onNext(workoutData);
      }
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      // In edit mode, cancel the edit
      if (editContextData?.cancelEdit) {
        editContextData.cancelEdit();
      } else if (onEditCancel) {
        onEditCancel();
      }
    } else {
      // In onboarding mode, go back
      if (onBack) {
        onBack();
      }
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Let's create your fitness profile</Text>
          <Text style={styles.subtitle}>Tell us about your goals, activity level, and workout preferences</Text>
        </View>

        <View style={styles.content}>
          {/* Primary Fitness Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What are your fitness goals?</Text>
            <Text style={styles.sectionSubtitle}>Select all that apply</Text>
            <View style={styles.goalsGrid}>
              {fitnessGoals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => {
                    if (primaryGoals.includes(goal.id)) {
                      setPrimaryGoals(prev => prev.filter(id => id !== goal.id));
                    } else {
                      setPrimaryGoals(prev => [...prev, goal.id]);
                    }
                    if (errors.primaryGoals) {
                      setErrors(prev => ({ ...prev, primaryGoals: undefined }));
                    }
                  }}
                  style={styles.goalItem}
                >
                  <Card
                    style={[
                      styles.goalCard,
                      primaryGoals.includes(goal.id) && styles.goalCardSelected,
                    ]}
                    variant="outlined"
                  >
                    <View style={styles.goalContent}>
                      <Text style={styles.goalIcon}>{goal.icon}</Text>
                      <Text
                        style={[
                          styles.goalTitle,
                          primaryGoals.includes(goal.id) && styles.goalTitleSelected,
                        ]}
                      >
                        {goal.title}
                      </Text>
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
            {errors.primaryGoals && <Text style={styles.errorText}>{errors.primaryGoals}</Text>}
          </View>

          {/* Activity Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Level</Text>
            <Text style={styles.sectionSubtitle}>Your current physical activity outside of planned workouts</Text>
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => {
                  setActivityLevel(level.value);
                  if (errors.activityLevel) {
                    setErrors(prev => ({ ...prev, activityLevel: undefined }));
                  }
                }}
              >
                <Card
                  style={[
                    styles.activityCard,
                    activityLevel === level.value && styles.activityCardSelected,
                  ]}
                  variant="outlined"
                >
                  <View style={styles.activityContent}>
                    <Text
                      style={[
                        styles.activityTitle,
                        activityLevel === level.value && styles.activityTitleSelected,
                      ]}
                    >
                      {level.label}
                    </Text>
                    <Text style={styles.activityDescription}>{level.description}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            {errors.activityLevel && <Text style={styles.errorText}>{errors.activityLevel}</Text>}
          </View>

          {/* Workout Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where do you prefer to workout?</Text>
            <View style={styles.locationGrid}>
              {locationOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => {
                    setLocation(option.id as WorkoutPreferences['location']);
                    if (errors.location) {
                      setErrors((prev) => ({ ...prev, location: undefined }));
                    }
                  }}
                  style={styles.locationItem}
                >
                  <Card
                    style={[
                      styles.locationCard,
                      location === option.id && styles.locationCardSelected,
                    ]}
                    variant="outlined"
                  >
                    <View style={styles.locationContent}>
                      <Text style={styles.locationIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.locationTitle,
                          location === option.id && styles.locationTitleSelected,
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text style={styles.locationDescription}>{option.description}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
            {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          </View>

          {/* Available Equipment */}
          <View style={styles.section}>
            <MultiSelect
              options={equipmentOptions}
              selectedValues={equipment}
              onSelectionChange={setEquipment}
              label="Available Equipment"
              placeholder="Select equipment you have access to"
              searchable={true}
            />
          </View>

          {/* Time Preference */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Duration: {formatTime(timePreference)}</Text>
            <Text style={styles.sectionSubtitle}>How much time can you dedicate per workout?</Text>
            <View style={styles.sliderContainer}>
              <Slider
                min={15}
                max={120}
                value={timePreference}
                onValueChange={setTimePreference}
                step={15}
                showValue={true}
                unit=" min"
              />
            </View>
          </View>

          {/* Intensity Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fitness Level</Text>
            {intensityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setIntensity(option.value as WorkoutPreferences['intensity'])}
              >
                <Card
                  style={[
                    styles.intensityCard,
                    intensity === option.value && styles.intensityCardSelected,
                  ]}
                  variant="outlined"
                >
                  <View style={styles.intensityContent}>
                    <View style={styles.intensityHeader}>
                      <Text style={styles.intensityIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.intensityTitle,
                          intensity === option.value && styles.intensityTitleSelected,
                        ]}
                      >
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
          <View style={styles.section}>
            <MultiSelect
              options={workoutTypeOptions}
              selectedValues={workoutTypes}
              onSelectionChange={(values) => {
                setWorkoutTypes(values);
                if (errors.workoutTypes) {
                  setErrors((prev) => ({ ...prev, workoutTypes: undefined }));
                }
              }}
              label="Preferred Workout Types"
              placeholder="Select your favorite workout types"
              searchable={true}
              maxSelections={5}
            />
            {errors.workoutTypes && <Text style={styles.errorText}>{errors.workoutTypes}</Text>}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title={isEditMode ? 'Cancel' : 'Back'}
            onPress={handleBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title={isEditMode ? 'Save Changes' : 'Next'}
            onPress={handleNext}
            variant="primary"
            style={styles.nextButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

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

  activityCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  activityCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  activityContent: {
    padding: ResponsiveTheme.spacing.md,
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

  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },

  locationItem: {
    width: '31%',
  },

  locationCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  locationCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  locationContent: {
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.md,
  },

  locationIcon: {
    fontSize: rf(32),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  locationTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
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

  sliderContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
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

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.sm,
  },

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
