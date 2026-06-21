import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { ExerciseTipsCard } from "./ExerciseTipsCard";

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
        <Text style={styles.noDataEmoji}>?</Text>
        <Text style={styles.noDataText}>No exercise details available</Text>
      </View>
    );
  }

  return (
    <View style={styles.detailsContainer}>
      {exercise.targetMuscles.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Primary Muscles</Text>
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

      {exercise.secondaryMuscles?.length &&
        exercise.secondaryMuscles.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Secondary Muscles</Text>
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

      {exercise.equipments.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Equipment Needed</Text>
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

      {exercise.bodyParts.length > 0 && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Body Parts</Text>
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

      {/* Exercise Tips — shared component (de-duplicated from ExerciseInstructionModal) */}
      <ExerciseTipsCard />
    </View>
  );
};

const styles = StyleSheet.create({
  detailsContainer: {
    paddingBottom: spacing.xl,
  },

  detailSection: {
    marginBottom: spacing.xl,
  },

  detailSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },

  primaryChip: {
    backgroundColor: colors.primary + "20",
  },

  primaryChipText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  secondaryChip: {
    backgroundColor: colors.warning + "20",
  },

  secondaryChipText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  equipmentChip: {
    backgroundColor: colors.info + "20",
  },

  equipmentChipText: {
    color: colors.info,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  bodyPartChip: {
    backgroundColor: colors.success + "20",
  },

  bodyPartChipText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  tipContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },

  tipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: rf(20),
    marginBottom: spacing.sm,
  },

  noDataContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  noDataEmoji: {
    fontSize: rf(48),
    marginBottom: spacing.md,
  },

  noDataText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
