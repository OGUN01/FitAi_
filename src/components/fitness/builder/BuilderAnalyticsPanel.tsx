/**
 * BuilderAnalyticsPanel — Phase 11 (Part A, deliverable 1).
 *
 * Reusable analytics panel for the workout-builder context. DISTINCT from
 * `WeeklyInsightsPanel` (which reflects the CURRENT draft plan): this panel
 * surfaces HISTORICAL training trends pulled from `analyticsStore` +
 * `fitnessStore.completedSessions`.
 *
 * Sections (collapsible GlassCard, AuroraBackground compatible):
 *   a. Weekly volume trend (last 12 weeks) — Sparkline from exerciseVolumeHistory
 *   b. Muscle heatmap (last 4 weeks) — MuscleHeatmap per body part
 *   c. Recovery score trend (last 12 weeks) — Sparkline
 *   d. Consistency + workout streak (number + flame icon)
 *   e. Estimated growth (volume trend delta) — number + arrow
 *   f. Time invested (sum completedSessions durationMinutes)
 *   g. Exercise frequency (top 10 most-performed) — bar list
 *   h. PRs list (from exercise_prs) — name + weight + date
 *
 * Each section renders its own empty state when data is absent. Reduce-motion
 * is respected (sparklines render statically, no draw-in animation).
 *
 * All colors / spacing / radii from aurora-tokens. Haptics on every
 * interaction (section expand/collapse). Tap targets ≥ 44dp.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { GlassCard } from "../../ui/aurora/GlassCard";
import { MuscleHeatmap, type MuscleVolumeEntry } from "./MuscleHeatmap";
import { CURATED_EXERCISES } from "../../../data/curatedExercises";
import { useAnalyticsStore } from "../../../stores/analyticsStore";
import { useFitnessStore } from "../../../stores/fitnessStore";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rp, rf, rw } from "../../../utils/responsive";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

interface BuilderAnalyticsPanelProps {
  /** Test ID prefix. */
  testID?: string;
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

const fw = (
  w: (typeof typography.fontWeight)[keyof typeof typography.fontWeight],
): TextStyle["fontWeight"] => String(w) as TextStyle["fontWeight"];

// Module-level lookup map so the heatmap can resolve muscle groups per
// exercise id without scanning the full curated array per history entry.
const CURATED_EXERCISES_BY_ID: ReadonlyMap<string, (typeof CURATED_EXERCISES)[number]> = new Map(
  CURATED_EXERCISES.map((c) => [c.id, c]),
);

/** ISO date → YYYY-MM-DD week-start (Monday) bucket key. */
function weekStartKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Aggregate exerciseVolumeHistory into per-week totals (oldest → newest). */
function aggregateWeeklyVolume(
  history: Array<{
    exerciseId: string;
    exerciseName: string;
    date: string;
    totalVolume: number;
  }>,
  weeks: number,
): Array<{ weekLabel: string; total: number }> {
  const now = new Date();
  const buckets: Array<{ weekStart: Date; total: number; label: string }> = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ref = new Date(now);
    ref.setDate(ref.getDate() - i * 7);
    const day = ref.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(ref);
    weekStart.setDate(ref.getDate() + diff);
    buckets.push({
      weekStart,
      total: 0,
      label: i === 0 ? "This wk" : i === 1 ? "Last wk" : `W-${i}`,
    });
  }
  for (const entry of history) {
    const key = weekStartKey(entry.date);
    if (!key) continue;
    for (const b of buckets) {
      if (b.weekStart.toISOString().slice(0, 10) === key) {
        b.total += entry.totalVolume;
        break;
      }
    }
  }
  return buckets.map((b) => ({ weekLabel: b.label, total: b.total }));
}

/** Aggregate the last 4 weeks of per-muscle volume for the heatmap. */
function aggregateMuscleHeatmap(
  history: Array<{
    exerciseId: string;
    exerciseName: string;
    date: string;
    totalVolume: number;
  }>,
  curatedLookup: (exerciseId: string) => string[],
  weeks: number,
): MuscleVolumeEntry[] {
  const now = new Date();
  const weekStarts: Date[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ref = new Date(now);
    ref.setDate(ref.getDate() - i * 7);
    const day = ref.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const ws = new Date(ref);
    ws.setDate(ref.getDate() + diff);
    weekStarts.push(ws);
  }
  const muscleMap = new Map<string, number[]>();
  for (const entry of history) {
    const key = weekStartKey(entry.date);
    let weekIdx = -1;
    for (let i = 0; i < weekStarts.length; i++) {
      if (weekStarts[i].toISOString().slice(0, 10) === key) {
        weekIdx = i;
        break;
      }
    }
    if (weekIdx < 0) continue;
    const muscles = curatedLookup(entry.exerciseId);
    for (const muscle of muscles) {
      if (!muscleMap.has(muscle)) {
        muscleMap.set(muscle, new Array(weeks).fill(0));
      }
      muscleMap.get(muscle)![weekIdx] += entry.totalVolume;
    }
  }
  // Sort by total volume descending so the heaviest muscles appear first.
  return Array.from(muscleMap.entries())
    .map(([muscle, weeklyVolumes]) => ({
      muscle,
      weeklyVolumes,
      _total: weeklyVolumes.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b._total - a._total)
    .slice(0, 8) // top 8 muscle groups
    .map(({ muscle, weeklyVolumes }) => ({ muscle, weeklyVolumes }));
}

/** Top-N exercises by total sets across the history. */
function topExercises(
  history: Array<{
    exerciseId: string;
    exerciseName: string;
    totalSets: number;
  }>,
  limit: number,
): Array<{ name: string; sets: number }> {
  const map = new Map<string, { name: string; sets: number }>();
  for (const entry of history) {
    const existing = map.get(entry.exerciseId);
    if (existing) {
      existing.sets += entry.totalSets;
    } else {
      map.set(entry.exerciseId, {
        name: entry.exerciseName || entry.exerciseId,
        sets: entry.totalSets,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.sets - a.sets)
    .slice(0, limit);
}

// ----------------------------------------------------------------------------
// SPARKLINE — minimal SVG-free line of bars (View-based, accessible)
// ----------------------------------------------------------------------------

interface SparklineProps {
  data: Array<{ label: string; value: number }>;
  unit: string;
  color: string;
  testID?: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, unit, color, testID }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={sparkStyles.container} testID={testID}>
      <View style={sparkStyles.barsRow}>
        {data.map((d, i) => {
          const h = Math.max(rf(2), (d.value / max) * rp(60));
          return (
            <View
              key={`bar_${i}`}
              style={sparkStyles.barWrap}
              accessibilityRole="text"
              accessibilityLabel={`${d.label}: ${Math.round(d.value)} ${unit}`}
            >
              <View
                style={[sparkStyles.bar, { height: h, backgroundColor: d.value > 0 ? color : colors.glass.backgroundLight }]}
              />
              <Text style={sparkStyles.barLabel}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const sparkStyles = StyleSheet.create({
  container: { width: "100%" },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: rp(80),
    gap: rp(spacing.xxs),
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    minHeight: rp(44), // tap target
  },
  bar: {
    width: rw(12),
    borderRadius: borderRadius.xs,
    minHeight: rf(2),
  } as ViewStyle,
  barLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    marginTop: rp(spacing.xxs),
  },
});

// ----------------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------------

export const BuilderAnalyticsPanel: React.FC<BuilderAnalyticsPanelProps> = ({
  testID,
}) => {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(true);

  // ── Store subscriptions ──
  const exerciseVolumeHistory = useAnalyticsStore((s) => s.exerciseVolumeHistory);
  const personalRecords = useAnalyticsStore((s) => s.personalRecords);
  const currentStreak = useAnalyticsStore((s) => s.analyticsSummary.currentStreak);
  const isLoadingExerciseAnalytics = useAnalyticsStore(
    (s) => s.isLoadingExerciseAnalytics,
  );

  // completedSessions for time invested (sum durationMinutes).
  const completedSessions = useFitnessStore((s) => s.completedSessions);

  // ── Derived data ──
  const weeklyVolume = useMemo(
    () => aggregateWeeklyVolume(exerciseVolumeHistory, 12),
    [exerciseVolumeHistory],
  );

  // ── Heatmap lookup: resolve muscle groups for each history entry via the
  // curated exercise library. Falls back to an empty list when the exercise
  // isn't in the curated set (e.g. user-deleted or custom entries) so those
  // rows simply don't contribute to the heatmap rather than crashing.
  const heatmapData = useMemo(
    () =>
      aggregateMuscleHeatmap(
        exerciseVolumeHistory,
        (exerciseId) => CURATED_EXERCISES_BY_ID.get(exerciseId)?.muscleGroups ?? [],
        4,
      ),
    [exerciseVolumeHistory],
  );

  // Recovery trend: derive a 0-100 score per week from volume consistency
  // (presence of workouts that week). This is a light heuristic — the
  // canonical recovery score lives in the weekly insights, not historical.
  const recoveryTrend = useMemo(() => {
    return weeklyVolume.map((w) => ({
      label: w.weekLabel,
      value: w.total > 0 ? 70 : 0, // baseline 70 when active, 0 when idle
    }));
  }, [weeklyVolume]);

  const topEx = useMemo(
    () => topExercises(exerciseVolumeHistory, 10),
    [exerciseVolumeHistory],
  );

  const timeInvestedMinutes = useMemo(
    () =>
      completedSessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
    [completedSessions],
  );

  // Estimated growth: delta between first and last non-zero weekly volume.
  const estimatedGrowthPct = useMemo(() => {
    const nonZero = weeklyVolume.filter((w) => w.total > 0);
    if (nonZero.length < 2) return 0;
    const first = nonZero[0].total;
    const last = nonZero[nonZero.length - 1].total;
    if (first <= 0) return 0;
    return Math.round(((last - first) / first) * 100);
  }, [weeklyVolume]);

  const hasAnyData =
    exerciseVolumeHistory.length > 0 ||
    personalRecords.length > 0 ||
    completedSessions.length > 0 ||
    currentStreak > 0;

  const handleToggle = useCallback(() => {
    haptics.selection();
    setExpanded((e) => !e);
  }, []);

  // ── Empty state ──
  if (!hasAnyData && !isLoadingExerciseAnalytics) {
    return (
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.springify()}
        style={styles.container}
      >
        <GlassCard
          blurIntensity="default"
          elevation={2}
          padding="lg"
          borderRadius="lg"
          showBorder
          style={styles.card}
        >
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={rf(28)} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No training history yet</Text>
            <Text style={styles.emptySubtitle}>
              Complete a few workouts and your volume trends, PRs, and muscle
              balance will appear here.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.springify()}
      layout={reduceMotion ? undefined : Layout.springify()}
      style={styles.container}
    >
      <GlassCard
        blurIntensity="default"
        elevation={3}
        padding="md"
        borderRadius="xl"
        showBorder
        style={styles.card}
      >
        {/* ── Collapsible header ── */}
        <Pressable
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={`Training analytics. ${expanded ? "Collapse" : "Expand"}.`}
          accessibilityState={{ expanded }}
          style={styles.header}
          testID={`${testID ?? "builder-analytics"}-header`}
        >
          <Ionicons name="analytics-outline" size={rf(18)} color={colors.primary.DEFAULT} />
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Training Analytics
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={rf(18)}
            color={colors.text.secondary}
          />
        </Pressable>

        {expanded && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.springify().delay(40)}
            layout={reduceMotion ? undefined : Layout.springify()}
          >
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* (d) Consistency + streak + (e) estimated growth + (f) time invested */}
              <View style={styles.statRow}>
                <StatTile
                  icon="flame"
                  label="Streak"
                  value={currentStreak > 0 ? `${currentStreak}d` : "—"}
                  accent={colors.primary.DEFAULT}
                  testID={`${testID ?? "builder-analytics"}-streak`}
                />
                <StatTile
                  icon={estimatedGrowthPct >= 0 ? "trending-up" : "trending-down"}
                  label="Growth"
                  value={`${estimatedGrowthPct >= 0 ? "+" : ""}${estimatedGrowthPct}%`}
                  accent={estimatedGrowthPct >= 0 ? colors.success.DEFAULT : colors.error.DEFAULT}
                  testID={`${testID ?? "builder-analytics"}-growth`}
                />
                <StatTile
                  icon="time"
                  label="Time"
                  value={formatMinutes(timeInvestedMinutes)}
                  accent={colors.secondary.DEFAULT}
                  testID={`${testID ?? "builder-analytics"}-time`}
                />
              </View>

              {/* (a) Weekly volume trend */}
              <SectionLabel icon="bar-chart" title="Weekly Volume (12 weeks)" />
              {weeklyVolume.some((w) => w.total > 0) ? (
                <Sparkline
                  data={weeklyVolume.map((w) => ({ label: w.weekLabel, value: w.total }))}
                  unit="kg"
                  color={colors.primary.DEFAULT}
                  testID={`${testID ?? "builder-analytics"}-volume-spark`}
                />
              ) : (
                <EmptyHint text="No volume recorded in the last 12 weeks." />
              )}

              {/* (b) Muscle heatmap */}
              <SectionLabel icon="body" title="Muscle Heatmap (4 weeks)" />
              {heatmapData.length > 0 ? (
                <MuscleHeatmap
                  data={heatmapData}
                  weekLabels={["W-3", "W-2", "W-1", "W"]}
                  testID={`${testID ?? "builder-analytics"}-heatmap`}
                />
              ) : (
                <EmptyHint text="No per-muscle volume recorded yet." />
              )}

              {/* (c) Recovery score trend */}
              <SectionLabel icon="pulse" title="Activity Trend (12 weeks)" />
              {recoveryTrend.some((w) => w.value > 0) ? (
                <Sparkline
                  data={recoveryTrend}
                  unit=""
                  color={colors.success.DEFAULT}
                  testID={`${testID ?? "builder-analytics"}-recovery-spark`}
                />
              ) : (
                <EmptyHint text="No activity in the last 12 weeks." />
              )}

              {/* (g) Exercise frequency */}
              <SectionLabel icon="barbell" title="Most Performed (top 10)" />
              {topEx.length > 0 ? (
                <View style={styles.freqList}>
                  {topEx.map((ex, i) => (
                    <View key={`freq_${i}`} style={styles.freqRow}>
                      <Text style={styles.freqRank}>{i + 1}.</Text>
                      <Text
                        style={styles.freqName}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {ex.name}
                      </Text>
                      <Text style={styles.freqSets} numberOfLines={1}>
                        {ex.sets} sets
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyHint text="No exercise frequency data yet." />
              )}

              {/* (h) PRs list */}
              <SectionLabel icon="trophy" title="Personal Records" />
              {personalRecords.length > 0 ? (
                <View style={styles.prList}>
                  {personalRecords.slice(0, 10).map((pr, i) => (
                    <View key={`pr_${i}`} style={styles.prRow}>
                      <Ionicons name="trophy" size={rf(14)} color={colors.warning.DEFAULT} />
                      <Text
                        style={styles.prName}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {pr.exerciseName}
                      </Text>
                      <Text style={styles.prValue} numberOfLines={1}>
                        {pr.weightKg > 0 ? `${pr.weightKg}kg` : `${pr.reps} reps`}
                      </Text>
                      <Text style={styles.prDate} numberOfLines={1}>
                        {formatDate(pr.achievedAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyHint text="No personal records logged yet." />
              )}
            </ScrollView>
          </Animated.View>
        )}
      </GlassCard>
    </Animated.View>
  );
};

// ----------------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------------

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
  testID?: string;
}

const StatTile: React.FC<StatTileProps> = ({ icon, label, value, accent, testID }) => (
  <View style={styles.statTile} testID={testID} accessible={false}>
    <Ionicons name={icon} size={rf(16)} color={accent} />
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const SectionLabel: React.FC<{ icon: keyof typeof Ionicons.glyphMap; title: string }> = ({
  icon,
  title,
}) => (
  <View style={styles.sectionLabel}>
    <Ionicons name={icon} size={rf(14)} color={colors.primary.DEFAULT} />
    <Text style={styles.sectionLabelText}>{title}</Text>
  </View>
);

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.emptyHint}>{text}</Text>
);

// ----------------------------------------------------------------------------
// FORMAT HELPERS
// ----------------------------------------------------------------------------

function formatMinutes(min: number): string {
  if (min <= 0) return "—";
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ----------------------------------------------------------------------------
// STYLES
// ----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: rp(spacing.sm),
  },
  card: {
    // GlassCard handles padding; we add nothing here.
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    minHeight: rp(44), // tap target ≥ 44dp
  },
  headerTitle: {
    flex: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
  } as TextStyle,
  body: {
    marginTop: rp(spacing.sm),
  },
  bodyContent: {
    gap: rp(spacing.md),
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: rp(spacing.xs),
  },
  statTile: {
    flex: 1,
    alignItems: "center",
    gap: rp(2),
    paddingVertical: rp(spacing.xs),
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    minHeight: rp(56),
    justifyContent: "center",
  } as ViewStyle,
  statValue: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.bold),
  } as TextStyle,
  statLabel: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    marginBottom: rp(spacing.xs),
  },
  sectionLabelText: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
  } as TextStyle,
  freqList: {
    gap: rp(spacing.xs),
  },
  freqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    minHeight: rp(32),
  },
  freqRank: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
    width: rw(20),
    flexShrink: 0,
  } as TextStyle,
  freqName: {
    flex: 1,
    flexShrink: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
  },
  freqSets: {
    color: colors.secondary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.semibold),
    flexShrink: 0,
  } as TextStyle,
  prList: {
    gap: rp(spacing.xs),
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    minHeight: rp(32),
  },
  prName: {
    flex: 1,
    flexShrink: 1,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
  },
  prValue: {
    color: colors.primary.DEFAULT,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: fw(typography.fontWeight.bold),
    flexShrink: 0,
  } as TextStyle,
  prDate: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    flexShrink: 0,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.md),
    gap: rp(spacing.xs),
  },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: fw(typography.fontWeight.semibold),
  } as TextStyle,
  emptySubtitle: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.caption),
    textAlign: "center",
    paddingHorizontal: rp(spacing.md),
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
  },
  emptyHint: {
    color: colors.text.tertiary,
    fontSize: rf(typography.fontSize.micro),
    fontStyle: "italic",
  } as TextStyle,
});

export default BuilderAnalyticsPanel;
