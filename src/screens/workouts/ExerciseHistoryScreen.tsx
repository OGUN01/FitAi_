/**
 * FitAI — Exercise History Screen (Aurora)
 *
 * Per-exercise history: volume bar chart, estimated-1RM trend, session list,
 * and a Personal Records card. Previously a flat dark surface with hardcoded
 * hex (#0D0D1A / #1A1A2E / #4CAF50), raw SVG, 🏆 emoji, ActivityIndicator, and
 * a "← Back" text button.
 *
 * Aurora modernization:
 *  - Wrapped in AuroraBackground theme="space".
 *  - Hardcoded colors → aurora tokens.
 *  - ActivityIndicator → AuroraSpinner.
 *  - Added Personal Records card at top (renders ExercisePR.value + prType +
 *    achievedAt — the `prs` state was already fetched but never rendered).
 *  - 🏆 emoji → gold glass pill PR badge.
 *  - "← Back" text → GlassHeader (back chevron + title).
 *  - Ad-hoc empty state → shared EmptyState.
 *  - Volume bar chart + 1RM trend recolored with tokens.
 *
 * Data flow unchanged: exerciseHistoryService.getHistory + getPersonalRecords
 * remain the source of truth; totalVolume from volumeCalculator is reused.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import Svg, { Rect, Polyline, Line, Text as SvgText } from "react-native-svg";
import {
  AuroraBackground,
  GlassCard,
  GlassHeader,
  AuroraSpinner,
  EmptyState,
} from "../../components/ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rp, rf } from "../../utils/responsive";
import {
  exerciseHistoryService,
  ExerciseHistoryEntry,
  ExercisePR,
} from "../../services/exerciseHistoryService";
import { getCurrentUserId } from "../../services/authUtils";
import { totalVolume } from "../../utils/volumeCalculator";

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

function formatSets(sets: ExerciseHistoryEntry["sets"]): string {
  if (sets.length === 0) return "No sets";
  const weight = sets[0].weightKg ?? 0;
  const allSameWeight = sets.every((s) => (s.weightKg ?? 0) === weight);
  if (allSameWeight) {
    const reps = sets.map((s) => s.reps ?? 0);
    const allSameReps = reps.every((r) => r === reps[0]);
    if (allSameReps) {
      return `${sets.length}×${reps[0]} @ ${weight}kg`;
    }
    return `${sets.length} sets @ ${weight}kg`;
  }
  return `${sets.length} sets`;
}

function VolumeChart({ entries }: { entries: ExerciseHistoryEntry[] }) {
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
      <Text style={styles.chartTitle}>Volume (kg)</Text>
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
              fill={colors.success.DEFAULT}
              rx={3}
            />
          );
        })}
        <Line
          x1={0}
          y1={CHART_HEIGHT - 20}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT - 20}
          stroke={colors.glass.border}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

function OneRMTrend({ entries }: { entries: ExerciseHistoryEntry[] }) {
  const withE1RM = [...entries].reverse().filter((e) => e.estimated1RM != null);
  if (withE1RM.length < 2) return null;

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
          stroke={colors.warning.DEFAULT}
          strokeWidth={2}
        />
        <Line
          x1={0}
          y1={CHART_HEIGHT - 20}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT - 20}
          stroke={colors.glass.border}
          strokeWidth={1}
        />
        <SvgText x={0} y={CHART_HEIGHT - 4} fill={colors.text.tertiary} fontSize={10}>
          {Math.round(minVal)}
        </SvgText>
        <SvgText
          x={CHART_WIDTH - 30}
          y={CHART_HEIGHT - 4}
          fill={colors.text.tertiary}
          fontSize={10}
        >
          {Math.round(maxVal)}
        </SvgText>
      </Svg>
    </View>
  );
}

// ── Personal Records card ────────────────────────────────────────────────────
// Renders the already-fetched `prs` state (ExercisePR.value + prType +
// achievedAt) that was previously loaded but never shown to the user.
function PersonalRecordsCard({ prs }: { prs: ExercisePR[] }) {
  if (prs.length === 0) return null;
  return (
    <GlassCard elevation={2} padding="md" borderRadius="lg" style={styles.prCard}>
      <View style={styles.prHeader}>
        <Text style={styles.prCardTitle}>Personal Records</Text>
      </View>
      <View style={styles.prList}>
        {prs.map((pr, i) => (
          <View key={`pr-${i}-${pr.prType}`} style={styles.prRow}>
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeEmoji}>🏆</Text>
              <Text style={styles.prBadgeLabel}>
                {pr.prType === "weight" ? "Weight PR" : "Est. 1RM PR"}
              </Text>
            </View>
            <Text style={styles.prValue}>
              {Math.round(pr.value)}
              {pr.prType === "weight" ? " kg" : " kg (1RM)"}
            </Text>
            <Text style={styles.prDate}>{formatDate(pr.achievedAt)}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export default function ExerciseHistoryScreen({ route, navigation }: Props) {
  const { exerciseId, exerciseName } = route.params;
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [prs, setPrs] = useState<ExercisePR[]>([]);
  const [loading, setLoading] = useState(true);

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
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const prSessionIds = new Set<string>();
  for (const pr of prs) {
    if (pr.sessionId) {
      prSessionIds.add(pr.sessionId);
    }
  }

  const renderSession = ({ item }: { item: ExerciseHistoryEntry }) => {
    const hasPR = prSessionIds.has(item.sessionId);
    return (
      <GlassCard
        elevation={1}
        padding="md"
        borderRadius="lg"
        style={styles.sessionCard}
      >
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionDate}>{formatDate(item.completedAt)}</Text>
          {hasPR && (
            <View style={styles.prPill}>
              <Text style={styles.prPillText}>🏆 PR</Text>
            </View>
          )}
        </View>
        <Text style={styles.sessionSets}>{formatSets(item.sets)}</Text>
        {item.estimated1RM != null && (
          <Text style={styles.sessionE1RM}>
            Est. 1RM: {Math.round(item.estimated1RM)}kg
          </Text>
        )}
      </GlassCard>
    );
  };

  if (loading) {
    return (
      <AuroraBackground theme="space">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingWrap}>
            <AuroraSpinner size="lg" theme="primary" />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <SafeAreaView style={styles.container}>
        <GlassHeader
          title={exerciseName}
          titleIcon="barbell"
          onBack={navigation?.goBack}
        />

        <FlatList
          testID="history-list"
          data={history}
          keyExtractor={(item) => item.sessionId}
          renderItem={renderSession}
          ListHeaderComponent={
            <View>
              <PersonalRecordsCard prs={prs} />
              {history.length > 0 && (
                <>
                  <VolumeChart entries={history} />
                  <OneRMTrend entries={history} />
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="barbell-outline"
              title="No history yet"
              subtitle="Complete your first workout!"
              iconColor={colors.primary.DEFAULT}
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
    paddingHorizontal: rp(spacing.md),
    paddingTop: rp(spacing.md),
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    marginBottom: rp(spacing.md),
  },
  chartContainer: {
    marginBottom: rp(spacing.md),
    alignItems: "center",
  },
  chartTitle: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    marginBottom: rp(spacing.sm),
    alignSelf: "flex-start",
  },
  listContent: {
    paddingBottom: rp(spacing.xxl),
  },
  // PR card
  prCard: {
    marginBottom: rp(spacing.md),
  },
  prHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(spacing.sm),
  },
  prCardTitle: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
  },
  prList: {
    gap: rp(spacing.xs),
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
  },
  // Gold glass pill PR badge
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
    flex: 1,
  },
  prBadgeEmoji: {
    fontSize: rf(typography.fontSize.caption),
  },
  prBadgeLabel: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.warning.DEFAULT,
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  prValue: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
  },
  prDate: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
  },
  // Session rows
  sessionCard: {
    marginBottom: rp(spacing.sm),
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(spacing.xxs),
  },
  sessionDate: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
  },
  prPill: {
    backgroundColor: `${colors.warning.DEFAULT}22`,
    borderWidth: 1,
    borderColor: `${colors.warning.DEFAULT}66`,
    borderRadius: borderRadius.full,
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xxs),
    marginLeft: rp(spacing.sm),
  },
  prPillText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.warning.DEFAULT,
    fontWeight: String(typography.fontWeight.bold) as any,
  },
  sessionSets: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
  },
  sessionE1RM: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.warning.DEFAULT,
    marginTop: rp(spacing.xxs),
  },
});
