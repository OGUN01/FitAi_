/**
 * DailyProgressRings Component
 * Apple Fitness-style triple activity rings
 * Move (calories), Exercise (workout), Nutrition (meals)
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
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ring configuration
const RINGS = {
  move: {
    color: '#FF6B6B',
    gradientEnd: '#FF8E53',
    icon: 'flame' as const,
    label: 'Move',
  },
  exercise: {
    color: '#4CAF50',
    gradientEnd: '#8BC34A',
    icon: 'fitness' as const,
    label: 'Exercise',
  },
  nutrition: {
    color: '#2196F3',
    gradientEnd: '#03A9F4',
    icon: 'nutrition' as const,
    label: 'Nutrition',
  },
};

interface DailyProgressRingsProps {
  moveProgress: number; // 0-100
  exerciseProgress: number; // 0-100
  nutritionProgress: number; // 0-100
  moveGoal?: string;
  exerciseGoal?: string;
  nutritionGoal?: string;
  onPress?: () => void;
}

// Individual Ring Component
const ProgressRing: React.FC<{
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
      withSpring(Math.min(progress, 100), {
        damping: 15,
        stiffness: 80,
      })
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
      
      {/* Background ring */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={`${color}20`}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      
      {/* Progress ring */}
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
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
  moveProgress,
  exerciseProgress,
  nutritionProgress,
  moveGoal = '500 cal',
  exerciseGoal = '30 min',
  nutritionGoal = '4 meals',
  onPress,
}) => {
  // Calculate overall score - ensure NaN becomes 0
  const safeMove = isNaN(moveProgress) ? 0 : moveProgress;
  const safeExercise = isNaN(exerciseProgress) ? 0 : exerciseProgress;
  const safeNutrition = isNaN(nutritionProgress) ? 0 : nutritionProgress;
  const overallScore = Math.round((safeMove + safeExercise + safeNutrition) / 3) || 0;
  
  // Ring sizes (outer to inner)
  const outerSize = rw(160);
  const middleSize = rw(130);
  const innerSize = rw(100);
  const strokeWidth = rw(12);

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
    >
      <GlassCard elevation={3} blurIntensity="light" padding="lg" borderRadius="xl">
        <View style={styles.container}>
          {/* Rings Section */}
          <View style={[styles.ringsContainer, { width: outerSize, height: outerSize }]}>
            {/* Move Ring (outer) */}
            <ProgressRing
              progress={moveProgress}
              size={outerSize}
              strokeWidth={strokeWidth}
              color={RINGS.move.color}
              gradientEnd={RINGS.move.gradientEnd}
              gradientId="moveGradient"
              delay={0}
            />
            
            {/* Exercise Ring (middle) */}
            <View style={[styles.ringOverlay, { 
              width: middleSize, 
              height: middleSize,
              top: (outerSize - middleSize) / 2,
              left: (outerSize - middleSize) / 2,
            }]}>
              <ProgressRing
                progress={exerciseProgress}
                size={middleSize}
                strokeWidth={strokeWidth}
                color={RINGS.exercise.color}
                gradientEnd={RINGS.exercise.gradientEnd}
                gradientId="exerciseGradient"
                delay={100}
              />
            </View>
            
            {/* Nutrition Ring (inner) */}
            <View style={[styles.ringOverlay, { 
              width: innerSize, 
              height: innerSize,
              top: (outerSize - innerSize) / 2,
              left: (outerSize - innerSize) / 2,
            }]}>
              <ProgressRing
                progress={nutritionProgress}
                size={innerSize}
                strokeWidth={strokeWidth}
                color={RINGS.nutrition.color}
                gradientEnd={RINGS.nutrition.gradientEnd}
                gradientId="nutritionGradient"
                delay={200}
              />
            </View>
            
            {/* Center Score */}
            <View style={styles.centerContent}>
              <Text style={styles.scoreText}>{overallScore}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          </View>

          {/* Legend Section */}
          <View style={styles.legendContainer}>
            {/* Move */}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: RINGS.move.color }]} />
              <View style={styles.legendText}>
                <View style={styles.legendRow}>
                  <Ionicons name={RINGS.move.icon} size={rf(14)} color={RINGS.move.color} />
                  <Text style={styles.legendLabel}>{RINGS.move.label}</Text>
                </View>
                <Text style={styles.legendValue}>{moveProgress}%</Text>
              </View>
            </View>
            
            {/* Exercise */}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: RINGS.exercise.color }]} />
              <View style={styles.legendText}>
                <View style={styles.legendRow}>
                  <Ionicons name={RINGS.exercise.icon} size={rf(14)} color={RINGS.exercise.color} />
                  <Text style={styles.legendLabel}>{RINGS.exercise.label}</Text>
                </View>
                <Text style={styles.legendValue}>{exerciseProgress}%</Text>
              </View>
            </View>
            
            {/* Nutrition */}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: RINGS.nutrition.color }]} />
              <View style={styles.legendText}>
                <View style={styles.legendRow}>
                  <Ionicons name={RINGS.nutrition.icon} size={rf(14)} color={RINGS.nutrition.color} />
                  <Text style={styles.legendLabel}>{RINGS.nutrition.label}</Text>
                </View>
                <Text style={styles.legendValue}>{nutritionProgress}%</Text>
              </View>
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
    gap: ResponsiveTheme.spacing.lg,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: rf(28),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
  },
  scoreLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  legendContainer: {
    flex: 1,
    gap: ResponsiveTheme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
  },
  legendText: {
    flex: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },
  legendLabel: {
    fontSize: rf(13),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
  },
  legendValue: {
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
});

export default DailyProgressRings;

