import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../../utils/responsive";
import { Exercise } from "../../../types/workout";

interface ExerciseCardSectionsProps {
  exercise: Exercise;
  getMuscleGroupColor: (group: string) => string;
}

export const ExerciseCardSections: React.FC<ExerciseCardSectionsProps> = ({
  exercise,
  getMuscleGroupColor,
}) => {
  return (
    <>
      {/* Muscle Groups */}
      {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
        <View style={styles.muscleGroupsSection}>
          <Text style={styles.sectionTitle}>Target Muscles</Text>
          <View style={styles.muscleGroupsContainer}>
            {exercise.muscleGroups.map((group) => (
              <View
                key={`muscle-${group}`}
                style={[
                  styles.muscleGroupChip,
                  { backgroundColor: getMuscleGroupColor(group) },
                ]}
              >
                <Text style={styles.muscleGroupText}>
                  {group.replace("_", " ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Equipment */}
      {exercise.equipment && exercise.equipment.length > 0 && (
        <View style={styles.equipmentSection}>
          <Text style={styles.sectionTitle}>Equipment Needed</Text>
          <View style={styles.equipmentContainer}>
            {exercise.equipment.map((item) => (
              <View key={`equipment-${item}`} style={styles.equipmentChip}>
                <Text style={styles.equipmentText}>
                  {item.replace("_", " ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Instructions */}
      {exercise.instructions && exercise.instructions.length > 0 && (
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {exercise.instructions.map((instruction, index) => (
            <View
              key={`instruction-${index}-${instruction.substring(0, 20)}`}
              style={styles.instructionItem}
            >
              <Text style={styles.instructionNumber}>{index + 1}.</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tips */}
      {exercise.tips && exercise.tips.length > 0 && (
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>💡 Tips</Text>
          {exercise.tips.map((tip) => (
            <Text key={`tip-${tip.substring(0, 30)}`} style={styles.tipText}>
              • {tip}
            </Text>
          ))}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  muscleGroupsSection: {
    marginBottom: spacing.md,
  },

  muscleGroupsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  muscleGroupChip: {
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  muscleGroupText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },

  equipmentSection: {
    marginBottom: spacing.md,
  },

  equipmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  equipmentChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(12),
  },

  equipmentText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },

  instructionsSection: {
    marginBottom: spacing.md,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },

  instructionNumber: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.sm,
    minWidth: 20,
  },

  instructionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    lineHeight: rf(20),
  },

  tipsSection: {
    marginBottom: spacing.md,
  },

  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: rf(18),
  },
});
