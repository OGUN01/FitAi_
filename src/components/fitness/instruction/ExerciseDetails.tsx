import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
      <View style={styles.noDataContainer} accessibilityRole="text">
        <Ionicons name="help-circle-outline" size={rf(48)} color={colors.textTertiary} />
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

      {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
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
    backgroundColor: "rgba(255, 107, 53, 0.2)",
  },

  primaryChipText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  secondaryChip: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },

  secondaryChipText: {
    color: colors.warningAlt,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  equipmentChip: {
    backgroundColor: "rgba(33, 150, 243, 0.2)",
  },

  equipmentChipText: {
    color: colors.info,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  bodyPartChip: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
  },

  bodyPartChipText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  noDataContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  noDataText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
