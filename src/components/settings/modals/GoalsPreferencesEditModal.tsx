/**
 * GoalsPreferencesEditModal - Edit Fitness Goals & Preferences
 * 
 * Fields:
 * - Primary Goals (multi-select)
 * - Experience Level (picker)
 * - Time Commitment (picker)
 * 
 * Uses useUserStore.updateFitnessGoalsLocal() to save changes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsModalWrapper } from '../components/SettingsModalWrapper';
import { GlassFormPicker } from '../components/GlassFormPicker';
import { useUserStore } from '../../../stores/userStore';
import { useUser } from '../../../hooks/useUser';
import { ResponsiveTheme } from '../../utils/constants';
import { rf } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';
import type { FitnessGoals } from '../../../../types/user';

interface GoalsPreferencesEditModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRIMARY_GOALS_OPTIONS = [
  { 
    value: 'weight_loss', 
    label: 'Weight Loss', 
    icon: 'trending-down-outline' as const,
    description: 'Burn fat and lose weight',
  },
  { 
    value: 'muscle_gain', 
    label: 'Muscle Gain', 
    icon: 'barbell-outline' as const,
    description: 'Build lean muscle mass',
  },
  { 
    value: 'strength', 
    label: 'Strength', 
    icon: 'fitness-outline' as const,
    description: 'Increase overall strength',
  },
  { 
    value: 'endurance', 
    label: 'Endurance', 
    icon: 'bicycle-outline' as const,
    description: 'Improve stamina and cardio',
  },
  { 
    value: 'flexibility', 
    label: 'Flexibility', 
    icon: 'body-outline' as const,
    description: 'Better mobility and stretch',
  },
  { 
    value: 'general_fitness', 
    label: 'General Fitness', 
    icon: 'heart-outline' as const,
    description: 'Overall health improvement',
  },
];

const EXPERIENCE_OPTIONS = [
  { 
    value: 'beginner', 
    label: 'Beginner', 
    icon: 'leaf-outline' as const,
    description: 'New to fitness',
  },
  { 
    value: 'intermediate', 
    label: 'Intermediate', 
    icon: 'flame-outline' as const,
    description: '1-3 years experience',
  },
  { 
    value: 'advanced', 
    label: 'Advanced', 
    icon: 'trophy-outline' as const,
    description: '3+ years experience',
  },
];

const TIME_COMMITMENT_OPTIONS = [
  { 
    value: '15-30', 
    label: '15-30 min', 
    icon: 'time-outline' as const,
    description: 'Quick workouts',
  },
  { 
    value: '30-45', 
    label: '30-45 min', 
    icon: 'timer-outline' as const,
    description: 'Moderate sessions',
  },
  { 
    value: '45-60', 
    label: '45-60 min', 
    icon: 'hourglass-outline' as const,
    description: 'Standard workouts',
  },
  { 
    value: '60+', 
    label: '60+ min', 
    icon: 'stopwatch-outline' as const,
    description: 'Extended training',
  },
];

export const GoalsPreferencesEditModal: React.FC<GoalsPreferencesEditModalProps> = ({
  visible,
  onClose,
}) => {
  const { profile } = useUser();
  const { updateFitnessGoalsLocal } = useUserStore();

  // Form state
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [timeCommitment, setTimeCommitment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load current values when modal opens
  useEffect(() => {
    if (visible && profile?.fitnessGoals) {
      const goals = profile.fitnessGoals;
      setPrimaryGoals(goals.primaryGoals || []);
      setExperience(goals.experience || goals.experience_level || '');
      setTimeCommitment(goals.timeCommitment || '');
      setErrors({});
    }
  }, [visible, profile]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (primaryGoals.length === 0) {
      newErrors.primaryGoals = 'Select at least one goal';
    }

    if (!experience) {
      newErrors.experience = 'Please select your experience level';
    }

    if (!timeCommitment) {
      newErrors.timeCommitment = 'Please select your time commitment';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [primaryGoals, experience, timeCommitment]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) {
      haptics.light();
      return;
    }

    setIsSaving(true);
    try {
      const updatedGoals: FitnessGoals = {
        primaryGoals,
        experience,
        experience_level: experience, // For backward compatibility
        timeCommitment,
        // Preserve existing optional fields
        preferred_equipment: profile?.fitnessGoals?.preferred_equipment,
        target_areas: profile?.fitnessGoals?.target_areas,
      };

      updateFitnessGoalsLocal(updatedGoals);
      haptics.success();
      onClose();
    } catch (error) {
      console.error('Error saving fitness goals:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [primaryGoals, experience, timeCommitment, profile, updateFitnessGoalsLocal, onClose, validate]);

  const hasChanges = useCallback(() => {
    if (!profile?.fitnessGoals) return true;
    const goals = profile.fitnessGoals;
    
    const currentGoalsSet = new Set(goals.primaryGoals || []);
    const newGoalsSet = new Set(primaryGoals);
    const goalsChanged = currentGoalsSet.size !== newGoalsSet.size || 
      [...currentGoalsSet].some(g => !newGoalsSet.has(g));

    return (
      goalsChanged ||
      experience !== (goals.experience || goals.experience_level || '') ||
      timeCommitment !== (goals.timeCommitment || '')
    );
  }, [primaryGoals, experience, timeCommitment, profile]);

  return (
    <SettingsModalWrapper
      visible={visible}
      title="Goals & Preferences"
      subtitle="Customize your fitness journey"
      icon="flag-outline"
      iconColor="#4CAF50"
      onClose={onClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveDisabled={!hasChanges()}
    >
      {/* Primary Goals - Multi-select */}
      <GlassFormPicker
        label="Primary Goals"
        options={PRIMARY_GOALS_OPTIONS}
        value={primaryGoals}
        onChange={(val) => setPrimaryGoals(val as string[])}
        multiSelect={true}
        columns={2}
        error={errors.primaryGoals}
        hint="Select all that apply"
      />

      {/* Experience Level */}
      <GlassFormPicker
        label="Experience Level"
        options={EXPERIENCE_OPTIONS}
        value={experience}
        onChange={(val) => setExperience(val as string)}
        columns={3}
        error={errors.experience}
      />

      {/* Time Commitment */}
      <GlassFormPicker
        label="Time Per Workout"
        options={TIME_COMMITMENT_OPTIONS}
        value={timeCommitment}
        onChange={(val) => setTimeCommitment(val as string)}
        columns={2}
        error={errors.timeCommitment}
        hint="Average time you can dedicate per session"
      />
    </SettingsModalWrapper>
  );
};

export default GoalsPreferencesEditModal;

