import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

interface ExerciseDetailsProps {
  exercise?: {
    targetMuscles: string[];
    secondaryMuscles?: string[];
    equipments: string[];
    bodyParts: string[];
  } | null;
}

export const ExerciseDetails: React.FC<ExerciseDetailsProps> = ({
  exercise,
}) => {
  if (!exercise) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataEmoji}>❓</Text>
        <Text style={styles.noDataText}>No exercise details available</Text>
      </View>
    );
  }

  return (
    <View style={styles.detailsContainer}>
      {/* Target Muscles */}
      {exercise.targetMuscles.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>🎯 Primary Muscles</Text>
          <View style={styles.chipContainer}>
            {exercise.targetMuscles.map((muscle) => (
              <View
                key={`primary-${muscle}`}
                style={[styles.chip, styles.primaryChip]}
              >
                <Text style={styles.primaryChipText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Secondary Muscles */}
      {exercise.secondaryMuscles?.length &&
        exercise.secondaryMuscles.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>💪 Secondary Muscles</Text>
            <View style={styles.chipContainer}>
              {exercise.secondaryMuscles.map((muscle) => (
                <View
                  key={`secondary-${muscle}`}
                  style={[styles.chip, styles.secondaryChip]}
                >
                  <Text style={styles.secondaryChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

      {/* Equipment */}
      {exercise.equipments.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>🏋️ Equipment Needed</Text>
          <View style={styles.chipContainer}>
            {exercise.equipments.map((equipment) => (
              <View
                key={`equipment-${equipment}`}
                style={[styles.chip, styles.equipmentChip]}
              >
                <Text style={styles.equipmentChipText}>{equipment}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Body Parts */}
      {exercise.bodyParts.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>🦴 Body Parts</Text>
          <View style={styles.chipContainer}>
            {exercise.bodyParts.map((bodyPart) => (
              <View
                key={`bodypart-${bodyPart}`}
                style={[styles.chip, styles.bodyPartChip]}
              >
                <Text style={styles.bodyPartChipText}>{bodyPart}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Exercise Tips */}
      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>💡 Tips</Text>
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>
            • Focus on proper form over speed or weight
          </Text>
          <Text style={styles.tipText}>
            • Control the movement throughout the full range of motion
          </Text>
          <Text style={styles.tipText}>
            • Breathe properly - exhale on exertion, inhale on release
          </Text>
          <Text style={styles.tipText}>
            • Stop if you feel pain or discomfort
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailsContainer: {
    paddingBottom: THEME.spacing.xl,
  },

  detailSection: {
    marginBottom: THEME.spacing.xl,
  },

  detailSectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.sm,
  },

  chip: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
  },

  primaryChip: {
    backgroundColor: THEME.colors.primary + "20",
  },

  primaryChipText: {
    color: THEME.colors.primary,
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  secondaryChip: {
    backgroundColor: THEME.colors.warning + "20",
  },

  secondaryChipText: {
    color: THEME.colors.warning,
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  equipmentChip: {
    backgroundColor: THEME.colors.info + "20",
  },

  equipmentChipText: {
    color: THEME.colors.info,
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  bodyPartChip: {
    backgroundColor: THEME.colors.success + "20",
  },

  bodyPartChipText: {
    color: THEME.colors.success,
    fontSize: THEME.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  tipContainer: {
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
  },

  tipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    lineHeight: 20,
    marginBottom: THEME.spacing.sm,
  },

  noDataContainer: {
    alignItems: "center",
    paddingVertical: THEME.spacing.xl,
  },

  noDataEmoji: {
    fontSize: 48,
    marginBottom: THEME.spacing.md,
  },

  noDataText: {
    fontSize: THEME.fontSize.md,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
  },
});
