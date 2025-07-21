import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Button, Card, THEME } from '../../components/ui';
import { MultiSelect } from '../../components/advanced/MultiSelect';
import { Slider } from '../../components/advanced/Slider';

export interface WorkoutPreferences {
  location: 'home' | 'gym' | 'both';
  equipment: string[];
  timePreference: number; // minutes
  intensity: 'beginner' | 'intermediate' | 'advanced';
  workoutTypes: string[];
}

interface WorkoutPreferencesScreenProps {
  onNext: (data: WorkoutPreferences) => void;
  onBack: () => void;
  initialData?: Partial<WorkoutPreferences>;
}

export const WorkoutPreferencesScreen: React.FC<WorkoutPreferencesScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
}) => {
  const [location, setLocation] = useState<WorkoutPreferences['location']>(
    initialData.location || 'both'
  );
  const [equipment, setEquipment] = useState<string[]>(
    initialData.equipment || []
  );
  const [timePreference, setTimePreference] = useState<number>(
    initialData.timePreference || 30
  );
  const [intensity, setIntensity] = useState<WorkoutPreferences['intensity']>(
    initialData.intensity || 'beginner'
  );
  const [workoutTypes, setWorkoutTypes] = useState<string[]>(
    initialData.workoutTypes || []
  );

  const [errors, setErrors] = useState<{
    location?: string;
    workoutTypes?: string;
  }>({});

  const locationOptions = [
    { 
      id: 'home', 
      title: 'Home', 
      icon: '🏠', 
      description: 'Workout from the comfort of your home' 
    },
    { 
      id: 'gym', 
      title: 'Gym', 
      icon: '🏋️', 
      description: 'Access to full gym equipment' 
    },
    { 
      id: 'both', 
      title: 'Both', 
      icon: '🔄', 
      description: 'Flexible workouts anywhere' 
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
      icon: '🌱'
    },
    { 
      value: 'intermediate', 
      label: 'Intermediate', 
      description: 'Some experience with regular exercise',
      icon: '💪'
    },
    { 
      value: 'advanced', 
      label: 'Advanced', 
      description: 'Experienced with consistent training',
      icon: '🔥'
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext({
        location,
        equipment,
        timePreference,
        intensity,
        workoutTypes,
      });
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
          <Text style={styles.title}>What are your workout preferences?</Text>
          <Text style={styles.subtitle}>
            Let's customize your fitness experience
          </Text>
        </View>

        <View style={styles.content}>
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
                      setErrors(prev => ({ ...prev, location: undefined }));
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
                      <Text style={[
                        styles.locationTitle,
                        location === option.id && styles.locationTitleSelected,
                      ]}>
                        {option.title}
                      </Text>
                      <Text style={styles.locationDescription}>
                        {option.description}
                      </Text>
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
            <Text style={styles.sectionTitle}>
              Workout Duration: {formatTime(timePreference)}
            </Text>
            <Text style={styles.sectionSubtitle}>
              How much time can you dedicate per workout?
            </Text>
            <View style={styles.sliderContainer}>
              <Slider
                value={timePreference}
                onValueChange={setTimePreference}
                minimumValue={15}
                maximumValue={120}
                step={15}
                showLabels={true}
                formatLabel={formatTime}
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
                      <Text style={[
                        styles.intensityTitle,
                        intensity === option.value && styles.intensityTitleSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    <Text style={styles.intensityDescription}>
                      {option.description}
                    </Text>
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
                  setErrors(prev => ({ ...prev, workoutTypes: undefined }));
                }
              }}
              label="Preferred Workout Types"
              placeholder="Select your favorite workout types"
              searchable={true}
              maxSelections={5}
            />
            {errors.workoutTypes && (
              <Text style={styles.errorText}>{errors.workoutTypes}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title="Next"
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
    backgroundColor: THEME.colors.background,
  },

  scrollView: {
    flex: 1,
  },

  header: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.xl,
    paddingBottom: THEME.spacing.lg,
  },

  title: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  subtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },

  content: {
    paddingHorizontal: THEME.spacing.lg,
  },

  section: {
    marginBottom: THEME.spacing.xl,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  sectionSubtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },

  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },

  locationItem: {
    width: '31%',
  },

  locationCard: {
    marginBottom: THEME.spacing.sm,
  },

  locationCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}10`,
  },

  locationContent: {
    alignItems: 'center',
    padding: THEME.spacing.md,
  },

  locationIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },

  locationTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },

  locationTitleSelected: {
    color: THEME.colors.primary,
  },

  locationDescription: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  sliderContainer: {
    paddingHorizontal: THEME.spacing.md,
  },

  intensityCard: {
    marginBottom: THEME.spacing.sm,
  },

  intensityCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}10`,
  },

  intensityContent: {
    padding: THEME.spacing.md,
  },

  intensityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },

  intensityIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },

  intensityTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  intensityTitleSelected: {
    color: THEME.colors.primary,
  },

  intensityDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  errorText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.error,
    marginTop: THEME.spacing.sm,
  },

  footer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundSecondary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },

  backButton: {
    flex: 1,
  },

  nextButton: {
    flex: 2,
  },
});
