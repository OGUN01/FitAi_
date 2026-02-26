import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

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
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  detailSection: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  detailSectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },

  chip: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  primaryChip: {
    backgroundColor: ResponsiveTheme.colors.primary + "20",
  },

  primaryChipText: {
    color: ResponsiveTheme.colors.primary,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  secondaryChip: {
    backgroundColor: ResponsiveTheme.colors.warning + "20",
  },

  secondaryChipText: {
    color: ResponsiveTheme.colors.warning,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  equipmentChip: {
    backgroundColor: ResponsiveTheme.colors.info + "20",
  },

  equipmentChipText: {
    color: ResponsiveTheme.colors.info,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  bodyPartChip: {
    backgroundColor: ResponsiveTheme.colors.success + "20",
  },

  bodyPartChipText: {
    color: ResponsiveTheme.colors.success,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  tipContainer: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },

  tipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  noDataContainer: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  noDataEmoji: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  noDataText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
});
