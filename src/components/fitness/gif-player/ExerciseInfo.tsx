import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

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
    padding: spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },

  exerciseTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },

  qualityIndicator: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  qualityText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  infoChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },

  infoChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  instructionsButton: {
    backgroundColor: colors.primary + "10",
    borderWidth: 1,
    borderColor: colors.primary + "30",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: "flex-start",
  },

  instructionsButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
