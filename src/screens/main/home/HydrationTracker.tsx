/**
 * HydrationTracker Component
 * Premium water intake tracker with visual progress
 * 
 * Features:
 * - Animated water level visualization
 * - Quick-add buttons
 * - Daily progress ring
 * - Time-based reminders
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw, rh } from '../../../utils/responsive';

// Water amount presets (in ml)
const QUICK_ADD_OPTIONS = [
  { amount: 250, label: 'Glass', icon: 'water-outline' as const },
  { amount: 500, label: 'Bottle', icon: 'water' as const },
  { amount: 750, label: 'Large', icon: 'beaker' as const },
];

interface HydrationTrackerProps {
  currentIntake: number; // in ml
  dailyGoal: number; // in ml
  onAddWater: (amount: number) => void;
  onPress?: () => void;
}

// Water Drop Visual Component
const WaterDrop: React.FC<{ progress: number; size: number }> = ({ progress: rawProgress, size }) => {
  // Sanitize progress to prevent NaN in SVG paths
  const progress = Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : 0;
  
  const fillHeight = (progress / 100) * (size * 0.7);
  const dropWidth = size * 0.6;
  const dropHeight = size * 0.75;
  
  // Pre-calculate and round SVG path coordinates
  const waterTop = Math.round(95 - (progress * 0.8));
  const waterMid = Math.round(90 - (progress * 0.75));
  
  return (
    <View style={[styles.dropContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="waterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#1E88E5" />
            <Stop offset="50%" stopColor="#42A5F5" />
            <Stop offset="100%" stopColor="#64B5F6" />
          </LinearGradient>
          <LinearGradient id="dropBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(33, 150, 243, 0.1)" />
            <Stop offset="100%" stopColor="rgba(33, 150, 243, 0.05)" />
          </LinearGradient>
        </Defs>
        {/* Drop outline/background */}
        <Path
          d="M50 10 C50 10, 20 45, 20 65 C20 85, 35 95, 50 95 C65 95, 80 85, 80 65 C80 45, 50 10, 50 10"
          fill="url(#dropBg)"
          stroke="rgba(33, 150, 243, 0.3)"
          strokeWidth="2"
        />
        {/* Water fill (clipped to drop shape) */}
        <Path
          d={`M50 10 C50 10, 20 45, 20 65 C20 85, 35 95, 50 95 C65 95, 80 85, 80 65 C80 45, 50 10, 50 10`}
          fill="none"
          clipPath="url(#dropClip)"
        />
        {/* Animated water level */}
        <Path
          d={`M20 ${waterTop} Q35 ${waterMid}, 50 ${waterTop} T80 ${waterTop} L80 95 L20 95 Z`}
          fill="url(#waterGrad)"
          opacity={0.9}
        />
      </Svg>
      <View style={styles.dropCenter}>
        <Text style={styles.dropPercentage}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
};

// Quick Add Button Component
const QuickAddButton: React.FC<{
  amount: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}> = ({ amount, label, icon, onPress }) => {
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.92}
      hapticFeedback={true}
      hapticType="medium"
      style={styles.quickAddButton}
    >
      <View style={styles.quickAddIconContainer}>
        <Ionicons name={icon} size={rf(18)} color="#2196F3" />
      </View>
      <Text style={styles.quickAddAmount}>{amount}ml</Text>
      <Text style={styles.quickAddLabel}>{label}</Text>
    </AnimatedPressable>
  );
};

export const HydrationTracker: React.FC<HydrationTrackerProps> = ({
  currentIntake,
  dailyGoal,
  onAddWater,
  onPress,
}) => {
  const progress = useMemo(() => {
    // Guard against division by zero - show 0% if no goal set
    return dailyGoal > 0 ? Math.min((currentIntake / dailyGoal) * 100, 100) : 0;
  }, [currentIntake, dailyGoal]);

  const remainingMl = Math.max(dailyGoal - currentIntake, 0);
  const remainingGlasses = Math.ceil(remainingMl / 250);

  // Time-based hydration status
  const getHydrationStatus = () => {
    const hour = new Date().getHours();
    const expectedProgress = ((hour - 6) / 16) * 100; // Assuming 6am-10pm active period
    
    if (progress >= expectedProgress + 10) {
      return { status: 'Ahead', color: '#4CAF50', message: 'Great hydration!' };
    } else if (progress >= expectedProgress - 10) {
      return { status: 'On Track', color: '#2196F3', message: 'Keep it up!' };
    } else {
      return { status: 'Behind', color: '#FF9800', message: 'Drink more water' };
    }
  };

  const hydrationStatus = getHydrationStatus();
  const dropSize = rw(90);

  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.98} hapticFeedback={true} hapticType="light">
      <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="water" size={rf(16)} color="#2196F3" />
            <Text style={styles.headerTitle}>Hydration</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${hydrationStatus.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: hydrationStatus.color }]} />
            <Text style={[styles.statusText, { color: hydrationStatus.color }]}>
              {hydrationStatus.status}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Water Drop Visual */}
          <WaterDrop progress={progress} size={dropSize} />

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(currentIntake / 1000).toFixed(1)}
                <Text style={styles.statUnit}>L</Text>
              </Text>
              <Text style={styles.statLabel}>Consumed</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(dailyGoal / 1000).toFixed(1)}
                <Text style={styles.statUnit}>L</Text>
              </Text>
              <Text style={styles.statLabel}>Goal</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, remainingGlasses > 0 ? {} : { color: '#4CAF50' }]}>
                {remainingGlasses > 0 ? remainingGlasses : '✓'}
                {remainingGlasses > 0 && <Text style={styles.statUnit}></Text>}
              </Text>
              <Text style={styles.statLabel}>{remainingGlasses > 0 ? 'Glasses left' : 'Complete!'}</Text>
            </View>
          </View>
        </View>

        {/* Quick Add Section */}
        <View style={styles.quickAddSection}>
          <Text style={styles.quickAddTitle}>Quick Add</Text>
          <View style={styles.quickAddButtons}>
            {QUICK_ADD_OPTIONS.map((option) => (
              <QuickAddButton
                key={option.amount}
                amount={option.amount}
                label={option.label}
                icon={option.icon}
                onPress={() => onAddWater(option.amount)}
              />
            ))}
          </View>
        </View>

        {/* Reminder Message */}
        <View style={styles.reminderContainer}>
          <Ionicons name="time-outline" size={rf(12)} color={hydrationStatus.color} />
          <Text style={styles.reminderText}>{hydrationStatus.message}</Text>
        </View>
      </GlassCard>
    </AnimatedPressable>
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
  headerTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: ResponsiveTheme.spacing.xs,
  },
  statusDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.md,
  },
  dropContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropCenter: {
    position: 'absolute',
    alignItems: 'center',
    top: '50%',
    marginTop: rh(5),
  },
  dropPercentage: {
    fontSize: rf(18),
    fontWeight: '800',
    color: '#2196F3',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: rf(18),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
  },
  statUnit: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  statLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: rh(30),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  quickAddSection: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  quickAddTitle: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  quickAddButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ResponsiveTheme.spacing.xs, // Reduced gap
  },
  quickAddButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md, // Increased horizontal padding
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.15)',
  },
  quickAddIconContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickAddAmount: {
    fontSize: rf(13),
    fontWeight: '700',
    color: '#2196F3',
  },
  quickAddLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 1,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  reminderText: {
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default HydrationTracker;

