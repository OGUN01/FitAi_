import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rh, rw, rs } from "../../../utils/responsive";

/** Locally-defined type — original module `useAIMealsPanel` was removed. */
interface MealGenerationOption {
  emoji: string;
  color: string;
  title: string;
  description: string;
  estimatedTime: string;
  suggestions: string[];
}

interface MealCardProps {
  option: MealGenerationOption;
  isGenerating: boolean;
  onPress: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({
  option,
  isGenerating,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.mealCard, isGenerating && styles.mealCardDisabled]}
      onPress={onPress}
      disabled={isGenerating}
    >
      <View style={styles.mealCardContent}>
        <View
          style={[styles.mealEmoji, { backgroundColor: option.color + "20" }]}
        >
          <Text style={styles.mealEmojiText}>{option.emoji}</Text>
        </View>

        <View style={styles.mealInfo}>
          <Text style={styles.mealTitle}>{option.title}</Text>
          <Text style={styles.mealDescription}>{option.description}</Text>

          <View style={styles.mealMeta}>
            <Text style={styles.mealTime}>⏱️ {option.estimatedTime}</Text>
            <Text style={styles.mealSuggestions}>
              {option.suggestions.slice(0, 2).join(" • ")}
            </Text>
          </View>
        </View>

        <View style={styles.generateButton}>
          {isGenerating ? (
            <ActivityIndicator size="small" color={option.color} />
          ) : (
            <Text style={[styles.generateButtonText, { color: option.color }]}>
              Generate
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  mealCard: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  mealCardDisabled: {
    opacity: 0.6,
  },

  mealCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.lg,
  },

  mealEmoji: {
    width: rw(48),
    height: rh(48),
    borderRadius: rs(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },

  mealEmojiText: {
    fontSize: rf(20),
  },

  mealInfo: {
    flex: 1,
  },

  mealTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  mealDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: rf(16),
  },

  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
  },

  mealTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  mealSuggestions: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    flex: 1,
  },

  generateButton: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    minWidth: rw(70),
  },

  generateButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
});
