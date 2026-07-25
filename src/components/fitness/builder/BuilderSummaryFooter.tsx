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
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { GlassButton } from "../../ui/aurora/GlassButton";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import { ParticleBurst } from "../../ui/ParticleBurst";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
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
  const save = useWorkoutBuilderStore((s) => s.save);

  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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
          <Divider />
          <Stat
            icon="time-outline"
            label="Duration"
            value={totalDuration > 0 ? `${totalDuration}m` : "—"}
          />
          <Divider />
          <Stat
            icon="flame-outline"
            label="Calories"
            value={totalCalories > 0 ? String(Math.round(totalCalories)) : "—"}
          />
          <Divider />
          <Stat
            icon="scale-outline"
            label="Volume"
            value={totalVolume > 0 ? `${Math.round(totalVolume)}kg` : "—"}
          />
          <Divider />
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
            <Text style={styles.difficultyLabel}>Difficulty</Text>
            <Text style={styles.difficultyValue}>{difficulty}</Text>
          </View>
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

const Divider: React.FC = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
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
    gap: rp(spacing.xxs),
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: rp(2),
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
  divider: {
    width: rw(1),
    height: rp(28),
    backgroundColor: colors.glass.border,
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
  },
  saveBtn: {
    flexShrink: 0,
  },
  confettiWrap: {
    position: "absolute",
    top: -40,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BuilderSummaryFooter;
