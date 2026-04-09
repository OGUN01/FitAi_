import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

/** Locally-defined type — original module `useAIMealsPanel` was removed. */
interface QuickActionOption {
  emoji: string;
  title: string;
  description: string;
}

interface QuickActionCardProps {
  action: QuickActionOption;
  isGenerating: boolean;
  onPress: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  action,
  isGenerating,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={onPress}
      disabled={isGenerating}
    >
      <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
      <Text style={styles.quickActionTitle}>{action.title}</Text>
      <Text style={styles.quickActionDescription}>{action.description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  quickActionCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: ResponsiveTheme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  quickActionEmoji: {
    fontSize: rf(24),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  quickActionTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  quickActionDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(14),
  },
});
