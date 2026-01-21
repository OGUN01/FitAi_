/**
 * DailyProgressRings Component
 * Compact Apple Fitness-style activity rings with real values
 * NO redundant percentage display - shows actual values
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw } from '../../../utils/responsive';
import type { MetricSource } from '../../../stores/healthDataStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ring configuration
const RINGS = {
  move: { color: '#FF6B6B', gradientEnd: '#FF8E53', icon: 'flame' as const },
  exercise: { color: '#4CAF50', gradientEnd: '#8BC34A', icon: 'barbell' as const },
  nutrition: { color: '#2196F3', gradientEnd: '#03A9F4', icon: 'restaurant' as const },
  steps: { color: '#9C27B0', gradientEnd: '#E040FB', icon: 'footsteps' as const },
};

interface DailyProgressRingsProps {
  // Actual values (not percentages)
  caloriesBurned: number;
  caloriesGoal: number;
  workoutMinutes: number;
  workoutGoal: number;
  mealsLogged: number;
  mealsGoal: number;
  // Steps (from Health Connect/HealthKit)
  steps?: number;
  stepsGoal?: number;
  // Data source attribution (for transparency)
  stepsSource?: MetricSource;
  onPress?: () => void;
}

// Single Ring Component
const Ring: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  gradientEnd: string;
  gradientId: string;
  delay?: number;
}> = ({ progress, size, strokeWidth, color, gradientEnd, gradientId, delay = 0 }) => {
  const animatedProgress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  useEffect(() => {
    animatedProgress.value = withDelay(
      delay,
      withSpring(Math.min(progress, 100), { damping: 15, stiffness: 80 })
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * animatedProgress.value) / 100,
  }));

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={gradientEnd} />
        </LinearGradient>
      </Defs>
      <Circle cx={center} cy={center} r={radius} stroke={`${color}15`} strokeWidth={strokeWidth} fill="transparent" />
      <AnimatedCircle
        cx={center} cy={center} r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeLinecap="round"
        rotation="-90"
        origin={`${center}, ${center}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
};

export const DailyProgressRings: React.FC<DailyProgressRingsProps> = ({
  caloriesBurned,
  caloriesGoal,
  workoutMinutes,
  workoutGoal,
  mealsLogged,
  mealsGoal,
  steps = 0,
  stepsGoal = 10000,
  stepsSource,
  onPress,
}) => {
  // Calculate percentages - guard against division by zero (show 0 instead of NaN)
  const moveProgress = caloriesGoal > 0 ? Math.min((caloriesBurned / caloriesGoal) * 100, 100) : 0;
  const exerciseProgress = workoutGoal > 0 ? Math.min((workoutMinutes / workoutGoal) * 100, 100) : 0;
  const nutritionProgress = mealsGoal > 0 ? Math.min((mealsLogged / mealsGoal) * 100, 100) : 0;
  const stepsProgress = stepsGoal > 0 ? Math.min((steps / stepsGoal) * 100, 100) : 0;
  const overallScore = Math.round((moveProgress + exerciseProgress + nutritionProgress + stepsProgress) / 4) || 0;
  
  // Ring sizes (compact) - 4 rings
  const outerSize = rw(140);      // Move (calories)
  const middleSize = rw(114);     // Exercise (workout)
  const innerSize = rw(88);       // Nutrition (meals)
  const innermostSize = rw(62);   // Steps
  const strokeWidth = rw(9);      // Slightly thinner for better fit
  const innerStrokeWidth = rw(7); // Thinner stroke for innermost ring

  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.98} hapticFeedback={true} hapticType="light">
      <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
        <View style={styles.container}>
          {/* Rings */}
          <View style={[styles.ringsContainer, { width: outerSize, height: outerSize }]}>
            <Ring progress={moveProgress} size={outerSize} strokeWidth={strokeWidth}
              color={RINGS.move.color} gradientEnd={RINGS.move.gradientEnd} gradientId="moveGrad" delay={0} />
            <View style={[styles.ringOverlay, { width: middleSize, height: middleSize, top: (outerSize - middleSize) / 2, left: (outerSize - middleSize) / 2 }]}>
              <Ring progress={exerciseProgress} size={middleSize} strokeWidth={strokeWidth}
                color={RINGS.exercise.color} gradientEnd={RINGS.exercise.gradientEnd} gradientId="exerciseGrad" delay={80} />
            </View>
            <View style={[styles.ringOverlay, { width: innerSize, height: innerSize, top: (outerSize - innerSize) / 2, left: (outerSize - innerSize) / 2 }]}>
              <Ring progress={nutritionProgress} size={innerSize} strokeWidth={strokeWidth}
                color={RINGS.nutrition.color} gradientEnd={RINGS.nutrition.gradientEnd} gradientId="nutritionGrad" delay={160} />
            </View>
            <View style={[styles.ringOverlay, { width: innermostSize, height: innermostSize, top: (outerSize - innermostSize) / 2, left: (outerSize - innermostSize) / 2 }]}>
              <Ring progress={stepsProgress} size={innermostSize} strokeWidth={innerStrokeWidth}
                color={RINGS.steps.color} gradientEnd={RINGS.steps.gradientEnd} gradientId="stepsGrad" delay={240} />
            </View>
            <View style={styles.centerContent}>
              <Text style={styles.scoreText}>{overallScore}</Text>
              <Text style={styles.scoreLabel}>%</Text>
            </View>
          </View>

          {/* Stats - Show actual values, not redundant percentages */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: RINGS.move.color }]} />
              <Ionicons name={RINGS.move.icon} size={rf(14)} color={RINGS.move.color} />
              <Text style={styles.statLabel}>Move</Text>
              <Text style={styles.statValue}>{caloriesBurned}<Text style={styles.statUnit}>/{caloriesGoal} cal</Text></Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: RINGS.exercise.color }]} />
              <Ionicons name={RINGS.exercise.icon} size={rf(14)} color={RINGS.exercise.color} />
              <Text style={styles.statLabel}>Exercise</Text>
              <Text style={styles.statValue}>{workoutMinutes}<Text style={styles.statUnit}>/{workoutGoal} min</Text></Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: RINGS.nutrition.color }]} />
              <Ionicons name={RINGS.nutrition.icon} size={rf(14)} color={RINGS.nutrition.color} />
              <Text style={styles.statLabel}>Meals</Text>
              <Text style={styles.statValue}>{mealsLogged}<Text style={styles.statUnit}>/{mealsGoal}</Text></Text>
            </View>
            {/* Steps from Health Connect/HealthKit */}
            <View style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: RINGS.steps.color }]} />
              <Ionicons name={RINGS.steps.icon} size={rf(14)} color={RINGS.steps.color} />
              <View style={styles.statLabelContainer}>
                <Text style={styles.statLabel}>Steps</Text>
                {stepsSource && (
                  <Text style={styles.sourceLabel}>via {stepsSource.name}</Text>
                )}
              </View>
              <Text style={styles.statValue}>{steps.toLocaleString()}<Text style={styles.statUnit}>/{stepsGoal.toLocaleString()}</Text></Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.md,
  },
  ringsContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringOverlay: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: rf(18),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
  },
  scoreLabel: {
    fontSize: rf(10),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  statsContainer: {
    flex: 1,
    gap: ResponsiveTheme.spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },
  statDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statLabelContainer: {
    flex: 1,
  },
  statLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  sourceLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    opacity: 0.7,
  },
  statValue: {
    fontSize: rf(13),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  statUnit: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default DailyProgressRings;
