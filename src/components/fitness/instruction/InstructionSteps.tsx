import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rp, rbr, rs } from "../../../utils/responsive";

interface InstructionStepsProps {
  instructions?: string[];
}

export const InstructionSteps: React.FC<InstructionStepsProps> = ({
  instructions,
}) => {
  if (!instructions?.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataEmoji}>i</Text>
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
      {instructions.map((instruction, index) => (
        <View
          key={`step-${index}-${instruction.substring(0, 20)}`}
          style={styles.instructionItem}
        >
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.instructionText}>
            {instruction.replace(/^Step:\d+\s*/, "")}
          </Text>
        </View>
      ))}
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
    color: colors.surface,
  },

  instructionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: rf(22),
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

  noDataSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
