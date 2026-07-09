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

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheet,
  GlassCard,
  AnimatedPressable,
  GlassButton,
} from "../ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rp, rf } from "../../utils/responsive";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
import { parseLocalFloat } from "../../utils/units";
import { totalVolume } from "../../utils/volumeCalculator";
import {
  exerciseHistoryService,
  LastSessionData,
} from "../../services/exerciseHistoryService";
import {
  progressionService,
  ProgressionResult,
} from "../../services/progressionService";
import { prDetectionService, PRCheckResult } from "../../services/prDetectionService";
import { useFitnessStore } from "../../stores/fitnessStore";
import { parseRepRange } from "../../features/workouts/components/ExerciseCard";
import { exerciseFilterService } from "../../services/exerciseFilterService";

const SET_TYPES = ["normal", "warmup", "failure", "drop"] as const;
type SetType = (typeof SET_TYPES)[number];

const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: "W",
  warmup: "WU",
  failure: "F",
  drop: "D",
};

const SET_TYPE_COLORS: Record<SetType, string> = {
  normal: colors.text.tertiary,
  warmup: colors.warning.DEFAULT,
  failure: colors.error.DEFAULT,
  drop: colors.secondary.DEFAULT,
};

const KG_TO_LBS = 2.2046;
const WEIGHT_STEP_KG = 2.5;

function kgToDisplay(kg: number, units: "kg" | "lbs"): string {
  if (units === "lbs") return (kg * KG_TO_LBS).toFixed(1);
  return kg.toFixed(1);
}

function displayToKg(display: string, units: "kg" | "lbs"): number {
  const val = parseLocalFloat(display) || 0;
  return Math.max(0, units === "lbs" ? val / KG_TO_LBS : val);
}

function isTimeHold(reps: number | string): boolean {
  if (typeof reps === "number") return false;
  const s = String(reps).toLowerCase().trim();
  if (s.includes("amrap")) return false;
  return (
    /\d+\s*(s|sec|secs|second|seconds)$/.test(s) ||
    /^\d+:\d{1,2}$/.test(s) ||
    /\d+\s*(min|mins|minute|minutes)$/.test(s)
  );
}

function isPerSide(reps: number | string): boolean {
  if (typeof reps === "number") return false;
  return (
    String(reps).toLowerCase().includes("per side") ||
    String(reps).toLowerCase().includes("each side") ||
    String(reps).toLowerCase().includes("each leg") ||
    String(reps).toLowerCase().includes("each arm")
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
  userUnits?: "kg" | "lbs";
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
  userUnits = "kg",
  calibrationMode = false,
  calibrationStartKg = 0,
  calibrationNote = "",
  onSave,
  onCancel,
  onPRDetected,
}) => {
  const [weight, setWeight] = useState("");
  const [repsInput, setRepsInput] = useState("");
  const repsRef = useRef<TextInput>(null);
  const [setType, setSetType] = useState<SetType>("normal");
  const [previousSession, setPreviousSession] = useState<LastSessionData | null>(null);
  const [suggestedWeight, setSuggestedWeight] = useState<ProgressionResult | null>(null);
  // Live PR preview — computed from the current weight/reps inputs against the
  // user's existing PRs. Null until history is loaded; null when no PR hit.
  const [prPreview, setPrPreview] = useState<PRCheckResult | null>(null);

  const exerciseData = exerciseFilterService.getExerciseById(exerciseId);
  const isBodyweight =
    exerciseData?.equipments?.includes("body weight") ??
    progressionService.isBodyweightExercise(exerciseId);

  const isTimeBased = isTimeHold(reps);
  const perSide = isPerSide(reps);
  const repsLabel = isTimeBased ? "Sets done" : perSide ? "Reps/side" : "Reps";

  const previousSet = previousSession?.sets[setIndex];

  // Default reps from exercise definition
  useEffect(() => {
    if (!isVisible) return;
    const [, maxReps] = parseRepRange(reps);
    setRepsInput(maxReps > 0 ? String(maxReps) : "");
    setSetType("normal");
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
        console.error("[SetLogModal] history fetch error:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, exerciseId, userId, setIndex, calibrationMode]);

  // ── Live PR preview ───────────────────────────────────────────────────────
  // Recompute the PR check whenever the weight/reps inputs change so the user
  // sees a live PR badge before tapping save. Non-blocking; failures swallowed.
  useEffect(() => {
    if (!isVisible || !userId || calibrationMode || isTimeBased) {
      setPrPreview(null);
      return;
    }
    let cancelled = false;
    const weightKg = isBodyweight ? 0 : displayToKg(weight, userUnits);
    const repsValue = parseInt(repsInput, 10) || 0;
    if (repsValue <= 0 || (!isBodyweight && weightKg <= 0)) {
      setPrPreview(null);
      return;
    }
    exerciseHistoryService
      .getPersonalRecords(exerciseId, userId)
      .then((prs) => {
        if (cancelled) return;
        const weightPR = prs.find((p) => p.prType === "weight");
        const e1rmPR = prs.find((p) => p.prType === "estimated_1rm");
        const result = prDetectionService.checkForPR(
          exerciseId,
          { weightKg: isBodyweight ? repsValue : weightKg, reps: repsValue },
          { weight: weightPR?.value, estimated1rm: e1rmPR?.value },
        );
        setPrPreview(result);
      })
      .catch(() => {
        if (!cancelled) setPrPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [weight, repsInput, isVisible, userId, exerciseId, calibrationMode, isTimeBased, isBodyweight, userUnits]);

  // ── Stepper helpers ───────────────────────────────────────────────────────
  const bumpWeight = useCallback(
    (deltaKg: number) => {
      setWeight((prev) => {
        const currentKg = displayToKg(prev, userUnits);
        const nextKg = Math.max(0, currentKg + deltaKg);
        return kgToDisplay(nextKg, userUnits);
      });
    },
    [userUnits],
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

  // ── Session volume footer (live, derived from store) ──────────────────────
  // SSOT: currentWorkoutSession.exercises[].sets[] — the store's CompletedSet
  // uses `weight` (kg) + `reps` (see fitnessStore.updateSetData). totalVolume
  // expects { weightKg, reps }, so map at the boundary.
  const sessionExercises =
    useFitnessStore.getState().currentWorkoutSession?.exercises ?? [];
  const sessionVolume = sessionExercises.reduce((sum, ex) => {
    const sets = (ex.sets ?? [])
      .filter((s) => s?.weight != null && s?.reps != null)
      .map((s) => ({ weightKg: s.weight!, reps: s.reps! }));
    return sum + totalVolume(sets);
  }, 0);

  // ── Save with validation + RPE ────────────────────────────────────────────
  const handleSave = (rpe: 1 | 2 | 3) => {
    const weightKg = isBodyweight ? 0 : displayToKg(weight, userUnits);
    const repsValue = parseInt(repsInput, 10) || 0;

    // Validation: reject reps=0
    if (repsValue <= 0) {
      crossPlatformAlert(
        "Reps required",
        "Enter how many reps you completed before saving this set.",
        [{ text: "OK", style: "default" }],
      );
      return;
    }
    // Validation: reject weight=0 for non-bodyweight exercises
    if (!isBodyweight && weightKg <= 0) {
      crossPlatformAlert(
        "Weight required",
        `Enter the weight you lifted (in ${userUnits}) before saving this set.`,
        [{ text: "OK", style: "default" }],
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
          const weightPR = prs.find((p) => p.prType === "weight");
          const e1rmPR = prs.find((p) => p.prType === "estimated_1rm");
          const result = prDetectionService.checkForPR(
            exerciseId,
            { weightKg: isBodyweight ? repsValue : weightKg, reps: repsValue },
            { weight: weightPR?.value, estimated1rm: e1rmPR?.value },
          );
          if (result) {
            if (result.isWeightPR && result.newWeightPR != null) {
              prDetectionService.recordPR(userId, exerciseId, "weight", result.newWeightPR, undefined, exerciseName, repsValue);
            }
            if (result.is1RMPR && result.new1RMPR != null) {
              prDetectionService.recordPR(userId, exerciseId, "estimated_1rm", result.new1RMPR, undefined, exerciseName, repsValue);
            }
            onPRDetected?.(exerciseName);
          }
        })
        .catch((err) => {
          console.error("[SetLogModal] PR detection error:", err);
        });
    }

    onSave(data);
  };

  return (
    <BottomSheet
      visible={isVisible}
      onClose={onCancel}
      title={`Set ${setIndex + 1} of ${totalSets}`}
      dismissOnDrag={false}
      closeOnOverlayPress={false}
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
      {/* ── Exercise name + PR preview ── */}
      <View style={styles.headerRow}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {exerciseName}
        </Text>
        {prPreview && (prPreview.isWeightPR || prPreview.is1RMPR) && (
          <View style={styles.prBadge}>
            <Ionicons name="trophy" size={rf(13)} color={colors.warning.DEFAULT} />
            <Text style={styles.prBadgeText}>
              {prPreview.isWeightPR && prPreview.newWeightPR != null
                ? `PR ${kgToDisplay(prPreview.newWeightPR, userUnits)} ${userUnits}`
                : prPreview.is1RMPR && prPreview.new1RMPR != null
                ? `PR 1RM ${Math.round(prPreview.new1RMPR)}kg`
                : "PR"}
            </Text>
          </View>
        )}
      </View>

      {/* ── Calibration Banner (first-ever session) ── */}
      {calibrationMode && (
        <View style={styles.calibrationBanner}>
          <View style={styles.calibrationHeader}>
            <Ionicons name="fitness" size={rf(16)} color={colors.secondary.DEFAULT} />
            <Text style={styles.calibrationTitle}>Calibration Session</Text>
          </View>
          <Text style={styles.calibrationBody}>
            {calibrationNote ||
              "Find your starting weight. Ramp up until 8–12 reps feel Just Right."}
          </Text>
        </View>
      )}

      {/* ── Previous session hint + Copy last set chip + progression reason ── */}
      {!calibrationMode && previousSet && (
        <View style={styles.previousHint}>
          <View style={styles.previousRow}>
            <Text style={styles.previousLabel}>Previous:</Text>
            <Text style={styles.previousValue}>
              {previousSet.weightKg != null
                ? `${kgToDisplay(previousSet.weightKg, userUnits)} ${userUnits}`
                : "—"}{" "}
              × {previousSet.reps ?? "—"} reps
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
              <Text style={styles.copyChipText}>Copy</Text>
            </AnimatedPressable>
          </View>
          {suggestedWeight?.action === "increase" && (
            <Text style={styles.suggestionText}>
              Suggested: {kgToDisplay(suggestedWeight.suggestedWeightKg, userUnits)}{" "}
              {userUnits} ↑{suggestedWeight.doubleJump ? "↑" : ""}
            </Text>
          )}
          {/* Surface the progression engine's reasoning so the user understands
              why a load was suggested (increase / hold / deload). */}
          {suggestedWeight?.reason ? (
            <Text style={styles.reasonText}>{suggestedWeight.reason}</Text>
          ) : null}
        </View>
      )}

      {/* ── Set type ── */}
      <View style={styles.setTypeRow}>
        <Text style={styles.fieldLabel}>Set Type</Text>
        <View style={styles.setTypeButtons}>
          {SET_TYPES.map((type) => (
            <AnimatedPressable
              key={type}
              onPress={() => setSetType(type)}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="selection"
              style={[
                styles.setTypeBadge,
                { backgroundColor: SET_TYPE_COLORS[type] },
                setType === type && styles.setTypeBadgeActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Set type ${SET_TYPE_LABELS[type]}`}
            >
              <Text style={styles.setTypeText}>{SET_TYPE_LABELS[type]}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {/* ── Weight input with steppers ── */}
      {!isBodyweight ? (
        <View style={styles.inputRow}>
          <Text style={styles.fieldLabel}>
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
              <Ionicons name="remove" size={rf(18)} color={colors.text.primary} />
            </AnimatedPressable>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => repsRef.current?.focus()}
            />
            <AnimatedPressable
              onPress={() => bumpWeight(WEIGHT_STEP_KG)}
              style={styles.stepperBtn}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel={`Increase weight by ${WEIGHT_STEP_KG} kg`}
            >
              <Ionicons name="add" size={rf(18)} color={colors.text.primary} />
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
        <Text style={styles.fieldLabel}>{repsLabel}</Text>
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
            <Ionicons name="remove" size={rf(18)} color={colors.text.primary} />
          </AnimatedPressable>
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
          />
          <AnimatedPressable
            onPress={() => bumpReps(1)}
            style={styles.stepperBtn}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Increase reps by 1"
          >
            <Ionicons name="add" size={rf(18)} color={colors.text.primary} />
          </AnimatedPressable>
        </View>
      </View>

      {/* ── RPE Three-tap (Ionicons + token colors, no emoji) ── */}
      <View style={styles.rpeLabel}>
        <Text style={styles.rpeLabelText}>How hard was that?</Text>
      </View>
      <View style={styles.rpeRow}>
        <AnimatedPressable
          onPress={() => handleSave(1)}
          scaleValue={0.96}
          springConfig="snappy"
          hapticType="success"
          style={[styles.rpeButton, styles.rpeEasy]}
          accessibilityRole="button"
          accessibilityLabel="Easy — save set with RPE easy"
        >
          <Ionicons name="happy-outline" size={rf(22)} color={colors.success.DEFAULT} />
          <Text style={styles.rpeText}>Easy</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => handleSave(2)}
          scaleValue={0.96}
          springConfig="snappy"
          hapticType="medium"
          style={[styles.rpeButton, styles.rpeRight]}
          accessibilityRole="button"
          accessibilityLabel="Just right — save set with RPE just right"
        >
          <Ionicons name="thumbs-up-outline" size={rf(22)} color={colors.warning.DEFAULT} />
          <Text style={styles.rpeText}>Just Right</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => handleSave(3)}
          scaleValue={0.96}
          springConfig="snappy"
          hapticType="heavy"
          style={[styles.rpeButton, styles.rpeHard]}
          accessibilityRole="button"
          accessibilityLabel="Hard — save set with RPE hard"
        >
          <Ionicons name="flame-outline" size={rf(22)} color={colors.error.DEFAULT} />
          <Text style={styles.rpeText}>Hard</Text>
        </AnimatedPressable>
      </View>

      {/* ── Session volume footer (live) ── */}
      <GlassCard
        elevation={1}
        padding="sm"
        borderRadius="md"
        style={styles.volumeFooter}
        contentStyle={styles.volumeFooterContent}
      >
        <Ionicons name="barbell-outline" size={rf(14)} color={colors.secondary.DEFAULT} />
        <Text style={styles.volumeLabel}>Session volume</Text>
        <Text style={styles.volumeValue}>
          {Math.round(sessionVolume).toLocaleString()} kg
        </Text>
      </GlassCard>

      {/* ── Back button ── */}
      <GlassButton
        label="Back"
        onPress={onCancel}
        variant="secondary"
        fullWidth
        style={styles.backButton}
        accessibilityLabel="Cancel set log"
      />
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
  modalScrollContent: {
    paddingBottom: rp(spacing.xl),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(spacing.md),
    gap: rp(spacing.sm),
  },
  exerciseName: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    flex: 1,
  },
  // PR badge — gold glass pill
  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    backgroundColor: `${colors.warning.DEFAULT}22`,
    borderWidth: 1,
    borderColor: `${colors.warning.DEFAULT}66`,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
  },
  prBadgeText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.warning.DEFAULT,
  },
  // Calibration banner
  calibrationBanner: {
    backgroundColor: `${colors.secondary.DEFAULT}1A`,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary.DEFAULT,
    borderRadius: borderRadius.md,
    padding: rp(spacing.md),
    marginBottom: rp(spacing.md),
  },
  calibrationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xxs),
  },
  calibrationTitle: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.secondary.light,
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  calibrationBody: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.secondary,
    lineHeight: rf(18),
  },
  // Previous session hint
  previousHint: {
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    padding: rp(spacing.md),
    marginBottom: rp(spacing.md),
  },
  previousRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.sm),
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xxs),
    backgroundColor: `${colors.primary.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.primary.DEFAULT}40`,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
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
    fontStyle: "italic",
  },
  // Set type
  setTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(spacing.md),
    gap: rp(spacing.md),
  },
  setTypeButtons: {
    flexDirection: "row",
    gap: rp(spacing.xs),
  },
  setTypeBadge: {
    width: rp(36),
    height: rp(36),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
  },
  setTypeBadgeActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
  setTypeText: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.background.DEFAULT,
  },
  // Inputs
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(spacing.md),
    gap: rp(spacing.md),
  },
  fieldLabel: {
    width: rp(80),
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  stepperRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  stepperBtn: {
    width: rp(40),
    height: rp(40),
    borderRadius: borderRadius.md,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: colors.aurora.space.high,
    borderRadius: borderRadius.md,
    paddingVertical: rp(12),
    paddingHorizontal: rp(spacing.md),
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    textAlign: "center",
    fontWeight: String(typography.fontWeight.bold) as any,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  bodyweightNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.xs),
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.md,
    padding: rp(spacing.sm),
    marginBottom: rp(spacing.md),
  },
  bodyweightText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    fontStyle: "italic",
  },
  // RPE three-tap
  rpeLabel: {
    marginBottom: rp(spacing.xs),
    alignItems: "center",
  },
  rpeLabelText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  rpeRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.md),
  },
  rpeButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: rp(14),
    alignItems: "center",
    justifyContent: "center",
    gap: rp(spacing.xxs),
  },
  rpeEasy: {
    backgroundColor: `${colors.success.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.success.DEFAULT}66`,
  },
  rpeRight: {
    backgroundColor: `${colors.warning.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.warning.DEFAULT}66`,
  },
  rpeHard: {
    backgroundColor: `${colors.error.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.error.DEFAULT}66`,
  },
  rpeText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.secondary,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  // Session volume footer
  volumeFooter: {
    marginBottom: rp(spacing.md),
  },
  volumeFooterContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
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
    marginTop: rp(spacing.xs),
  },
});
