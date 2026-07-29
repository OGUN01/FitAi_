import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { hexToRgba } from "../../../utils/colors";

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
    // Was colors.success + "20" (fragile hex-append) — hexToRgba tracks the
    // token if it ever changes to an rgba()/named color.
    backgroundColor: hexToRgba(colors.success, 0.13),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  qualityText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontFamily: FONT_FAMILY.semibold,
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
    // Was colors.primary + "10" / "30" (fragile hex-append) — hexToRgba
    // survives any future token format change.
    backgroundColor: hexToRgba(colors.primary, 0.1),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, 0.3),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },

  instructionsButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },
});
