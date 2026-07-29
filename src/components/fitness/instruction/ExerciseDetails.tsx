import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { rf } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";
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
    // 0.3 alpha bg + primaryLight text was ~2:1 contrast on dark surfaces.
    // Use 0.12 alpha + DEFAULT text (mirrors ExerciseInstructionModal chips).
    backgroundColor: hexToRgba(colors.primary, 0.12),
  },

  primaryChipText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  secondaryChip: {
    backgroundColor: hexToRgba(colors.warningAlt, 0.12),
  },

  secondaryChipText: {
    color: colors.warningAlt,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  equipmentChip: {
    backgroundColor: hexToRgba(colors.info, 0.12),
  },

  equipmentChipText: {
    color: colors.info,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  bodyPartChip: {
    backgroundColor: hexToRgba(colors.success, 0.12),
  },

  bodyPartChipText: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  noDataContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  noDataText: {
    fontSize: fontSize.md,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
