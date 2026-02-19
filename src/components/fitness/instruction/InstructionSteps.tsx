import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

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
    paddingBottom: THEME.spacing.xl,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.lg,
  },

  instructionItem: {
    flexDirection: "row",
    marginBottom: THEME.spacing.md,
    alignItems: "flex-start",
  },

  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: THEME.spacing.md,
    marginTop: 2,
  },

  stepNumberText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: "bold",
    color: THEME.colors.surface,
  },

  instructionText: {
    flex: 1,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    lineHeight: 22,
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

  noDataSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: "center",
  },
});
