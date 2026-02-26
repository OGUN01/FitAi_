import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
        <Text style={styles.noDataEmoji}>📝</Text>
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
    paddingBottom: ResponsiveTheme.spacing.xl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: ResponsiveTheme.spacing.md,
    alignItems: "flex-start",
  },

  stepNumber: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(14),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
    marginTop: rp(2),
  },

  stepNumberText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.surface,
  },

  instructionText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(22),
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

  noDataSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
});
