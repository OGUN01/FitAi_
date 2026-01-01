/**
 * ProfileStats - Stats Grid Component
 * 
 * Shows NON-REDUNDANT user statistics:
 * - Total Workouts
 * - Calories Burned
 * - Longest Streak
 * - Achievements (from store, not hardcoded)
 * 
 * Improvements:
 * - Centered values
 * - Colored borders matching icon color
 * - Better spacing and visual hierarchy
 * - Subtle gradient backgrounds
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';
import { haptics } from '../../utils/haptics';

interface StatItem {
  id: string;
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradientColors: [string, string];
  suffix?: string;
}

interface ProfileStatsProps {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  longestStreak: number;
  achievements: number;
  onStatPress?: (statId: string) => void;
}

const StatCard: React.FC<{ 
  stat: StatItem; 
  index: number;
  onPress?: () => void;
}> = ({ stat, index, onPress }) => {
  // Animated value for count-up effect
  const animatedValue = useRef(new RNAnimated.Value(0)).current;
  const displayValue = useRef(0);

  useEffect(() => {
    if (typeof stat.value === 'number' && stat.value > 0) {
      RNAnimated.timing(animatedValue, {
        toValue: stat.value,
        duration: 1000 + index * 200,
        useNativeDriver: false,
      }).start();

      animatedValue.addListener(({ value }) => {
        displayValue.current = Math.floor(value);
      });
    }
    return () => animatedValue.removeAllListeners();
  }, [stat.value, index, animatedValue]);

  const formatValue = (value: number | string): string => {
    if (typeof value === 'number') {
      if (value >= 10000) return `${(value / 1000).toFixed(0)}k`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
      return value.toString();
    }
    return value;
  };

  return (
    <Animated.View 
      entering={FadeInUp.delay(100 + index * 100).duration(500).springify()}
      style={styles.statCardWrapper}
    >
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress?.();
        }}
        scaleValue={0.95}
        hapticFeedback={false}
      >
        <View style={[styles.cardBorder, { borderColor: `${stat.color}40` }]}>
          <GlassCard 
            elevation={1} 
            padding="md" 
            blurIntensity="light" 
            borderRadius="lg" 
            style={styles.statCard}
          >
            {/* Subtle gradient background */}
            <LinearGradient
              colors={[`${stat.color}10`, 'transparent']}
              style={styles.gradientBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            
            {/* Icon with colored background */}
            <View style={[styles.iconContainer, { backgroundColor: `${stat.color}25` }]}>
              <Ionicons name={stat.icon} size={rf(20)} color={stat.color} />
            </View>
            
            {/* Value */}
            <View style={styles.valueContainer}>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {formatValue(stat.value)}
              </Text>
              {stat.suffix && (
                <Text style={[styles.statSuffix, { color: `${stat.color}99` }]}>
                  {stat.suffix}
                </Text>
              )}
            </View>
            
            {/* Label */}
            <Text style={styles.statLabel}>{stat.label}</Text>
          </GlassCard>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  totalWorkouts,
  totalCaloriesBurned,
  longestStreak,
  achievements,
  onStatPress,
}) => {
  const stats: StatItem[] = [
    {
      id: 'workouts',
      label: 'Workouts',
      value: totalWorkouts,
      icon: 'barbell',
      color: '#FF6B6B',
      gradientColors: ['#FF6B6B', '#FF8E53'],
    },
    {
      id: 'calories',
      label: 'Calories',
      value: totalCaloriesBurned,
      icon: 'flame',
      color: '#FFB347',
      gradientColors: ['#FFB347', '#FFCC33'],
    },
    {
      id: 'longest-streak',
      label: 'Best Streak',
      value: longestStreak,
      icon: 'trophy',
      color: '#4CAF50',
      gradientColors: ['#4CAF50', '#8BC34A'],
      suffix: longestStreak === 1 ? ' day' : ' days',
    },
    {
      id: 'achievements',
      label: 'Achievements',
      value: achievements,
      icon: 'ribbon',
      color: '#667eea',
      gradientColors: ['#667eea', '#764ba2'],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.map((stat, index) => (
          <StatCard 
            key={stat.id} 
            stat={stat} 
            index={index}
            onPress={() => onStatPress?.(stat.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: '48.5%',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  cardBorder: {
    borderRadius: ResponsiveTheme.borderRadius.lg + 2,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    width: rw(42),
    height: rw(42),
    borderRadius: rw(21),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  statValue: {
    fontSize: rf(26),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statSuffix: {
    fontSize: rf(14),
    fontWeight: '600',
    marginLeft: 2,
  },
  statLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    letterSpacing: 0.5,
  },
});

export default ProfileStats;
