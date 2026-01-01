import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { DayMeal } from '../../types/ai';
import { THEME } from '../ui';

interface MacroDashboardProps {
  meal: DayMeal;
  style?: any;
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
  compact = false
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
          <View style={[styles.progressRingBackground, { borderColor: color + '20' }]} />
          <Animated.View
            style={[
              styles.progressRing,
              {
                borderColor: color,
                transform: [
                  {
                    rotate: animatedValue.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* Value and Label */}
      <View style={[styles.macroContent, compact && styles.macroContentCompact]}>
        <Text style={[styles.macroValue, compact && styles.macroValueCompact, { color }]}>
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
  const calculatePercentage = (value: number, target: number | null): number | undefined => {
    if (!target || target === 0) return undefined;
    return Math.min((value / target) * 100, 100);
  };

  const macroData = [
    {
      value: meal.totalCalories || 0,
      label: 'Calories',
      unit: 'cal',
      color: '#FF6B6B',
      target: dailyTargets?.calories ?? undefined,
      percentage: calculatePercentage(meal.totalCalories || 0, dailyTargets?.calories ?? null),
    },
    {
      value: meal.totalMacros?.protein || 0,
      label: 'Protein',
      unit: 'g',
      color: '#4ECDC4',
      target: dailyTargets?.protein ?? undefined,
      percentage: calculatePercentage(meal.totalMacros?.protein || 0, dailyTargets?.protein ?? null),
    },
    {
      value: meal.totalMacros?.carbohydrates || 0,
      label: 'Carbs',
      unit: 'g',
      color: '#45B7D1',
      target: dailyTargets?.carbs ?? undefined,
      percentage: calculatePercentage(meal.totalMacros?.carbohydrates || 0, dailyTargets?.carbs ?? null),
    },
    {
      value: meal.totalMacros?.fat || 0,
      label: 'Fat',
      unit: 'g',
      color: '#96CEB4',
      target: dailyTargets?.fat ?? undefined,
      percentage: calculatePercentage(meal.totalMacros?.fat || 0, dailyTargets?.fat ?? null),
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
                      backgroundColor: '#4ECDC4',
                      flex: (meal.totalMacros.protein * 4) / (meal.totalCalories || 1) 
                    }
                  ]} 
                />
                <Text style={styles.breakdownLabel}>Protein</Text>
              </View>
              <View style={styles.breakdownItem}>
                <View 
                  style={[
                    styles.breakdownBar, 
                    { 
                      backgroundColor: '#45B7D1',
                      flex: (meal.totalMacros.carbohydrates * 4) / (meal.totalCalories || 1) 
                    }
                  ]} 
                />
                <Text style={styles.breakdownLabel}>Carbs</Text>
              </View>
              <View style={styles.breakdownItem}>
                <View 
                  style={[
                    styles.breakdownBar, 
                    { 
                      backgroundColor: '#96CEB4',
                      flex: (meal.totalMacros.fat * 9) / (meal.totalCalories || 1) 
                    }
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
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: THEME.spacing.lg,
    marginVertical: THEME.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  containerCompact: {
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
    borderRadius: 12,
  },
  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroGridCompact: {
    gap: THEME.spacing.sm,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  macroItemCompact: {
    flex: 0,
    minWidth: 60,
  },
  progressRingContainer: {
    width: 60,
    height: 60,
    marginBottom: THEME.spacing.sm,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingBackground: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 6,
  },
  progressRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 6,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  macroContent: {
    alignItems: 'center',
  },
  macroContentCompact: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: '700',
    lineHeight: 24,
  },
  macroValueCompact: {
    fontSize: THEME.fontSize.lg,
    lineHeight: 20,
  },
  macroUnit: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: -2,
  },
  macroUnitCompact: {
    fontSize: 10,
  },
  macroLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: '600',
    marginTop: THEME.spacing.xs,
  },
  macroLabelCompact: {
    fontSize: THEME.fontSize.xs,
    marginTop: 2,
  },
  macroTarget: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  macroPercentage: {
    fontSize: THEME.fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  additionalInfo: {
    marginTop: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  fiberInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  fiberLabel: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  fiberValue: {
    fontSize: THEME.fontSize.md,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  caloricBreakdown: {
    marginTop: THEME.spacing.md,
  },
  breakdownTitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: '600',
    marginBottom: THEME.spacing.sm,
  },
  breakdownBars: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: THEME.colors.background,
  },
  breakdownItem: {
    justifyContent: 'center',
  },
  breakdownBar: {
    height: 8,
  },
  breakdownLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xs,
  },
});

export default MacroDashboard;