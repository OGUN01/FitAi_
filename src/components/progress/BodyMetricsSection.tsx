import React, { useMemo } from "react";
import { View, Text, StyleSheet, DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rh } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { GlassCard } from "../../components/ui/aurora/GlassCard";

// Helper for date formatting
const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

interface BodyMetricsSectionProps {
  stats: any;
  progressEntries: any[];
}

export const BodyMetricsSection: React.FC<BodyMetricsSectionProps> = ({
  stats,
  progressEntries,
}) => {
  const weightProgressWidth: DimensionValue = useMemo(() => {
    const current = Number(stats.weight.current);
    const goal = Number(stats.weight.goal);
    if (current <= 0 || !isFinite(current)) {
    return "0%" as DimensionValue;
    }
    const raw = ((current - goal) / current) * 100 + 50;
    const clamped = Math.max(0, Math.min(100, isFinite(raw) ? raw : 0));
    return `${clamped}%` as DimensionValue;
  }, [stats.weight.current, stats.weight.goal]);
  // Helper to render trend icon
  const renderTrendIcon = (trend: string) => {
    if (trend === "stable") return null;
    return (
      <Ionicons
        name={
          trend === "decreasing"
            ? "trending-down-outline"
            : "trending-up-outline"
        }
        size={rf(16)}
        color={
          trend === "decreasing"
            ? colors.success
            : colors.error
        }
      />
    );
  };

  // Helper to render change text
  const renderChangeText = (change: number | null, unit: string) => {
    if (change === null) return "--";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)} ${unit}`;
  };

  // Helper to render manual entry label
  const renderManualLabel = (date?: string) => (
    <View style={styles.manualEntry}>
      <Ionicons
        name="create-outline"
        size={rf(12)}
        color={colors.textSecondary}
        style={{ marginRight: rp(4) }}
      />
      <Text style={styles.manualEntryText}>
        Manual{date ? ` • ${formatDate(date)}` : ""}
      </Text>
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Body Metrics</Text>
      {!stats.weight.current &&
      !stats.bodyFat.current &&
      !stats.muscle.current ? (
        <GlassCard
          style={styles.emptyCard}
          elevation={2}
          blurIntensity="light"
          padding="lg"
          borderRadius="lg"
        >
          <Ionicons
            name="body-outline"
            size={rf(32)}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Start tracking to see progress</Text>
          <Text style={styles.emptySubtitle}>
            Log your weight and body metrics
          </Text>
        </GlassCard>
      ) : (
        <>
          <View style={styles.statsGrid}>
            {/* Weight Card */}
            <GlassCard
              style={styles.statCard}
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
            >
              <View style={styles.statHeader}>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>
                    {stats.weight.current && stats.weight.current > 0
                      ? stats.weight.current
                      : "--"}
                  </Text>
                  <Text style={styles.statUnit}>{stats.weight.unit}</Text>
                </View>
                {stats.weight.change !== null &&
                  stats.weight.change !== 0 &&
                  renderTrendIcon(stats.weight.trend)}
              </View>
              <Text style={styles.statLabel}>Weight</Text>
              {stats.weight.change !== null && stats.weight.change !== 0 && (
                <Text
                  style={[
                    styles.statChange,
                    (stats.weight.change ?? 0) < 0
                      ? styles.statChangePositive
                      : styles.statChangeNegative,
                  ]}
                >
                  {renderChangeText(stats.weight.change, stats.weight.unit)}
                </Text>
              )}
              {stats.weight.current ? renderManualLabel(progressEntries[0]?.entry_date) : null}
              <View style={styles.goalProgress}>
                <Text style={styles.goalText}>
                  Goal: {stats.weight.goal}
                  {stats.weight.unit}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: weightProgressWidth },
                    ]}
                  />
                </View>
              </View>
            </GlassCard>

            {/* Body Fat Card */}
            <GlassCard
              style={styles.statCard}
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
            >
              <View style={styles.statHeader}>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>
                    {stats.bodyFat.current && stats.bodyFat.current > 0
                      ? stats.bodyFat.current
                      : "--"}
                  </Text>
                  <Text style={styles.statUnit}>{stats.bodyFat.unit}</Text>
                </View>
                {stats.bodyFat.change !== null &&
                  stats.bodyFat.change !== 0 &&
                  renderTrendIcon(stats.bodyFat.trend)}
              </View>
              <Text style={styles.statLabel}>Body Fat</Text>
              {stats.bodyFat.change !== null && stats.bodyFat.change !== 0 && (
                <Text
                  style={[
                    styles.statChange,
                    (stats.bodyFat.change ?? 0) < 0
                      ? styles.statChangePositive
                      : styles.statChangeNegative,
                  ]}
                >
                  {renderChangeText(stats.bodyFat.change, stats.bodyFat.unit)}
                </Text>
              )}
              {stats.bodyFat.current ? renderManualLabel(progressEntries[0]?.entry_date) : null}
            </GlassCard>
          </View>

          <View style={styles.statsGrid}>
            {/* Muscle Mass Card */}
            <GlassCard
              style={styles.statCard}
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
            >
              <View style={styles.statHeader}>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>
                    {stats.muscle.current && stats.muscle.current > 0
                      ? stats.muscle.current
                      : "--"}
                  </Text>
                  <Text style={styles.statUnit}>{stats.muscle.unit}</Text>
                </View>
                {stats.muscle.change !== null && stats.muscle.change !== 0 && (
                  <Ionicons
                    name={
                      stats.muscle.trend === "decreasing"
                        ? "trending-down-outline"
                        : "trending-up-outline"
                    }
                    size={rf(16)}
                    color={
                      stats.muscle.trend === "decreasing"
                        ? colors.error
                        : colors.success
                    }
                  />
                )}
              </View>
              <Text style={styles.statLabel}>Muscle Mass</Text>
              {stats.muscle.change !== null && stats.muscle.change !== 0 && (
                <Text
                  style={[
                    styles.statChange,
                    (stats.muscle.change ?? 0) > 0
                      ? styles.statChangePositive
                      : styles.statChangeNegative,
                  ]}
                >
                  {renderChangeText(stats.muscle.change, stats.muscle.unit)}
                </Text>
              )}
              {stats.muscle.current ? renderManualLabel(progressEntries[0]?.entry_date) : null}
            </GlassCard>

            {/* BMI Card */}
            <GlassCard
              style={styles.statCard}
              elevation={2}
              blurIntensity="light"
              padding="md"
              borderRadius="lg"
            >
              <View style={styles.statHeader}>
                <View style={styles.statValueRow}>
                  <Text style={styles.statValue}>
                    {stats.bmi.current && stats.bmi.current > 0
                      ? Number(stats.bmi.current).toFixed(1)
                      : "--"}
                  </Text>
                  <Text style={styles.statUnit}>BMI</Text>
                </View>
              </View>
              <Text style={styles.statLabel}>Body Mass Index</Text>
              {null}
              {stats.bmi.current && (
                <View style={styles.manualEntry}>
                  <Ionicons
                    name="calculator-outline"
                    size={rf(12)}
                    color={colors.textSecondary}
                    style={{ marginRight: rp(4) }}
                  />
                  <Text style={styles.manualEntryText}>Calculated</Text>
                </View>
              )}
            </GlassCard>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyCard: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: rh(120),
    padding: spacing.lg,
  },
  emptyIcon: {
    marginBottom: spacing.sm,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: rf(18),
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: rf(16),
    color: colors.textSecondary,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "center",
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    width: "100%",
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: rp(2),
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  statUnit: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: rp(2),
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  statChange: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  statChangePositive: {
    color: colors.success,
  },
  statChangeNegative: {
    color: colors.error,
  },
  statChangeNeutral: {
    color: colors.textSecondary,
  },
  manualEntry: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: rp(4),
  },
  manualEntryText: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  goalProgress: {
    marginTop: spacing.sm,
    width: "100%",
  },
  goalText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: rp(4),
  },
  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
});
