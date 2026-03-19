/**
 * WeightEntryModal - Modal for logging weight entries
 *
 * SINGLE SOURCE OF TRUTH: Uses progress_entries table via progressData service
 *
 * Features:
 * - Number input with validation
 * - Optional body fat and notes
 * - Syncs to Supabase immediately
 * - Updates local stores for instant UI feedback
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../../utils/haptics';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rp, rbr, rs, rh } from '../../utils/responsive';
import { progressDataService } from '../../services/progressData';
import { useProfileStore } from '../../stores/profileStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useAuth } from '../../hooks/useAuth';
import { invalidateMetricsCache } from '../../hooks/useCalculatedMetrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from '../../utils/weekUtils';
import { weightTrackingService } from '../../services/WeightTrackingService';
import { convertWeight, toDisplayWeight } from '../../utils/units';

interface WeightEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentWeight?: number; // Pre-fill with current weight
  unit?: 'kg' | 'lbs';
}

export const WeightEntryModal: React.FC<WeightEntryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentWeight,
  unit = 'kg',
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Form state
  const [weight, setWeight] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with current weight when modal opens
  useEffect(() => {
    if (visible && currentWeight != null) {
      const displayWeight = toDisplayWeight(currentWeight, unit);
      if (displayWeight != null) {
        setWeight(displayWeight.toFixed(1));
      }
    }
  }, [visible, currentWeight, unit]);

  // Reset form when closing
  const handleClose = useCallback(() => {
    setWeight('');
    setBodyFat('');
    setNotes('');
    setError(null);
    onClose();
  }, [onClose]);

  // Validate inputs
  const validateInputs = useCallback((): boolean => {
    const weightNum = parseFloat(weight);

    if (!weight || isNaN(weightNum)) {
      setError('Please enter a valid weight');
      return false;
    }

    if (unit === 'lbs') {
      if (weightNum < 44 || weightNum > 660) {
        setError('Weight must be between 44 and 660 lbs');
        return false;
      }
    } else {
      if (weightNum < 20 || weightNum > 300) {
        setError('Weight must be between 20 and 300 kg');
        return false;
      }
    }

    if (bodyFat) {
      const bodyFatNum = parseFloat(bodyFat);
      if (isNaN(bodyFatNum) || bodyFatNum < 3 || bodyFatNum > 60) {
        setError('Body fat must be between 3% and 60%');
        return false;
      }
    }

    setError(null);
    return true;
  }, [weight, bodyFat]);

  // Submit weight entry
  const handleSubmit = useCallback(async () => {
    if (!validateInputs()) {
      haptics.error();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const weightKg = convertWeight(parseFloat(weight), unit, 'kg');
      const bodyFatPercent = bodyFat ? parseFloat(bodyFat) : undefined;

      if (user?.id) {
        // Authenticated user: sync to Supabase
        const result = await progressDataService.createProgressEntry(user.id, {
          weight_kg: weightKg,
          body_fat_percentage: bodyFatPercent,
          notes: notes || undefined,
        });

        if (!result.success) {
          setError(result.error || 'Failed to save weight entry');
          haptics.error();
          return;
        }
      } else {
        // Guest user: save locally via AsyncStorage
        const existingData = await AsyncStorage.getItem('guest_weight_entries');
        const entries = existingData ? JSON.parse(existingData) : [];
        entries.push({
          id: `guest_${Date.now()}`,
          weight_kg: weightKg,
          body_fat_percentage: bodyFatPercent,
          notes: notes || undefined,
          created_at: new Date().toISOString(),
        });
        await AsyncStorage.setItem('guest_weight_entries', JSON.stringify(entries));
      }

      haptics.success();

      // Update the canonical profile/body-analysis and analytics history paths
      // without mutating the health-device store.
      useProfileStore.getState().updateBodyAnalysis({
        current_weight_kg: weightKg,
      });
      weightTrackingService.setWeight(weightKg);

      const analyticsState = useAnalyticsStore.getState();
      const entryDate = getLocalDateString();
      const nextWeightHistory = [
        ...analyticsState.weightHistory.filter((entry) => entry.date !== entryDate),
        { date: entryDate, weight: weightKg },
      ].sort((a, b) => a.date.localeCompare(b.date));
      analyticsState.setHistoryData(nextWeightHistory, analyticsState.calorieHistory);

      // Bust the metrics cache so the next call to refreshMetrics() re-fetches
      // from Supabase and picks up the new body_analysis.current_weight_kg.
      invalidateMetricsCache();

      console.info('Weight entry saved successfully:', weightKg, 'kg');

      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error('Failed to save weight entry:', err);
      setError('An unexpected error occurred');
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [weight, bodyFat, notes, user, validateInputs, onSuccess, handleClose]);

  // Convert display if needed
  const displayUnit = unit === 'lbs' ? 'lbs' : 'kg';
  const placeholder = unit === 'lbs' ? 'e.g., 165.0' : 'e.g., 75.0';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
              <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title}>Log Weight</Text>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={rf(24)} color={ResponsiveTheme.colors.white} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  {/* Weight Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Weight ({displayUnit}) <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="scale-outline"
                        size={rs(20)}
                        color={ResponsiveTheme.colors.primary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={weight}
                        onChangeText={setWeight}
                        placeholder={placeholder}
                        placeholderTextColor={ResponsiveTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        returnKeyType="next"
                        editable={!isSubmitting}
                      />
                      <Text style={styles.unitLabel}>{displayUnit}</Text>
                    </View>
                  </View>

                  {/* Body Fat Input (Optional) */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Body Fat % (optional)</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="fitness-outline"
                        size={rs(20)}
                        color={ResponsiveTheme.colors.errorLight}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        value={bodyFat}
                        onChangeText={setBodyFat}
                        placeholder="e.g., 18.5"
                        placeholderTextColor={ResponsiveTheme.colors.textMuted}
                        keyboardType="decimal-pad"
                        returnKeyType="next"
                        editable={!isSubmitting}
                      />
                      <Text style={styles.unitLabel}>%</Text>
                    </View>
                  </View>

                  {/* Notes Input (Optional) */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Notes (optional)</Text>
                    <View style={[styles.inputContainer, styles.notesContainer]}>
                      <TextInput
                        style={[styles.input, styles.notesInput]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="How are you feeling?"
                        placeholderTextColor={ResponsiveTheme.colors.textMuted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>

                  {/* Error Message */}
                  {error && (
                    <View style={styles.errorContainer}>
                      <Ionicons
                        name="alert-circle"
                        size={rf(16)}
                        color={ResponsiveTheme.colors.errorLight}
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={ResponsiveTheme.colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={rs(20)}
                        color={ResponsiveTheme.colors.white}
                      />
                      <Text style={styles.submitButtonText}>Save Entry</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Info Text */}
                <Text style={styles.infoText}>Your weight is tracked in Progress → Analytics</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.overlay,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  blurContainer: {
    borderTopLeftRadius: rbr(24),
    borderTopRightRadius: rbr(24),
    overflow: 'hidden',
  },
  modalContent: {
    padding: rp(20),
    backgroundColor: 'rgba(20, 20, 35, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rp(20),
  },
  title: {
    fontSize: rf(22),
    fontWeight: '700',
    color: ResponsiveTheme.colors.white,
  },
  closeButton: {
    padding: rp(4),
  },
  scrollContent: {
    maxHeight: rh(350),
  },
  inputGroup: {
    marginBottom: rp(16),
  },
  label: {
    fontSize: rf(14),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(8),
  },
  required: {
    color: ResponsiveTheme.colors.errorLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
    paddingHorizontal: rp(12),
    height: rh(50),
  },
  inputIcon: {
    marginRight: rp(10),
  },
  input: {
    flex: 1,
    fontSize: rf(16),
    color: ResponsiveTheme.colors.white,
    height: '100%',
  },
  unitLabel: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textMuted,
    marginLeft: rp(8),
  },
  notesContainer: {
    height: rh(80),
    alignItems: 'flex-start',
    paddingVertical: rp(12),
  },
  notesInput: {
    height: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.errorTint,
    padding: rp(12),
    borderRadius: rbr(8),
    marginBottom: rp(16),
  },
  errorText: {
    color: ResponsiveTheme.colors.errorLight,
    fontSize: rf(14),
    marginLeft: rp(8),
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(12),
    paddingVertical: rp(14),
    marginTop: rp(8),
    gap: rp(8),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(16),
    fontWeight: '600',
  },
  infoText: {
    textAlign: 'center',
    color: ResponsiveTheme.colors.textMuted,
    fontSize: rf(12),
    marginTop: rp(12),
  },
});

export default WeightEntryModal;
