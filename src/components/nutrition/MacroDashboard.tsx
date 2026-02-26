import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";
import { DayMeal } from "../../types/ai";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr } from "../../utils/responsive";

interface MacroDashboardProps {
  meal: DayMeal;
  style?: StyleProp<ViewStyle>;
  showTitle?: boolean;
  compact?: boolean;
  animated?: boolean;
  /** Daily targets from calculated metrics - NO HARDCODED DEFAULTS */
  dailyTargets?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
}

interface MacroItemProps {
  value: number;
  label: string;
  unit: string;
  color: string;
  percentage?: number;
  target?: number;
  compact?: boolean;
}

const MacroItem: React.FC<MacroItemProps> = ({
  value,
  label,
  unit,
  color,
  percentage,
  target,
  compact = false,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (percentage !== undefined) {
      Animated.timing(animatedValue, {
        toValue: percentage,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [percentage]);

  return (
    <View style={[styles.macroItem, compact && styles.macroItemCompact]}>
      {/* Progress Ring for percentage */}
      {percentage !== undefined && !compact && (
        <View style={styles.progressRingContainer}>
          <View
            style={[
              styles.progressRingBackground,
              { borderColor: color + "20" },
            ]}
          />
          <Animated.View
            style={[
              styles.progressRing,
              {
                borderColor: color,
                transform: [
                  {
                    rotate: animatedValue.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* Value and Label */}
      <View
        style={[styles.macroContent, compact && styles.macroContentCompact]}
      >
        <Text
          style={[
            styles.macroValue,
            compact && styles.macroValueCompact,
            { color },
          ]}
        >
          {Math.round(value)}
        </Text>
        <Text style={[styles.macroUnit, compact && styles.macroUnitCompact]}>
          {unit}
        </Text>
        <Text style={[styles.macroLabel, compact && styles.macroLabelCompact]}>
          {label}
        </Text>

        {/* Target comparison */}
        {target && !compact && (
          <Text style={styles.macroTarget}>
            / {Math.round(target)} {unit}
          </Text>
        )}

        {/* Percentage */}
        {percentage !== undefined && !compact && (
          <Text style={[styles.macroPercentage, { color }]}>
            {Math.round(percentage)}%
          </Text>
        )}
      </View>
    </View>
  );
};

export const MacroDashboard: React.FC<MacroDashboardProps> = ({
  meal,
  style,
  showTitle = true,
  compact = false,
  animated = true,
  dailyTargets, // CRITICAL: Should be passed from parent using useCalculatedMetrics
}) => {
  // Calculate percentages of daily targets (only if targets are provided)
  const calculatePercentage = (
    value: number,
    target: number | null,
  ): number | undefined => {
    if (!target || target === 0) return undefined;
    return Math.min((value / target) * 100, 100);
  };

  const macroData = [
    {
      value: meal.totalCalories || 0,
      label: "Calories",
      unit: "cal",
      color: ResponsiveTheme.colors.errorLight,
      target: dailyTargets?.calories ?? undefined,
      percentage: calculatePercentage(
        meal.totalCalories || 0,
        dailyTargets?.calories ?? null,
      ),
    },
    {
      value: meal.totalMacros?.protein || 0,
      label: "Protein",
      unit: "g",
      color: ResponsiveTheme.colors.teal,
      target: dailyTargets?.protein ?? undefined,
      percentage: calculatePercentage(
        meal.totalMacros?.protein || 0,
        dailyTargets?.protein ?? null,
      ),
    },
    {
      value: meal.totalMacros?.carbohydrates || 0,
      label: "Carbs",
      unit: "g",
      color: "#45B7D1",
      target: dailyTargets?.carbs ?? undefined,
      percentage: calculatePercentage(
        meal.totalMacros?.carbohydrates || 0,
        dailyTargets?.carbs ?? null,
      ),
    },
    {
      value: meal.totalMacros?.fat || 0,
      label: "Fat",
      unit: "g",
      color: "#96CEB4",
      target: dailyTargets?.fat ?? undefined,
      percentage: calculatePercentage(
        meal.totalMacros?.fat || 0,
        dailyTargets?.fat ?? null,
      ),
    },
  ];

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      {showTitle && !compact && (
        <Text style={styles.title}>Nutrition Facts</Text>
      )}

      <View style={[styles.macroGrid, compact && styles.macroGridCompact]}>
        {macroData.map((macro, index) => (
          <MacroItem
            key={macro.label}
            value={macro.value}
            label={macro.label}
            unit={macro.unit}
            color={macro.color}
            target={animated ? macro.target : undefined}
            percentage={animated ? macro.percentage : undefined}
            compact={compact}
          />
        ))}
      </View>

      {/* Additional nutrition info for non-compact mode */}
      {!compact && meal.totalMacros?.fiber && (
        <View style={styles.additionalInfo}>
          <View style={styles.fiberInfo}>
            <Text style={styles.fiberLabel}>Fiber</Text>
            <Text style={styles.fiberValue}>
              {Math.round(meal.totalMacros.fiber)}g
            </Text>
          </View>

          {/* Caloric breakdown */}
          <View style={styles.caloricBreakdown}>
            <Text style={styles.breakdownTitle}>Caloric Breakdown</Text>
            <View style={styles.breakdownBars}>
              <View style={styles.breakdownItem}>
                <View
                  style={[
                    styles.breakdownBar,
                    {
                      backgroundColor: ResponsiveTheme.colors.teal,
                      flex:
                        (meal.totalMacros.protein * 4) /
                        (meal.totalCalories || 1),
                    },
                  ]}
                />
                <Text style={styles.breakdownLabel}>Protein</Text>
              </View>
              <View style={styles.breakdownItem}>
                <View
                  style={[
                    styles.breakdownBar,
                    {
                      backgroundColor: "#45B7D1",
                      flex:
                        (meal.totalMacros.carbohydrates * 4) /
                        (meal.totalCalories || 1),
                    },
                  ]}
                />
                <Text style={styles.breakdownLabel}>Carbs</Text>
              </View>
              <View style={styles.breakdownItem}>
                <View
                  style={[
                    styles.breakdownBar,
                    {
                      backgroundColor: "#96CEB4",
                      flex:
                        (meal.totalMacros.fat * 9) / (meal.totalCalories || 1),
                    },
                  ]}
                />
                <Text style={styles.breakdownLabel}>Fat</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: ResponsiveTheme.spacing.lg,
    marginVertical: ResponsiveTheme.spacing.md,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  containerCompact: {
    padding: ResponsiveTheme.spacing.md,
    marginVertical: ResponsiveTheme.spacing.sm,
    borderRadius: rbr(12),
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroGridCompact: {
    gap: ResponsiveTheme.spacing.sm,
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  macroItemCompact: {
    flex: 0,
    minWidth: 60,
  },
  progressRingContainer: {
    width: rp(60),
    height: rp(60),
    marginBottom: ResponsiveTheme.spacing.sm,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  progressRingBackground: {
    position: "absolute",
    width: rp(60),
    height: rp(60),
    borderRadius: rbr(30),
    borderWidth: 6,
  },
  progressRing: {
    width: rp(60),
    height: rp(60),
    borderRadius: rbr(30),
    borderWidth: 6,
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  macroContent: {
    alignItems: "center",
  },
  macroContentCompact: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    lineHeight: 24,
  },
  macroValueCompact: {
    fontSize: ResponsiveTheme.fontSize.lg,
    lineHeight: 20,
  },
  macroUnit: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(-2),
  },
  macroUnitCompact: {
    fontSize: rf(10),
  },
  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: "600",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  macroLabelCompact: {
    fontSize: ResponsiveTheme.fontSize.xs,
    marginTop: rp(2),
  },
  macroTarget: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  macroPercentage: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
    marginTop: rp(2),
  },
  additionalInfo: {
    marginTop: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  fiberInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  fiberLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: "500",
  },
  fiberValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.accent,
    fontWeight: "700",
  },
  caloricBreakdown: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  breakdownTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: "600",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  breakdownBars: {
    flexDirection: "row",
    height: rp(8),
    borderRadius: rbr(4),
    overflow: "hidden",
    backgroundColor: ResponsiveTheme.colors.background,
  },
  breakdownItem: {
    justifyContent: "center",
  },
  breakdownBar: {
    height: rp(8),
  },
  breakdownLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: ResponsiveTheme.spacing.xs,
  },
});

export default MacroDashboard;
