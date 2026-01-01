/**
 * AchievementShowcase Component
 * Shows achievements section - empty state until real achievements are earned
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw } from '../../../utils/responsive';
import { SectionHeader } from '../home/SectionHeader';

interface AchievementShowcaseProps {
  achievements?: string[];
  onAchievementPress?: (achievement: any) => void;
  onSeeAllPress?: () => void;
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = () => {
  // Always show empty state - achievements will be earned through actual app usage
  // This prevents showing mock/placeholder achievements
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionHeader
          title="Achievements"
          icon="trophy"
          iconColor="#FFD700"
        />
      </View>

      <GlassCard elevation={1} blurIntensity="light" padding="md" borderRadius="lg">
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="trophy-outline" size={rf(28)} color={ResponsiveTheme.colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>No achievements yet</Text>
          <Text style={styles.emptySubtext}>Complete goals to earn badges</Text>
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.xl,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  headerContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  emptyIconContainer: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textMuted,
  },
});

export default AchievementShowcase;
