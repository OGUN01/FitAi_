/**
 * WeightEntryModal - Modal for logging weight entries
 *
 * SINGLE SOURCE OF TRUTH: Uses progress_entries table via progressData service
 *
 * Features:
 * - DialStepper for the primary weight metric (Editorial Dark single-metric
 *   entry — replaces the old boxed labeled-input stack)
 * - Optional body fat (underline input) and notes
 * - Syncs to Supabase immediately
 * - Updates local stores for instant UI feedback
 */

import React, { useState, useCallback, useEffect } from "react";
import { logger } from "../../utils/logger";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../utils/haptics";
import {
  colors,
  border as borderTokens,
  spacing,
  borderRadius,
  typography,
  flatColors,
} from "../../theme/aurora-tokens";
import { rf, rs, rh } from "../../utils/responsive";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import { DialStepper } from "../onboarding/aurora/DialStepper";
import { progressDataService } from "../../services/progressData";
import { BodyAnalysisService } from "../../services/onboardingService";
import type { BodyAnalysisData } from "../../types/onboarding";
import { useProfileStore } from "../../stores/profileStore";
import { useAnalyticsStore } from "../../stores/analyticsStore";
import { trackAchievementActivity, isWeightGoalAchieved } from "../../stores/achievementStore";
import { useAuth } from "../../hooks/useAuth";
import { getCurrentUserId } from "../../services/authUtils";
import { invalidateMetricsCache } from "../../hooks/useCalculatedMetrics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalDateString } from "../../utils/weekUtils";
import { weightTrackingService } from "../../services/WeightTrackingService";
import { convertWeight, toDisplayWeight, parseLocalFloat } from "../../utils/units";

interface WeightEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentWeight?: number; // Pre-fill with current weight
  unit?: "kg" | "lbs";
}

// Validation floors/ceilings per unit — also drive the DialStepper range.
const WEIGHT_RANGE: Record<"kg" | "lbs", { min: number; max: number }> = {
  kg: { min: 20, max: 300 },
  lbs: { min: 44, max: 660 },
};
const WEIGHT_STEP = 0.1;
const BODY_FAT_MIN = 3;
const BODY_FAT_MAX = 60;
const BODY_FAT_STEP = 0.5;

export const WeightEntryModal: React.FC<WeightEntryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentWeight,
  unit = "kg",
}) => {
  const { user } = useAuth();

  // Form state — weight is the primary metric (DialStepper, numeric). Body fat
  // is an OPTIONAL underline input, kept as a string so it can stay blank.
  const range = WEIGHT_RANGE[unit];
  const [weight, setWeight] = useState<number>(range.min);
  const [bodyFat, setBodyFat] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with current weight when modal opens. No hardcoded fallback
  // (principle #8): when the real value is missing the dial starts at the
  // validation floor — a UI default, not substituted user data.
  useEffect(() => {
    if (visible) {
      const displayWeight = toDisplayWeight(currentWeight ?? null, unit);
      setWeight(displayWeight != null ? Math.max(range.min, Math.min(range.max, displayWeight)) : range.min);
    }
  }, [visible, currentWeight, unit, range.min, range.max]);

  // Reset form when closing
  const handleClose = useCallback(() => {
    setBodyFat("");
    setNotes("");
    setError(null);
    onClose();
  }, [onClose]);

  // Validate inputs
  const validateInputs = useCallback((): boolean => {
    if (!Number.isFinite(weight)) {
      setError("Please enter a valid weight");
      return false;
    }

    if (unit === "lbs") {
      if (weight < 44 || weight > 660) {
        setError("Weight must be between 44 and 660 lbs");
        return false;
      }
    } else {
      if (weight < 20 || weight > 300) {
        setError("Weight must be between 20 and 300 kg");
        return false;
      }
    }

    if (bodyFat.trim()) {
      const bodyFatNum = parseLocalFloat(bodyFat);
      if (isNaN(bodyFatNum) || bodyFatNum < 3 || bodyFatNum > 60) {
        setError("Body fat must be between 3% and 60%");
        return false;
      }
    }

    setError(null);
    return true;
  }, [weight, bodyFat, unit]);

  // Submit weight entry
  const handleSubmit = useCallback(async () => {
    if (!validateInputs()) {
      haptics.error();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const weightKg = convertWeight(weight, unit, "kg");
      const bodyFatPercent = bodyFat.trim() ? parseLocalFloat(bodyFat) : undefined;

      if (user?.id) {
        // Authenticated user: sync to Supabase
        const result = await progressDataService.createProgressEntry(user.id, {
          weight_kg: weightKg,
          body_fat_percentage: bodyFatPercent,
          notes: notes || undefined,
        });

        if (!result.success) {
          setError(result.error || "Failed to save weight entry");
          haptics.error();
          return;
        }
      } else {
        // Guest user: save locally via AsyncStorage
        const existingData = await AsyncStorage.getItem("guest_weight_entries");
        const entries = existingData ? JSON.parse(existingData) : [];
        entries.push({
          id: `guest_${Date.now()}`,
          weight_kg: weightKg,
          body_fat_percentage: bodyFatPercent,
          notes: notes || undefined,
          created_at: new Date().toISOString(),
        });
        await AsyncStorage.setItem(
          "guest_weight_entries",
          JSON.stringify(entries),
        );
      }

      haptics.success();

      const nextBodyAnalysis = {
        ...(useProfileStore.getState().bodyAnalysis || {}),
        current_weight_kg: weightKg,
      };
      useProfileStore.getState().updateBodyAnalysis(nextBodyAnalysis);
      weightTrackingService.setWeight(weightKg);

      // Milestone achievements (weight-first-log, weight-goal-hit) key off
      // these two fields — see services/achievements/definitions.ts. This was
      // the one primary weight-entry flow that never surfaced weight activity
      // to the achievement engine, so those milestones could never unlock.
      const achievementUserId = getCurrentUserId();
      if (achievementUserId) {
        // Reuses achievementStore's canonical tolerance-based check so this
        // flow and the store's own reconciliation path agree on what counts
        // as "goal achieved" (within 0.25kg of target).
        const weightGoalAchieved = isWeightGoalAchieved(
          weightKg,
          nextBodyAnalysis.target_weight_kg,
        );
        trackAchievementActivity.customActivity(achievementUserId, {
          weightLogged: 1,
          weightGoalAchieved,
        });
      }

      if (user?.id) {
        try {
          await BodyAnalysisService.save(user.id, nextBodyAnalysis as BodyAnalysisData);
        } catch (mirrorError) {
          console.error(
            "Failed to mirror manual weight into body analysis:",
            mirrorError,
          );
        }
      }

      const analyticsState = useAnalyticsStore.getState();
      const entryDate = getLocalDateString();
      const nextWeightHistory = [
        ...analyticsState.weightHistory.filter(
          (entry) => entry.date !== entryDate,
        ),
        { date: entryDate, weight: weightKg },
      ].sort((a, b) => a.date.localeCompare(b.date));
      analyticsState.setHistoryData(
        nextWeightHistory,
        analyticsState.calorieHistory,
      );

      invalidateMetricsCache();

      logger.info("Weight entry saved successfully", { weightKg });

      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Failed to save weight entry:", err);
      setError("An unexpected error occurred");
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [weight, bodyFat, notes, user, validateInputs, onSuccess, handleClose, unit]);

  const displayUnit = unit === "lbs" ? "lbs" : "kg";

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      showCloseButton={false}
      contentStyle={styles.content}
      testID="weight-entry-sheet"
    >
      {/* ── Header — custom (title + close button), per the
          AdjustmentWizard.tsx pattern. ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Log Weight</Text>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close weight entry"
        >
          <Ionicons
            name="close"
            size={rf(24)}
            color={colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Weight — primary metric, DialStepper (single-metric entry). */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Weight ({displayUnit}) <Text style={styles.required}>*</Text>
          </Text>
          <DialStepper
            value={weight}
            min={range.min}
            max={range.max}
            step={WEIGHT_STEP}
            onChange={setWeight}
            unit={displayUnit}
            format={(v) => v.toFixed(1)}
            testID="weight-dial"
          />
        </View>

        {/* Body Fat Input (Optional) — underline, stays blank when omitted. */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Body Fat % (optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="fitness-outline"
              size={rs(20)}
              color={colors.text.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="e.g., 18.5"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              editable={!isSubmitting}
            />
            <Text style={styles.unitLabel}>%</Text>
          </View>
        </View>

        {/* Notes Input (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (optional)</Text>
          <View
            style={[styles.inputContainer, styles.notesContainer]}
          >
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling?"
              placeholderTextColor={colors.text.muted}
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
              color={colors.error.light}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isSubmitting && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Save weight entry"
      >
        {isSubmitting ? (
          <AuroraSpinner customSize={rf(14)} theme="white" />
        ) : (
          <>
            <Ionicons
              name="checkmark-circle"
              size={rs(20)}
              color={colors.text.primary}
            />
            <Text style={styles.submitButtonText}>Save Entry</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info Text */}
      <Text style={styles.infoText}>
        Your weight is tracked in Progress → Analytics
      </Text>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  // BottomSheet already supplies the sheet surface, backdrop fade,
  // drag-to-dismiss, and safe-area padding this modal used to hand-roll.
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.variants.pageTitle,
    color: colors.text.primary,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    maxHeight: rh(350),
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.variants.caption2,
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error.light,
  },
  // Editorial underline input: no boxed border, just a hairline underline.
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: borderTokens.DEFAULT,
    paddingHorizontal: 0,
    height: rh(50),
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.variants.body,
    color: colors.text.primary,
    height: "100%",
  },
  unitLabel: {
    ...typography.variants.caption2,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
  notesContainer: {
    height: rh(80),
    alignItems: "flex-start",
    paddingVertical: spacing.md,
  },
  notesInput: {
    height: "100%",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: flatColors.errorTint,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.variants.caption2,
    color: colors.error.light,
    marginLeft: spacing.sm,
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.variants.cardHeadline,
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
  },
  infoText: {
    ...typography.variants.caption,
    textAlign: "center",
    color: colors.text.muted,
    marginTop: spacing.md,
  },
});

export default WeightEntryModal;
