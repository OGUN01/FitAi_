import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button, Card, THEME } from '../../components/ui';
import { FitnessGoals } from '../../types/profileData';
import {
  useEditMode,
  useEditData,
  useEditActions,
} from '../../contexts/EditContext';

interface FitnessGoalsScreenProps {
  onNext?: (data: FitnessGoals) => void;
  onBack?: () => void;
  initialData?: Partial<FitnessGoals>;
  // Edit mode props
  isEditMode?: boolean;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

// Fitness goal options
const FITNESS_GOALS = [
  { id: 'weight-loss', title: 'Weight Loss', icon: '🔥', description: 'Burn fat and lose weight' },
  { id: 'weight-gain', title: 'Weight Gain', icon: '📈', description: 'Gain healthy weight' },
  { id: 'muscle-gain', title: 'Muscle Gain', icon: '💪', description: 'Build lean muscle mass' },
  { id: 'strength', title: 'Strength', icon: '🏋️', description: 'Increase overall strength' },
  { id: 'endurance', title: 'Endurance', icon: '🏃', description: 'Improve cardiovascular fitness' },
  { id: 'flexibility', title: 'Flexibility', icon: '🧘', description: 'Enhance mobility' },
  { id: 'general_fitness', title: 'General Fitness', icon: '⚡', description: 'Overall health' },
];

// Experience level options
const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to fitness', icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience', icon: '💪' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced athlete', icon: '🔥' },
];

// Time commitment options
const TIME_COMMITMENTS = [
  { value: '30 minutes', label: '30 min/day', description: 'Quick sessions', icon: '⏱️' },
  { value: '45 minutes', label: '45 min/day', description: 'Moderate sessions', icon: '⏰' },
  { value: '60 minutes', label: '60 min/day', description: 'Full sessions', icon: '🕐' },
  { value: '90 minutes', label: '90 min/day', description: 'Extended sessions', icon: '⏲️' },
];

export const FitnessGoalsScreen: React.FC<FitnessGoalsScreenProps> = ({
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
  const [primaryGoals, setPrimaryGoals] = useState<string[]>(data.primaryGoals || []);
  const [experience, setExperience] = useState<FitnessGoals['experience']>(data.experience || 'beginner');
  const [timeCommitment, setTimeCommitment] = useState<string>(data.timeCommitment || '30 minutes');
  const [targetWeight, setTargetWeight] = useState<string>(data.targetWeight || '');
  const [timeframe, setTimeframe] = useState<string>(data.timeframe || '');

  const [errors, setErrors] = useState<{
    primaryGoals?: string;
    experience?: string;
    timeCommitment?: string;
  }>({});

  // Track if data has been populated to prevent loops
  const [isDataPopulated, setIsDataPopulated] = useState(false);

  // Create form data object for syncing
  const formData = {
    primaryGoals,
    experience,
    timeCommitment,
    targetWeight,
    timeframe,
  };

  // Update form data when edit context data is loaded (only once)
  useEffect(() => {
    if (
      isEditMode &&
      editContextData?.currentData &&
      !isDataPopulated
    ) {
      const data = editContextData.currentData;

      // Check if we have actual fitness goals data (not just metadata)
      const hasActualData = (data.primaryGoals && data.primaryGoals.length > 0) || data.experience || data.timeCommitment;

      console.log('🔄 FitnessGoalsScreen: Loading edit data:', {
        hasData: !!data,
        hasActualData,
        dataKeys: Object.keys(data),
        primaryGoals: data.primaryGoals,
        experience: data.experience,
        timeCommitment: data.timeCommitment
      });

      if (hasActualData) {
        setPrimaryGoals(data.primaryGoals || []);
        setExperience(data.experience || 'beginner');
        setTimeCommitment(data.timeCommitment || '30 minutes');
        setTargetWeight(data.targetWeight || '');
        setTimeframe(data.timeframe || '');
        console.log('✅ FitnessGoalsScreen: Data loaded successfully');
        setIsDataPopulated(true);
      } else {
        console.warn('⚠️ FitnessGoalsScreen: No actual fitness goals data found in currentData');
      }
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
  }, [primaryGoals, experience, timeCommitment, targetWeight, timeframe, isEditMode, isDataPopulated]);

  // Toggle primary goal selection
  const togglePrimaryGoal = (goalId: string) => {
    setPrimaryGoals(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });
  };

  // Validation
  const validate = () => {
    const newErrors: typeof errors = {};

    if (primaryGoals.length === 0) {
      newErrors.primaryGoals = 'Please select at least one fitness goal';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Next/Save
  const handleNext = async () => {
    if (!validate()) {
      return;
    }

    const formattedData: any = {
      primaryGoals,
      experience,
      timeCommitment,
      ...(targetWeight && { targetWeight }),
      ...(timeframe && { timeframe }),
    };

    if (isEditMode && editContextData?.saveChanges) {
      // In edit mode, save changes
      const success = await editContextData.saveChanges();
      if (success && onEditComplete) {
        onEditComplete();
      }
    } else if (onNext) {
      // In onboarding mode, proceed to next
      onNext(formattedData as FitnessGoals);
    }
  };

  // Handle Cancel
  const handleCancel = () => {
    if (isEditMode && editContextData?.cancelEdit) {
      editContextData.cancelEdit();
    }
    if (onEditCancel) {
      onEditCancel();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditMode ? 'Edit Fitness Goals' : 'Fitness Goals'}
            </Text>
            <Text style={styles.subtitle}>
              Tell us what you want to achieve
            </Text>
          </View>

          {/* Primary Goals */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Goals *</Text>
            <Text style={styles.sectionDescription}>
              Select one or more goals (you can choose multiple)
            </Text>
            <View style={styles.goalsGrid}>
              {FITNESS_GOALS.map(goal => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    primaryGoals.includes(goal.id) && styles.goalCardSelected,
                  ]}
                  onPress={() => togglePrimaryGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.goalIcon}>{goal.icon}</Text>
                  <Text style={[
                    styles.goalTitle,
                    primaryGoals.includes(goal.id) && styles.goalTitleSelected,
                  ]}>
                    {goal.title}
                  </Text>
                  <Text style={styles.goalDescription}>{goal.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.primaryGoals && (
              <Text style={styles.errorText}>{errors.primaryGoals}</Text>
            )}
          </Card>

          {/* Experience Level */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Experience Level *</Text>
            <Text style={styles.sectionDescription}>
              What's your fitness experience?
            </Text>
            <View style={styles.optionsRow}>
              {EXPERIENCE_LEVELS.map(level => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.optionCard,
                    experience === level.value && styles.optionCardSelected,
                  ]}
                  onPress={() => setExperience(level.value as FitnessGoals['experience'])}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>{level.icon}</Text>
                  <Text style={[
                    styles.optionLabel,
                    experience === level.value && styles.optionLabelSelected,
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={styles.optionDescription}>{level.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Time Commitment */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Time Commitment *</Text>
            <Text style={styles.sectionDescription}>
              How much time can you dedicate daily?
            </Text>
            <View style={styles.optionsRow}>
              {TIME_COMMITMENTS.map(time => (
                <TouchableOpacity
                  key={time.value}
                  style={[
                    styles.optionCard,
                    timeCommitment === time.value && styles.optionCardSelected,
                  ]}
                  onPress={() => setTimeCommitment(time.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>{time.icon}</Text>
                  <Text style={[
                    styles.optionLabel,
                    timeCommitment === time.value && styles.optionLabelSelected,
                  ]}>
                    {time.label}
                  </Text>
                  <Text style={styles.optionDescription}>{time.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {isEditMode ? (
              <>
                <Button
                  title="Cancel"
                  onPress={handleCancel}
                  variant="outline"
                  style={styles.actionButton}
                />
                <Button
                  title="Save Changes"
                  onPress={handleNext}
                  variant="primary"
                  style={styles.actionButton}
                />
              </>
            ) : (
              <>
                {onBack && (
                  <Button
                    title="Back"
                    onPress={onBack}
                    variant="outline"
                    style={styles.actionButton}
                  />
                )}
                <Button
                  title="Next"
                  onPress={handleNext}
                  variant="primary"
                  style={styles.actionButton}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: rp(20),
  },
  header: {
    marginBottom: rh(24),
  },
  title: {
    fontSize: rf(28),
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginBottom: rh(8),
  },
  subtitle: {
    fontSize: rf(16),
    color: THEME.colors.text.secondary,
  },
  section: {
    marginBottom: rh(20),
    padding: rp(16),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '600',
    color: THEME.colors.text.primary,
    marginBottom: rh(8),
  },
  sectionDescription: {
    fontSize: rf(14),
    color: THEME.colors.text.secondary,
    marginBottom: rh(16),
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -rp(6),
  },
  goalCard: {
    width: '48%',
    margin: rp(6),
    padding: rp(16),
    borderRadius: rs(12),
    borderWidth: 2,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background.secondary,
    alignItems: 'center',
  },
  goalCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  goalIcon: {
    fontSize: rf(32),
    marginBottom: rh(8),
  },
  goalTitle: {
    fontSize: rf(14),
    fontWeight: '600',
    color: THEME.colors.text.primary,
    textAlign: 'center',
    marginBottom: rh(4),
  },
  goalTitleSelected: {
    color: THEME.colors.primary,
  },
  goalDescription: {
    fontSize: rf(11),
    color: THEME.colors.text.tertiary,
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -rp(6),
  },
  optionCard: {
    flex: 1,
    minWidth: '30%',
    margin: rp(6),
    padding: rp(12),
    borderRadius: rs(12),
    borderWidth: 2,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background.secondary,
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primaryLight,
  },
  optionIcon: {
    fontSize: rf(24),
    marginBottom: rh(6),
  },
  optionLabel: {
    fontSize: rf(13),
    fontWeight: '600',
    color: THEME.colors.text.primary,
    textAlign: 'center',
    marginBottom: rh(4),
  },
  optionLabelSelected: {
    color: THEME.colors.primary,
  },
  optionDescription: {
    fontSize: rf(10),
    color: THEME.colors.text.tertiary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: rf(12),
    color: THEME.colors.error,
    marginTop: rh(8),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: rh(32),
    gap: rp(12),
  },
  actionButton: {
    flex: 1,
  },
});

export default FitnessGoalsScreen;
