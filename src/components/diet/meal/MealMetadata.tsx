import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { DayMeal } from "../../../types/ai";

interface MealMetadataProps {
  meal: DayMeal;
  prepTime: number;
  cookTime: number;
  totalTime: number;
}

export const MealMetadata: React.FC<MealMetadataProps> = ({
  meal,
  prepTime,
  cookTime,
  totalTime,
}) => {
  return (
    <View style={styles.metadataRow}>
      {/* Prep Time */}
      {prepTime > 0 && (
        <View style={styles.metadataItem}>
          <Ionicons
            name="hourglass-outline"
            size={rf(14)}
            color={colors.text.secondary}
          />
          <Text style={styles.metadataText}>Prep: {prepTime}m</Text>
        </View>
      )}
      {/* Cook Time */}
      {cookTime > 0 && (
        <>
          {prepTime > 0 && <View style={styles.metadataDot} />}
          <View style={styles.metadataItem}>
            <Ionicons
              name="flame-outline"
              size={rf(14)}
              color={colors.warning.DEFAULT}
            />
            <Text style={styles.metadataText}>Cook: {cookTime}m</Text>
          </View>
        </>
      )}
      {/* Total Time */}
      {totalTime > 0 && (
        <>
          <View style={styles.metadataDot} />
          <View style={styles.metadataItem}>
            <Ionicons
              name="time-outline"
              size={rf(14)}
              color={colors.primary[500]}
            />
            <Text style={[styles.metadataText, { color: colors.primary[500] }]}>
              Total: {totalTime}m
            </Text>
          </View>
        </>
      )}
      {/* Difficulty */}
      {meal.difficulty && (
        <>
          <View style={styles.metadataDot} />
          <View
            style={[
              styles.difficultyBadgeContainer,
              {
                backgroundColor:
                  meal.difficulty === "easy"
                    ? `${colors.success.DEFAULT}20`
                    : meal.difficulty === "medium"
                      ? `${colors.warning.DEFAULT}20`
                      : `${colors.error.DEFAULT}20`,
              },
            ]}
          >
            <Text
              style={[
                styles.difficultyBadge,
                {
                  color:
                    meal.difficulty === "easy"
                      ? colors.success.DEFAULT
                      : meal.difficulty === "medium"
                        ? colors.warning.DEFAULT
                        : colors.error.DEFAULT,
                },
              ]}
            >
              {meal.difficulty.charAt(0).toUpperCase() +
                meal.difficulty.slice(1)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metadataText: {
    fontSize: typography.fontSize.micro,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  metadataDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing.sm,
  },
  difficultyBadgeContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  difficultyBadge: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.semibold,
  },
});
