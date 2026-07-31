/**
 * WeeklyInsightsPanel — collapsible flat panel showing live weekly plan
 * analytics (Phase 6.3).
 *
 * Composes:
 *   - MuscleBalanceRadar (Phase 1 Skia radar, 8 axes) — fed from
 *     insights.muscleCoverage. Tap axis → tooltip with set count.
 *   - Stat grid (3×2): Push/Pull Ratio, Volume Score, Recovery Score (ring),
 *     Time Commitment, Weekly Calories, Total Volume.
 *   - Muscle Coverage list: per-muscle-group horizontal bars (flat fills).
 *     Under-hit groups (<2 sets) highlighted amber.
 *
 * Subscribes to `workoutBuilderStore.insights` + `isComputingInsights`.
 * Loading state: AuroraSpinner + "Computing insights…". Empty state (no
 * draft): "Add exercises to see insights." Reduce-motion is respected by the
 * radar internally (it snaps to final shape).
 *
 * All colors / spacing / radii from aurora-tokens. Spring presets from
 * src/theme/animations.ts. Haptics from src/utils/haptics.ts.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { AuroraSpinner } from "../../ui/aurora/AuroraSpinner";
import { ProgressRing } from "../../ui/aurora/ProgressRing";
import { MuscleBalanceRadar } from "../../charts/MuscleBalanceRadar";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import { haptics } from "../../../utils/haptics";
import {
  colors,
  surface,
  border,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rs } from "../../../utils/responsive";
import type { WeeklyInsights } from "../../../types/workout";
import { MAJOR_MUSCLE_GROUPS } from "../../../services/workoutInsightsService";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

/** Cast a typography weight token to RN's TextStyle fontWeight (TS strict). */
const fw = (
  w: typeof typography.fontWeight[keyof typeof typography.fontWeight],
): TextStyle["fontWeight"] => String(w) as TextStyle["fontWeight"];

// ----------------------------------------------------------------------------
// RADAR DATA MAPPING
// ----------------------------------------------------------------------------

/**
 * Map insights.muscleCoverage (lowercase muscle keys) to the radar's 8-axis
 * shape (capitalized: Chest/Back/Shoulders/Biceps/Triceps/Legs/Glutes/Core).
 *
 * "Legs" aggregates quadriceps + hamstrings + calves (the radar collapses the
 * lower body into one axis to keep the chart readable at 8 vertices).
 *
 * Values are normalized to 0..100 against a per-axis soft cap so the radar
 * renders a meaningful shape even at low absolute volumes. The cap = 12 sets
 * (a reasonable "well-developed" weekly target for a single axis).
 */
const RADAR_SOFT_CAP = 12;

function buildRadarData(
  muscleCoverage: WeeklyInsights["muscleCoverage"],
): Record<string, number> {
  const legs =
    (muscleCoverage["quadriceps"] ?? 0) +
    (muscleCoverage["hamstrings"] ?? 0) +
    (muscleCoverage["calves"] ?? 0);

  return {
    Chest: normalizeForRadar(muscleCoverage["chest"] ?? 0),
    Back: normalizeForRadar(muscleCoverage["back"] ?? 0),
    Shoulders: normalizeForRadar(muscleCoverage["shoulders"] ?? 0),
    Biceps: normalizeForRadar(muscleCoverage["biceps"] ?? 0),
    Triceps: normalizeForRadar(muscleCoverage["triceps"] ?? 0),
    Legs: normalizeForRadar(legs),
    Glutes: normalizeForRadar(muscleCoverage["glutes"] ?? 0),
    Core: normalizeForRadar(muscleCoverage["core"] ?? 0),
  };
}

/** Clamp + scale a set count to 0..100 for the radar. */
function normalizeForRadar(sets: number): number {
  if (!Number.isFinite(sets) || sets <= 0) return 0;
  return Math.round(Math.min(100, (sets / RADAR_SOFT_CAP) * 100));
}

// ----------------------------------------------------------------------------
// SEVERITY COLOR HELPERS
// ----------------------------------------------------------------------------

type ScoreBand = "good" | "ok" | "bad";

function bandForScore(score: number): ScoreBand {
  if (score >= 70) return "good";
  if (score >= 40) return "ok";
  return "bad";
}

function colorForBand(band: ScoreBand): string {
  switch (band) {
    case "good":
      return colors.success.DEFAULT;
    case "ok":
      return colors.warning.DEFAULT;
    case "bad":
      return colors.error.DEFAULT;
  }
}

/** Push/pull ratio → color. 0.8–1.2 green, 0.5–0.8 / 1.2–1.5 amber, else red. */
function colorForPushPullRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return colors.error.DEFAULT;
  if (ratio >= 0.8 && ratio <= 1.2) return colors.success.DEFAULT;
  if ((ratio >= 0.5 && ratio < 0.8) || (ratio > 1.2 && ratio <= 1.5)) {
    return colors.warning.DEFAULT;
  }
  return colors.error.DEFAULT;
}

function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "—";
  return ratio.toFixed(2);
}

// ----------------------------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------------------------

export const WeeklyInsightsPanel: React.FC = () => {
  const insights = useWorkoutBuilderStore((s) => s.insights);
  const isComputing = useWorkoutBuilderStore((s) => s.isComputingInsights);
  const draft = useWorkoutBuilderStore((s) => s.draft);

  // Default expanded when insights exist; collapses to a header when empty.
  const [expanded, setExpanded] = useState(true);

  const hasContent = useMemo(() => {
    if (!draft) return false;
    return draft.workouts.some((d) => (d.plannedExercises?.length ?? 0) > 0);
  }, [draft]);

  const handleToggle = useCallback(() => {
    haptics.selection();
    setExpanded((e) => !e);
  }, []);

  // ── Empty state: no draft / no exercises ──
  if (!insights || !hasContent) {
    return (
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.container}
      >
        <View style={[styles.card, styles.cardEmpty]}>
          <View style={styles.emptyState}>
            <Ionicons
              name="analytics-outline"
              size={rf(28)}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>Add exercises to see insights</Text>
            <Text style={styles.emptySubtitle}>
              Push/pull balance, recovery score, and muscle coverage will appear
              here as you build.
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  const radarData = buildRadarData(insights.muscleCoverage);
  const recoveryBand = bandForScore(insights.recoveryScore);

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={styles.container}
    >
      <View style={styles.card}>
        {/* Header */}
        <Pressable
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel="Weekly insights. Tap to expand or collapse."
          accessibilityState={{ expanded }}
          style={styles.header}
        >
          <Ionicons
            name="pulse-outline"
            size={rf(20)}
            color={colors.primary.DEFAULT}
          />
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Weekly Insights
          </Text>
          {isComputing && (
            <View style={styles.computingRow}>
              <AuroraSpinner customSize={rf(14)} theme="primary" />
              <Text style={styles.computingText}>Recalculating…</Text>
            </View>
          )}
          <Ionicons
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={rf(18)}
            color={colors.text.tertiary}
            style={styles.chevron}
          />
        </Pressable>

        {expanded && (
          <View style={styles.body}>
            {/* (a) Radar */}
            <View style={styles.radarWrap}>
              <MuscleBalanceRadar
                data={radarData}
                size={rs(240)}
                testID="weekly-insights-radar"
              />
              <Text style={styles.radarCaption}>
                Tap an axis to see set count. Values scaled to {RADAR_SOFT_CAP}
                -set target.
              </Text>
            </View>

            {/* (b) Stat grid */}
            <View style={styles.statGrid}>
              <StatTile
                icon="git-compare-outline"
                label="Push/Pull"
                value={formatRatio(insights.pushPullRatio)}
                valueColor={colorForPushPullRatio(insights.pushPullRatio)}
              />
              <StatTile
                icon="bar-chart-outline"
                label="Volume Score"
                value={`${insights.volumeScore}`}
                suffix="/100"
                valueColor={colorForBand(bandForScore(insights.volumeScore))}
              />
              <RecoveryTile
                score={insights.recoveryScore}
                band={recoveryBand}
              />
              <StatTile
                icon="time-outline"
                label="Time"
                value={String(insights.timeCommitment)}
                suffix=" min"
              />
              <StatTile
                icon="flame-outline"
                label="Weekly kcal"
                value={
                  insights.weeklyCalories > 0
                    ? String(Math.round(insights.weeklyCalories))
                    : "—"
                }
              />
              {/* No raw Volume tile here: the sticky BuilderSummaryFooter
                  already shows total volume on this screen — one authoritative
                  readout per metric per screen. */}
            </View>

            {/* (c) Muscle coverage bars — flat fills (GradientBarChart retired) */}
            <View style={styles.coverageSection}>
              <Text style={styles.sectionLabel}>Muscle Coverage</Text>
              {buildCoverageBars(insights).map((bar, index) => (
                <CoverageBar key={bar.label} bar={bar} index={index} />
              ))}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// STAT TILE
// ----------------------------------------------------------------------------

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  suffix?: string;
  valueColor?: string;
}

const StatTile: React.FC<StatTileProps> = ({
  icon,
  label,
  value,
  suffix,
  valueColor,
}) => (
  <View style={styles.statTile}>
    <View style={styles.statIconRow}>
      <Ionicons name={icon} size={rf(14)} color={colors.text.tertiary} />
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
    <View style={styles.statValueRow}>
      <Text
        style={[styles.statValue, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {suffix ? <Text style={styles.statSuffix}>{suffix}</Text> : null}
    </View>
  </View>
);

// ----------------------------------------------------------------------------
// RECOVERY TILE — uses ProgressRing for the 0-100 gauge
// ----------------------------------------------------------------------------

interface RecoveryTileProps {
  score: number;
  band: ScoreBand;
}

const RecoveryTile: React.FC<RecoveryTileProps> = ({ score, band }) => {
  const ringColor = colorForBand(band);
  return (
    <View style={styles.statTile}>
      <View style={styles.statIconRow}>
        <Ionicons name="pulse-outline" size={rf(14)} color={colors.text.tertiary} />
        <Text style={styles.statLabel} numberOfLines={1}>
          Recovery
        </Text>
      </View>
      <View style={styles.recoveryRingWrap}>
        <ProgressRing
          progress={score}
          size={rs(56)}
          strokeWidth={6}
          color={ringColor}
          animated
          showText
        />
      </View>
    </View>
  );
};

// ----------------------------------------------------------------------------
// COVERAGE BARS — one per MAJOR_MUSCLE_GROUP (flat fills, no gradient)
// ----------------------------------------------------------------------------

interface CoverageBarData {
  label: string;
  value: number;
  maxValue: number;
  underHit: boolean;
  unit: string;
}

/** Build flat bar data for the muscle coverage list. */
function buildCoverageBars(insights: WeeklyInsights): CoverageBarData[] {
  const bars: CoverageBarData[] = [];
  // Dynamic max so high-volume muscle groups (>20 sets) don't clip at the old
  // hardcoded ceiling. We floor at 20 so low-volume weeks still render bars at
  // a readable scale rather than all-maxing against a tiny ceiling.
  const maxSets = Math.max(
    20,
    ...MAJOR_MUSCLE_GROUPS.map((m) => insights.muscleCoverage[m] ?? 0),
  );
  for (const muscle of MAJOR_MUSCLE_GROUPS) {
    const sets = insights.muscleCoverage[muscle] ?? 0;
    bars.push({
      label: capitalize(muscle),
      value: sets,
      maxValue: maxSets,
      underHit: sets > 0 && sets < 2,
      unit: " sets",
    });
  }
  return bars;
}

/** Single coverage row: label + hairline track + flat accent fill + value. */
const CoverageBar: React.FC<{ bar: CoverageBarData; index: number }> = ({
  bar,
  index,
}) => {
  const progress = useSharedValue(0);
  const percentage =
    bar.maxValue > 0 ? Math.min(100, (bar.value / bar.maxValue) * 100) : 0;

  useEffect(() => {
    progress.value = withDelay(
      index * 150,
      withTiming(percentage, { duration: 1000, easing: Easing.out(Easing.cubic) }),
    );
  }, [percentage, index, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const fillColor = bar.underHit
    ? colors.warning.DEFAULT
    : colors.primary.DEFAULT;

  return (
    <View style={styles.coverageRow}>
      <View style={styles.coverageHeader}>
        <Text style={styles.coverageLabel}>{bar.label}</Text>
        <Text style={styles.coverageValue}>
          {bar.value}
          {bar.unit}
        </Text>
      </View>
      <View style={styles.coverageTrack}>
        <Animated.View
          style={[styles.coverageFill, fillStyle, { backgroundColor: fillColor }]}
        />
      </View>
    </View>
  );
};

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginVertical: rp(spacing.sm),
  },
  // Flat surface + hairline (was GlassCard elevation 2-3 — glass/elevation
  // replaced by a flat step + 1px border per Editorial Dark).
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: rp(spacing.md),
  },
  cardEmpty: {
    padding: rp(spacing.lg),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    minHeight: Math.max(rp(44), 44),
  },
  headerTitle: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  computingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  computingText: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  chevron: {
    marginLeft: rp(spacing.xs),
  },
  body: {
    marginTop: rp(spacing.md),
    gap: rp(spacing.md),
  },
  radarWrap: {
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  radarCaption: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    textAlign: "center",
    paddingHorizontal: rp(spacing.lg),
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(spacing.sm),
  },
  statTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: surface[1],
    borderRadius: borderRadius.md,
    padding: rp(spacing.sm),
    gap: rp(spacing.xs),
    borderWidth: 1,
    borderColor: border.subtle,
    minHeight: Math.max(rp(72), 72),
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontWeight: fw(typography.fontWeight.medium),
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: rp(2),
  },
  statValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: fw(typography.fontWeight.bold),
    fontVariant: ["tabular-nums"],
  },
  statSuffix: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.micro),
  },
  recoveryRingWrap: {
    alignItems: "center",
    marginTop: rp(spacing.xs),
  },
  coverageSection: {
    gap: rp(spacing.xs),
    // No maxHeight: the row list grows with the muscle-group count. A fixed
    // maxHeight of rp(280) clipped the last ~2 muscle groups on screens with
    // 10 major groups.
  },
  coverageRow: {
    marginBottom: rp(spacing.sm),
  },
  coverageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(spacing.xs),
  },
  coverageLabel: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  coverageValue: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
    fontVariant: ["tabular-nums"],
  },
  coverageTrack: {
    width: "100%",
    height: rp(8),
    backgroundColor: surface[2],
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  coverageFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.md),
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
  },
  emptySubtitle: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    // lineHeight was previously rf(body)*normal which was far too loose for a
    // caption-sized font; use caption × normal so leading matches the font size.
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
  },
});

export default WeeklyInsightsPanel;
