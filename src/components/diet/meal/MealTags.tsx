import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { DayMeal } from "../../../types/ai";
import { rp } from "../../../utils/responsive";

interface MealTagsProps {
  meal: DayMeal;
}

export const MealTags: React.FC<MealTagsProps> = ({ meal }) => {
  if (!meal.tags || meal.tags.length === 0) {
    return null;
  }

  const tagsToRender = meal.tags
    .filter(
      (tag) =>
        !["breakfast", "lunch", "dinner", "snack", "ai-generated"].includes(
          tag.toLowerCase(),
        ),
    )
    .slice(0, 4);

  if (tagsToRender.length === 0) {
    return null;
  }

  return (
    <View style={styles.tagsRow}>
      {tagsToRender.map((tag, index) => (
        <View key={`tag-${index}`} style={styles.tagChip}>
          <Text style={styles.tagText}>
            {tag
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tagChip: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(4),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  tagText: {
    fontSize: typography.fontSize.micro,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
});
