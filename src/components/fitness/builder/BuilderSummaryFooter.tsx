/**
 * BuilderSummaryFooter — floating glass footer, sticky at the bottom of the
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
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ViewStyle, Pressable, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import { ParticleBurst } from "../../ui/ParticleBurst";
import { CustomDialog } from "../../ui/CustomDialog";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { useFitnessStore } from "../../../stores/fitnessStore";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";

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
    if (!hasContent || saving) return;
    setSaving(true);
    try {
      await save();
      haptics.celebration();
      setShowConfetti(true);
      // Let the confetti play briefly before navigating back
      setTimeout(() => {
        setShowConfetti(false);
        onSaved();
      }, 900);
    } catch (err) {
      console.error("[BuilderSummaryFooter] save failed:", err);
      haptics.error();
      setSaving(false);
    }
  };

  // ── Phase 9 AI action handlers ──
  const handleGenerateFullWeek = async () => {
    setAiMenuOpen(false);
    if (filledDayCount < 2) {
      setAiActionError("Add exercises to at least 2 days first.");
      haptics.warning();
      return;
    }
    haptics.medium();
    const result = await generateFullWeek();
    if (result.success) {
      haptics.success();
    } else {
      setAiActionError(result.error ?? "Failed to generate full week");
      haptics.error();
    }
  };

  const handleApplyProgression = async () => {
    setAiMenuOpen(false);
    haptics.medium();
    const result = await applyProgression(priorPerformance);
    if (result.success) {
      haptics.success();
    } else {
      setAiActionError(result.error ?? "Failed to apply progressive overload");
      haptics.error();
    }
  };

  const handleDeloadConfirm = async () => {
    setDeloadConfirmOpen(false);
    haptics.medium();
    const result = await deloadWeek();
    if (result.success) {
      haptics.success();
    } else {
      setAiActionError(result.error ?? "Failed to apply deload");
      haptics.error();
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
      <GlassCard
        blurIntensity="heavy"
        elevation={5}
        padding="md"
        borderRadius="xl"
        showBorder
        style={styles.card}
      >
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
            value={totalVolume > 0 ? `${Math.round(totalVolume)}kg` : "—"}
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

        {/* Phase 9 — AI menu dropdown */}
        {aiMenuOpen && (
          <View style={styles.aiMenu}>
            <Pressable
              onPress={handleGenerateFullWeek}
              disabled={filledDayCount < 2 || aiLoading}
              accessibilityRole="button"
              accessibilityLabel="Generate full week from partial plan"
              style={[styles.aiMenuItem, (filledDayCount < 2 || aiLoading) && styles.aiMenuItemDisabled]}
            >
              <Ionicons name="calendar-outline" size={rf(16)} color={colors.primary.light} />
              <Text style={styles.aiMenuItemText}>Generate Full Week</Text>
              {filledDayCount < 2 && (
                <Text style={styles.aiMenuItemHint}>
                  {filledDayCount === 0
                    ? "Add to 2 days first"
                    : `${filledDayCount}/2 days`}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleApplyProgression}
              disabled={aiLoading || priorPerformance.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Apply progressive overload"
              style={[styles.aiMenuItem, (aiLoading || priorPerformance.length === 0) && styles.aiMenuItemDisabled]}
            >
              <Ionicons name="trending-up-outline" size={rf(16)} color={colors.success.light} />
              <Text style={styles.aiMenuItemText}>Apply Progressive Overload</Text>
            </Pressable>
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
              <Ionicons name="fitness-outline" size={rf(16)} color={colors.warning.light} />
              <Text style={styles.aiMenuItemText}>Deload Week</Text>
            </Pressable>
          </View>
        )}
      </GlassCard>

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

      {/* Phase 9 — Deload confirmation (destructive-ish: overwrites draft) */}
      <CustomDialog
        visible={deloadConfirmOpen}
        title="Apply Deload Week?"
        message="This reduces volume by ~40% across all days. Your current exercises stay, but set counts drop. You can undo by not saving."
        type="warning"
        actions={[
          {
            text: "Cancel",
            onPress: () => setDeloadConfirmOpen(false),
            style: "cancel",
            variant: "secondary",
          },
          {
            text: "Apply Deload",
            onPress: handleDeloadConfirm,
            style: "destructive",
            variant: "primary",
          },
        ]}
        onDismiss={() => setDeloadConfirmOpen(false)}
      />

      {/* Phase 9 — AI error dialog */}
      {aiActionError && (
        <CustomDialog
          visible={!!aiActionError}
          title="AI Action Failed"
          message={aiActionError}
          type="warning"
          actions={[
            {
              text: "Dismiss",
              onPress: () => setAiActionError(null),
              style: "default",
              variant: "primary",
            },
          ]}
          onDismiss={() => setAiActionError(null)}
        />
      )}
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
    elevation: 11,
  },
  card: {
    backgroundColor: colors.glass.backgroundDark,
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
  } as TextStyle,
  saveBtn: {
    flexShrink: 0,
  },
  // Phase 9 — AI menu
  aiMenuBtn: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(255, 107, 53, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiMenuBtnLoading: {
    opacity: 0.7,
  },
  aiMenu: {
    marginTop: rp(spacing.sm),
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    padding: rp(spacing.xs),
    gap: rp(2),
    zIndex: 1200,
    elevation: 12,
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
    elevation: 12,
  },
});

export default BuilderSummaryFooter;
