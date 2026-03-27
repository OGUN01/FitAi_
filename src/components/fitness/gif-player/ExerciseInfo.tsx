import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";

interface Exercise {
  name: string;
  equipments?: string[];
  targetMuscles?: string[];
  instructions?: string[];
}

interface ExerciseInfoProps {
  exercise: Exercise | null | undefined;
  displayName: string;
  showTitle: boolean;
  showInstructions: boolean;
  onInstructionsPress?: () => void;
}

export const ExerciseInfo: React.FC<ExerciseInfoProps> = ({
  exercise,
  displayName,
  showTitle,
  showInstructions,
  onInstructionsPress,
}) => {
  if (!exercise) return null;

  return (
    <View style={styles.exerciseInfo}>
      {showTitle && (
        <View style={styles.titleRow}>
          <Text style={styles.exerciseTitle} numberOfLines={2}>
            {displayName}
          </Text>
          <View style={styles.qualityIndicator}>
            <Text style={styles.qualityText}>Demo</Text>
          </View>
        </View>
      )}

      <View style={styles.infoRow}>
        {(exercise.equipments?.length ?? 0) > 0 && (
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>
              Equipment: {exercise.equipments?.[0] || "Equipment"}
            </Text>
          </View>
        )}
        {(exercise.targetMuscles?.length ?? 0) > 0 && (
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>
              Target: {exercise.targetMuscles?.[0] || "Muscle"}
            </Text>
          </View>
        )}
      </View>

      {showInstructions && onInstructionsPress && (
        <TouchableOpacity
          style={styles.instructionsButton}
          onPress={onInstructionsPress}
        >
          <Text style={styles.instructionsButtonText}>
            View Instructions ({exercise.instructions?.length || 0} steps)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  exerciseInfo: {
    padding: ResponsiveTheme.spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  exerciseTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  qualityIndicator: {
    backgroundColor: ResponsiveTheme.colors.success + "20",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  qualityText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.success,
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  infoChip: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  infoChipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
  },

  instructionsButton: {
    backgroundColor: ResponsiveTheme.colors.primary + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "30",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    alignSelf: "flex-start",
  },

  instructionsButtonText: {
    color: ResponsiveTheme.colors.primary,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
  },
});
