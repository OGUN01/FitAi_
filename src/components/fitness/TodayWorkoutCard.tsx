/**
 * TodayWorkoutCard Component
 * Primary action card showing today's scheduled workout with quick start
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';
import { DayWorkout } from '../../types/ai';

interface TodayWorkoutCardProps {
  workout: DayWorkout | null;
  isRestDay: boolean;
  isCompleted: boolean;
  progress: number;
  onStartWorkout: () => void;
  onViewDetails: () => void;
}

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  workout,
  isRestDay,
  isCompleted,
  progress,
  onStartWorkout,
  onViewDetails,
}) => {
  const getStatusConfig = () => {
    if (isCompleted) {
      return {
        icon: 'checkmark-circle' as const,
        color: '#10b981',
        gradient: ['#10b981', '#059669'] as [string, string],
        label: 'Completed',
        buttonText: 'View Summary',
      };
    }
    if (isRestDay) {
      return {
        icon: 'moon' as const,
        color: '#667eea',
        gradient: ['#667eea', '#764ba2'] as [string, string],
        label: 'Rest Day',
        buttonText: 'Recovery Tips',
      };
    }
    if (progress > 0) {
      return {
        icon: 'play-circle' as const,
        color: '#FF6B6B',
        gradient: ['#FF6B6B', '#FF8E53'] as [string, string],
        label: `${progress}% Complete`,
        buttonText: 'Continue',
      };
    }
    return {
      icon: 'fitness' as const,
      color: '#FF6B6B',
      gradient: ['#FF6B6B', '#FF8E53'] as [string, string],
      label: 'Ready to Go',
      buttonText: 'Start Workout',
    };
  };

  const config = getStatusConfig();
  const exerciseCount = workout?.exercises?.length || 0;

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <GlassCard elevation={3} blurIntensity="light" padding="none" borderRadius="xl">
        <AnimatedPressable
          onPress={onViewDetails}
          scaleValue={0.98}
          hapticFeedback={true}
          hapticType="light"
        >
          <View style={styles.container}>
            {/* Top Section - Status + Info */}
            <View style={styles.topSection}>
              {/* Left: Icon */}
              <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Ionicons name={config.icon} size={rf(28)} color="#fff" />
              </LinearGradient>

              {/* Middle: Workout Info */}
              <View style={styles.infoContainer}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {isRestDay ? 'Rest & Recover' : workout?.title || "Today's Workout"}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
                    <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                    <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                  </View>
                </View>

                {!isRestDay && workout && (
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={rf(14)} color={ResponsiveTheme.colors.textSecondary} />
                      <Text style={styles.metaText}>{workout.duration} min</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flame-outline" size={rf(14)} color={ResponsiveTheme.colors.textSecondary} />
                      <Text style={styles.metaText}>{workout.estimatedCalories} cal</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="barbell-outline" size={rf(14)} color={ResponsiveTheme.colors.textSecondary} />
                      <Text style={styles.metaText}>{exerciseCount} exercises</Text>
                    </View>
                  </View>
                )}

                {isRestDay && (
                  <Text style={styles.restDaySubtitle}>
                    Recovery is essential for muscle growth and preventing injury
                  </Text>
                )}
              </View>
            </View>

            {/* Progress Bar (if in progress) */}
            {progress > 0 && progress < 100 && !isRestDay && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${progress}%`, backgroundColor: config.color }
                    ]} 
                  />
                </View>
              </View>
            )}

            {/* Bottom Section - Action Button */}
            <View style={styles.bottomSection}>
              <AnimatedPressable
                onPress={onStartWorkout}
                scaleValue={0.96}
                hapticFeedback={true}
                hapticType="medium"
                style={styles.actionButton}
              >
                <LinearGradient
                  colors={config.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionButtonText}>{config.buttonText}</Text>
                  <Ionicons 
                    name={isCompleted ? 'eye-outline' : 'arrow-forward'} 
                    size={rf(18)} 
                    color="#fff" 
                  />
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </View>
        </AnimatedPressable>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: ResponsiveTheme.spacing.lg,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ResponsiveTheme.spacing.md,
  },
  iconContainer: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ResponsiveTheme.spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: rf(17),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  restDaySubtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
    lineHeight: rf(18),
  },
  progressSection: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  progressBar: {
    height: rh(6),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: rh(3),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: rh(3),
  },
  bottomSection: {
    marginTop: ResponsiveTheme.spacing.lg,
  },
  actionButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  actionButtonText: {
    fontSize: rf(15),
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default TodayWorkoutCard;

