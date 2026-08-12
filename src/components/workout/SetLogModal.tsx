/**
 * FitAI — Set Log Modal (Aurora)
 *
 * Modal shown when a user completes a set. Captures weight, reps, set type,
 * and RPE (Rate of Perceived Exertion) via a three-tap interface.
 *
 * KEY DESIGN DECISIONS:
 * - "Save & Continue" is replaced by three RPE buttons: Easy / Just Right / Hard
 *   (Ionicons + token colors instead of emoji). One tap saves and closes.
 * - RPE is always captured (never optional) — it's the engine's signal for pace of progression.
 * - Calibration mode shows a banner when this is the user's first session for the exercise.
 * - is_calibration flag flows through SetLogData to completionTracking._writeExerciseSets.
 *
 * Aurora modernization:
 * - Migrated from flat RN `Modal animationType="slide"` to the shared `BottomSheet`
 *   (slide-up + drag-to-dismiss + glass surface).
 * - All hardcoded hex (#1A1A2E / #888 / #CCC / #666 / rgba) replaced with aurora tokens.
 * - Added: quick-increment steppers (±2.5kg / ±1 rep), "Copy last set" chip,
 *   inline PR badge preview, ProgressionResult.reason text, session volume footer.
 * - RPE three-tap now uses Ionicons + token colors (no emoji).
 * - Validation: reject reps=0 and weight=0 for non-bodyweight via crossPlatformAlert.
 *
 * SSOT preserved: the `updateSetData` store write path is untouched — it remains
 * the single source of truth for logged set data.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, AnimatedPressable, GlassButton } from '../ui/aurora';
import { colors, spacing, borderRadius, typography } from '../../theme/aurora-tokens';
import { rp, rf } from '../../utils/responsive';
import { crossPlatformAlert } from '../../utils/crossPlatformAlert';
import { parseLocalFloat } from '../../utils/units';
import { hexToRgba } from '../../utils/colors';
import { totalVolume } from '../../utils/volumeCalculator';
import { exerciseHistoryService, LastSessionData } from '../../services/exerciseHistoryService';
import { progressionService, ProgressionResult } from '../../services/progressionService';
import { prDetectionService, PRCheckResult } from '../../services/prDetectionService';
import { useFitnessStore } from '../../stores/fitnessStore';
import { parseRepRange } from '../../features/workouts/components/ExerciseCard';
import { exerciseFilterService } from '../../services/exerciseFilterService';

const SET_TYPES = ['normal', 'warmup', 'failure', 'drop'] as const;
type SetType = (typeof SET_TYPES)[number];

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Working',
  warmup: 'Warm-up',
  failure: 'Failure',
  drop: 'Drop-set',
};

const SET_TYPE_DESCRIPTIONS: Record<SetType, string> = {
  normal:
    'Your main working set. Log the weight/reps you completed with proper form. This drives progressive overload.',
  warmup:
    "Prepares your muscles for working sets. Doesn't count toward progressive overload but reduces injury risk.",
  failure:
    'You reached muscle failure. Great for intensity techniques but requires longer recovery.',
  drop: 'Reduce weight mid-set to extend the set after failure. Advanced technique for muscle exhaustion.',
};

// Inactive set-type badge color: grey. Active uses primary (cyan) for normal/
// warmup/drop; failure uses red to signal intensity. One accent color per
// state instead of four — reduces cognitive load (reviewer feedback).
const SET_TYPE_COLOR_ACTIVE: Record<SetType, string> = {
  normal: colors.secondary.DEFAULT,
  warmup: colors.secondary.DEFAULT,
  failure: colors.error.DEFAULT,
  drop: colors.secondary.DEFAULT,
};

const KG_TO_LBS = 2.2046;
const WEIGHT_STEP_KG = 2.5;

// RPE three-tap maps to the standard 1-10 Rate of Perceived Exertion scale so
// the numeric value is meaningful to users familiar with RPE. The three-tap
// interface stays (Easy/Just Right/Hard) but each shows its RPE equivalent.
// 1 = Easy (RPE ~4), 2 = Just Right (RPE ~7), 3 = Hard (RPE ~9).
const RPE_NUMERIC: Record<1 | 2 | 3, number> = { 1: 4, 2: 7, 3: 9 };
const RPE_DESCRIPTOR: Record<1 | 2 | 3, string> = {
  1: 'Easy',
  2: 'Just Right',
  3: 'Hard',
};
const RPE_EXPLAINER: Array<{ range: string; label: string; desc: string }> = [
  { range: '1-3', label: 'Very easy', desc: 'No effort — warm-up or recovery pace.' },
  { range: '4-5', label: 'Easy', desc: 'Could do many more reps. Used for technique work.' },
  { range: '6-7', label: 'Moderate', desc: 'Challenging but 3-5 reps left in the tank.' },
  { range: '8-9', label: 'Hard', desc: '1-2 reps left. Near your limit for the set.' },
  { range: '10', label: 'Max effort', desc: 'Could not do another rep. True failure.' },
];

// Display weight without trailing .0 (30 not 30.0). Decimals only when needed
// (32.5, 17.5). Gym users expect integer weights; .0 reads as a technical UI.
function kgToDisplay(kg: number, units: 'kg' | 'lbs'): string {
  const raw = units === 'lbs' ? kg * KG_TO_LBS : kg;
  // Round to 1 decimal to kill fp drift (e.g. 2.5000000001), then strip .0.
  const rounded = Math.round(raw * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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
  // RPE explainer card visibility (dismissible).
  const [rpeExplainerOpen, setRpeExplainerOpen] = useState(false);
  // Progressive overload explainer card visibility (dismissible).
  // Defaults to CLOSED so the modal fits on first open without scrolling —
  // the explainer is informational and can be re-opened via its info icon.
  // Opening it by default pushed the RPE buttons + volume footer + Back button
  // below the visible sheet area on smaller screens.
  const [overloadExplainerOpen, setOverloadExplainerOpen] = useState(false);
  // Set-type legend card visibility (dismissible). Tracks which set type's
  // description is expanded, or null when collapsed.
  const [legendOpen, setLegendOpen] = useState<SetType | null>(null);
  // RPE selection state — tracks which effort button the user tapped before
  // they confirm via the sticky Save button. Replaces the previous "one-tap
  // save" model so users can change their mind without re-opening the modal.
  const [selectedRpe, setSelectedRpe] = useState<1 | 2 | 3 | null>(null);
  const [previousSession, setPreviousSession] = useState<LastSessionData | null>(null);
  const [suggestedWeight, setSuggestedWeight] = useState<ProgressionResult | null>(null);
  // Live PR preview — computed from the current weight/reps inputs against the
  // user's existing PRs. Null until history is loaded; null when no PR hit.
  const [prPreview, setPrPreview] = useState<PRCheckResult | null>(null);
  // Tracks the exercise the `weight` field currently belongs to. SetLogModal
  // is a single persistent instance reused for every set of every exercise
  // in the session (no `key` prop in WorkoutSessionScreen), and `isVisible`
  // cycles false→true for EVERY set (including sets within the same
  // exercise). We only want to clear `weight` on an actual exercise change —
  // clearing it on every reopen would also wipe the intentional "carry the
  // same weight to the next set of this exercise" behavior.
  const weightExerciseRef = useRef<string | null>(null);

  const exerciseData = exerciseFilterService.getExerciseById(exerciseId);
  const isBodyweight =
    exerciseData?.equipments?.includes('body weight') ??
    progressionService.isBodyweightExercise(exerciseId);

  const isTimeBased = isTimeHold(reps);
  const perSide = isPerSide(reps);
  const repsLabel = isTimeBased ? 'Sets done' : perSide ? 'Reps/side' : 'Reps';

  const previousSet = previousSession?.sets[setIndex];

  // Default reps from exercise definition
  useEffect(() => {
    if (!isVisible) return;
    const [, maxReps] = parseRepRange(reps);
    setRepsInput(maxReps > 0 ? String(maxReps) : '');
    setSetType('normal');
    // Reset weight ONLY when the exercise itself has changed since the last
    // time this field was populated. `isVisible` cycles false→true for every
    // set (including sets within the same exercise), so gating purely on
    // `isVisible` would also wipe the intentionally "sticky" weight carried
    // from set 1 to set 2 of the SAME exercise. Gating on exerciseId here
    // fixes the critical bug (weight leaking across exercises, e.g. Bench
    // Press 60kg silently pre-filling Squat/Leg Press/Bicep Curl) while
    // preserving same-exercise continuity.
    if (weightExerciseRef.current !== exerciseId) {
      weightExerciseRef.current = exerciseId;
      setWeight('');
    }
    // In calibration mode, seed weight input with the conservative start weight.
    // P2-14: normalize calibrationStartKg to 1 decimal BEFORE display so fp
    // drift (e.g. 2.5000000001 from repeated kg<->lbs round-trips) never leaks
    // into the input string. kgToDisplay already applies toFixed(1), but the
    // source value itself is rounded first so the lbs path
    // (roundedKg * 2.2046).toFixed(1) is also stable across re-opens.
    if (calibrationMode && calibrationStartKg > 0 && setIndex === 0) {
      const roundedStartKg = Math.round(calibrationStartKg * 10) / 10;
      setWeight(kgToDisplay(roundedStartKg, userUnits));
    }
  }, [isVisible, exerciseId, reps, calibrationMode, calibrationStartKg, setIndex]);

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
            .catch((err) => {
              console.error('[SetLogModal] getLastWorkingSetRPE error:', err);
              return null;
            });

          const result = progressionService.suggestNextWeight(
            exerciseId,
            lastSets,
            repRange,
            isBodyweight,
            undefined,
            lastRPE
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

    return () => {
      cancelled = true;
    };
  }, [isVisible, exerciseId, userId, setIndex, calibrationMode]);

  // ── Live PR preview ───────────────────────────────────────────────────────
  // Recompute the PR check whenever the weight/reps inputs change so the user
  // sees a live PR badge before tapping save. Non-blocking; failures swallowed.
  // Debounced 350ms after the last keystroke — this fires on every character
  // typed into weight/reps (the highest-frequency interaction on this screen),
  // and each lookup is a DB round trip via exerciseHistoryService, so an
  // undebounced effect fanned out a query per character during rapid typing.
  useEffect(() => {
    if (!isVisible || !userId || calibrationMode || isTimeBased) {
      setPrPreview(null);
      return;
    }
    const weightKg = isBodyweight ? 0 : displayToKg(weight, userUnits);
    const repsValue = parseInt(repsInput, 10) || 0;
    if (repsValue <= 0 || (!isBodyweight && weightKg <= 0)) {
      setPrPreview(null);
      return;
    }
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      exerciseHistoryService
        .getPersonalRecords(exerciseId, userId)
        .then((prs) => {
          if (cancelled) return;
          const weightPR = prs.find((p) => p.prType === 'weight');
          const e1rmPR = prs.find((p) => p.prType === 'estimated_1rm');
          const result = prDetectionService.checkForPR(
            exerciseId,
            { weightKg: isBodyweight ? repsValue : weightKg, reps: repsValue },
            { weight: weightPR?.value, estimated1rm: e1rmPR?.value }
          );
          setPrPreview(result);
        })
        .catch((err) => {
          if (!cancelled) setPrPreview(null);
          console.error('[SetLogModal] live PR preview error:', err);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    weight,
    repsInput,
    isVisible,
    userId,
    exerciseId,
    calibrationMode,
    isTimeBased,
    isBodyweight,
    userUnits,
  ]);

  // ── Stepper helpers ───────────────────────────────────────────────────────
  const bumpWeight = useCallback(
    (deltaKg: number) => {
      setWeight((prev) => {
        const currentKg = displayToKg(prev, userUnits);
        const nextKg = Math.max(0, currentKg + deltaKg);
        return kgToDisplay(nextKg, userUnits);
      });
    },
    [userUnits]
  );

  const bumpReps = useCallback((delta: number) => {
    setRepsInput((prev) => {
      const current = parseInt(prev, 10) || 0;
      return String(Math.max(0, current + delta));
    });
  }, []);

  const copyLastSet = useCallback(() => {
    if (!previousSet) return;
    if (previousSet.weightKg != null) {
      setWeight(kgToDisplay(previousSet.weightKg, userUnits));
    }
    if (previousSet.reps != null) {
      setRepsInput(String(previousSet.reps));
    }
  }, [previousSet, userUnits]);

  // ── Session volume footer (live, derived from store + current inputs) ─────
  // SSOT: currentWorkoutSession.exercises[].sets[] — the store's CompletedSet
  // uses `weight` (kg) + `reps` (see fitnessStore.updateSetData). totalVolume
  // expects { weightKg, reps }, so map at the boundary.
  //
  // VOLUME=0 BUG FIX: the store only holds SAVED sets. The set the user is
  // currently typing has not been saved yet, so it contributed 0 — the footer
  // read "0 kg" even with weight+reps entered. Now we add the live in-progress
  // set's volume (weight×reps from the inputs) on top of the accumulated saved
  // sets, so the number updates as the user types.
  // Reactive subscription so savedVolume recomputes when sets are saved to the
  // store (was previously useFitnessStore.getState() — non-reactive, so the
  // footer stayed at the pre-save value after a set was logged).
  const sessionExercises = useFitnessStore((s) => s.currentWorkoutSession?.exercises) ?? [];
  const savedVolume = sessionExercises.reduce((sum, ex) => {
    const sets = (ex.sets ?? [])
      .filter((s) => s?.weight != null && s?.reps != null)
      .map((s) => ({ weightKg: s.weight!, reps: s.reps! }));
    return sum + totalVolume(sets);
  }, 0);
  // Live in-progress set volume: weight×reps from the current inputs.
  const liveWeightKg = isBodyweight ? 0 : displayToKg(weight, userUnits);
  const liveReps = parseInt(repsInput, 10) || 0;
  const liveVolume = liveWeightKg > 0 && liveReps > 0 ? liveWeightKg * liveReps : 0;
  const sessionVolume = savedVolume + liveVolume;

  // ── Save with validation + RPE ────────────────────────────────────────────
  const handleSave = (rpe: 1 | 2 | 3) => {
    const weightKg = isBodyweight ? 0 : displayToKg(weight, userUnits);
    const repsValue = parseInt(repsInput, 10) || 0;

    // Validation: reject reps=0
    if (repsValue <= 0) {
      crossPlatformAlert(
        'Reps required',
        'Enter how many reps you completed before saving this set.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    // Validation: reject weight=0 for non-bodyweight exercises
    if (!isBodyweight && weightKg <= 0) {
      crossPlatformAlert(
        'Weight required',
        `Enter the weight you lifted (in ${userUnits}) before saving this set.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    const data: SetLogData = {
      weightKg,
      reps: repsValue,
      setType,
      completed: true,
      rpe,
      isCalibration: calibrationMode,
    };

    // Persist to fitness store — SSOT path (unchanged)
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
            { weight: weightPR?.value, estimated1rm: e1rmPR?.value }
          );
          if (result) {
            if (result.isWeightPR && result.newWeightPR != null) {
              prDetectionService.recordPR(
                userId,
                exerciseId,
                'weight',
                result.newWeightPR,
                undefined,
                exerciseName,
                repsValue
              );
            }
            if (result.is1RMPR && result.new1RMPR != null) {
              prDetectionService.recordPR(
                userId,
                exerciseId,
                'estimated_1rm',
                result.new1RMPR,
                undefined,
                exerciseName,
                repsValue
              );
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

  return (
    <BottomSheet
      visible={isVisible}
      onClose={onCancel}
      title=""
      dismissOnDrag={false}
      closeOnOverlayPress={false}
      // flex:1 so the inner ScrollView can bound its height against the sheet's
      // maxHeight and scroll its content instead of overflowing + clipping.
      // Without this, the KeyboardAvoidingView + GlassCard content View have no
      // flex bound, so the ScrollView's flex:1 is a no-op and the lower controls
      // (RPE buttons, volume footer, Back) render past the sheet's clipped edge.
      contentStyle={styles.sheetContentFlex}
    >
      {/*
        ScrollView: the modal body is tall (exercise name, calibration banner,
        set-type, weight+reps steppers, RPE three-tap, volume footer, Back).
        The weight/reps TextInputs use autoFocus, so the Android soft keyboard
        opens. The stock RN Modal portal does not resize for the keyboard
        (adjustResize applies to the root activity, not the Modal dialog), and
        BottomSheet's KeyboardAvoidingView is a no-op on Android
        (behavior={undefined}). Without a ScrollView, the keyboard occludes the
        RPE buttons (Easy/Just Right/Hard) and the Back/Cancel button at the
        bottom — taps never reach them. Wrapping the body lets the user scroll
        the lower controls into view above the keyboard. keyboardShouldPersistTaps
        "handled" matches the established pattern across the app
        (LogMealModal, MealEditModal, onboarding tabs, etc.).
      */}
      <ScrollView
        style={styles.modalScroll}
        contentContainerStyle={styles.modalScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Exercise name + progress dots + PR preview ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text
              style={styles.exerciseName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {exerciseName}
            </Text>
            <View style={styles.dotsRow}>
              {Array.from({ length: totalSets }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < setIndex + 1 && styles.progressDotDone,
                    i === setIndex && styles.progressDotCurrent,
                  ]}
                />
              ))}
            </View>
          </View>
          {prPreview && (prPreview.isWeightPR || prPreview.is1RMPR) && (
            <View style={styles.prBadge}>
              <Ionicons name="trophy" size={rf(13)} color={colors.warning.DEFAULT} />
              <Text style={styles.prBadgeText}>
                {prPreview.isWeightPR && prPreview.newWeightPR != null
                  ? `PR ${kgToDisplay(prPreview.newWeightPR, userUnits)} ${userUnits}`
                  : prPreview.is1RMPR && prPreview.new1RMPR != null
                    ? `PR 1RM ${Math.round(prPreview.new1RMPR)}kg`
                    : 'PR'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Calibration Banner (first-ever session) — single compact row ── */}
        {calibrationMode && (
          <View style={styles.calibrationBanner}>
            <Ionicons name="fitness" size={rf(15)} color={colors.secondary.DEFAULT} />
            <View style={styles.calibrationTextWrap}>
              <Text style={styles.calibrationTitle}>Calibration</Text>
              <Text style={styles.calibrationBody} numberOfLines={2}>
                {calibrationNote
                  ? calibrationNote
                  : `Start at ${kgToDisplay(calibrationStartKg, userUnits)} ${userUnits} • Aim for 8–12 reps`}
              </Text>
            </View>
          </View>
        )}

        {/* ── Previous session hint + Copy last set chip + progression reason ── */}
        {!calibrationMode && previousSet && (
          <View style={styles.previousHint}>
            <View style={styles.previousRow}>
              <Text style={styles.previousLabel} numberOfLines={1}>
                Previous:
              </Text>
              <Text
                style={styles.previousValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {previousSet.weightKg != null
                  ? `${kgToDisplay(previousSet.weightKg, userUnits)} ${userUnits}`
                  : '—'}{' '}
                × {previousSet.reps ?? '—'} reps
              </Text>
              <AnimatedPressable
                onPress={copyLastSet}
                style={styles.copyChip}
                scaleValue={0.94}
                springConfig="snappy"
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel="Copy last set values"
              >
                <Ionicons name="copy-outline" size={rf(12)} color={colors.primary.DEFAULT} />
                <Text style={styles.copyChipText} numberOfLines={1}>
                  Copy
                </Text>
              </AnimatedPressable>
            </View>
            {suggestedWeight?.action === 'increase' && (
              <Text style={styles.suggestionText} numberOfLines={2}>
                Suggested: {kgToDisplay(suggestedWeight.suggestedWeightKg, userUnits)} {userUnits} ↑
                {suggestedWeight.doubleJump ? '↑' : ''}
              </Text>
            )}
            {/* Surface the progression engine's reasoning so the user understands
              why a load was suggested (increase / hold / deload). */}
            {suggestedWeight?.reason ? (
              <Text style={styles.reasonText} numberOfLines={3}>
                {suggestedWeight.reason}
              </Text>
            ) : null}
          </View>
        )}

        {/* ── Set type ── */}
        <View style={styles.setTypeSection}>
          <View style={styles.setTypeHeader}>
            <Text style={styles.fieldLabel} numberOfLines={1}>
              Set Type
            </Text>
            <AnimatedPressable
              onPress={() => setLegendOpen((prev) => (prev === null ? 'normal' : null))}
              style={styles.legendToggle}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Toggle set type legend"
            >
              <Ionicons
                name={legendOpen ? 'information-circle' : 'information-circle-outline'}
                size={rf(16)}
                color={colors.text.tertiary}
              />
            </AnimatedPressable>
          </View>
          <View style={styles.setTypeButtons}>
            {SET_TYPES.map((type) => {
              const isActive = setType === type;
              const activeColor = SET_TYPE_COLOR_ACTIVE[type];
              return (
                <AnimatedPressable
                  key={type}
                  onPress={() => setSetType(type)}
                  onLongPress={() => setLegendOpen((prev) => (prev === type ? null : type))}
                  scaleValue={0.9}
                  springConfig="snappy"
                  hapticType="selection"
                  style={[
                    styles.setTypeBadge,
                    isActive && { backgroundColor: activeColor, borderColor: activeColor },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set type ${SET_TYPE_LABELS[type]}`}
                >
                  <Text
                    style={[styles.setTypeText, isActive && styles.setTypeTextActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {SET_TYPE_LABELS[type]}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
        {/* Legend / tooltip — explains each set type. Dismissible. */}
        {legendOpen && (
          <View style={styles.legendCard}>
            {SET_TYPES.map((type) => (
              <View key={type} style={styles.legendRow}>
                <View
                  style={[styles.legendDot, { backgroundColor: SET_TYPE_COLOR_ACTIVE[type] }]}
                />
                <Text style={styles.legendLabel}>{SET_TYPE_LABELS[type]}</Text>
                <Text style={styles.legendDesc} numberOfLines={2}>
                  {SET_TYPE_DESCRIPTIONS[type]}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Progressive overload explainer (dismissible) ── */}
        {/* Pulls the REAL increment + rep range from the progression service and
          the exercise plan — no hardcoded values. Dismissible so experienced
          users can hide it. */}
        {overloadExplainerOpen &&
          (() => {
            const increment = progressionService.getIncrementForExercise(exerciseId);
            const [minReps, maxReps] = parseRepRange(reps);
            const muscleGroup = progressionService.getMuscleGroup(exerciseId);
            return (
              <View style={styles.overloadCard}>
                <View style={styles.overloadHeader}>
                  <Ionicons name="trending-up" size={rf(15)} color={colors.success.DEFAULT} />
                  <Text style={styles.overloadTitle}>Progressive Overload</Text>
                  <AnimatedPressable
                    onPress={() => setOverloadExplainerOpen(false)}
                    style={styles.overloadDismiss}
                    scaleValue={0.9}
                    springConfig="snappy"
                    hapticType="light"
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss progressive overload explainer"
                  >
                    <Ionicons name="close" size={rf(14)} color={colors.text.tertiary} />
                  </AnimatedPressable>
                </View>
                <Text style={styles.overloadBody}>
                  The engine increases your load over time using double progression: hit the top of
                  your rep range ({minReps > 0 ? minReps : '—'}
                  {maxReps > 0 ? `-${maxReps}` : ''} reps) across all sets, then weight goes up{' '}
                  {increment}kg
                  {muscleGroup === 'lower' ? ' (lower-body step)' : ' (upper-body step)'}. Easy sets
                  may jump faster; hard sets hold steady.
                </Text>
              </View>
            );
          })()}

        {/* ── Weight input with steppers ── */}
        {!isBodyweight ? (
          <View style={styles.inputRow}>
            <Text style={styles.fieldLabel} numberOfLines={1}>
              Weight ({userUnits.toUpperCase()})
            </Text>
            <View style={styles.stepperRow}>
              <AnimatedPressable
                onPress={() => bumpWeight(-WEIGHT_STEP_KG)}
                style={styles.stepperBtn}
                scaleValue={0.9}
                springConfig="snappy"
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel={`Decrease weight by ${WEIGHT_STEP_KG} kg`}
              >
                <Ionicons name="remove" size={rf(22)} color={colors.text.primary} />
              </AnimatedPressable>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  autoFocus
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => repsRef.current?.focus()}
                  maxLength={7}
                />
                <Text style={styles.inputSuffix}>{userUnits}</Text>
              </View>
              <AnimatedPressable
                onPress={() => bumpWeight(WEIGHT_STEP_KG)}
                style={styles.stepperBtn}
                scaleValue={0.9}
                springConfig="snappy"
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel={`Increase weight by ${WEIGHT_STEP_KG} kg`}
              >
                <Ionicons name="add" size={rf(22)} color={colors.text.primary} />
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <View style={styles.bodyweightNote}>
            <Ionicons name="body" size={rf(16)} color={colors.text.tertiary} />
            <Text style={styles.bodyweightText}>Bodyweight exercise</Text>
          </View>
        )}

        {/* ── Reps input with steppers ── */}
        <View style={styles.inputRow}>
          <Text style={styles.fieldLabel} numberOfLines={1}>
            {repsLabel}
          </Text>
          <View style={styles.stepperRow}>
            <AnimatedPressable
              onPress={() => bumpReps(-1)}
              style={styles.stepperBtn}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Decrease reps by 1"
            >
              <Ionicons name="remove" size={rf(22)} color={colors.text.primary} />
            </AnimatedPressable>
            <View style={styles.inputWrap}>
              <TextInput
                ref={repsRef}
                style={styles.input}
                value={repsInput}
                onChangeText={setRepsInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                autoFocus={isBodyweight}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => repsRef.current?.blur()}
                maxLength={5}
              />
            </View>
            <AnimatedPressable
              onPress={() => bumpReps(1)}
              style={styles.stepperBtn}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Increase reps by 1"
            >
              <Ionicons name="add" size={rf(22)} color={colors.text.primary} />
            </AnimatedPressable>
          </View>
        </View>

        {/* ── RPE Three-tap (Ionicons + token colors, no emoji) ── */}
        <View style={styles.rpeLabel}>
          <Text style={styles.rpeLabelText}>
            How hard was that? <Text style={styles.requiredStar}>*</Text>
          </Text>
          {!selectedRpe && <Text style={styles.rpeHint}>Choose one</Text>}
          <AnimatedPressable
            onPress={() => setRpeExplainerOpen((prev) => !prev)}
            style={styles.rpeInfoToggle}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Toggle RPE explainer"
          >
            <Ionicons
              name={rpeExplainerOpen ? 'information-circle' : 'information-circle-outline'}
              size={rf(16)}
              color={colors.text.tertiary}
            />
          </AnimatedPressable>
        </View>
        {/* RPE explainer — Rate of Perceived Exertion 1-10, what each zone means. */}
        {rpeExplainerOpen && (
          <View style={styles.rpeExplainerCard}>
            <Text style={styles.rpeExplainerTitle}>Rate of Perceived Exertion (RPE 1-10)</Text>
            <Text style={styles.rpeExplainerBody}>
              RPE estimates how close you were to failure. The app uses it to pace progression: easy
              sets may jump weight faster, hard sets hold steady.
            </Text>
            {RPE_EXPLAINER.map((zone) => (
              <View key={zone.range} style={styles.rpeZoneRow}>
                <Text style={styles.rpeZoneRange}>RPE {zone.range}</Text>
                <Text style={styles.rpeZoneLabel}>{zone.label}</Text>
                <Text style={styles.rpeZoneDesc} numberOfLines={2}>
                  {zone.desc}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.rpeRow}>
          {([1, 2, 3] as const).map((rpe) => {
            const isSelected = selectedRpe === rpe;
            const palette =
              rpe === 1
                ? colors.success.DEFAULT
                : rpe === 2
                  ? colors.warning.DEFAULT
                  : colors.error.DEFAULT;
            const icon =
              rpe === 1 ? 'happy-outline' : rpe === 2 ? 'thumbs-up-outline' : 'flame-outline';
            return (
              <AnimatedPressable
                key={rpe}
                onPress={() => setSelectedRpe(rpe)}
                scaleValue={0.96}
                springConfig="snappy"
                hapticType={rpe === 1 ? 'success' : rpe === 2 ? 'medium' : 'heavy'}
                style={[
                  styles.rpeButton,
                  { backgroundColor: hexToRgba(palette, isSelected ? 0.22 : 0.1) },
                  { borderColor: hexToRgba(palette, isSelected ? 0.85 : 0.4) },
                  isSelected && { borderWidth: 2 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${RPE_DESCRIPTOR[rpe]} — RPE ${RPE_NUMERIC[rpe]}${isSelected ? ' (selected)' : ''}`}
              >
                <View style={styles.rpeIconRow}>
                  <Ionicons name={icon as any} size={rf(26)} color={palette} />
                  {isSelected && (
                    <View style={[styles.rpeCheck, { backgroundColor: palette }]}>
                      <Ionicons name="checkmark" size={rf(12)} color={colors.text.primary} />
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.rpeText, isSelected && { color: colors.text.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {RPE_DESCRIPTOR[rpe]}
                </Text>
                <Text style={styles.rpeNumeric}>RPE {RPE_NUMERIC[rpe]}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* ── Session volume footer (live) — flat row, no card-in-sheet ── */}
        <View style={styles.volumeFooter}>
          <Ionicons name="barbell-outline" size={rf(14)} color={colors.secondary.DEFAULT} />
          <Text style={styles.volumeLabel} numberOfLines={1}>
            Session volume (incl. this set)
          </Text>
          <Text
            style={styles.volumeValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {Math.round(sessionVolume).toLocaleString()} kg
          </Text>
        </View>

        {/* ── Save / Back row — Save is the primary CTA, disabled until an RPE
              is selected so users don't accidentally save without rating.
              Label changes dynamically: "Pick RPE" (no selection) → "Save Set"
              (middle sets) → "Next Set →" (last set). ── */}
        <View style={styles.actionRow}>
          <GlassButton
            label="Back"
            onPress={onCancel}
            variant="secondary"
            colors={[colors.glass.backgroundDark, colors.glass.backgroundDark]}
            textStyle={styles.backButtonText}
            style={styles.backButton}
            accessibilityLabel="Cancel set log"
          />
          <GlassButton
            label={
              !selectedRpe
                ? 'Pick RPE'
                : setIndex + 1 >= totalSets
                  ? 'Complete Workout'
                  : 'Save & Next →'
            }
            onPress={() => selectedRpe && handleSave(selectedRpe)}
            variant="primary"
            style={styles.saveButton}
            accessibilityLabel="Save set"
            disabled={!selectedRpe}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ScrollView wraps the modal body so the lower controls (RPE buttons +
  // Back/Cancel) scroll above the Android soft keyboard. The modal's content
  // is laid out top-to-bottom inside this scroll container.
  modalScroll: {
    flex: 1,
  },
  // Applied to BottomSheet's KeyboardAvoidingView via `contentStyle` so the
  // ScrollView inside can flex to the sheet's bounded maxHeight.
  sheetContentFlex: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: rp(spacing.xl),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rp(spacing.lg),
    gap: rp(spacing.sm),
  },
  exerciseName: {
    fontSize: rf(22),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text.primary,
    letterSpacing: -0.2,
    flex: 1,
  },
  // PR badge — gold glass pill
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xxs),
    backgroundColor: hexToRgba(colors.warning.DEFAULT, 0.13),
    borderWidth: 1,
    borderColor: hexToRgba(colors.warning.DEFAULT, 0.4),
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
  },
  prBadgeText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.warning.DEFAULT,
  },
  // Calibration banner — compact single row (reviewer: was too tall).
  calibrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.sm),
    backgroundColor: hexToRgba(colors.secondary.DEFAULT, 0.1),
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary.DEFAULT,
    borderRadius: borderRadius.md,
    padding: rp(spacing.sm),
    marginBottom: rp(spacing.lg),
  },
  calibrationTextWrap: {
    flex: 1,
  },
  calibrationTitle: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.secondary.DEFAULT,
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  calibrationBody: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.secondary,
    lineHeight: rf(15),
    marginTop: 2,
  },
  // Previous session hint — compact.
  previousHint: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    padding: rp(spacing.sm),
    marginBottom: rp(spacing.md),
  },
  previousRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rp(spacing.sm),
    alignItems: 'center',
  },
  previousLabel: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
  },
  previousValue: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xxs),
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.1),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.25),
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    // Clamp to 44px minimum touch target (chip was ~28-32px tall, below the
    // 44px accessibility minimum for the Copy action).
    minHeight: Math.max(rp(44), 44),
    justifyContent: 'center',
  },
  copyChipText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.primary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  suggestionText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.success.DEFAULT,
    fontWeight: String(typography.fontWeight.medium) as any,
    marginTop: rp(spacing.xxs),
  },
  reasonText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    marginTop: rp(spacing.xxs),
    fontStyle: 'italic',
  },
  // Set type
  setTypeButtons: {
    flexDirection: 'row',
    gap: rp(spacing.xs),
    flexWrap: 'wrap',
  },
  setTypeBadge: {
    // Clamp to 44px minimum touch target. Pill shape for full labels.
    minHeight: Math.max(rp(36), 44),
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.xs),
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.glass.backgroundLight,
    backgroundColor: colors.glass.backgroundDark,
  },
  setTypeText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.medium) as any,
    color: colors.text.secondary,
  },
  legendToggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCard: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: rp(spacing.sm),
    marginBottom: rp(spacing.md),
    gap: rp(spacing.xs),
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rp(spacing.xs),
  },
  legendDot: {
    width: rf(8),
    height: rf(8),
    borderRadius: borderRadius.full,
    marginTop: rf(4),
  },
  legendLabel: {
    width: rp(64),
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
  },
  legendDesc: {
    flex: 1,
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    lineHeight: rf(15),
  },
  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rp(spacing.md),
    gap: rp(spacing.md),
  },
  fieldLabel: {
    width: rp(80),
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  stepperRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: 'hidden',
  },
  stepperBtn: {
    // 48pt+ steppers for sweaty-thumb mid-set accuracy (was 44).
    width: Math.max(rp(48), 48),
    height: Math.max(rp(48), 48),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.backgroundDark,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Keep input visually grouped with steppers — no separate border.
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.aurora.space.high,
    // Tall readout row so the big numerals breathe.
    minHeight: Math.max(rp(64), 64),
  },
  input: {
    flex: 1,
    paddingVertical: rp(12),
    paddingHorizontal: rp(spacing.xs),
    color: colors.text.primary,
    // Big numeric readout (was h3=20) — glanceable mid-workout.
    fontSize: rf(28),
    textAlign: 'center',
    fontWeight: String(typography.fontWeight.extrabold) as any,
    fontVariant: ['tabular-nums'],
  },
  inputSuffix: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
    paddingRight: rp(spacing.sm),
  },
  bodyweightNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xs),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    padding: rp(spacing.sm),
    marginBottom: rp(spacing.md),
  },
  bodyweightText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  // RPE three-tap label row — left-aligned so the label + required star + hint
  // + info icon sit on one line, with the info icon pushed to the far right.
  rpeLabel: {
    marginBottom: rp(spacing.xs),
    alignItems: 'center',
    flexDirection: 'row',
    gap: rp(spacing.xs),
  },
  requiredStar: {
    color: colors.error.DEFAULT,
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  rpeHint: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    fontStyle: 'italic',
    flex: 1,
  },
  rpeLabelText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  rpeInfoToggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeExplainerCard: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: rp(spacing.md),
    marginBottom: rp(spacing.sm),
  },
  rpeExplainerTitle: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    marginBottom: rp(spacing.xxs),
  },
  rpeExplainerBody: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.secondary,
    lineHeight: rf(16),
    marginBottom: rp(spacing.sm),
  },
  rpeZoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rp(spacing.xs),
    paddingVertical: rp(spacing.xxs),
  },
  rpeZoneRange: {
    width: rp(56),
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.secondary.DEFAULT,
  },
  rpeZoneLabel: {
    width: rp(72),
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.medium) as any,
    color: colors.text.secondary,
  },
  rpeZoneDesc: {
    flex: 1,
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    lineHeight: rf(15),
  },
  rpeRow: {
    flexDirection: 'row',
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.md),
  },
  rpeButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xxs),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xxs),
    borderWidth: 1,
    // Clamp to 44px minimum touch target (paddingVertical:14 + icon + label
    // was ~52-60px on most screens but could compress below 44 on small
    // devices with large font scaling — enforce the floor).
    minHeight: Math.max(rp(44), 44),
  },
  rpeText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.semibold) as any,
    textAlign: 'center',
  },
  // Session volume footer — flat row with a hairline top rule (no card-in-sheet).
  volumeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    paddingTop: rp(spacing.sm),
    marginBottom: rp(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.glass.backgroundDark,
  },
  // Progressive overload explainer card
  overloadCard: {
    backgroundColor: hexToRgba(colors.success.DEFAULT, 0.08),
    borderWidth: 1,
    borderColor: hexToRgba(colors.success.DEFAULT, 0.3),
    borderRadius: borderRadius.md,
    padding: rp(spacing.md),
    marginBottom: rp(spacing.md),
  },
  overloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xxs),
  },
  overloadTitle: {
    flex: 1,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.success.DEFAULT,
  },
  overloadDismiss: {
    width: Math.max(rp(24), 32),
    height: Math.max(rp(24), 32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  overloadBody: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.secondary,
    lineHeight: rf(16),
  },
  volumeLabel: {
    flex: 1,
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  volumeValue: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.secondary.DEFAULT,
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  backButton: {
    flex: 1,
    marginRight: rp(spacing.xs),
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  saveButton: {
    flex: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: rp(spacing.md),
    marginTop: rp(spacing.sm),
  },
  // RPE selected-state helpers
  rpeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xxs),
    marginBottom: rp(spacing.xxs),
  },
  rpeCheck: {
    width: rf(16),
    height: rf(16),
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeNumeric: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
    marginTop: 2,
  },
  // Header progress dots
  headerTitleWrap: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: rp(spacing.xs),
    marginTop: rp(spacing.md),
    alignItems: 'center',
  },
  progressDot: {
    width: rf(8),
    height: rf(8),
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.backgroundLight,
  },
  progressDotDone: {
    backgroundColor: colors.secondary.DEFAULT,
  },
  progressDotCurrent: {
    width: rf(10),
    height: rf(10),
    backgroundColor: colors.primary.DEFAULT,
  },
  // Set type section + active text
  setTypeSection: {
    marginBottom: rp(spacing.lg),
  },
  setTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rp(spacing.xs),
  },
  setTypeTextActive: {
    color: colors.text.primary,
  },
});
