import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

interface CompletedViewProps {
  totalCards: number;
}

export const CompletedView: React.FC<CompletedViewProps> = ({ totalCards }) => {
  return (
    <View style={styles.completedContainer}>
      <Text style={styles.completedIcon}>✅</Text>
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
    padding: ResponsiveTheme.spacing.xl,
  },

  completedIcon: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  completedText: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  completedSubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
