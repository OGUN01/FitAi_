import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassCard } from "../ui/aurora/GlassCard";
import { LargeProgressRing } from "../ui/aurora/ProgressRing";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rbr } from "../../utils/responsive";

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
  // Detect when ALL targets are 0 — show friendly empty state
  const allTargetsZero =
    nutritionTargets.calories.target === 0 &&
    nutritionTargets.protein.target === 0 &&
    nutritionTargets.carbs.target === 0 &&
    nutritionTargets.fat.target === 0;

  if (allTargetsZero) {
    return (
      <View style={styles.section}>
        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="lg"
          borderRadius="lg"
        >
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>🍎</Text>
            <Text style={styles.emptyStateTitle}>
              Complete your body measurements for personalized nutrition targets
            </Text>
            <Text style={styles.emptyStateAction}>Update Profile</Text>
          </View>
        </GlassCard>
      </View>
    );
  }

  const OVERFLOW_COLOR = "#ef4444";
  const proteinOverflow = nutritionTargets.protein.target > 0 && nutritionTargets.protein.current > nutritionTargets.protein.target;
  const carbsOverflow = nutritionTargets.carbs.target > 0 && nutritionTargets.carbs.current > nutritionTargets.carbs.target;
  const fatOverflow = nutritionTargets.fat.target > 0 && nutritionTargets.fat.current > nutritionTargets.fat.target;
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
        <View style={styles.macroList}>
          {/* Protein */}
          <View style={styles.macroRow}>
            <View style={styles.macroRowHeader}>
              <View style={styles.macroLabelRow}>
                <View style={[styles.macroDot, { backgroundColor: "#4A90D9" }]} />
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <Text style={styles.macroAmount}>
                <Text style={[styles.macroValue, proteinOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(nutritionTargets.protein.current)}g</Text>
                <Text style={styles.macroTarget}> / {nutritionTargets.protein.target}g</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: proteinOverflow ? OVERFLOW_COLOR : "#4A90D9",
                    width: `${Math.min(100, nutritionTargets.protein.target > 0 ? (nutritionTargets.protein.current / nutritionTargets.protein.target) * 100 : 0)}%` as any,
                  },
                ]}
              />
            </View>
          </View>
          {/* Carbs */}
          <View style={styles.macroRow}>
            <View style={styles.macroRowHeader}>
              <View style={styles.macroLabelRow}>
                <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <Text style={styles.macroAmount}>
                <Text style={[styles.macroValue, carbsOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(nutritionTargets.carbs.current)}g</Text>
                <Text style={styles.macroTarget}> / {nutritionTargets.carbs.target}g</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: carbsOverflow ? OVERFLOW_COLOR : "#F5A623",
                    width: `${Math.min(100, nutritionTargets.carbs.target > 0 ? (nutritionTargets.carbs.current / nutritionTargets.carbs.target) * 100 : 0)}%` as any,
                  },
                ]}
              />
            </View>
          </View>
          {/* Fats */}
          <View style={styles.macroRow}>
            <View style={styles.macroRowHeader}>
              <View style={styles.macroLabelRow}>
                <View style={[styles.macroDot, { backgroundColor: "#F8C84B" }]} />
                <Text style={styles.macroLabel}>Fats</Text>
              </View>
              <Text style={styles.macroAmount}>
                <Text style={[styles.macroValue, fatOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(nutritionTargets.fat.current)}g</Text>
                <Text style={styles.macroTarget}> / {nutritionTargets.fat.target}g</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: fatOverflow ? OVERFLOW_COLOR : "#F8C84B",
                    width: `${Math.min(100, nutritionTargets.fat.target > 0 ? (nutritionTargets.fat.current / nutritionTargets.fat.target) * 100 : 0)}%` as any,
                  },
                ]}
              />
            </View>
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
  macroList: {
    marginTop: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    gap: ResponsiveTheme.spacing.md,
  },
  macroRow: {
    gap: ResponsiveTheme.spacing.xs,
  },
  macroRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  macroDot: {
    width: rw(8),
    height: rh(8),
    borderRadius: rbr(4),
  },
  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  macroAmount: {
    fontSize: ResponsiveTheme.fontSize.sm,
  },
  macroValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  macroTarget: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
  progressTrack: {
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.border,
    borderRadius: rbr(3),
    overflow: "hidden",
    minWidth: rw(4),
  },
  progressFill: {
    height: rh(6),
    borderRadius: rbr(3),
    minWidth: rw(4),
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rh(4),
    paddingHorizontal: rw(4),
  },
  emptyStateIcon: {
    fontSize: rf(32),
    marginBottom: rh(1.5),
  },
  emptyStateTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: rh(1.5),
  },
  emptyStateAction: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.primary,
  },
});
