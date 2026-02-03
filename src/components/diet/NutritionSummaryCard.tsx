import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { LargeProgressRing } from "../ui/aurora/ProgressRing";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw } from "../../utils/responsive";

interface NutritionSummaryCardProps {
  nutritionTargets: {
    calories: { current: number; target: number };
    protein: { current: number; target: number };
    carbs: { current: number; target: number };
    fat: { current: number; target: number };
  };
}

export const NutritionSummaryCard: React.FC<NutritionSummaryCardProps> = ({
  nutritionTargets,
}) => {
  return (
    <View style={styles.section}>
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
      >
        <View style={styles.calorieOverviewCenter}>
          <LargeProgressRing
            progress={
              nutritionTargets.calories.target
                ? (nutritionTargets.calories.current /
                    nutritionTargets.calories.target) *
                  100
                : 0
            }
            gradient={true}
            gradientColors={["#FF6B6B", "#FF8E53", "#FFC107"]}
          >
            <View style={styles.calorieCenter}>
              <Text style={styles.caloriesRemaining}>
                {nutritionTargets.calories.target
                  ? Math.max(
                      0,
                      nutritionTargets.calories.target -
                        nutritionTargets.calories.current,
                    )
                  : 0}
              </Text>
              <Text style={styles.caloriesLabel}>Calories left</Text>
              <Text style={styles.caloriesTarget}>
                of {nutritionTargets.calories.target}
              </Text>
            </View>
          </LargeProgressRing>
        </View>
        <View style={styles.macroGrid}>
          <View style={styles.macroStat}>
            <Text style={styles.macroValue}>
              {Math.round(nutritionTargets.protein.current)}g
            </Text>
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroTarget}>
              / {nutritionTargets.protein.target}g
            </Text>
          </View>
          <View style={styles.macroStat}>
            <Text style={styles.macroValue}>
              {Math.round(nutritionTargets.carbs.current)}g
            </Text>
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroTarget}>
              / {nutritionTargets.carbs.target}g
            </Text>
          </View>
          <View style={styles.macroStat}>
            <Text style={styles.macroValue}>
              {Math.round(nutritionTargets.fat.current)}g
            </Text>
            <Text style={styles.macroLabel}>Fats</Text>
            <Text style={styles.macroTarget}>
              / {nutritionTargets.fat.target}g
            </Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  calorieOverviewCenter: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  calorieCenter: { alignItems: "center", justifyContent: "center" },
  caloriesRemaining: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  caloriesLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  caloriesTarget: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    opacity: 0.5,
  },
  macroStat: { alignItems: "center" },
  macroValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  macroTarget: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.xs,
  },
});
