/**
 * AchievementShowcase Component
 * Professional achievement display with Ionicons (NO emojis)
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';

// Professional icon mapping for achievements
const ACHIEVEMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Fitness
  'first_workout': 'fitness',
  'streak_7': 'flame',
  'streak_30': 'bonfire',
  'calories_1000': 'flash',
  'steps_10k': 'footsteps',
  // Nutrition
  'first_meal': 'nutrition',
  'water_goal': 'water',
  'balanced_diet': 'leaf',
  // General
  'default': 'ribbon',
  'trophy': 'trophy',
  'medal': 'medal',
  'star': 'star',
  'target': 'locate',
};

// Get professional icon for achievement
const getAchievementIcon = (iconKey: string): keyof typeof Ionicons.glyphMap => {
  // If it's already an Ionicon name, use it
  if (iconKey in Ionicons.glyphMap || iconKey.includes('-')) {
    return iconKey as keyof typeof Ionicons.glyphMap;
  }
  // Map known keys
  return ACHIEVEMENT_ICONS[iconKey] || ACHIEVEMENT_ICONS['default'];
};

interface Achievement {
  id: string;
  icon: string;
  title: string;
  category?: string;
  unlockedAt?: string;
}

interface NearlyCompleteAchievement {
  id: string;
  icon: string;
  title: string;
  progress: number;
}

interface AchievementShowcaseProps {
  recentAchievements: Achievement[];
  nearlyComplete?: NearlyCompleteAchievement[];
  totalBadges: number;
  onViewAll?: () => void;
  onAchievementPress?: (achievement: Achievement) => void;
}

// Badge card with professional icon
const BadgeCard: React.FC<{
  icon: string;
  title: string;
  onPress?: () => void;
}> = ({ icon, title, onPress }) => (
  <AnimatedPressable
    onPress={onPress}
    scaleValue={0.95}
    hapticFeedback={true}
    hapticType="light"
    style={styles.badgeCard}
  >
    <View style={styles.badgeIconContainer}>
      <Ionicons 
        name={getAchievementIcon(icon)} 
        size={rf(22)} 
        color="#FFB300" 
      />
    </View>
    <Text style={styles.badgeTitle} numberOfLines={2}>{title}</Text>
  </AnimatedPressable>
);

// Progress badge with professional icon
const ProgressBadge: React.FC<{
  icon: string;
  title: string;
  progress: number;
  onPress?: () => void;
}> = ({ icon, title, progress, onPress }) => (
  <AnimatedPressable
    onPress={onPress}
    scaleValue={0.95}
    hapticFeedback={true}
    hapticType="light"
    style={styles.progressBadgeCard}
  >
    <View style={styles.progressBadgeIconContainer}>
      <Ionicons 
        name={getAchievementIcon(icon)} 
        size={rf(18)} 
        color="rgba(156, 39, 176, 0.6)" 
      />
      {/* Progress overlay */}
      <View style={styles.progressRing}>
        <View 
          style={[
            styles.progressRingFill, 
            { 
              borderColor: '#9C27B0',
              transform: [{ rotate: `${(progress / 100) * 360 - 90}deg` }]
            }
          ]} 
        />
      </View>
    </View>
    <Text style={styles.progressBadgeTitle} numberOfLines={1}>{title}</Text>
    <Text style={styles.progressPercent}>{progress}%</Text>
  </AnimatedPressable>
);

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  recentAchievements,
  nearlyComplete = [],
  totalBadges,
  onViewAll,
  onAchievementPress,
}) => {
  const hasAchievements = recentAchievements.length > 0 || nearlyComplete.length > 0;

  return (
    <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <Ionicons name="trophy" size={rf(16)} color="#FFB300" />
          </View>
          <Text style={styles.headerTitle}>Achievements</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalBadges}</Text>
          </View>
        </View>
        
        <AnimatedPressable
          onPress={onViewAll}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="light"
        >
          <View style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={rf(14)} color={ResponsiveTheme.colors.primary} />
          </View>
        </AnimatedPressable>
      </View>

      {hasAchievements ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {recentAchievements.map((achievement) => (
            <BadgeCard
              key={achievement.id}
              icon={achievement.icon}
              title={achievement.title}
              onPress={() => onAchievementPress?.(achievement)}
            />
          ))}
          
          {recentAchievements.length > 0 && nearlyComplete.length > 0 && (
            <View style={styles.divider} />
          )}
          
          {nearlyComplete.map((achievement) => (
            <ProgressBadge
              key={achievement.id}
              icon={achievement.icon}
              title={achievement.title}
              progress={achievement.progress}
              onPress={() => onAchievementPress?.(achievement as any)}
            />
          ))}
        </ScrollView>
      ) : (
        <AnimatedPressable
          onPress={onViewAll}
          scaleValue={0.98}
          hapticFeedback={true}
          hapticType="light"
        >
          <View style={styles.emptyState}>
            <View style={styles.emptyIconRow}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="trophy-outline" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />
              </View>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="ribbon-outline" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />
              </View>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="medal-outline" size={rf(20)} color={ResponsiveTheme.colors.textSecondary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Start earning achievements</Text>
            <Text style={styles.emptySubtitle}>Complete workouts to unlock badges</Text>
          </View>
        </AnimatedPressable>
      )}
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
    gap: ResponsiveTheme.spacing.sm,
  },
  headerIconBg: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  countBadge: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  countText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.primary,
  },
  scrollContent: {
    gap: ResponsiveTheme.spacing.md,
    paddingRight: ResponsiveTheme.spacing.sm,
  },
  badgeCard: {
    alignItems: 'center',
    width: rw(68),
  },
  badgeIconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 179, 0, 0.25)',
  },
  badgeTitle: {
    fontSize: rf(10),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    lineHeight: rf(13),
  },
  divider: {
    width: 1,
    height: rh(50),
    backgroundColor: ResponsiveTheme.colors.border,
    marginHorizontal: ResponsiveTheme.spacing.xs,
    alignSelf: 'center',
  },
  progressBadgeCard: {
    alignItems: 'center',
    width: rw(68),
  },
  progressBadgeIconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    backgroundColor: 'rgba(156, 39, 176, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: rw(24),
    borderWidth: 2,
    borderColor: 'rgba(156, 39, 176, 0.15)',
  },
  progressRingFill: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: rw(26),
    borderWidth: 2,
    borderTopColor: '#9C27B0',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  progressBadgeTitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },
  progressPercent: {
    fontSize: rf(9),
    fontWeight: '700',
    color: '#9C27B0',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  emptyIconRow: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyIconCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: rf(13),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
  },
  emptySubtitle: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
});

export default AchievementShowcase;
