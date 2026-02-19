import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { THEME } from "../../ui";

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
            <Text style={styles.qualityText}>🎬 Demo</Text>
          </View>
        </View>
      )}

      <View style={styles.infoRow}>
        {(exercise.equipments?.length ?? 0) > 0 && (
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>
              🏋️ {exercise.equipments?.[0] || "Equipment"}
            </Text>
          </View>
        )}
        {(exercise.targetMuscles?.length ?? 0) > 0 && (
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>
              💪 {exercise.targetMuscles?.[0] || "Muscle"}
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
            📋 View Instructions ({exercise.instructions?.length || 0} steps)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  exerciseInfo: {
    padding: THEME.spacing.lg,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },

  exerciseTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    flex: 1,
    marginRight: THEME.spacing.sm,
  },

  qualityIndicator: {
    backgroundColor: THEME.colors.success + "20",
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },

  qualityText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.success,
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },

  infoChip: {
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.lg,
  },

  infoChipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: "500",
  },

  instructionsButton: {
    backgroundColor: THEME.colors.primary + "10",
    borderWidth: 1,
    borderColor: THEME.colors.primary + "30",
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignSelf: "flex-start",
  },

  instructionsButtonText: {
    color: THEME.colors.primary,
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
  },
});
