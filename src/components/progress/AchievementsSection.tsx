/**
 * AchievementsSection — horizontal scroll of circular badges (Aurora 2026)
 *
 * Not a boxed grid: a flat horizontal ScrollView of circular tier-ringed
 * badges. Locked badges sit at 40% opacity with a lock glyph.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  chart,
  colors,
  surface,
  typography,
  spacing,
  borderRadius,
} from '../../theme/aurora-tokens';
import { TIER_COLOR_MAP } from '../../data/achievements/tierColors';

interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  date: string;
  completed: boolean;
  category: string;
  points: number;
  rarity?: string;
  progress?: number;
  target?: number;
}

interface AchievementsSectionProps {
  achievements: Achievement[];
  completedCount: number;
  totalCount: number;
}

const BADGE_SIZE = 64;
const RING_WIDTH = 2.5;

const tierColor = (rarity: string | undefined, completed: boolean): string => {
  if (completed) {
    return chart[4];
  }
  return (rarity && TIER_COLOR_MAP[rarity]) || colors.text.muted;
};

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements,
  completedCount,
  totalCount,
}) => {
  // Guests never initialize achievement definitions (auth-only store), so the
  // section would render a bare "Achievements 0/0" header with an empty strip —
  // looks broken, not intentional. Hide until definitions exist.
  if (achievements.length === 0) {
    return null;
  }

  const sorted = [...achievements].sort((a, b) => {
    if (a.completed && !b.completed) {
      return -1;
    }
    if (!a.completed && b.completed) {
      return 1;
    }
    return 0;
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(270).duration(320)}
      style={styles.section}
    >
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.countText}>
          <Text style={styles.countValue}>{completedCount}</Text>/{totalCount}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sorted.map((achievement, index) => {
          const accent = tierColor(achievement.rarity, achievement.completed);
          const locked = !achievement.completed;
          const hasProgress =
            locked &&
            (achievement.progress ?? 0) > 0 &&
            (achievement.target ?? 0) > 0;
          const pct = hasProgress
            ? Math.min(1, (achievement.progress ?? 0) / (achievement.target ?? 1))
            : 0;

          return (
            <Animated.View
              key={achievement.id}
              entering={FadeInDown.delay(300 + index * 40).duration(260)}
              style={styles.badgeWrap}
            >
              <View
                style={[
                  styles.badgeRing,
                  { borderColor: accent },
                  locked && styles.badgeLocked,
                ]}
              >
                <View style={[styles.badgeCore, { backgroundColor: surface[1] }]}>
                  <Ionicons
                    name={
                      locked
                        ? 'lock-closed'
                        : (achievement.iconName as keyof typeof Ionicons.glyphMap)
                    }
                    size={24}
                    color={locked ? colors.text.muted : accent}
                  />
                </View>
                {hasProgress && (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(pct * 100)}%`, backgroundColor: accent },
                      ]}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.badgeTitle} numberOfLines={2}>
                {achievement.title}
              </Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
  },
  countText: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
  countValue: {
    ...typography.variants.caption,
    fontFamily: 'Manrope_700Bold',
    color: colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  badgeWrap: {
    width: BADGE_SIZE + 12,
    alignItems: 'center',
  },
  badgeRing: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: RING_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  badgeLocked: {
    opacity: 0.4,
  },
  badgeCore: {
    width: BADGE_SIZE - RING_WIDTH * 4,
    height: BADGE_SIZE - RING_WIDTH * 4,
    borderRadius: (BADGE_SIZE - RING_WIDTH * 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    bottom: -6,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: borderRadius.xs,
    backgroundColor: surface[2],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  badgeTitle: {
    ...typography.variants.caption,
    fontSize: 11,
    lineHeight: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default AchievementsSection;
