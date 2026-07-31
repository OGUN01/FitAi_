/**
 * FitAI — Exercise History Screen (Aurora flat, 2026 redesign)
 *
 * Per-exercise history with date-grouped flat rows, PR highlight in successAlt
 * text (not a gold badge box), a flat Personal Records section, volume + 1RM
 * charts, and a muted empty state.
 *
 * Design language (2026 flat):
 *  - Custom flat header: back chevron + uppercase letterspaced "HISTORY"
 *    eyebrow + bold exercise-name title. No glass cards anywhere.
 *  - Personal Records: flat section directly on the aurora background (no
 *    card chrome). PR label + value render in successAlt text (green); date
 *    in muted tertiary. No gold pill badges.
 *  - Sessions grouped by date under uppercase muted date eyebrows.
 *  - Flat rows: sets summary (semibold) + est. 1RM. PR sessions highlight the
 *    sets summary in successAlt text with a leading trophy glyph — no badge box.
 *    Hairline separators between rows.
 *
 * Data flow unchanged: exerciseHistoryService.getHistory + getPersonalRecords
 * remain the source of truth; totalVolume from volumeCalculator is reused.
 * handleRetry, prSessionIds memo, and the loading/error branches are preserved
 * byte-for-byte.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect, Polyline, Line, Text as SvgText } from "react-native-svg";
import {
  AuroraBackground,
  AuroraSpinner,
  EmptyState,
  AnimatedPressable,
} from "../../components/ui/aurora";
import {
  flatColors as colors,
  spacing,
  typography,
} from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { hexToRgba } from "../../utils/colors";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import {
  exerciseHistoryService,
  ExerciseHistoryEntry,
  ExercisePR,
} from "../../services/exerciseHistoryService";
import { getCurrentUserId } from "../../services/authUtils";
import { totalVolume } from "../../utils/volumeCalculator";
import { useProfileStore } from "../../stores/profileStore";
import { toDisplayWeight, type WeightUnit } from "../../utils/units";

interface RouteParams {
  exerciseId: string;
  exerciseName: string;
}

interface Props {
  route: { params: RouteParams };
  navigation?: { goBack: () => void };
}

const CHART_WIDTH = 300;
const CHART_HEIGHT = 120;
const BAR_GAP = 4;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatSets(sets: ExerciseHistoryEntry["sets"], unit: WeightUnit): string {
  if (sets.length === 0) return "No sets";
  const weightKg = sets[0].weightKg ?? 0;
  const allSameWeight = sets.every((s) => (s.weightKg ?? 0) === weightKg);
  // Stored kg → display in the user's unit (1-decimal precision).
  const display = toDisplayWeight(weightKg, unit);
  const weight = display == null ? weightKg : Math.round(display * 10) / 10;
  if (allSameWeight) {
    const reps = sets.map((s) => s.reps ?? 0);
    const allSameReps = reps.every((r) => r === reps[0]);
    if (allSameReps) {
      return `${sets.length}×${reps[0]} @ ${weight}${unit}`;
    }
    return `${sets.length} sets @ ${weight}${unit}`;
  }
  return `${sets.length} sets`;
}

// ── Date grouping (presentation-only) ───────────────────────────────────────
interface DateGroup {
  key: string;
  label: string;
  rows: ExerciseHistoryEntry[];
}

function groupByDate(entries: ExerciseHistoryEntry[]): DateGroup[] {
  const map = new Map<string, ExerciseHistoryEntry[]>();
  for (const e of entries) {
    const d = new Date(e.completedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = map.get(key);
    if (existing) existing.push(e);
    else map.set(key, [e]);
  }
  return Array.from(map.entries()).map(([, rows]) => {
    const d = new Date(rows[0].completedAt);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rows,
    };
  });
}

function VolumeChart({
  entries,
  unit,
}: {
  entries: ExerciseHistoryEntry[];
  unit: WeightUnit;
}) {
  if (entries.length === 0) return null;

  const reversed = [...entries].reverse();
  const volumes = reversed.map((e) =>
    totalVolume(
      e.sets
        .filter((s) => s.weightKg != null && s.reps != null)
        .map((s) => ({ weightKg: s.weightKg!, reps: s.reps! })),
    ),
  );
  const maxVol = Math.max(...volumes, 1);
  const barWidth = Math.max(
    8,
    (CHART_WIDTH - BAR_GAP * (reversed.length - 1)) / reversed.length,
  );

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Volume ({unit})</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {volumes.map((vol, i) => {
          const barH = (vol / maxVol) * (CHART_HEIGHT - 20);
          const x = i * (barWidth + BAR_GAP);
          const y = CHART_HEIGHT - 20 - barH;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={colors.successAlt}
              rx={3}
            />
          );
        })}
        <Line
          x1={0}
          y1={CHART_HEIGHT - 20}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT - 20}
          stroke={colors.glassBorder}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

function OneRMTrend({
  entries,
  unit,
}: {
  entries: ExerciseHistoryEntry[];
  unit: WeightUnit;
}) {
  const withE1RM = [...entries].reverse().filter((e) => e.estimated1RM != null);
  if (withE1RM.length < 2) return null;

  // Display conversion (stored kg → user unit) for the axis labels only;
  // point geometry is unit-independent (uniform scale).
  const toDisplay = (kg: number) =>
    Math.round(toDisplayWeight(kg, unit) ?? kg);

  const values = withE1RM.map((e) => e.estimated1RM!);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  const points = withE1RM
    .map((_, i) => {
      const x = (i / (withE1RM.length - 1)) * CHART_WIDTH;
      const y =
        CHART_HEIGHT -
        20 -
        ((values[i] - minVal) / range) * (CHART_HEIGHT - 30);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Estimated 1RM Trend</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Polyline
          points={points}
          fill="none"
          stroke={colors.warning}
          strokeWidth={2}
        />
        <Line
          x1={0}
          y1={CHART_HEIGHT - 20}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT - 20}
          stroke={colors.glassBorder}
          strokeWidth={1}
        />
        <SvgText x={0} y={CHART_HEIGHT - 4} fill={colors.textTertiary} fontSize={10}>
          {toDisplay(minVal)}
        </SvgText>
        <SvgText
          x={CHART_WIDTH - 30}
          y={CHART_HEIGHT - 4}
          fill={colors.textTertiary}
          fontSize={10}
        >
          {toDisplay(maxVal)}
        </SvgText>
      </Svg>
    </View>
  );
}

// ── Personal Records section (flat, no card chrome) ──────────────────────────
// Renders the already-fetched `prs` state (ExercisePR.value + prType +
// achievedAt) that was previously loaded but never shown to the user. PR label +
// value use successAlt text (green); the date stays muted. No gold pill badge.
function PersonalRecordsSection({
  prs,
  unit,
}: {
  prs: ExercisePR[];
  unit: WeightUnit;
}) {
  if (prs.length === 0) return null;
  return (
    <View style={styles.prSection}>
      <Text style={styles.sectionEyebrow}>PERSONAL RECORDS</Text>
      <View style={styles.prList}>
        {prs.map((pr, i) => (
          <View key={`pr-${i}-${pr.prType}`} style={styles.prRow}>
            <View style={styles.prLabelWrap}>
              <Ionicons
                name="trophy"
                size={rf(typography.fontSize.caption)}
                color={colors.successAlt}
              />
              <Text style={styles.prLabel}>
                {pr.prType === "weight" ? "Weight PR" : "Est. 1RM PR"}
              </Text>
            </View>
            <Text style={styles.prValue}>
              {Math.round(toDisplayWeight(pr.value, unit) ?? pr.value)}
              {pr.prType === "weight" ? ` ${unit}` : ` ${unit} (1RM)`}
            </Text>
            <Text style={styles.prDate}>{formatDate(pr.achievedAt)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Flat header — back chevron + eyebrow + title ─────────────────────────────
const ScreenHeader: React.FC<{
  title: string;
  onBack?: () => void;
}> = ({ title, onBack }) => (
  <View style={styles.header}>
    {onBack ? (
      <AnimatedPressable
        onPress={onBack}
        scaleValue={0.9}
        springConfig="snappy"
        hapticType="light"
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={rf(26)} color={colors.text} />
      </AnimatedPressable>
    ) : (
      <View style={styles.backButton} />
    )}
    <View style={styles.headerText}>
      <Text style={styles.eyebrow} numberOfLines={1}>
        History
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
    {/* Spacer balances the back button so the title block stays put */}
    <View style={styles.backButton} />
  </View>
);

export default function ExerciseHistoryScreen({ route, navigation }: Props) {
  const { exerciseId, exerciseName } = route.params;
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [prs, setPrs] = useState<ExercisePR[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Stored values are kg; display converts for imperial users (matches
  // WorkoutSessionScreen). Two-step select → derive (jest profileStore
  // mock ignores selectors).
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const userUnits: WeightUnit = personalInfo?.units === "imperial" ? "lbs" : "kg";

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all([
      exerciseHistoryService.getHistory(exerciseId, userId, 90),
      exerciseHistoryService.getPersonalRecords(exerciseId, userId),
    ])
      .then(([h, p]) => {
        if (!cancelled) {
          setHistory(h);
          setPrs(p);
        }
      })
      .catch((err) => {
        console.error("[ExerciseHistoryScreen] Failed to load history:", err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  // Memoize the Set so renderGroup's useCallback stays stable across renders
  // that don't change `prs` (a fresh Set every render would break the memo).
  const prSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pr of prs) {
      if (pr.sessionId) {
        ids.add(pr.sessionId);
      }
    }
    return ids;
  }, [prs]);

  // Date-grouped sessions (presentation-only transform).
  const groups = useMemo(() => groupByDate(history), [history]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      exerciseHistoryService.getHistory(exerciseId, userId, 90),
      exerciseHistoryService.getPersonalRecords(exerciseId, userId),
    ])
      .then(([h, p]) => {
        if (!cancelled) {
          setHistory(h);
          setPrs(p);
        }
      })
      .catch((err) => {
        console.error("[ExerciseHistoryScreen] Failed to load history:", err);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // No cleanup setter needed — component re-renders replace this closure.
  }, [exerciseId]);

  const renderGroup = useCallback(
    ({ item }: { item: DateGroup }) => (
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.groupCount} numberOfLines={1}>
            {item.rows.length} set{item.rows.length === 1 ? "" : "s"}
          </Text>
        </View>
        {item.rows.map((entry, idx) => {
          const hasPR = prSessionIds.has(entry.sessionId);
          return (
            <View key={entry.sessionId} style={styles.sessionRow}>
              <View style={styles.sessionMain}>
                <View style={styles.sessionTop}>
                  {hasPR ? (
                    <Ionicons
                      name="trophy"
                      size={rf(typography.fontSize.caption)}
                      color={colors.successAlt}
                      style={styles.prGlyph}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.sessionSets,
                      hasPR && styles.sessionSetsPR,
                    ]}
                    numberOfLines={1}
                  >
                    {formatSets(entry.sets, userUnits)}
                  </Text>
                </View>
                {entry.estimated1RM != null ? (
                  <Text style={styles.sessionE1RM} numberOfLines={1}>
                    Est. 1RM: {Math.round(toDisplayWeight(entry.estimated1RM, userUnits) ?? entry.estimated1RM)}{userUnits}
                  </Text>
                ) : null}
                {hasPR ? (
                  <Text style={styles.prTag} numberOfLines={1}>
                    Personal Record
                  </Text>
                ) : null}
              </View>
              {idx < item.rows.length - 1 ? (
                <View style={styles.separator} />
              ) : null}
            </View>
          );
        })}
      </View>
    ),
    [prSessionIds, userUnits],
  );

  if (loading) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.container}>
          <ScreenHeader title={exerciseName} onBack={navigation?.goBack} />
          <View style={styles.loadingWrap}>
            <AuroraSpinner size="lg" theme="primary" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (loadError) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.container}>
          <ScreenHeader title={exerciseName} onBack={navigation?.goBack} />
          <View style={styles.errorWrap}>
            <EmptyState
              icon="cloud-offline-outline"
              iconColor={colors.error}
              title="Couldn't load history"
              subtitle="Check your connection and try again."
              ctaText="Try Again"
              onCta={handleRetry}
            />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={exerciseName} onBack={navigation?.goBack} />

        <FlatList
          testID="history-list"
          data={groups}
          keyExtractor={(item) => item.key}
          renderItem={renderGroup}
          ListHeaderComponent={
            <View>
              <PersonalRecordsSection prs={prs} unit={userUnits} />
              {history.length > 0 && (
                <>
                  <VolumeChart entries={history} unit={userUnits} />
                  <OneRMTrend entries={history} unit={userUnits} />
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="barbell-outline"
              title="No history yet"
              subtitle="Complete your first workout!"
              iconColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.sm),
    paddingBottom: rp(spacing.xs),
  },
  backButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: rbr(22),
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: rf(22),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.text,
    marginTop: rp(2),
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.xs),
    paddingBottom: rp(spacing.xxl),
  },
  // ── Personal Records section (flat) ────────────────────────────────────────
  prSection: {
    marginTop: rp(spacing.sm),
    marginBottom: rp(spacing.md),
  },
  sectionEyebrow: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: rp(spacing.sm),
  },
  prList: {
    gap: rp(spacing.xs),
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
  },
  prLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
    flex: 1,
  },
  prLabel: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.successAlt,
    fontWeight: "600",
  },
  prValue: {
    fontSize: rf(typography.fontSize.body),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.text,
  },
  prDate: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.textTertiary,
  },
  // ── Charts (flat) ───────────────────────────────────────────────────────────
  chartContainer: {
    marginBottom: rp(spacing.md),
    alignItems: "center",
  },
  chartTitle: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: rp(spacing.sm),
    alignSelf: "flex-start",
  },
  // ── Date-grouped session rows ──────────────────────────────────────────────
  group: {
    marginBottom: rp(spacing.md),
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rp(spacing.xs),
  },
  groupLabel: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  groupCount: {
    fontSize: rf(11),
    fontWeight: "500",
    color: colors.textTertiary,
  },
  sessionRow: {
    // Wrapper for row + hairline.
  },
  sessionMain: {
    paddingVertical: rp(spacing.sm),
    minHeight: 44,
    gap: rp(spacing.xxs),
  },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.xs),
  },
  prGlyph: {
    flexShrink: 0,
  },
  sessionSets: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  // PR highlight in successAlt text (not a badge box).
  sessionSetsPR: {
    color: colors.successAlt,
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
  },
  sessionE1RM: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.warning,
  },
  prTag: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.successAlt,
  },
  separator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
  },
});
