/**
 * SmartCoaching Component
 * AI-powered personalized coaching recommendations
 * 
 * Features:
 * - Context-aware daily tips
 * - Workout suggestions based on recovery
 * - Recovery day recommendations
 * - Personalized insights
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw } from '../../utils/responsive';

// Tip types and their visual styling
const TIP_STYLES = {
  workout: {
    icon: 'fitness' as const,
    gradient: ['#FF6B6B', '#FF8E53'] as [string, string],
    bgColor: 'rgba(255, 107, 107, 0.1)',
  },
  recovery: {
    icon: 'bed' as const,
    gradient: ['#667eea', '#764ba2'] as [string, string],
    bgColor: 'rgba(102, 126, 234, 0.1)',
  },
  nutrition: {
    icon: 'nutrition' as const,
    gradient: ['#11998e', '#38ef7d'] as [string, string],
    bgColor: 'rgba(17, 153, 142, 0.1)',
  },
  hydration: {
    icon: 'water' as const,
    gradient: ['#2196F3', '#03A9F4'] as [string, string],
    bgColor: 'rgba(33, 150, 243, 0.1)',
  },
  motivation: {
    icon: 'flash' as const,
    gradient: ['#FFD700', '#FFA500'] as [string, string],
    bgColor: 'rgba(255, 215, 0, 0.1)',
  },
};

interface Recommendation {
  id: string;
  type: keyof typeof TIP_STYLES;
  title: string;
  description: string;
  action?: string;
  priority: number;
}

interface SmartCoachingProps {
  // User state for generating recommendations
  recoveryScore?: number;
  sleepHours?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  lastWorkoutDaysAgo?: number;
  currentStreak?: number;
  waterIntake?: number;
  waterGoal?: number;
  caloriesConsumed?: number;
  caloriesGoal?: number;
  
  // Callbacks
  onTipPress?: (tip: Recommendation) => void;
  onViewAll?: () => void;
}

// Generate smart recommendations based on user state
const generateRecommendations = (props: SmartCoachingProps): Recommendation[] => {
  const {
    recoveryScore, // NO DEFAULT - from healthDataStore
    sleepHours, // NO DEFAULT - from healthDataStore
    sleepQuality, // NO DEFAULT - from healthDataStore
    lastWorkoutDaysAgo, // NO DEFAULT - from fitnessStore
    currentStreak, // NO DEFAULT - from achievementStore
    waterIntake, // NO DEFAULT - from hydrationStore
    waterGoal, // NO DEFAULT - from hydrationStore
    caloriesConsumed, // NO DEFAULT - from nutritionStore
    caloriesGoal, // NO DEFAULT - from calculatedMetrics
  } = props;

  const recommendations: Recommendation[] = [];
  const hour = new Date().getHours();

  // Recovery-based workout recommendation
  if (recoveryScore >= 80) {
    recommendations.push({
      id: 'high-intensity',
      type: 'workout',
      title: 'Ready for High Intensity',
      description: 'Your recovery score is excellent. Perfect day for HIIT or strength training.',
      action: 'Start Workout',
      priority: 1,
    });
  } else if (recoveryScore >= 60) {
    recommendations.push({
      id: 'moderate-workout',
      type: 'workout',
      title: 'Balanced Training Day',
      description: 'Moderate recovery suggests a steady-state cardio or yoga session.',
      action: 'View Options',
      priority: 2,
    });
  } else if (recoveryScore < 50) {
    recommendations.push({
      id: 'rest-day',
      type: 'recovery',
      title: 'Recovery Day Recommended',
      description: 'Your body needs rest. Consider light stretching or a walk.',
      action: 'Recovery Tips',
      priority: 1,
    });
  }

  // Sleep-based recommendations
  if (sleepHours < 6) {
    recommendations.push({
      id: 'sleep-deficit',
      type: 'recovery',
      title: 'Sleep Deficit Detected',
      description: `Only ${sleepHours.toFixed(1)} hours last night. Try to get to bed 30 mins earlier tonight.`,
      priority: 2,
    });
  } else if (sleepQuality === 'excellent' && sleepHours >= 7) {
    recommendations.push({
      id: 'great-sleep',
      type: 'motivation',
      title: 'Excellent Sleep Quality!',
      description: 'Your rest was optimal. Capitalize on this energy today.',
      priority: 3,
    });
  }

  // Hydration reminder (time-based)
  if (hour >= 8 && hour <= 20) {
    const hydrationPercent = (waterIntake / waterGoal) * 100;
    const expectedPercent = ((hour - 8) / 12) * 100;
    
    if (hydrationPercent < expectedPercent - 20) {
      recommendations.push({
        id: 'hydration',
        type: 'hydration',
        title: 'Time to Hydrate',
        description: `You're behind on water intake. Aim for ${Math.ceil(waterGoal * 0.25)} more glasses by evening.`,
        action: 'Log Water',
        priority: 2,
      });
    }
  }

  // Streak maintenance
  if (currentStreak >= 7 && lastWorkoutDaysAgo === 0) {
    recommendations.push({
      id: 'streak-active',
      type: 'motivation',
      title: `${currentStreak} Day Streak! 🔥`,
      description: "Incredible consistency! You're building lasting habits.",
      priority: 3,
    });
  } else if (lastWorkoutDaysAgo >= 2 && currentStreak > 0) {
    recommendations.push({
      id: 'streak-warning',
      type: 'workout',
      title: 'Protect Your Streak',
      description: `${lastWorkoutDaysAgo} days since last workout. A quick session keeps momentum.`,
      action: 'Quick Workout',
      priority: 1,
    });
  }

  // Nutrition reminder
  if (hour >= 10 && hour <= 14 && caloriesConsumed < caloriesGoal * 0.3) {
    recommendations.push({
      id: 'nutrition-breakfast',
      type: 'nutrition',
      title: 'Fuel Your Morning',
      description: 'Start with a protein-rich breakfast to maintain energy levels.',
      action: 'Meal Ideas',
      priority: 2,
    });
  }

  // Sort by priority and return top 3
  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 3);
};

// Single Recommendation Card
const RecommendationCard: React.FC<{
  recommendation: Recommendation;
  onPress?: () => void;
  index: number;
}> = ({ recommendation, onPress, index }) => {
  const style = TIP_STYLES[recommendation.type];

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
        style={[styles.recommendationCard, { backgroundColor: style.bgColor }]}
      >
        <View style={styles.cardContent}>
          <LinearGradient
            colors={style.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons name={style.icon} size={rf(16)} color="#FFFFFF" />
          </LinearGradient>
          
          <View style={styles.textContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{recommendation.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>{recommendation.description}</Text>
          </View>

          {recommendation.action && (
            <View style={styles.actionContainer}>
              <Text style={[styles.actionText, { color: style.gradient[0] }]}>
                {recommendation.action}
              </Text>
              <Ionicons name="chevron-forward" size={rf(14)} color={style.gradient[0]} />
            </View>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const SmartCoaching: React.FC<SmartCoachingProps> = (props) => {
  const { onTipPress, onViewAll } = props;
  
  const recommendations = useMemo(() => generateRecommendations(props), [
    props.recoveryScore,
    props.sleepHours,
    props.sleepQuality,
    props.lastWorkoutDaysAgo,
    props.currentStreak,
    props.waterIntake,
    props.waterGoal,
  ]);

  if (recommendations.length === 0) {
    return null; // Don't render if no recommendations
  }

  return (
    <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiIconContainer}>
            <Ionicons name="sparkles" size={rf(14)} color="#FFD700" />
          </View>
          <Text style={styles.headerTitle}>Smart Coach</Text>
        </View>
        <AnimatedPressable onPress={onViewAll} scaleValue={0.95} hapticFeedback={true} hapticType="light">
          <Text style={styles.viewAllText}>See All</Text>
        </AnimatedPressable>
      </View>

      {/* Recommendations */}
      <View style={styles.recommendationsList}>
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onPress={() => onTipPress?.(rec)}
            index={index}
          />
        ))}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },
  aiIconContainer: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },
  viewAllText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.primary,
  },
  recommendationsList: {
    gap: ResponsiveTheme.spacing.sm,
  },
  recommendationCard: {
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.sm,
    gap: ResponsiveTheme.spacing.sm,
  },
  iconGradient: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(15),
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: rf(11),
    fontWeight: '700',
  },
});

export default SmartCoaching;

