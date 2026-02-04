import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { MiniProgressRing } from "../../ui/aurora/ProgressRing";
import { macroColors } from "../../../hooks/useMealCard";
import { DayMeal } from "../../../types/ai";

interface MacroRingsProps {
  meal: DayMeal;
  macroPercentages: {
    protein: number;
    carbs: number;
    fat: number;
  };
  fiber: number;
}

export const MacroRings: React.FC<MacroRingsProps> = ({
  meal,
  macroPercentages,
  fiber,
}) => {
  return (
    <View style={styles.macroRingsContainer}>
      {/* Protein Ring */}
      <View style={styles.macroRingItem}>
        <MiniProgressRing
          progress={macroPercentages.protein}
          color={macroColors.protein}
          backgroundColor={`${macroColors.protein}20`}
          showText={false}
          animated={true}
        />
        <Text style={styles.macroValue}>
          {Math.round(meal.totalMacros?.protein || 0)}g
        </Text>
        <Text style={[styles.macroLabel, { color: macroColors.protein }]}>
          Protein
        </Text>
      </View>

      {/* Carbs Ring */}
      <View style={styles.macroRingItem}>
        <MiniProgressRing
          progress={macroPercentages.carbs}
          color={macroColors.carbs}
          backgroundColor={`${macroColors.carbs}20`}
          showText={false}
          animated={true}
        />
        <Text style={styles.macroValue}>
          {Math.round(meal.totalMacros?.carbohydrates || 0)}g
        </Text>
        <Text style={[styles.macroLabel, { color: macroColors.carbs }]}>
          Carbs
        </Text>
      </View>

      {/* Fat Ring */}
      <View style={styles.macroRingItem}>
        <MiniProgressRing
          progress={macroPercentages.fat}
          color={macroColors.fat}
          backgroundColor={`${macroColors.fat}20`}
          showText={false}
          animated={true}
        />
        <Text style={styles.macroValue}>
          {Math.round(meal.totalMacros?.fat || 0)}g
        </Text>
        <Text style={[styles.macroLabel, { color: macroColors.fat }]}>Fat</Text>
      </View>

      {/* Fiber (no ring, just value) */}
      {fiber > 0 && (
        <View style={styles.macroRingItem}>
          <View style={styles.fiberCircle}>
            <Ionicons
              name="leaf"
              size={rf(16)}
              color={colors.success.DEFAULT}
            />
          </View>
          <Text style={styles.macroValue}>{Math.round(fiber)}g</Text>
          <Text style={[styles.macroLabel, { color: colors.success.DEFAULT }]}>
            Fiber
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  macroRingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  macroRingItem: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  macroLabel: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.medium,
    marginTop: 2,
  },
  fiberCircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: `${colors.success.DEFAULT}20`,
    justifyContent: "center",
    alignItems: "center",
  },
});
