import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Svg, { Rect, Polyline, Line, Text as SvgText } from "react-native-svg";
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
              fill="#4CAF50"
              rx={3}
            />
          );
        })}
        <Line
          x1={0}
          y1={CHART_HEIGHT - 20}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT - 20}
          stroke="#444"
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
          stroke="#FF9800"
          strokeWidth={2}
        />
        <Line
          x1={0}
          y1={CHART_HEIGHT - 20}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT - 20}
          stroke="#444"
          strokeWidth={1}
        />
        <SvgText x={0} y={CHART_HEIGHT - 4} fill="#888" fontSize={10}>
          {Math.round(minVal)}
        </SvgText>
        <SvgText
          x={CHART_WIDTH - 30}
          y={CHART_HEIGHT - 4}
          fill="#888"
          fontSize={10}
        >
          {Math.round(maxVal)}
        </SvgText>
      </Svg>
    </View>
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
      <View style={styles.sessionRow}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionDate}>{formatDate(item.completedAt)}</Text>
          {hasPR && <Text style={styles.prBadge}>🏆</Text>}
        </View>
        <Text style={styles.sessionSets}>{formatSets(item.sets)}</Text>
        {item.estimated1RM != null && (
          <Text style={styles.sessionE1RM}>
            Est. 1RM: {Math.round(item.estimated1RM)}kg
          </Text>
        )}
      </View>
    );
  };

  const emptyComponent = (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        No history yet — complete your first workout!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {navigation && (
          <Pressable
            onPress={navigation.goBack}
            style={styles.backButton}
            testID="back-button"
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        )}
        <View style={styles.headerTitles}>
          <Text style={styles.title}>{exerciseName}</Text>
          <Text style={styles.subtitle}>History</Text>
        </View>
      </View>

      {history.length > 0 && (
        <>
          <VolumeChart entries={history} />
          <OneRMTrend entries={history} />
        </>
      )}

      <FlatList
        testID="history-list"
        data={history}
        keyExtractor={(item) => item.sessionId}
        renderItem={renderSession}
        ListEmptyComponent={emptyComponent}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D1A",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  listContent: {
    paddingBottom: 32,
  },
  sessionRow: {
    backgroundColor: "#1A1A2E",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  prBadge: {
    fontSize: 14,
    marginLeft: 8,
  },
  sessionSets: {
    fontSize: 13,
    color: "#CCC",
  },
  sessionE1RM: {
    fontSize: 12,
    color: "#FF9800",
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  headerTitles: {
    flex: 1,
  },
});
