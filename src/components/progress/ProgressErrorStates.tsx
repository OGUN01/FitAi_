import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  spacing,
  typography,
  flatColors,
} from "../../theme/aurora-tokens";
import { AuroraSpinner } from "../../components/ui/aurora/AuroraSpinner";
import { EmptyState } from "../../components/ui/aurora/EmptyState";

interface ProgressErrorStatesProps {
  isLoading: boolean;
  progressLoading: boolean;
  statsLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasCalculatedMetrics: boolean;
  onRefresh: () => void;
}

export const ProgressErrorStates: React.FC<ProgressErrorStatesProps> = ({
  progressLoading,
  statsLoading,
  error,
  isAuthenticated,
  hasCalculatedMetrics,
  onRefresh,
}) => {
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

  if (error) {
    return (
      <View style={styles.wrap}>
        <EmptyState
          icon="cloud-offline-outline"
          iconColor={colors.error.DEFAULT}
          title="Couldn't load progress"
          subtitle={error}
          ctaText="Retry"
          onCta={onRefresh}
        />
      </View>
    );
  }

  if (!isAuthenticated && !hasCalculatedMetrics) {
    return (
      <View style={styles.wrap}>
        <EmptyState
          icon="lock-closed-outline"
          title="Please sign in to track your progress"
        />
      </View>
    );
  }

  // No standalone empty state for zero weigh-ins: WeightJourneySection's own
  // empty-chart copy ("Log at least 2 entries to see your journey") + its
  // "Log" button, and GoalProgressSection's own empty-goal copy, already
  // cover this case with section-local CTAs. A generic panel here duplicated
  // that messaging with a second, differently-labeled "Add Entry" button.

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    zIndex: 10,
    // Flat dim veil (not a glass wash) — keeps the aurora backdrop visible
    // while covering stale content during load.
    backgroundColor: flatColors.overlay,
    justifyContent: "center",
  },
  loadingText: {
    ...typography.variants.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  wrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
});

export default ProgressErrorStates;
