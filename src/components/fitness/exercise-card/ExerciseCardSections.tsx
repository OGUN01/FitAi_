import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
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
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  muscleGroupsSection: {
    marginBottom: THEME.spacing.md,
  },

  muscleGroupsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
  },

  muscleGroupChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  muscleGroupText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    textTransform: "capitalize",
  },

  equipmentSection: {
    marginBottom: THEME.spacing.md,
  },

  equipmentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
  },

  equipmentChip: {
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  equipmentText: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    textTransform: "capitalize",
  },

  instructionsSection: {
    marginBottom: THEME.spacing.md,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: THEME.spacing.sm,
  },

  instructionNumber: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginRight: THEME.spacing.sm,
    minWidth: 20,
  },

  instructionText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    flex: 1,
    lineHeight: 20,
  },

  tipsSection: {
    marginBottom: THEME.spacing.md,
  },

  tipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
    lineHeight: 18,
  },
});
