import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { rf, rp, rbr, rs } from "../../../utils/responsive";

interface InstructionStepsProps {
  instructions?: string[];
}

/**
 * Strip a leading "Step:N" prefix if present. The previous strip regex only
 * matched the literal format "Step:1 " — most stored instructions use "1. "
 * or "Step 1: " formats. Handle both, and pass everything else through
 * unchanged.
 */
const stripStepPrefix = (instruction: string): string => {
  // "Step:1 ..." or "Step:12 ..."
  let s = instruction.replace(/^Step:\d+\s*/, "");
  if (s !== instruction) return s;
  // "Step 1: ..." or "Step 12: ..."
  s = instruction.replace(/^Step\s+\d+:\s*/i, "");
  if (s !== instruction) return s;
  // "1. ..." leading numeric prefix
  s = instruction.replace(/^\d+\.\s*/, "");
  return s;
};

export const InstructionSteps: React.FC<InstructionStepsProps> = ({
  instructions,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  if (!instructions?.length) {
    return (
      <View style={styles.noDataContainer} accessibilityRole="text">
        <Ionicons name="information-circle-outline" size={rf(48)} color={colors.textTertiary} />
        <Text style={styles.noDataText}>
          No detailed instructions available
        </Text>
        <Text style={styles.noDataSubtext}>
          Follow the general form shown in the demonstration above
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.instructionsContainer}>
      <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
      {instructions.map((instruction, index) => {
        const isExpanded = expandedSteps.has(index);
        return (
          <View
            key={`step-${index}-${instruction.substring(0, 20)}`}
            style={styles.instructionItem}
          >
            <View style={styles.stepNumber} accessibilityRole="text">
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.instructionTextWrapper}>
              <Text
                style={styles.instructionText}
                numberOfLines={isExpanded ? undefined : 5}
              >
                {stripStepPrefix(instruction)}
              </Text>
              <Pressable
                onPress={() =>
                  setExpandedSteps((prev) => {
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
  );
};

const styles = StyleSheet.create({
  instructionsContainer: {
    paddingBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: spacing.md,
    alignItems: "flex-start",
  },

  stepNumber: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(14),
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    marginTop: rp(2),
  },

  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: "bold",
    color: colors.white,
  },

  instructionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: rf(22),
  },

  instructionTextWrapper: {
    flex: 1,
  },

  showMoreButton: {
    marginTop: rp(spacing.xs),
    alignSelf: "flex-start",
  },

  showMoreText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
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

  noDataSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
