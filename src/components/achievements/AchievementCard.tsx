// Achievement Card Component
// Individual achievement display with progress and celebration

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Achievement, UserAchievement } from "../../services/achievementEngine";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";

interface AchievementCardProps {
  achievement: Achievement;
  userProgress?: UserAchievement;
  onPress?: () => void;
  showProgress?: boolean;
  size?: "small" | "medium" | "large";
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  userProgress,
  onPress,
  showProgress = true,
  size = "medium",
}) => {
  const isCompleted = userProgress?.isCompleted || false;
  const progress = userProgress?.progress || 0;
  const maxProgress =
    userProgress?.maxProgress || achievement.requirements[0]?.target || 1;
  const progressPercent = Math.min((progress / maxProgress) * 100, 100);

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      platinum: "#E5E4E2",
      diamond: "#B9F2FF",
      legendary: "#FF6B6B",
    };
    return colors[tier as keyof typeof colors] || "#CD7F32";
  };

  const tierColor = getTierColor(achievement.tier);

  const cardStyle = [
    styles.card,
    size === "small" && styles.cardSmall,
    size === "large" && styles.cardLarge,
    isCompleted && styles.cardCompleted,
  ].filter(Boolean);

  const iconStyle = [
    styles.icon,
    size === "small" && styles.iconSmall,
    size === "large" && styles.iconLarge,
    !isCompleted && styles.iconLocked,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      style={
        [cardStyle, { borderTopColor: tierColor, borderTopWidth: 3 }] as any
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={iconStyle}>{isCompleted ? achievement.icon : "🔒"}</Text>
          <View style={styles.info}>
            <Text style={[styles.title, !isCompleted && styles.titleLocked]}>
              {achievement.title}
            </Text>
            <Text style={styles.tier}>{achievement.tier.toUpperCase()}</Text>
          </View>
        </View>

        {achievement.description && (
          <Text style={styles.description} numberOfLines={2}>
            {achievement.description}
          </Text>
        )}

        {showProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: tierColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progressPercent)}%
              </Text>
            </View>

            <View style={styles.rewardSection}>
              <Text style={styles.rewardText}>
                🪙 {achievement.reward.value} FitCoins
              </Text>
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={[styles.completedBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.completedText}>✓ EARNED</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardSmall: {
    padding: ResponsiveTheme.spacing.sm,
  },

  cardLarge: {
    padding: ResponsiveTheme.spacing.lg,
  },

  cardCompleted: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  content: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  icon: {
    fontSize: rf(32),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  iconSmall: {
    fontSize: rf(24),
  },

  iconLarge: {
    fontSize: rf(40),
  },

  iconLocked: {
    opacity: 0.5,
  },

  info: {
    flex: 1,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },

  titleLocked: {
    color: ResponsiveTheme.colors.textMuted,
  },

  tier: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  description: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    lineHeight: rf(18),
  },

  progressSection: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressTrack: {
    flex: 1,
    height: rh(6),
    backgroundColor: ResponsiveTheme.colors.border,
    borderRadius: rs(3),
    marginRight: ResponsiveTheme.spacing.sm,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: rs(3),
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    minWidth: rw(35),
    textAlign: "right",
  },

  rewardSection: {
    alignItems: "flex-end",
  },

  rewardText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.primary,
    fontWeight: "500",
  },

  completedBadge: {
    position: "absolute",
    top: ResponsiveTheme.spacing.sm,
    right: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  completedText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "bold",
  },
});

export default AchievementCard;
