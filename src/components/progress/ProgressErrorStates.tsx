import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../utils/responsive";
import {
  colors,
  surface,
  border as borderTokens,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
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
  progressLoading,
  statsLoading,
  error,
  isAuthenticated,
  hasCalculatedMetrics,
  progressEntriesLength,
  onRefresh,
  onAddEntry,
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
      <View style={styles.panel}>
        <View style={styles.row}>
          <Ionicons name="warning-outline" size={rf(22)} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <Button
          title="Retry"
          onPress={onRefresh}
          variant="outline"
          size="sm"
          style={styles.actionButton}
        />
      </View>
    );
  }

  if (!isAuthenticated && !hasCalculatedMetrics) {
    return (
      <View style={styles.panel}>
        <View style={styles.row}>
          <Ionicons name="lock-closed-outline" size={rf(22)} color={colors.error.DEFAULT} />
          <Text style={styles.errorText}>Please sign in to track your progress</Text>
        </View>
      </View>
    );
  }

  if (
    isAuthenticated &&
    !hasCalculatedMetrics &&
    progressEntriesLength === 0 &&
    !progressLoading
  ) {
    return (
      <View style={styles.panel}>
        <View style={styles.row}>
          <Ionicons name="stats-chart-outline" size={rf(22)} color={colors.text.secondary} />
          <Text style={styles.bodyText}>No body measurements yet</Text>
        </View>
        <Text style={styles.subText}>Add your first measurement to start tracking!</Text>
        <Button
          title="Add Entry"
          onPress={onAddEntry}
          variant="primary"
          size="sm"
          style={styles.actionButton}
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    zIndex: 10,
    backgroundColor: colors.glass.backgroundDark,
    justifyContent: "center",
  },
  loadingText: {
    ...typography.variants.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  panel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.variants.body,
    color: colors.error.DEFAULT,
    textAlign: "center",
    flex: 1,
  },
  bodyText: {
    ...typography.variants.body,
    color: colors.text.secondary,
    textAlign: "center",
    flex: 1,
  },
  subText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
  },
});

export default ProgressErrorStates;
