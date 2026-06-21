import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from "../../../theme/aurora-tokens";
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
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  quickActionEmoji: {
    fontSize: rf(24),
    marginBottom: spacing.xs,
  },

  quickActionTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  quickActionDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(14),
  },
});
