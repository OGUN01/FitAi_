import React from "react";
import { View, Text, StyleSheet, DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
    fiber?: { current: number; target: number };
    sugar?: { current: number; target: number };
  };
}

export const NutritionSummaryCard: React.FC<NutritionSummaryCardProps> = React.memo(({
  nutritionTargets,
}) => {
  // When targets are all zero (incomplete profile), show zero targets with a notice
  // But only show the notice when there are also no consumed calories (truly empty profile)
  // If user has consumed food but targets=0, the problem is profile setup, not "estimated targets"
  const allTargetsZero =
    nutritionTargets.calories.target === 0 &&
    nutritionTargets.protein.target === 0 &&
    nutritionTargets.carbs.target === 0 &&
    nutritionTargets.fat.target === 0;
  const hasConsumedData = nutritionTargets.calories.current > 0;

  // No fabricated defaults — show actual targets or 0. The notice banner tells user to complete profile.
  const resolvedTargets = nutritionTargets;
  const showDefaultsNotice = allTargetsZero && !hasConsumedData;

  const OVERFLOW_COLOR = "#ef4444";
  const proteinOverflow = resolvedTargets.protein.target > 0 && resolvedTargets.protein.current > resolvedTargets.protein.target;
  const carbsOverflow = resolvedTargets.carbs.target > 0 && resolvedTargets.carbs.current > resolvedTargets.carbs.target;
  const fatOverflow = resolvedTargets.fat.target > 0 && resolvedTargets.fat.current > resolvedTargets.fat.target;
  const calorieOverflow = resolvedTargets.calories.target > 0 && resolvedTargets.calories.current > resolvedTargets.calories.target;
  const fiberOverflow = nutritionTargets.fiber && nutritionTargets.fiber.target > 0 && nutritionTargets.fiber.current > nutritionTargets.fiber.target;
  const sugarOverflow = nutritionTargets.sugar && nutritionTargets.sugar.target > 0 && nutritionTargets.sugar.current > nutritionTargets.sugar.target;
  return (
    <View style={styles.section}>
      {showDefaultsNotice && (
        <View style={styles.defaultsNotice}>
          <Ionicons
            name="document-text-outline"
            size={rf(12)}
            color={ResponsiveTheme.colors.warning}
          />
          <Text style={styles.defaultsNoticeText}>
            Complete your profile to see personalized nutrition targets
          </Text>
        </View>
      )}
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
      >
        <View style={styles.calorieOverviewCenter}>
          <LargeProgressRing
            progress={
              resolvedTargets.calories.target
                ? (resolvedTargets.calories.current /
                    resolvedTargets.calories.target) *
                  100
                : 0
            }
            gradient={true}
            gradientColors={calorieOverflow ? ["#ef4444", "#ef4444", "#ef4444"] : ["#FF6B6B", "#FF8E53", "#FFC107"]}
          >
            <View style={styles.calorieCenter}>
              <Text style={[styles.caloriesRemaining, calorieOverflow && { color: OVERFLOW_COLOR }]}>
                {resolvedTargets.calories.target
                  ? calorieOverflow
                    ? `+${Math.round(resolvedTargets.calories.current - resolvedTargets.calories.target)}`
                    : Math.max(
                        0,
                        resolvedTargets.calories.target -
                          resolvedTargets.calories.current,
                      )
                  : 0}
              </Text>
              <Text style={styles.caloriesLabel}>{calorieOverflow ? 'Over target' : 'Calories left'}</Text>
              <Text style={styles.caloriesTarget}>
                of {resolvedTargets.calories.target}
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
                <Text style={[styles.macroValue, proteinOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(resolvedTargets.protein.current)}g</Text>
                <Text style={styles.macroTarget}> / {resolvedTargets.protein.target}g</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: proteinOverflow ? OVERFLOW_COLOR : "#4A90D9",
                    width: `${Math.min(100, resolvedTargets.protein.target > 0 ? (resolvedTargets.protein.current / resolvedTargets.protein.target) * 100 : 0)}%` as DimensionValue,
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
                <Text style={[styles.macroValue, carbsOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(resolvedTargets.carbs.current)}g</Text>
                <Text style={styles.macroTarget}> / {resolvedTargets.carbs.target}g</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: carbsOverflow ? OVERFLOW_COLOR : "#F5A623",
                    width: `${Math.min(100, resolvedTargets.carbs.target > 0 ? (resolvedTargets.carbs.current / resolvedTargets.carbs.target) * 100 : 0)}%` as DimensionValue,
                  },
                ]}
              />
            </View>
          </View>
          {/* Fats */}
          <View style={styles.macroRow}>
            <View style={styles.macroRowHeader}>
              <View style={styles.macroLabelRow}>
                <View style={[styles.macroDot, { backgroundColor: "#2ECC71" }]} />
                <Text style={styles.macroLabel}>Fats</Text>
              </View>
              <Text style={styles.macroAmount}>
                <Text style={[styles.macroValue, fatOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(resolvedTargets.fat.current)}g</Text>
                <Text style={styles.macroTarget}> / {resolvedTargets.fat.target}g</Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: fatOverflow ? OVERFLOW_COLOR : "#2ECC71",
                    width: `${Math.min(100, resolvedTargets.fat.target > 0 ? (resolvedTargets.fat.current / resolvedTargets.fat.target) * 100 : 0)}%` as DimensionValue,
                  },
                ]}
              />
            </View>
          </View>
          {/* Fiber */}
          {nutritionTargets.fiber && (
            <View style={styles.macroRow}>
              <View style={styles.macroRowHeader}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroDot, { backgroundColor: "#9B59B6" }]} />
                  <Text style={styles.macroLabel}>Fiber</Text>
                </View>
                <Text style={styles.macroAmount}>
                  <Text style={[styles.macroValue, fiberOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(nutritionTargets.fiber.current)}g</Text>
                  <Text style={styles.macroTarget}> / {nutritionTargets.fiber.target}g</Text>
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: fiberOverflow ? OVERFLOW_COLOR : "#9B59B6",
                      width: `${Math.min(100, nutritionTargets.fiber.target > 0 ? (nutritionTargets.fiber.current / nutritionTargets.fiber.target) * 100 : 0)}%` as DimensionValue,
                    },
                  ]}
                />
              </View>
            </View>
          )}
          {/* Sugar */}
          {nutritionTargets.sugar && (
            <View style={styles.macroRow}>
              <View style={styles.macroRowHeader}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroDot, { backgroundColor: "#E74C3C" }]} />
                  <Text style={styles.macroLabel}>Sugar</Text>
                </View>
                <Text style={styles.macroAmount}>
                  <Text style={[styles.macroValue, sugarOverflow && { color: OVERFLOW_COLOR }]}>{Math.round(nutritionTargets.sugar.current)}g</Text>
                  <Text style={styles.macroTarget}> / {nutritionTargets.sugar.target}g</Text>
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: sugarOverflow ? OVERFLOW_COLOR : "#E74C3C",
                      width: `${Math.min(100, nutritionTargets.sugar.target > 0 ? (nutritionTargets.sugar.current / nutritionTargets.sugar.target) * 100 : 0)}%` as DimensionValue,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </GlassCard>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  defaultsNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    backgroundColor: `${ResponsiveTheme.colors.warning}18`,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.warning}30`,
  },
  defaultsNoticeText: {
    flex: 1,
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(14),
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
