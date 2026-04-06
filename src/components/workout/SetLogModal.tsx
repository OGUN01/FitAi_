/**
 * FitAI — Set Log Modal
 *
 * Modal shown when a user completes a set. Captures weight, reps, set type,
 * and RPE (Rate of Perceived Exertion) via a three-tap interface.
 *
 * KEY DESIGN DECISIONS:
 * - "Save & Continue" is replaced by three RPE buttons: 🟢 Easy / 🟡 Just Right / 🔴 Hard
 *   One tap saves and closes — zero extra steps.
 * - RPE is always captured (never optional) — it's the engine's signal for pace of progression.
 * - Calibration mode shows a banner when this is the user's first session for the exercise.
 * - is_calibration flag flows through SetLogData to completionTracking._writeExerciseSets.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ResponsiveTheme } from '../../utils/constants';
import { parseLocalFloat } from '../../utils/units';
import {
  exerciseHistoryService,
  LastSessionData,
} from '../../services/exerciseHistoryService';
import {
  progressionService,
  ProgressionResult,
} from '../../services/progressionService';
import { prDetectionService } from '../../services/prDetectionService';
import { useFitnessStore } from '../../stores/fitnessStore';
import { parseRepRange } from '../../features/workouts/components/ExerciseCard';
import { exerciseFilterService } from '../../services/exerciseFilterService';

const SET_TYPES = ['normal', 'warmup', 'failure', 'drop'] as const;
type SetType = (typeof SET_TYPES)[number];

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'W',
  warmup: 'WU',
  failure: 'F',
  drop: 'D',
};

const SET_TYPE_COLORS: Record<SetType, string> = {
  normal: '#E0E0E0',
  warmup: '#FF9800',
  failure: '#F44336',
  drop: '#9C27B0',
};

const KG_TO_LBS = 2.2046;

function kgToDisplay(kg: number, units: 'kg' | 'lbs'): string {
  if (units === 'lbs') return (kg * KG_TO_LBS).toFixed(1);
  return kg.toFixed(1);
}

function displayToKg(display: string, units: 'kg' | 'lbs'): number {
  const val = parseLocalFloat(display) || 0;
  return Math.max(0, units === 'lbs' ? val / KG_TO_LBS : val);
}

function isTimeHold(reps: number | string): boolean {
  if (typeof reps === 'number') return false;
  const s = String(reps).toLowerCase().trim();
  if (s.includes('amrap')) return false;
  return (
    /\d+\s*(s|sec|secs|second|seconds)$/.test(s) ||
    /^\d+:\d{1,2}$/.test(s) ||
    /\d+\s*(min|mins|minute|minutes)$/.test(s)
  );
}

function isPerSide(reps: number | string): boolean {
  if (typeof reps === 'number') return false;
  return (
    String(reps).toLowerCase().includes('per side') ||
    String(reps).toLowerCase().includes('each side') ||
    String(reps).toLowerCase().includes('each leg') ||
    String(reps).toLowerCase().includes('each arm')
  );
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface SetLogData {
  weightKg: number;
  reps: number;
  setType: SetType;
  completed: boolean;
  /** 1=easy, 2=just right, 3=hard — always present after Phase 6 */
  rpe: 1 | 2 | 3;
  /** True when this set is part of a first-session calibration ramp-up */
  isCalibration: boolean;
}

interface SetLogModalProps {
  isVisible: boolean;
  exerciseId: string;
  exerciseName: string;
  reps: number | string;
  setIndex: number;
  totalSets: number;
  userId?: string;
  userUnits?: 'kg' | 'lbs';
  /** Set when calibrationService determined this is a first session */
  calibrationMode?: boolean;
  /** Conservative starting weight from calibrationService */
  calibrationStartKg?: number;
  /** Note shown under the weight input in calibration mode */
  calibrationNote?: string;
  onSave: (data: SetLogData) => void;
  onCancel: () => void;
  onPRDetected?: (exerciseName: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SetLogModal: React.FC<SetLogModalProps> = ({
  isVisible,
  exerciseId,
  exerciseName,
  reps,
  setIndex,
  totalSets,
  userId,
  userUnits = 'kg',
  calibrationMode = false,
  calibrationStartKg = 0,
  calibrationNote = '',
  onSave,
  onCancel,
  onPRDetected,
}) => {
  const [weight, setWeight] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const repsRef = useRef<TextInput>(null);
  const [setType, setSetType] = useState<SetType>('normal');
  const [previousSession, setPreviousSession] = useState<LastSessionData | null>(null);
  const [suggestedWeight, setSuggestedWeight] = useState<ProgressionResult | null>(null);

  const exerciseData = exerciseFilterService.getExerciseById(exerciseId);
  const isBodyweight =
    exerciseData?.equipments?.includes('body weight') ??
    progressionService.isBodyweightExercise(exerciseId);

  const isTimeBased = isTimeHold(reps);
  const perSide = isPerSide(reps);
  const repsLabel = isTimeBased ? 'Sets done' : perSide ? 'Reps/side' : 'Reps';

  // Default reps from exercise definition
  useEffect(() => {
    if (!isVisible) return;
    const [, maxReps] = parseRepRange(reps);
    setRepsInput(maxReps > 0 ? String(maxReps) : '');
    setSetType('normal');
    // In calibration mode, seed weight input with the conservative start weight
    if (calibrationMode && calibrationStartKg > 0 && setIndex === 0) {
      setWeight(kgToDisplay(calibrationStartKg, userUnits));
    }
  }, [isVisible, reps, calibrationMode, calibrationStartKg, setIndex]);

  // Fetch history + suggested weight (skip in calibration mode for Session 1)
  useEffect(() => {
    if (!isVisible || !userId || !exerciseId) return;
    if (calibrationMode) return; // No history to fetch; calibrationStartKg is already seeded
    let cancelled = false;

    exerciseHistoryService
      .getLastSession(exerciseId, userId)
      .then(async (session) => {
        if (cancelled) return;
        setPreviousSession(session);

        if (session && session.sets.length > 0) {
          const repRange = parseRepRange(reps);
          const lastSets = session.sets.map((s) => ({
            reps: s.reps ?? 0,
            weight: s.weightKg ?? 0,
            setType: s.setType,
            completed: true,
            rpe: s.rpe,
          }));

          // Get last RPE for progression modulation
          const lastRPE = await exerciseHistoryService
            .getLastWorkingSetRPE(exerciseId, userId)
            .catch(() => null);

          const result = progressionService.suggestNextWeight(
            exerciseId,
            lastSets,
            repRange,
            isBodyweight,
            undefined,
            lastRPE,
          );
          setSuggestedWeight(result);

          // Pre-fill weight
          if (!isBodyweight && result.suggestedWeightKg > 0 && !weight) {
            setWeight(kgToDisplay(result.suggestedWeightKg, userUnits));
          }

          // Per-set fallback: use previous data for this specific set index
          const prevSet = session.sets[setIndex];
          if (prevSet?.weightKg != null && !weight) {
            setWeight(kgToDisplay(prevSet.weightKg, userUnits));
          }
        }
      })
      .catch((err) => {
        console.error('[SetLogModal] history fetch error:', err);
      });

    return () => { cancelled = true; };
  }, [isVisible, exerciseId, userId, setIndex, calibrationMode]);

  // ── Save with RPE ──────────────────────────────────────────────────────────
  const handleSave = (rpe: 1 | 2 | 3) => {
    const weightKg = isBodyweight ? 0 : displayToKg(weight, userUnits);
    const repsValue = parseInt(repsInput, 10) || 0;

    const data: SetLogData = {
      weightKg,
      reps: repsValue,
      setType,
      completed: true,
      rpe,
      isCalibration: calibrationMode,
    };

    // Persist to fitness store
    useFitnessStore.getState().updateSetData(exerciseId, setIndex, {
      weightKg,
      reps: repsValue,
      setType,
      completed: true,
      rpe,
      isCalibration: calibrationMode,
    });

    // PR detection — async, non-blocking
    // Skip PR detection for calibration sets (exploratory weights, not max effort)
    if (
      !calibrationMode &&
      userId &&
      repsValue > 0 &&
      (weightKg > 0 || isBodyweight) &&
      !isTimeBased
    ) {
      exerciseHistoryService
        .getPersonalRecords(exerciseId, userId)
        .then((prs) => {
          const weightPR = prs.find((p) => p.prType === 'weight');
          const e1rmPR = prs.find((p) => p.prType === 'estimated_1rm');
          const result = prDetectionService.checkForPR(
            exerciseId,
            { weightKg: isBodyweight ? repsValue : weightKg, reps: repsValue },
            { weight: weightPR?.value, estimated1rm: e1rmPR?.value },
          );
          if (result) {
            if (result.isWeightPR && result.newWeightPR != null) {
              prDetectionService.recordPR(userId, exerciseId, 'weight', result.newWeightPR, undefined, exerciseName, repsValue);
            }
            if (result.is1RMPR && result.new1RMPR != null) {
              prDetectionService.recordPR(userId, exerciseId, 'estimated_1rm', result.new1RMPR, undefined, exerciseName, repsValue);
            }
            onPRDetected?.(exerciseName);
          }
        })
        .catch((err) => {
          console.error('[SetLogModal] PR detection error:', err);
        });
    }

    onSave(data);
  };

  const previousSet = previousSession?.sets[setIndex];

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.setLabel}>
              Set {setIndex + 1} of {totalSets} — Log Your Performance
            </Text>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {exerciseName}
            </Text>
          </View>

          {/* ── Calibration Banner (first-ever session) ── */}
          {calibrationMode && (
            <View style={styles.calibrationBanner}>
              <Text style={styles.calibrationTitle}>🎯 Calibration Session</Text>
              <Text style={styles.calibrationBody}>
                {calibrationNote ||
                  'Find your starting weight. Ramp up until 8–12 reps feel 🟡 Just Right.'}
              </Text>
            </View>
          )}

          {/* ── Previous session hint (non-calibration only) ── */}
          {!calibrationMode && previousSet && (
            <View style={styles.previousHint}>
              <Text style={styles.previousLabel}>Previous:</Text>
              <Text style={styles.previousValue}>
                {previousSet.weightKg != null
                  ? `${kgToDisplay(previousSet.weightKg, userUnits)} ${userUnits}`
                  : '—'}{' '}
                × {previousSet.reps ?? '—'} reps
              </Text>
              {suggestedWeight?.action === 'increase' && (
                <Text style={styles.suggestionText}>
                  Suggested: {kgToDisplay(suggestedWeight.suggestedWeightKg, userUnits)}{' '}
                  {userUnits} ↑{suggestedWeight.doubleJump ? '↑' : ''}
                </Text>
              )}
            </View>
          )}

          {/* ── Set type ── */}
          <View style={styles.setTypeRow}>
            <Text style={styles.fieldLabel}>Set Type</Text>
            <View style={styles.setTypeButtons}>
              {SET_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.setTypeBadge,
                    { backgroundColor: SET_TYPE_COLORS[type] },
                    setType === type && styles.setTypeBadgeActive,
                  ]}
                  onPress={() => setSetType(type)}
                >
                  <Text style={styles.setTypeText}>{SET_TYPE_LABELS[type]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Weight input ── */}
          {!isBodyweight ? (
            <View style={styles.inputRow}>
              <Text style={styles.fieldLabel}>
                Weight ({userUnits.toUpperCase()})
              </Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#666"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => repsRef.current?.focus()}
              />
            </View>
          ) : (
            <View style={styles.bodyweightNote}>
              <Text style={styles.bodyweightText}>Bodyweight exercise</Text>
            </View>
          )}

          {/* ── Reps input ── */}
          <View style={styles.inputRow}>
            <Text style={styles.fieldLabel}>{repsLabel}</Text>
            <TextInput
              ref={repsRef}
              style={styles.input}
              value={repsInput}
              onChangeText={setRepsInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#666"
              autoFocus={isBodyweight}
              returnKeyType="done"
            />
          </View>

          {/* ── RPE Three-tap (replaces Save & Continue) ── */}
          <View style={styles.rpeLabel}>
            <Text style={styles.rpeLabelText}>How hard was that?</Text>
          </View>
          <View style={styles.rpeRow}>
            <TouchableOpacity
              style={[styles.rpeButton, styles.rpeEasy]}
              onPress={() => handleSave(1)}
              activeOpacity={0.8}
            >
              <Text style={styles.rpeEmoji}>🟢</Text>
              <Text style={styles.rpeText}>Easy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rpeButton, styles.rpeRight]}
              onPress={() => handleSave(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.rpeEmoji}>🟡</Text>
              <Text style={styles.rpeText}>Just Right</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rpeButton, styles.rpeHard]}
              onPress={() => handleSave(3)}
              activeOpacity={0.8}
            >
              <Text style={styles.rpeEmoji}>🔴</Text>
              <Text style={styles.rpeText}>Hard</Text>
            </TouchableOpacity>
          </View>

          {/* ── Back button ── */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: ResponsiveTheme.spacing.xl,
    paddingBottom: 40,
  },
  header: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  setLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },
  // Calibration banner
  calibrationBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
    borderRadius: 8,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  calibrationTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#A5B4FC',
    fontWeight: ResponsiveTheme.fontWeight.bold,
    marginBottom: 4,
  },
  calibrationBody: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: '#C7D2FE',
    lineHeight: 18,
  },
  // Previous session hint
  previousHint: {
    backgroundColor: '#12122A',
    borderRadius: 8,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  previousLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#888',
  },
  previousValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  suggestionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#4CAF50',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  // Set type
  setTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },
  setTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  setTypeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  setTypeBadgeActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  setTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },
  fieldLabel: {
    width: 80,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#888',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A4A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: ResponsiveTheme.fontSize.lg,
    textAlign: 'center',
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
  bodyweightNote: {
    backgroundColor: '#12122A',
    borderRadius: 8,
    padding: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: 'center',
  },
  bodyweightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#888',
    fontStyle: 'italic',
  },
  // RPE three-tap
  rpeLabel: {
    marginBottom: 8,
    alignItems: 'center',
  },
  rpeLabelText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#888',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  rpeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  rpeButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rpeEasy: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  rpeRight: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  rpeHard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  rpeEmoji: {
    fontSize: 20,
  },
  rpeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: '#CCC',
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  // Back button
  cancelButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: '#666',
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
