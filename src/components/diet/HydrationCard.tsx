/**
 * HydrationCard Component
 * Single unified hydration tracker - fixes duplicate hydration sections
 * Fixes Issue #2 - Consolidates two hydration sections into one
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';

// Quick add options
const QUICK_ADD_OPTIONS = [
  { amount: 250, label: '250ml', icon: 'water-outline' as const },
  { amount: 500, label: '500ml', icon: 'water' as const },
  { amount: 1000, label: '1L', icon: 'beaker-outline' as const },
];

interface HydrationCardProps {
  currentIntake: number; // in ml
  dailyGoal: number; // in ml
  onAddWater: (amount: number) => void;
  onPress?: () => void;
}

// Water Drop Visual
const WaterDropVisual: React.FC<{ progress: number; size: number }> = ({ progress: rawProgress, size }) => {
  // Sanitize progress to prevent NaN in SVG paths
  const progress = Number.isFinite(rawProgress) ? Math.max(0, Math.min(100, rawProgress)) : 0;
  
  // Pre-calculate and round SVG path coordinates
  const waterTop = Math.round(95 - (progress * 0.8));
  const waterMid = Math.round(90 - (progress * 0.75));
  
  return (
    <View style={[styles.dropContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="waterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#1E88E5" />
            <Stop offset="50%" stopColor="#42A5F5" />
            <Stop offset="100%" stopColor="#64B5F6" />
          </LinearGradient>
          <LinearGradient id="dropBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(33, 150, 243, 0.08)" />
            <Stop offset="100%" stopColor="rgba(33, 150, 243, 0.03)" />
          </LinearGradient>
        </Defs>
        {/* Drop background */}
        <Path
          d="M50 10 C50 10, 20 45, 20 65 C20 85, 35 95, 50 95 C65 95, 80 85, 80 65 C80 45, 50 10, 50 10"
          fill="url(#dropBgGradient)"
          stroke="rgba(33, 150, 243, 0.2)"
          strokeWidth="2"
        />
        {/* Water fill */}
        <Path
          d={`M20 ${waterTop} Q35 ${waterMid}, 50 ${waterTop} T80 ${waterTop} L80 95 L20 95 Z`}
          fill="url(#waterGradient)"
          opacity={0.85}
        />
      </Svg>
      <View style={styles.dropCenter}>
        <Text style={styles.dropPercentage}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
};

export const HydrationCard: React.FC<HydrationCardProps> = ({
  currentIntake,
  dailyGoal,
  onAddWater,
  onPress,
}) => {
  const progress = useMemo(() => {
    // Guard against division by zero
    return dailyGoal > 0 ? Math.min((currentIntake / dailyGoal) * 100, 100) : 0;
  }, [currentIntake, dailyGoal]);

  const remainingMl = Math.max(dailyGoal - currentIntake, 0);
  const remainingGlasses = Math.ceil(remainingMl / 250);

  // Status based on progress
  const status = useMemo(() => {
    if (progress >= 100) return { text: 'Goal reached!', color: '#4CAF50' };
    if (progress >= 75) return { text: 'Almost there', color: '#4CAF50' };
    if (progress >= 50) return { text: 'On track', color: '#2196F3' };
    if (progress >= 25) return { text: 'Keep going', color: '#FF9800' };
    return { text: 'Stay hydrated', color: '#FF9800' };
  }, [progress]);

  const dropSize = rw(80);

  return (
    <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="water" size={rf(18)} color="#2196F3" />
          <Text style={styles.sectionTitle}>Hydration</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <AnimatedPressable onPress={onPress} scaleValue={0.98} hapticFeedback={true} hapticType="light" style={styles.cardWrapper}>
        <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
          <View style={styles.content}>
            {/* Water Drop */}
            <WaterDropVisual progress={progress} size={dropSize} />

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.mainStat}>
                <Text style={styles.intakeValue}>
                  {(currentIntake / 1000).toFixed(1)}
                  <Text style={styles.intakeUnit}>L</Text>
                </Text>
                <Text style={styles.goalText}>of {(dailyGoal / 1000).toFixed(1)}L goal</Text>
              </View>

              {/* Quick Add Buttons */}
              <View style={styles.quickAddRow}>
                {QUICK_ADD_OPTIONS.map((option) => (
                  <AnimatedPressable
                    key={option.amount}
                    onPress={() => onAddWater(option.amount)}
                    scaleValue={0.9}
                    hapticFeedback={true}
                    hapticType="medium"
                    style={styles.quickAddButton}
                  >
                    <Text style={styles.quickAddText}>+{option.label}</Text>
                  </AnimatedPressable>
                ))}
              </View>

              {/* Remaining */}
              {remainingGlasses > 0 && (
                <Text style={styles.remainingText}>
                  {remainingGlasses} glass{remainingGlasses !== 1 ? 'es' : ''} to go
                </Text>
              )}
            </View>
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  cardWrapper: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: 6,
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
    gap: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
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
    fontSize: rf(16),
    fontWeight: '800',
    color: '#2196F3',
  },
  statsContainer: {
    flex: 1,
  },
  mainStat: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  intakeValue: {
    fontSize: rf(28),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
  },
  intakeUnit: {
    fontSize: rf(16),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  quickAddButton: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)',
  },
  quickAddText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: '#2196F3',
  },
  remainingText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default HydrationCard;

