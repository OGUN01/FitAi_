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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ring configuration
const RINGS = {
  move: { color: '#FF6B6B', gradientEnd: '#FF8E53', icon: 'flame' as const },
  exercise: { color: '#4CAF50', gradientEnd: '#8BC34A', icon: 'barbell' as const },
  nutrition: { color: '#2196F3', gradientEnd: '#03A9F4', icon: 'restaurant' as const },
};

interface DailyProgressRingsProps {
  // Actual values (not percentages)
  caloriesBurned: number;
  caloriesGoal: number;
  workoutMinutes: number;
  workoutGoal: number;
  mealsLogged: number;
  mealsGoal: number;
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
  onPress,
}) => {
  // Calculate percentages
  const moveProgress = Math.min((caloriesBurned / caloriesGoal) * 100, 100);
  const exerciseProgress = Math.min((workoutMinutes / workoutGoal) * 100, 100);
  const nutritionProgress = Math.min((mealsLogged / mealsGoal) * 100, 100);
  const overallScore = Math.round((moveProgress + exerciseProgress + nutritionProgress) / 3);
  
  // Ring sizes (compact)
  const outerSize = rw(140);
  const middleSize = rw(112);
  const innerSize = rw(84);
  const strokeWidth = rw(10);

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
    fontSize: rf(24),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
  },
  scoreLabel: {
    fontSize: rf(12),
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
  statLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
    flex: 1,
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
