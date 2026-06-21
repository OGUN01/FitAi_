/**
 * FitAI — Workout Header (Aurora)
 *
 * Thin glass header strip shown at the top of the active workout session.
 * Previously a flat surface with a text "X" exit button.
 *
 * Aurora modernization:
 *  - Flat surface → thin GlassCard strip.
 *  - Text "X" exit button → AnimatedPressable with Ionicons "close".
 *  - Hardcoded colors → aurora tokens.
 *  - Added live session volume + mesocycle-week pill (data passed in from the
 *    session screen, which reads fitnessStore.getMesocycleWeek() + derives
 *    volume from currentWorkoutSession).
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, AnimatedPressable } from "../ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rh, rw } from "../../utils/responsive";

interface WorkoutHeaderProps {
  workoutTitle: string;
  currentExercise: number;
  totalExercises: number;
  duration: number;
  calories: number;
  onExit: () => void;
  paddingTop?: number;
  /** Live session volume in kg (derived from store). Optional. */
  sessionVolume?: number;
  /** Mesocycle week (1-4) from fitnessStore.getMesocycleWeek(). Optional. */
  mesocycleWeek?: number | null;
}

/** Format elapsed seconds as M:SS (e.g. 0:05, 1:30, 10:04) */
const formatSeconds = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const safeString = (value: any, fallback: string = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isNaN(value)) return fallback;
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  workoutTitle,
  currentExercise,
  totalExercises,
  duration,
  calories,
  onExit,
  paddingTop = 12,
  sessionVolume,
  mesocycleWeek,
}) => {
  return (
    <GlassCard
      elevation={2}
      padding="none"
      borderRadius="none"
      style={{ ...styles.header, paddingTop }}
      contentStyle={styles.headerContent}
    >
      <AnimatedPressable
        onPress={onExit}
        scaleValue={0.9}
        springConfig="snappy"
        hapticType="medium"
        style={styles.exitButton}
        accessibilityRole="button"
        accessibilityLabel="Exit workout"
      >
        <Ionicons name="close" size={rf(20)} color={colors.error.light} />
      </AnimatedPressable>

      <View style={styles.headerInfo}>
        <Text
          style={styles.workoutTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {safeString(workoutTitle, "Workout")}
        </Text>
        <Text style={styles.progressText}>
          Exercise {safeString(currentExercise)} of {safeString(totalExercises)}
        </Text>
        {/* Mesocycle-week pill (only when available) */}
        {mesocycleWeek != null && mesocycleWeek > 0 ? (
          <View style={styles.mesoPill}>
            <Text style={styles.mesoPillText}>Wk {mesocycleWeek}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.headerRight}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>TIME</Text>
          <Text style={styles.timerText}>{formatSeconds(duration)}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>CAL</Text>
          <Text style={styles.caloriesText}>{safeString(calories)}</Text>
        </View>
        {sessionVolume != null ? (
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>VOL</Text>
            <Text style={styles.volumeText}>
              {Math.round(sessionVolume).toLocaleString()}
            </Text>
          </View>
        ) : null}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rp(spacing.lg),
    paddingVertical: rp(spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  exitButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(20),
    backgroundColor: `${colors.error.DEFAULT}20`,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${colors.error.DEFAULT}40`,
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: rp(spacing.md),
  },
  workoutTitle: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    textAlign: "center",
  },
  progressText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    marginTop: rp(spacing.xxs),
  },
  mesoPill: {
    marginTop: rp(spacing.xxs),
    backgroundColor: `${colors.secondary.DEFAULT}1A`,
    borderWidth: 1,
    borderColor: `${colors.secondary.DEFAULT}40`,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
  },
  mesoPillText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.secondary.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: rp(spacing.sm),
  },
  statBlock: {
    alignItems: "flex-end",
  },
  timerText: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 9,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    opacity: 0.7,
    marginTop: rp(spacing.xxs),
  },
  caloriesText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    fontVariant: ["tabular-nums"],
  },
  volumeText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.secondary.light,
    fontWeight: String(typography.fontWeight.semibold) as any,
    fontVariant: ["tabular-nums"],
  },
});
