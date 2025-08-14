import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Card, THEME } from '../../components/ui';
import { FitnessGoals } from '../../types/user';
import { useEditMode, useEditData, useEditActions } from '../../contexts/EditContext';

interface GoalsScreenProps {
  onNext?: (data: FitnessGoals) => void;
  onBack?: () => void;
  initialData?: Partial<FitnessGoals>;
  // Edit mode props
  isEditMode?: boolean;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

export const GoalsScreen: React.FC<GoalsScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
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
  const [selectedGoals, setSelectedGoals] = useState<string[]>(data.primaryGoals || []);
  const [timeCommitment, setTimeCommitment] = useState<string>(data.timeCommitment || '');
  const [experience, setExperience] = useState<string>(data.experience || '');

  const [errors, setErrors] = useState<{
    goals?: string;
    time?: string;
    experience?: string;
  }>({});

  // Track if data has been populated to prevent loops
  const [isDataPopulated, setIsDataPopulated] = useState(false);

  // Create form data object for syncing
  const formData = {
    primaryGoals: selectedGoals,
    timeCommitment,
    experience,
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
      setSelectedGoals(data.primaryGoals || []);
      setTimeCommitment(data.timeCommitment || '');
      setExperience(data.experience || '');
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
  }, [selectedGoals, timeCommitment, experience, isEditMode, isDataPopulated]);

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

  const timeOptions = [
    { value: '15-30', label: '15-30 minutes', description: 'Quick daily workouts' },
    { value: '30-45', label: '30-45 minutes', description: 'Moderate workout sessions' },
    { value: '45-60', label: '45-60 minutes', description: 'Comprehensive training' },
    { value: '60+', label: '60+ minutes', description: 'Extended workout sessions' },
  ];

  const experienceOptions = [
    {
      value: 'beginner',
      label: 'Beginner',
      description: 'New to fitness or returning after a break',
    },
    {
      value: 'intermediate',
      label: 'Intermediate',
      description: 'Some experience with regular exercise',
    },
    { value: 'advanced', label: 'Advanced', description: 'Experienced with consistent training' },
  ];

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((id) => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });

    if (errors.goals) {
      setErrors((prev) => ({ ...prev, goals: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (selectedGoals.length === 0) {
      newErrors.goals = 'Please select at least one fitness goal';
    }

    if (!timeCommitment) {
      newErrors.time = 'Please select your time commitment';
    }

    if (!experience) {
      newErrors.experience = 'Please select your experience level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    const goalsData = {
      primaryGoals: selectedGoals,
      timeCommitment,
      experience,
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
        onNext(goalsData);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>What are your fitness goals?</Text>
          <Text style={styles.subtitle}>
            Select all that apply. We'll customize your plan accordingly.
          </Text>
        </View>

        <View style={styles.content}>
          {/* Fitness Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Goals</Text>
            <View style={styles.goalsGrid}>
              {fitnessGoals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => toggleGoal(goal.id)}
                  style={styles.goalItem}
                >
                  <Card
                    style={[
                      styles.goalCard,
                      selectedGoals.includes(goal.id) && styles.goalCardSelected,
                    ]}
                    variant="outlined"
                  >
                    <View style={styles.goalContent}>
                      <Text style={styles.goalIcon}>{goal.icon}</Text>
                      <Text
                        style={[
                          styles.goalTitle,
                          selectedGoals.includes(goal.id) && styles.goalTitleSelected,
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
            {errors.goals && <Text style={styles.errorText}>{errors.goals}</Text>}
          </View>

          {/* Time Commitment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Commitment</Text>
            <Text style={styles.sectionSubtitle}>How much time can you dedicate per workout?</Text>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setTimeCommitment(option.value);
                  if (errors.time) {
                    setErrors((prev) => ({ ...prev, time: undefined }));
                  }
                }}
              >
                <Card
                  style={[
                    styles.optionCard,
                    timeCommitment === option.value && styles.optionCardSelected,
                  ]}
                  variant="outlined"
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        timeCommitment === option.value && styles.optionTitleSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
          </View>

          {/* Experience Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Level</Text>
            {experienceOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setExperience(option.value);
                  if (errors.experience) {
                    setErrors((prev) => ({ ...prev, experience: undefined }));
                  }
                }}
              >
                <Card
                  style={[
                    styles.optionCard,
                    experience === option.value && styles.optionCardSelected,
                  ]}
                  variant="outlined"
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        experience === option.value && styles.optionTitleSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
            {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}
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

  optionCard: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  optionCardSelected: {
    borderColor: ResponsiveTheme.colors.primary,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
  },

  optionContent: {
    padding: ResponsiveTheme.spacing.md,
  },

  optionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  optionTitleSelected: {
    color: ResponsiveTheme.colors.primary,
  },

  optionDescription: {
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
