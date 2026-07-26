import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";

interface CompletedViewProps {
  totalCards: number;
}

export const CompletedView: React.FC<CompletedViewProps> = ({ totalCards }) => {
  return (
    <View style={styles.completedContainer}>
      <View style={styles.completedIconWrap}>
        <Ionicons name="checkmark-circle" size={rf(64)} color={colors.success} />
      </View>
      <Text style={styles.completedText}>All cards reviewed!</Text>
      <Text style={styles.completedSubtext}>
        You've gone through all {totalCards} options
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  completedContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },

  completedIconWrap: {
    marginBottom: spacing.md,
  },

  completedText: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  completedSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
