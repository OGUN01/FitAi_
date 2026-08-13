/**
 * BuilderSummaryFooter — floating flat footer, sticky at the bottom of the
 * WeeklyBuilderScreen.
 *
 * Subscribes to workoutBuilderStore `insights` + `draft` and shows:
 *  - exercise count (sum across the week)
 *  - estimated duration (sum)
 *  - estimated calories (sum)
 *  - total volume (kg)
 *  - muscle balance % (push/pull ratio → simplified 0-100 balance score)
 *  - difficulty
 *
 * Save button: calls `save()`, fires celebration haptic + confetti burst
 * (ParticleBurst from src/components/ui/ParticleBurst.tsx — Phase 1 Confetti
 * absent), then navigates back.
 *
 * Loading state: AuroraSpinner while `isComputingInsights`.
 *
 * Design language: Editorial Dark — flat surface + 1px hairline top border,
 * no glass blur, no cast shadows (depth comes from type hierarchy). Confirm
 * dialogs route through DetentBottomSheet (thumb-reachable, swipe-dismissible)
 * instead of centered CustomDialog overlays. Metric readouts use
 * tabular-nums.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ViewStyle, Pressable, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import { DetentBottomSheet } from "../../ui/aurora/DetentBottomSheet";
import { ParticleBurst } from "../../ui/ParticleBurst";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { useFitnessStore } from "../../../stores/fitnessStore";
import { useProfileStore } from "../../../stores/profileStore";
import { toDisplayWeight, type WeightUnit } from "../../../utils/units";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  surface,
  border,
  flatShadows,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";

export interface BuilderSummaryFooterProps {
  /** Navigate back after a successful save. */
  onSaved: () => void;
  /** Container style override. */
  style?: ViewStyle;
  /** Test ID. */
  testID?: string;
}

export const BuilderSummaryFooter: React.FC<BuilderSummaryFooterProps> = ({
  onSaved,
  style,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const draft = useWorkoutBuilderStore((s) => s.draft);
  const insights = useWorkoutBuilderStore((s) => s.insights);
  const isComputingInsights = useWorkoutBuilderStore((s) => s.isComputingInsights);
  const aiLoading = useWorkoutBuilderStore((s) => s.aiLoading);
  const save = useWorkoutBuilderStore((s) => s.save);
  const generateFullWeek = useWorkoutBuilderStore((s) => s.generateFullWeek);
  const applyProgression = useWorkoutBuilderStore((s) => s.applyProgression);
  const deloadWeek = useWorkoutBuilderStore((s) => s.deloadWeek);

  // Phase 9 — completed sessions from fitnessStore for priorPerformance.
  const completedSessions = useFitnessStore((s) => s.completedSessions);

  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [deloadConfirmOpen, setDeloadConfirmOpen] = useState(false);
  const [aiActionError, setAiActionError] = useState<string | null>(null);
  const saveInFlightRef = useRef(false);
  const aiActionInFlightRef = useRef(false);
  const saveSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (saveSuccessTimeoutRef.current) {
        clearTimeout(saveSuccessTimeoutRef.current);
      }
      saveInFlightRef.current = false;
      aiActionInFlightRef.current = false;
    },
    [],
  );

  // ── Phase 9: filled-day count (drives "Generate Full Week" disabled state) ──
  const filledDayCount = useMemo(() => {
    if (!draft) return 0;
    return draft.workouts.filter((d) => (d.plannedExercises?.length ?? 0) > 0).length;
  }, [draft]);

  // ── Phase 9: build priorPerformance from completed sessions ──
  const priorPerformance = useMemo(() => {
    // Map the most recent completed session per exercise_id into the shape the
    // worker expects. Non-fatal: empty array for users with no history.
    const byExercise = new Map<string, {
      exerciseId: string;
      exerciseName?: string;
      lastSession: {
        completedAt: string;
        sets: Array<{
          setNumber: number;
          weightKg: number | null;
          reps: number | null;
          rpe?: 1 | 2 | 3 | null;
        }>;
      };
    }>();

    for (const session of completedSessions) {
      for (const ex of (session as { exercises?: Array<{ exerciseId: string; exerciseName?: string; sets?: Array<{ reps?: number; weight?: number; rpe?: number; completed?: boolean }> }> }).exercises ?? []) {
        if (!ex.exerciseId) continue;
        if (byExercise.has(ex.exerciseId)) continue;
        const sets = (ex.sets ?? []).map((s, i) => ({
          setNumber: i + 1,
          weightKg: s.weight ?? null,
          reps: s.reps ?? null,
          rpe: (s.rpe as 1 | 2 | 3 | null) ?? null,
        }));
        if (sets.length === 0) continue;
        byExercise.set(ex.exerciseId, {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          lastSession: {
            completedAt: (session as { completedAt?: string }).completedAt ?? new Date().toISOString(),
            sets,
          },
        });
      }
    }
    return Array.from(byExercise.values()).slice(0, 8);
  }, [completedSessions]);

  // Aggregate weekly stats from the draft (insights is the SSOT, but the
  // draft drives counts; insights carries volume/calories/duration).
  const totalExercises = useMemo(() => {
    if (!draft) return 0;
    return draft.workouts.reduce(
      (sum, d) => sum + (d.plannedExercises?.length ?? 0),
      0,
    );
  }, [draft]);

  const totalDuration = insights?.timeCommitment ?? 0;
  const totalVolume = insights?.totalVolume ?? 0;
  const totalCalories = insights?.calorieEstimate ?? 0;

  // Volume is stored/computed in kg; display converts for imperial users.
  // Two-step select → derive (jest profileStore mock ignores selectors).
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const userUnits: WeightUnit = personalInfo?.units === "imperial" ? "lbs" : "kg";
  const displayVolume = useMemo(
    () => (totalVolume > 0 ? toDisplayWeight(totalVolume, userUnits) : null),
    [totalVolume, userUnits],
  );

  // Push/pull balance → 0-100 score (1.0 = balanced = 100).
  const balanceScore = useMemo(() => {
    const ratio = insights?.pushPullRatio ?? 1;
    if (!Number.isFinite(ratio) || ratio <= 0) return 0;
    // Deviation from 1.0; map 1.0→100, 0.5/2.0→50, extreme→0
    const dev = Math.abs(Math.log2(ratio));
    return Math.max(0, Math.round(100 - dev * 50));
  }, [insights?.pushPullRatio]);

  const difficulty = useMemo(() => {
    if (!draft) return "—";
    const days = draft.workouts.filter((d) => (d.plannedExercises?.length ?? 0) > 0);
    if (days.length === 0) return "—";
    const difficulties = days.map((d) => d.difficulty);
    if (difficulties.includes("advanced")) return "Advanced";
    if (difficulties.includes("intermediate")) return "Intermediate";
    return "Beginner";
  }, [draft]);

  const hasContent = totalExercises > 0;

  const handleSave = async () => {
    if (!hasContent || saving || saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      await save();
      haptics.celebration();
      setShowConfetti(true);
      // Let the confetti play briefly before navigating back
      saveSuccessTimeoutRef.current = setTimeout(() => {
        saveSuccessTimeoutRef.current = null;
        saveInFlightRef.current = false;
        setSaving(false);
        setShowConfetti(false);
        onSaved();
      }, 900);
    } catch (err) {
      console.error("[BuilderSummaryFooter] save failed:", err);
      haptics.error();
      saveInFlightRef.current = false;
      setSaving(false);
    }
  };

  // ── Phase 9 AI action handlers ──
  const handleGenerateFullWeek = async () => {
    if (aiLoading || aiActionInFlightRef.current) return;
    setAiMenuOpen(false);
    if (filledDayCount < 2) {
      setAiActionError("Add exercises to at least 2 days first.");
      haptics.warning();
      return;
    }
    aiActionInFlightRef.current = true;
    haptics.medium();
    try {
      const result = await generateFullWeek();
      if (result.success) {
        haptics.success();
      } else {
        setAiActionError(result.error ?? "Failed to generate full week");
        haptics.error();
      }
    } catch (error) {
      console.error("[BuilderSummaryFooter] generate full week failed:", error);
      setAiActionError("Failed to generate full week");
      haptics.error();
    } finally {
      aiActionInFlightRef.current = false;
    }
  };

  const handleApplyProgression = async () => {
    if (aiLoading || aiActionInFlightRef.current) return;
    aiActionInFlightRef.current = true;
    setAiMenuOpen(false);
    haptics.medium();
    try {
      const result = await applyProgression(priorPerformance);
      if (result.success) {
        haptics.success();
      } else {
        setAiActionError(result.error ?? "Failed to apply progressive overload");
        haptics.error();
      }
    } catch (error) {
      console.error("[BuilderSummaryFooter] apply progression failed:", error);
      setAiActionError("Failed to apply progressive overload");
      haptics.error();
    } finally {
      aiActionInFlightRef.current = false;
    }
  };

  const handleDeloadConfirm = async () => {
    if (aiLoading || aiActionInFlightRef.current) return;
    aiActionInFlightRef.current = true;
    setDeloadConfirmOpen(false);
    haptics.medium();
    try {
      const result = await deloadWeek();
      if (result.success) {
        haptics.success();
      } else {
        setAiActionError(result.error ?? "Failed to apply deload");
        haptics.error();
      }
    } catch (error) {
      console.error("[BuilderSummaryFooter] apply deload failed:", error);
      setAiActionError("Failed to apply deload");
      haptics.error();
    } finally {
      aiActionInFlightRef.current = false;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom || rp(spacing.md) },
        style,
      ]}
      pointerEvents="box-none"
      testID={testID}
    >
      {/* Flat footer surface — depth from hairline top border, not blur/shadow */}
      <View style={styles.card}>
        {isComputingInsights && (
          <View style={styles.computingRow}>
            <AuroraSpinner customSize={rf(16)} theme="white" />
            <Text style={styles.computingText}>Recalculating…</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <Stat
            icon="barbell-outline"
            label="Exercises"
            value={String(totalExercises)}
          />
          <Stat
            icon="scale-outline"
            label="Volume"
            value={displayVolume != null ? `${Math.round(displayVolume)}${userUnits}` : "—"}
          />
          <Stat
            icon="fitness-outline"
            label="Balance"
            value={hasContent ? `${balanceScore}%` : "—"}
            valueColor={
              balanceScore >= 70
                ? colors.success.DEFAULT
                : balanceScore >= 40
                  ? colors.warning.DEFAULT
                  : colors.error.DEFAULT
            }
          />
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.difficultyCell}>
            <Text style={styles.difficultyLabel} numberOfLines={1}>
              Difficulty
            </Text>
            <Text style={styles.difficultyValue} numberOfLines={1}>
              {difficulty}
            </Text>
          </View>

          {/* Phase 9 — AI kebab menu */}
          <Pressable
            hitSlop={8}
            onPress={() => {
              setAiMenuOpen((v) => !v);
              haptics.selection();
            }}
            accessibilityRole="button"
            accessibilityLabel="AI actions menu"
            accessibilityState={{ disabled: aiLoading }}
            disabled={aiLoading}
            style={[styles.aiMenuBtn, aiLoading && styles.aiMenuBtnLoading]}
          >
            {aiLoading ? (
              <AuroraSpinner customSize={rf(16)} theme="white" />
            ) : (
              <Ionicons
                name={aiMenuOpen ? "close" : "sparkles"}
                size={rf(18)}
                color={colors.primary.DEFAULT}
              />
            )}
          </Pressable>

          <GlassButton
            label={saving ? "Saving…" : "Save Schedule"}
            icon="checkmark-circle-outline"
            onPress={handleSave}
            disabled={!hasContent || saving}
            loading={saving}
            variant="success"
            hapticType="heavy"
            style={styles.saveBtn}
            testID={`${testID ?? "footer"}-save`}
          />
        </View>

        {/* Phase 9 — AI menu dropdown (flat surface + hairline separators) */}
        {aiMenuOpen && (
          <View style={styles.aiMenu}>
            <Pressable
              onPress={handleGenerateFullWeek}
              disabled={filledDayCount < 2 || aiLoading}
              accessibilityRole="button"
              accessibilityLabel="Generate full week from partial plan"
              style={[styles.aiMenuItem, (filledDayCount < 2 || aiLoading) && styles.aiMenuItemDisabled]}
            >
              <Ionicons name="calendar-outline" size={rf(16)} color={colors.primary.DEFAULT} />
              <Text style={styles.aiMenuItemText}>Generate Full Week</Text>
              {filledDayCount < 2 && (
                <Text style={styles.aiMenuItemHint}>
                  {filledDayCount === 0
                    ? "Add to 2 days first"
                    : `${filledDayCount}/2 days`}
                </Text>
              )}
            </Pressable>
            <View style={styles.aiMenuRule} />
            <Pressable
              onPress={handleApplyProgression}
              disabled={aiLoading || priorPerformance.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Apply progressive overload"
              accessibilityState={{ disabled: aiLoading || priorPerformance.length === 0 }}
              style={[styles.aiMenuItem, (aiLoading || priorPerformance.length === 0) && styles.aiMenuItemDisabled]}
            >
              <Ionicons name="trending-up-outline" size={rf(16)} color={colors.primary.DEFAULT} />
              <Text style={styles.aiMenuItemText}>Apply Progressive Overload</Text>
            </Pressable>
            <View style={styles.aiMenuRule} />
            <Pressable
              onPress={() => {
                setAiMenuOpen(false);
                setDeloadConfirmOpen(true);
                haptics.selection();
              }}
              disabled={aiLoading}
              accessibilityRole="button"
              accessibilityLabel="Deload week"
              style={[styles.aiMenuItem, aiLoading && styles.aiMenuItemDisabled]}
            >
              <Ionicons name="fitness-outline" size={rf(16)} color={colors.primary.DEFAULT} />
              <Text style={styles.aiMenuItemText}>Deload Week</Text>
            </Pressable>
          </View>
        )}
      </View>

      {showConfetti && (
        <View style={styles.confettiWrap} pointerEvents="none">
          <ParticleBurst
            particleCount={24}
            duration={1400}
            radius={160}
            autoPlay
          />
        </View>
      )}

      {/*
        Phase 9 — Deload confirmation. Routed through DetentBottomSheet
        (thumb-reachable, swipe-dismissible) instead of a centered dialog.
        Destructive-ish: overwrites the draft.
      */}
      <DetentBottomSheet
        visible={deloadConfirmOpen}
        onClose={() => setDeloadConfirmOpen(false)}
        dismissOnLowestDrag={!aiLoading}
        snapPoints={[0.4, 0.6]}
        initialSnapIndex={1}
        testID={`${testID ?? "footer"}-deload-sheet`}
      >
        <View style={styles.sheetBody}>
          <View style={[styles.sheetIcon, { backgroundColor: hexToRgba(colors.warning.DEFAULT, 0.12) }]}>
            <Ionicons name="warning" size={rf(28)} color={colors.warning.DEFAULT} />
          </View>
          <Text style={styles.sheetTitle}>Apply Deload Week?</Text>
          <Text style={styles.sheetMessage}>
            This reduces volume by ~40% across all days. Your current exercises stay, but set counts drop. You can undo by not saving.
          </Text>
          <View style={styles.sheetActions}>
            <GlassButton
              label="Cancel"
              onPress={() => setDeloadConfirmOpen(false)}
              disabled={aiLoading}
              variant="secondary"
              hapticType="light"
              style={styles.sheetActionBtn}
              testID={`${testID ?? "footer"}-deload-cancel`}
            />
            <GlassButton
              label="Apply Deload"
              onPress={handleDeloadConfirm}
              loading={aiLoading}
              disabled={aiLoading}
              variant="primary"
              hapticType="medium"
              style={styles.sheetActionBtn}
              testID={`${testID ?? "footer"}-deload-confirm`}
            />
          </View>
        </View>
      </DetentBottomSheet>

      {/*
        Phase 9 — AI error sheet. Single dismiss action; same bottom-sheet
        pattern as the deload confirmation.
      */}
      <DetentBottomSheet
        visible={!!aiActionError}
        onClose={() => setAiActionError(null)}
        snapPoints={[0.4, 0.6]}
        initialSnapIndex={1}
        testID={`${testID ?? "footer"}-error-sheet`}
      >
        <View style={styles.sheetBody}>
          <View style={[styles.sheetIcon, { backgroundColor: hexToRgba(colors.error.DEFAULT, 0.12) }]}>
            <Ionicons name="close-circle" size={rf(28)} color={colors.error.DEFAULT} />
          </View>
          <Text style={styles.sheetTitle}>AI Action Failed</Text>
          <Text style={styles.sheetMessage}>{aiActionError}</Text>
          <View style={styles.sheetActions}>
            <GlassButton
              label="Dismiss"
              onPress={() => setAiActionError(null)}
              variant="primary"
              hapticType="light"
              style={styles.sheetActionBtn}
              testID={`${testID ?? "footer"}-error-dismiss`}
            />
          </View>
        </View>
      </DetentBottomSheet>
    </View>
  );
};

// ── Small stat sub-component ─────────────────────────────────────────────────
const Stat: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}> = ({ icon, label, value, valueColor }) => (
  <View style={styles.statCell}>
    <Ionicons name={icon} size={rf(16)} color={colors.text.secondary} />
    <Text
      style={[styles.statValue, valueColor ? { color: valueColor } : null]}
      numberOfLines={1}
    >
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

// Shared tabular-nums treatment for metric readouts (Editorial Dark standard).
const tabularNums: TextStyle = { fontVariant: ["tabular-nums"] };

// NOTE: Divider removed — statsRow now uses 3 cells without dividers per
// audit fix (5 stats + 4 dividers overflowed on 360px screens).
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
    zIndex: 1100,
  },
  // Flat footer surface — pure-black step + 1px hairline top border. No blur,
  // no cast shadow (Editorial Dark: depth from type hierarchy, not elevation).
  card: {
    backgroundColor: surface[1],
    borderTopWidth: 1,
    borderTopColor: border.subtle,
    borderRadius: borderRadius.xl,
    padding: rp(spacing.md),
  },
  computingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
    justifyContent: "center",
  },
  computingText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
    ...tabularNums,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: rp(2),
    minHeight: Math.max(rp(44), 44),
    justifyContent: "center",
  },
  statValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    ...tabularNums,
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: rp(spacing.md),
    gap: rp(spacing.md),
  },
  difficultyCell: {
    flex: 1,
    // ~100px keeps the longest difficulty label ("Intermediate") on one line;
    // at flex widths below this the single word clipped with an ellipsis.
    minWidth: rp(100),
  },
  difficultyLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  difficultyValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
    marginTop: rp(2),
    ...tabularNums,
  } as TextStyle,
  saveBtn: {
    flexShrink: 0,
  },
  // Phase 9 — AI menu (flat surface + hairline separators between rows)
  aiMenuBtn: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: borderRadius.lg,
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.12),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.3),
    alignItems: "center",
    justifyContent: "center",
  },
  aiMenuBtnLoading: {
    opacity: 0.7,
  },
  aiMenu: {
    marginTop: rp(spacing.sm),
    backgroundColor: surface[2],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: rp(spacing.xs),
    gap: rp(2),
    zIndex: 1200,
    ...flatShadows.sm,
  },
  aiMenuRule: {
    height: 1,
    backgroundColor: border.subtle,
    marginHorizontal: rp(spacing.sm),
  },
  aiMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    borderRadius: borderRadius.md,
    minHeight: Math.max(rp(44), 44),
  },
  aiMenuItemDisabled: {
    opacity: 0.4,
  },
  aiMenuItemText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.medium) as TextStyle["fontWeight"],
  },
  aiMenuItemHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    ...tabularNums,
  },
  confettiWrap: {
    position: "absolute",
    top: -40,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
  },
  // DetentBottomSheet confirmation bodies (deload + AI error)
  sheetBody: {
    alignItems: "center",
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xl),
    gap: rp(spacing.sm),
  },
  sheetIcon: {
    width: rf(56),
    height: rf(56),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as TextStyle["fontWeight"],
    textAlign: "center",
  },
  sheetMessage: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
    textAlign: "center",
    lineHeight: rf(22),
  },
  sheetActions: {
    flexDirection: "column",
    gap: rp(spacing.sm),
    width: "100%",
    marginTop: rp(spacing.sm),
  },
  sheetActionBtn: {
    width: "100%",
  },
});

export default BuilderSummaryFooter;
