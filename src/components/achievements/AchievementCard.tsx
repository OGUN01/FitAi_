import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Achievement,
  UserAchievement,
} from "../../services/achievements/types";
import {
  surface,
  border,
  chart,
  colors,
  typography,
  spacing,
} from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { TIER_COLOR_MAP as tierColorMap } from "../../data/achievements/tierColors";
import { getReadableTextColor } from "./AchievementCelebration";

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
  const isLocked = !isCompleted && progress === 0;
  const tierColor = tierColorMap[achievement.tier] ?? chart[1];
  // Bright tiers (gold/silver) need a dark checkmark, not hardcoded white —
  // same WCAG-luminance rule AchievementCelebration uses for its button label.
  const statusIconColor = isCompleted
    ? getReadableTextColor(tierColor)
    : colors.text.muted;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.97}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={`${achievement.title}, ${achievement.tier} tier achievement. ${isCompleted ? "Earned" : "Locked"}.`}
      accessibilityRole="button"
      accessibilityHint={isCompleted ? "Tap to view achievement details" : "Tap to view progress and how to unlock"}
    >
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[styles.tile, isLocked && styles.tileLocked]}
      >
        {/* Tier ring badge — primary glyph is the achievement's own emoji
            (services/achievements/definitions.ts contract), not a generic
            status icon. Completion/lock state is a small corner badge. */}
        <View style={[styles.ringOuter, { borderColor: tierColor }]}>
          <View style={[styles.ringInner, { backgroundColor: `${tierColor}18` }]}>
            <Text style={[styles.iconEmoji, isLocked && styles.iconEmojiLocked]}>
              {achievement.icon}
            </Text>
          </View>
          {(isCompleted || isLocked) && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isCompleted ? tierColor : surface[2] },
              ]}
            >
              <Ionicons
                name={isCompleted ? "checkmark" : "lock-closed"}
                size={rf(10)}
                color={statusIconColor}
              />
            </View>
          )}
        </View>

        {/* Title */}
        <Text
          style={[styles.title, isLocked && styles.titleLocked]}
          numberOfLines={2}
        >
          {achievement.title}
        </Text>

        {/* Tier chip */}
        <View style={[styles.tierChip, { backgroundColor: `${tierColor}18` }]}>
          <Text style={[styles.tierChipText, { color: tierColor }]} numberOfLines={1}>
            {achievement.tier.toUpperCase()}
          </Text>
        </View>

        {/* Progress bar for in-progress */}
        {showProgress && !isCompleted && progress > 0 && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%`, backgroundColor: tierColor },
                ]}
              />
            </View>
            <Text style={styles.progressText} numberOfLines={1}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
        )}

        {/* Unlocked date */}
        {isCompleted && userProgress?.unlockedAt && (
          <Text style={styles.unlockedText} numberOfLines={1}>
            {new Date(userProgress.unlockedAt).toLocaleDateString()}
          </Text>
        )}
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  tileLocked: {
    opacity: 0.4,
  },
  ringOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
    position: "relative",
  },
  ringInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  iconEmoji: {
    fontSize: rf(22),
  },
  iconEmojiLocked: {
    opacity: 0.5,
  },
  statusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: surface[1],
  },
  title: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  titleLocked: {
    color: colors.text.muted,
  },
  tierChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  tierChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(10),
    letterSpacing: 0.5,
  },
  progressWrap: {
    width: "100%",
    marginTop: spacing.xs,
  },
  progressTrack: {
    height: 4,
    backgroundColor: border.subtle,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
  unlockedText: {
    ...typography.variants.caption,
    color: chart[4],
    marginTop: spacing.xs,
  },
});

export default AchievementCard;
