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
import { FitnessGoals } from '../../types/user';

interface GoalsScreenProps {
  onNext: (data: FitnessGoals) => void;
  onBack: () => void;
  initialData?: Partial<FitnessGoals>;
}

export const GoalsScreen: React.FC<GoalsScreenProps> = ({
  onNext,
  onBack,
  initialData = {},
}) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    initialData.primaryGoals || []
  );
  const [timeCommitment, setTimeCommitment] = useState<string>(
    initialData.timeCommitment || ''
  );
  const [experience, setExperience] = useState<string>(
    initialData.experience || ''
  );

  const [errors, setErrors] = useState<{
    goals?: string;
    time?: string;
    experience?: string;
  }>({});

  const fitnessGoals = [
    { id: 'weight_loss', title: 'Weight Loss', icon: '🔥', description: 'Burn fat and lose weight' },
    { id: 'muscle_gain', title: 'Muscle Gain', icon: '💪', description: 'Build lean muscle mass' },
    { id: 'strength', title: 'Strength', icon: '🏋️', description: 'Increase overall strength' },
    { id: 'endurance', title: 'Endurance', icon: '🏃', description: 'Improve cardiovascular fitness' },
    { id: 'flexibility', title: 'Flexibility', icon: '🧘', description: 'Enhance mobility and flexibility' },
    { id: 'general_fitness', title: 'General Fitness', icon: '⚡', description: 'Overall health and wellness' },
  ];

  const timeOptions = [
    { value: '15-30', label: '15-30 minutes', description: 'Quick daily workouts' },
    { value: '30-45', label: '30-45 minutes', description: 'Moderate workout sessions' },
    { value: '45-60', label: '45-60 minutes', description: 'Comprehensive training' },
    { value: '60+', label: '60+ minutes', description: 'Extended workout sessions' },
  ];

  const experienceOptions = [
    { value: 'beginner', label: 'Beginner', description: 'New to fitness or returning after a break' },
    { value: 'intermediate', label: 'Intermediate', description: 'Some experience with regular exercise' },
    { value: 'advanced', label: 'Advanced', description: 'Experienced with consistent training' },
  ];

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });
    
    if (errors.goals) {
      setErrors(prev => ({ ...prev, goals: undefined }));
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

  const handleNext = () => {
    if (validateForm()) {
      onNext({
        primaryGoals: selectedGoals,
        timeCommitment,
        experience,
      });
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
                      <Text style={[
                        styles.goalTitle,
                        selectedGoals.includes(goal.id) && styles.goalTitleSelected,
                      ]}>
                        {goal.title}
                      </Text>
                      <Text style={styles.goalDescription}>
                        {goal.description}
                      </Text>
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
            <Text style={styles.sectionSubtitle}>
              How much time can you dedicate per workout?
            </Text>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setTimeCommitment(option.value);
                  if (errors.time) {
                    setErrors(prev => ({ ...prev, time: undefined }));
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
                    <Text style={[
                      styles.optionTitle,
                      timeCommitment === option.value && styles.optionTitleSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
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
                    setErrors(prev => ({ ...prev, experience: undefined }));
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
                    <Text style={[
                      styles.optionTitle,
                      experience === option.value && styles.optionTitleSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
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
            title="Back"
            onPress={onBack}
            variant="outline"
            style={styles.backButton}
          />
          <Button
            title="Complete Setup"
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
  
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  
  goalItem: {
    width: '48%',
  },
  
  goalCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  goalCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}10`,
  },
  
  goalContent: {
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  
  goalIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },
  
  goalTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  
  goalTitleSelected: {
    color: THEME.colors.primary,
  },
  
  goalDescription: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  
  optionCard: {
    marginBottom: THEME.spacing.sm,
  },
  
  optionCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: `${THEME.colors.primary}10`,
  },
  
  optionContent: {
    padding: THEME.spacing.md,
  },
  
  optionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  
  optionTitleSelected: {
    color: THEME.colors.primary,
  },
  
  optionDescription: {
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
