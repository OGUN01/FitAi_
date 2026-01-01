/**
 * DietHeader Component
 * Clean, minimal header with greeting and primary action
 * Fixes Issue #1 - Removes debug buttons, keeps only essential actions
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';

interface DietHeaderProps {
  userName?: string;
  caloriesRemaining: number;
  caloriesGoal: number;
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
}

export const DietHeader: React.FC<DietHeaderProps> = ({
  userName = 'there',
  caloriesRemaining,
  caloriesGoal,
  onNotificationPress,
  onSettingsPress,
}) => {
  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Calorie status
  const calorieStatus = useMemo(() => {
    const percentage = ((caloriesGoal - caloriesRemaining) / caloriesGoal) * 100;
    if (percentage >= 100) return { text: 'Goal reached!', color: '#4CAF50' };
    if (percentage >= 75) return { text: 'Almost there', color: '#FF9800' };
    if (percentage >= 50) return { text: 'On track', color: '#2196F3' };
    return { text: 'Keep going', color: '#667eea' };
  }, [caloriesRemaining, caloriesGoal]);

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(0)} style={styles.container}>
      {/* Left: Greeting */}
      <View style={styles.leftSection}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.title}>Nutrition</Text>
      </View>

      {/* Right: Actions */}
      <View style={styles.rightSection}>
        {/* Calorie Badge */}
        <View style={[styles.calorieBadge, { backgroundColor: `${calorieStatus.color}15` }]}>
          <Ionicons name="flame" size={rf(12)} color={calorieStatus.color} />
          <Text style={[styles.calorieText, { color: calorieStatus.color }]}>
            {caloriesRemaining} left
          </Text>
        </View>

        {/* Settings */}
        {onSettingsPress && (
          <AnimatedPressable
            onPress={onSettingsPress}
            scaleValue={0.9}
            hapticFeedback={true}
            hapticType="light"
            style={styles.iconButton}
          >
            <Ionicons name="settings-outline" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />
          </AnimatedPressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.sm,
  },
  leftSection: {
    flex: 1,
  },
  greeting: {
    fontSize: rf(14),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },
  title: {
    fontSize: rf(28),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: 4,
  },
  calorieText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  iconButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DietHeader;

