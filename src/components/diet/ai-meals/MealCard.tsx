import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from "../../../theme/aurora-tokens";
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
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  mealCardDisabled: {
    opacity: 0.6,
  },

  mealCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
  },

  mealEmoji: {
    width: rw(48),
    height: rh(48),
    borderRadius: rs(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },

  mealEmojiText: {
    fontSize: rf(20),
  },

  mealInfo: {
    flex: 1,
  },

  mealTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  mealDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: rf(16),
  },

  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  mealTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  mealSuggestions: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },

  generateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    minWidth: rw(70),
  },

  generateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
