import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

interface MealActionsProps {
  onStartMeal?: () => void;
  onCompleteMeal?: () => void;
  isCompleted: boolean;
  isInProgress: boolean;
  progress: number;
  mealConfig: { colors: readonly [string, string, ...string[]]; icon: string };
  onStartPress: () => void;
  onCompletePress: () => void;
}

export const MealActions: React.FC<MealActionsProps> = ({
  onStartMeal,
  onCompleteMeal,
  isCompleted,
  isInProgress,
  progress,
  mealConfig,
  onStartPress,
  onCompletePress,
}) => {
  return (
    <View style={styles.actionButtonsRow}>
      {/* Start/Continue Button */}
      {onStartMeal && !isCompleted && (
        <Pressable
          style={[styles.actionButton, styles.actionButtonFlex]}
          onPress={onStartPress}
        >
          <LinearGradient
            colors={mealConfig.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="play" size={rf(18)} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>
              {isInProgress
                ? `Continue (${Math.round(progress)}%)`
                : "Start Meal"}
            </Text>
          </LinearGradient>
        </Pressable>
      )}

      {/* Complete/Completed Button */}
      {onCompleteMeal && (
        <Pressable
          style={[
            styles.actionButton,
            !onStartMeal || isCompleted
              ? styles.actionButtonFlex
              : styles.completeButton,
            isCompleted && styles.actionButtonCompleted,
          ]}
          onPress={onCompletePress}
          disabled={isCompleted}
        >
          <LinearGradient
            colors={
              isCompleted
                ? ([colors.success.DEFAULT, colors.success.light] as const)
                : ([ResponsiveTheme.colors.successAlt, ResponsiveTheme.colors.successAltDark] as const)
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons
              name={isCompleted ? "checkmark-circle" : "checkbox-outline"}
              size={rf(18)}
              color={colors.text.primary}
            />
            <Text style={styles.actionButtonText}>
              {isCompleted ? "Completed" : "Mark Complete"}
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actionButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  actionButtonFlex: {
    flex: 1,
  },
  completeButton: {
    minWidth: rw(140),
  },
  actionButtonCompleted: {
    opacity: 0.9,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionButtonText: {
    fontSize: typography.fontSize.body,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
});
