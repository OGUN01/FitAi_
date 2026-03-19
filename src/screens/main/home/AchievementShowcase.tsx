/**
 * AchievementShowcase Component
 * Professional achievement display with Ionicons (NO emojis)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rp } from "../../../utils/responsive";
import { AchievementViewModel } from "../../../utils/achievementViewModel";

interface AchievementShowcaseProps {
  achievements: AchievementViewModel[];
  totalBadges: number;
  totalAchievements: number;
  onViewAll?: () => void;
  // eslint-disable-next-line no-unused-vars
  onAchievementPress?: (achievement: AchievementViewModel) => void;
}

const resolveIconName = (iconName: string): keyof typeof Ionicons.glyphMap => {
  if (iconName in Ionicons.glyphMap) {
    return iconName as keyof typeof Ionicons.glyphMap;
  }

  return "ribbon-outline";
};

const BadgeCard: React.FC<{
  iconName: string;
  title: string;
  onPress?: () => void;
}> = ({ iconName, title, onPress }) => (
  <AnimatedPressable
    onPress={onPress}
    scaleValue={0.95}
    hapticFeedback={true}
    hapticType="light"
    style={styles.badgeCard}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={styles.badgeIconContainer}>
      <Ionicons
        name={resolveIconName(iconName)}
        size={rf(22)}
        color={ResponsiveTheme.colors.amber}
      />
    </View>
    <Text style={styles.badgeTitle} numberOfLines={2}>
      {title}
    </Text>
  </AnimatedPressable>
);

const ProgressBadge: React.FC<{
  iconName: string;
  title: string;
  progress: number;
  onPress?: () => void;
}> = ({ iconName, title, progress, onPress }) => (
  <AnimatedPressable
    onPress={onPress}
    scaleValue={0.95}
    hapticFeedback={true}
    hapticType="light"
    style={styles.progressBadgeCard}
    accessibilityRole="button"
    accessibilityLabel={`${title} ${progress} percent`}
  >
    <View style={styles.progressBadgeIconContainer}>
      <Ionicons
        name={resolveIconName(iconName)}
        size={rf(18)}
        color="rgba(156, 39, 176, 0.6)"
      />
      <View style={styles.progressRing}>
        <View
          style={[
            styles.progressRingFill,
            {
              borderColor: ResponsiveTheme.colors.primary,
              transform: [{ rotate: `${(progress / 100) * 360 - 90}deg` }],
            },
          ]}
        />
      </View>
    </View>
    <Text style={styles.progressBadgeTitle} numberOfLines={1}>
      {title}
    </Text>
    <Text style={styles.progressPercent}>{progress}%</Text>
  </AnimatedPressable>
);

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  achievements,
  totalBadges,
  totalAchievements,
  onViewAll,
  onAchievementPress,
}) => {
  const hasAchievements = achievements.length > 0;

  return (
    <GlassCard
      elevation={2}
      blurIntensity="light"
      padding="md"
      borderRadius="lg"
    >
      <View style={styles.header}>
        <AnimatedPressable
          onPress={onViewAll}
          scaleValue={0.98}
          hapticFeedback={true}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="Achievements"
          testID="achievement-section"
          style={styles.headerLeft}
        >
          <View style={styles.headerIconBg}>
            <Ionicons
              name="trophy"
              size={rf(16)}
              color={ResponsiveTheme.colors.amber}
            />
          </View>
          <Text style={styles.headerTitle}>Achievements</Text>
          {totalAchievements > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {totalBadges}/{totalAchievements}
              </Text>
            </View>
          ) : null}
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onViewAll}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="View all achievements"
        >
          <View style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons
              name="chevron-forward"
              size={rf(14)}
              color={ResponsiveTheme.colors.primary}
            />
          </View>
        </AnimatedPressable>
      </View>

      {hasAchievements ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {achievements.map((achievement) =>
            achievement.completed ? (
              <BadgeCard
                key={achievement.id}
                iconName={achievement.iconName}
                title={achievement.title}
                onPress={() => onAchievementPress?.(achievement)}
              />
            ) : (
              <ProgressBadge
                key={achievement.id}
                iconName={achievement.iconName}
                title={achievement.title}
                progress={achievement.percentComplete}
                onPress={() => onAchievementPress?.(achievement)}
              />
            ),
          )}
        </ScrollView>
      ) : (
        <AnimatedPressable
          onPress={onViewAll}
          scaleValue={0.98}
          hapticFeedback={true}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="Start earning achievements"
        >
          <View style={styles.emptyState}>
            <View style={styles.emptyIconRow}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="trophy-outline"
                  size={rf(20)}
                  color={ResponsiveTheme.colors.textSecondary}
                />
              </View>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="ribbon-outline"
                  size={rf(20)}
                  color={ResponsiveTheme.colors.textSecondary}
                />
              </View>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="medal-outline"
                  size={rf(20)}
                  color={ResponsiveTheme.colors.textSecondary}
                />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Start earning achievements</Text>
            <Text style={styles.emptySubtitle}>
              Complete workouts to unlock badges
            </Text>
          </View>
        </AnimatedPressable>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  headerIconBg: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: "rgba(255, 179, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  countBadge: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    paddingVertical: rp(2),
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  countText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(2),
  },
  viewAllText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  scrollContent: {
    gap: ResponsiveTheme.spacing.md,
    paddingRight: ResponsiveTheme.spacing.sm,
  },
  badgeCard: {
    alignItems: "center",
    width: rw(68),
  },
  badgeIconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    backgroundColor: "rgba(255, 179, 0, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    borderWidth: 1.5,
    borderColor: "rgba(255, 179, 0, 0.25)",
  },
  badgeTitle: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    lineHeight: rf(13),
  },
  progressBadgeCard: {
    alignItems: "center",
    width: rw(68),
  },
  progressBadgeIconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    backgroundColor: "rgba(156, 39, 176, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
    position: "relative",
  },
  progressRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: rw(24),
    borderWidth: 2,
    borderColor: "rgba(156, 39, 176, 0.15)",
  },
  progressRingFill: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: rw(26),
    borderWidth: 2,
    borderTopColor: ResponsiveTheme.colors.primary,
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  progressBadgeTitle: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
  progressPercent: {
    fontSize: rf(9),
    fontWeight: "700",
    color: ResponsiveTheme.colors.primary,
    marginTop: rp(2),
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  emptyIconRow: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyIconCircle: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  emptySubtitle: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
});

export default AchievementShowcase;
