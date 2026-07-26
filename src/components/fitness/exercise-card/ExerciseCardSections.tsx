import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../../utils/responsive";
import { Exercise } from "../../../types/workout";

interface ExerciseCardSectionsProps {
  exercise: Exercise;
  getMuscleGroupColor: (group: string) => string;
}

/**
 * Compute WCAG relative luminance for a #RRGGBB hex color.
 * Used to pick a readable text color on tinted muscle-group chips.
 */
const relativeLuminance = (hex: string): number => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const channel = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** Pick black or white text for a given background hex (WCAG contrast). */
const readableTextColor = (bgHex: string): string => {
  // White background text threshold: luminance > 0.4 → use dark text.
  return relativeLuminance(bgHex) > 0.4 ? colors.black : colors.white;
};

export const ExerciseCardSections: React.FC<ExerciseCardSectionsProps> = ({
  exercise,
  getMuscleGroupColor,
}) => {
  const [expandedInstructions, setExpandedInstructions] = useState<
    Set<number>
  >(new Set());

  return (
    <>
      {/* Muscle Groups */}
      {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
        <View style={styles.muscleGroupsSection}>
          <Text style={styles.sectionTitle}>Target Muscles</Text>
          <View style={styles.muscleGroupsContainer}>
            {exercise.muscleGroups.map((group) => {
              const bg = getMuscleGroupColor(group);
              return (
                <View
                  key={`muscle-${group}`}
                  style={[styles.muscleGroupChip, { backgroundColor: bg }]}
                >
                  <Text
                    style={[
                      styles.muscleGroupText,
                      { color: readableTextColor(bg) },
                    ]}
                  >
                    {group.replace("_", " ")}
                  </Text>
                </View>
              );
            })}
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
          {exercise.instructions.map((instruction, index) => {
            const isExpanded = expandedInstructions.has(index);
            return (
              <View
                key={`instruction-${index}-${instruction.substring(0, 20)}`}
                style={styles.instructionItem}
              >
                <Text style={styles.instructionNumber}>{index + 1}.</Text>
                <View style={styles.instructionTextWrapper}>
                  <Text
                    style={styles.instructionText}
                    numberOfLines={isExpanded ? undefined : 5}
                  >
                    {instruction}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setExpandedInstructions((prev) => {
                        const next = new Set(prev);
                        if (next.has(index)) {
                          next.delete(index);
                        } else {
                          next.add(index);
                        }
                        return next;
                      })
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={isExpanded ? "Show less" : "Show more"}
                    style={styles.showMoreButton}
                  >
                    <Text style={styles.showMoreText}>
                      {isExpanded ? "Show less" : "Show more"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Tips */}
      {exercise.tips && exercise.tips.length > 0 && (
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Tips</Text>
          {exercise.tips.map((tip) => (
            <Text key={`tip-${tip.substring(0, 30)}`} style={styles.tipText}>
              - {tip}
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

  // Text color set inline via readableTextColor() per chip — some tints are
  // very light (e.g. triceps #FFEAA7 yellow) and fail contrast with white.
  muscleGroupText: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
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

  instructionTextWrapper: {
    flex: 1,
  },

  showMoreButton: {
    marginTop: rp(4),
    alignSelf: "flex-start",
  },

  showMoreText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
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
