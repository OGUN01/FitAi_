// Achievement Card Component
// Individual achievement display with progress and celebration

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Achievement,
  UserAchievement,
} from "../../services/achievements/types";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rs, rbr, rp } from "../../utils/responsive";
import GlassCard from "../ui/GlassCard";
import { Ionicons } from "@expo/vector-icons";

interface AchievementCardProps {
  achievement: Achievement;
  userProgress?: UserAchievement;
  onPress?: () => void;
  showProgress?: boolean;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  userProgress,
  onPress,
  showProgress = true,
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
      gold: ResponsiveTheme.colors.gold,
      platinum: "#E5E4E2",
      diamond: "#B9F2FF",
      legendary: ResponsiveTheme.colors.errorLight,
    };
    return colors[tier as keyof typeof colors] || "#CD7F32";
  };

  const tierColor = getTierColor(achievement.tier);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${achievement.title}, ${achievement.tier} tier achievement. ${isCompleted ? "Earned" : "Locked"}.`}
      accessibilityRole="button"
    >
      <GlassCard
        elevation={isCompleted ? 4 : 1}
        blurIntensity={isCompleted ? "default" : "light"}
        style={StyleSheet.flatten([
          styles.container,
          !isCompleted && progress === 0 ? styles.lockedCard : undefined,
        ])}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View
              style={[styles.iconContainer, !isCompleted && styles.iconLocked]}
            >
              <Text style={styles.icon}>{achievement.icon}</Text>
              {isCompleted && (
                <View style={styles.checkBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={ResponsiveTheme.colors.success}
                  />
                </View>
              )}
            </View>

            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text
                  style={[styles.title, !isCompleted && styles.titleLocked]}
                >
                  {achievement.title}
                </Text>
                <View style={[styles.tierBadge, { borderColor: tierColor }]}>
                  <Text style={[styles.tierText, { color: tierColor }]}>
                    {achievement.tier.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {achievement.description}
              </Text>
            </View>
          </View>

          {showProgress && (isCompleted || progress > 0) && (
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
            </View>
          )}

          {isCompleted && (
            <Text style={styles.unlockedText}>
              Unlocked{" "}
              {new Date(
                userProgress?.unlockedAt || Date.now(),
              ).toLocaleDateString()}
            </Text>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: rh(1.5),
  },
  lockedCard: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: rh(1),
  },
  iconContainer: {
    width: rw(12),
    height: rw(12),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: rw(3),
    marginRight: rw(3),
  },
  icon: {
    fontSize: rf(3.5),
  },
  iconLocked: {
    opacity: 0.5,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  checkBadge: {
    position: "absolute",
    bottom: -rp(4),
    right: -rp(4),
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: rbr(8),
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rh(0.5),
  },
  title: {
    fontSize: rf(1.8),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    flex: 1,
    marginRight: rw(2),
  },
  titleLocked: {
    color: ResponsiveTheme.colors.textMuted,
  },
  tierBadge: {
    borderWidth: 1,
    paddingHorizontal: rw(1.5),
    paddingVertical: rh(0.2),
    borderRadius: rbr(6),
  },
  tierText: {
    fontSize: rf(1),
    fontWeight: "800",
  },
  description: {
    fontSize: rf(1.5),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(2),
  },
  progressSection: {
    marginTop: rh(1),
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTrack: {
    flex: 1,
    height: rh(0.6),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: rs(3),
    marginRight: rw(2),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rs(3),
  },
  progressText: {
    fontSize: rf(1.2),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textTertiary,
    width: rw(10),
    textAlign: "right",
  },
  unlockedText: {
    fontSize: rf(1.2),
    color: ResponsiveTheme.colors.success,
    marginTop: rh(1),
    textAlign: "right",
  },
});

export default AchievementCard;
