// Achievement Card Component
// Individual achievement display with progress and celebration

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Achievement,
  UserAchievement,
} from "../../services/achievements/types";
import { flatColors as colors } from "../../theme/aurora-tokens";
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
    const tierColors = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: colors.gold,
      platinum: "#E5E4E2",
      diamond: "#B9F2FF",
      legendary: colors.errorLight,
    };
    return tierColors[tier as keyof typeof tierColors] || "#CD7F32";
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
                    color={colors.success}
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
              </View>
              <View style={styles.tierRow}>
                <View style={[styles.tierBadge, { borderColor: tierColor }]}>
                  <Text style={[styles.tierText, { color: tierColor }]}>
                    {achievement.tier.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.description}>
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
    marginBottom: rh(12),
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
    marginBottom: rh(8),
  },
  iconContainer: {
    width: rw(48),
    height: rw(48),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: rw(12),
    marginRight: rw(12),
  },
  icon: {
    fontSize: rf(24),
  },
  iconLocked: {
    opacity: 0.5,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  checkBadge: {
    position: "absolute",
    bottom: -rp(6),
    right: -rp(6),
    backgroundColor: colors.background,
    borderRadius: rbr(10),
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(4),
  },
  tierRow: {
    flexDirection: "row",
    marginBottom: rh(6),
  },
  title: {
    fontSize: rf(16),
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    flexWrap: "wrap",
  },
  titleLocked: {
    color: colors.textMuted,
  },
  tierBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: rw(8),
    paddingVertical: rh(2),
    borderRadius: rbr(6),
  },
  tierText: {
    fontSize: rf(10),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(18),
    flexShrink: 1,
  },
  progressSection: {
    marginTop: rh(8),
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTrack: {
    flex: 1,
    height: rh(6),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: rs(3),
    marginRight: rw(8),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rs(3),
  },
  progressText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.textTertiary,
    width: rw(42),
    textAlign: "right",
  },
  unlockedText: {
    fontSize: rf(11),
    color: colors.success,
    marginTop: rh(8),
    textAlign: "right",
  },
});

export default AchievementCard;
