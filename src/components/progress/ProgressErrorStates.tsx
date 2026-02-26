import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { Button } from "../../components/ui";

interface ProgressErrorStatesProps {
  isLoading: boolean;
  progressLoading: boolean;
  statsLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasCalculatedMetrics: boolean;
  progressEntriesLength: number;
  onRefresh: () => void;
  onAddEntry: () => void;
}

export const ProgressErrorStates: React.FC<ProgressErrorStatesProps> = ({
  isLoading,
  progressLoading,
  statsLoading,
  error,
  isAuthenticated,
  hasCalculatedMetrics,
  progressEntriesLength,
  onRefresh,
  onAddEntry,
}) => {
  // Loading State
  if (progressLoading || statsLoading) {
    return (
      <View
        style={[styles.loadingContainer, StyleSheet.absoluteFill, { pointerEvents: "box-only" }]}
      >
        <AuroraSpinner size="lg" theme="primary" />
        <Text style={styles.loadingText}>Loading progress data...</Text>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <GlassCard
        style={styles.errorCard}
        elevation={1}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        <View style={styles.errorHeader}>
          <Ionicons
            name="warning-outline"
            size={rf(24)}
            color={ResponsiveTheme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <Button
          title="Retry"
          onPress={onRefresh}
          variant="outline"
          size="sm"
          style={styles.retryButton}
        />
      </GlassCard>
    );
  }

  // No Authentication State
  if (!isAuthenticated && !hasCalculatedMetrics) {
    return (
      <GlassCard
        style={styles.errorCard}
        elevation={1}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        <View style={styles.errorHeader}>
          <Ionicons
            name="lock-closed-outline"
            size={rf(24)}
            color={ResponsiveTheme.colors.error}
          />
          <Text style={styles.errorText}>
            Please sign in to track your progress
          </Text>
        </View>
      </GlassCard>
    );
  }

  // No Data State
  if (
    (isAuthenticated || hasCalculatedMetrics) &&
    progressEntriesLength === 0 &&
    !progressLoading
  ) {
    return (
      <GlassCard
        style={styles.errorCard}
        elevation={1}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        <View style={styles.noDataHeader}>
          <Ionicons
            name="stats-chart-outline"
            size={rf(24)}
            color={ResponsiveTheme.colors.textSecondary}
          />
          <Text style={styles.errorText}>No progress data yet</Text>
        </View>
        <Text style={styles.errorSubtext}>
          Add your first measurement to start tracking!
        </Text>
        <Button
          title="Add Entry"
          onPress={onAddEntry}
          variant="primary"
          size="sm"
          style={styles.retryButton}
        />
      </GlassCard>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
    zIndex: 10,
    backgroundColor: ResponsiveTheme.colors.overlay, // Semi-transparent background
    justifyContent: "center",
  },
  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.md,
  },
  errorCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: "center",
    marginHorizontal: ResponsiveTheme.spacing.lg,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
    marginBottom: ResponsiveTheme.spacing.md,
  },
  errorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
    flex: 1,
  },
  errorSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  retryButton: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  noDataHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
    marginBottom: ResponsiveTheme.spacing.md,
  },
});
