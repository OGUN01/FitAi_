import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
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
import { hexToRgba } from "../../utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { TIER_COLOR_MAP } from "../../data/achievements/tierColors";
import { getReadableTextColor } from "./AchievementCelebration";
import { DialogShell } from "../ui/CustomDialog";

interface AchievementDetailModalProps {
  visible: boolean;
  achievement: Achievement | null;
  userAchievement?: UserAchievement;
  onClose: () => void;
}

// Solid-color "gradient" (both stops equal) derived from the shared tier map
// so this stays in lockstep with the canonical tier colors used elsewhere.
const tierGradients: Record<string, readonly [string, string]> =
  Object.fromEntries(
    Object.entries(TIER_COLOR_MAP).map(([tier, color]) => [
      tier,
      [color, color] as const,
    ]),
  );

export const AchievementDetailModal: React.FC<AchievementDetailModalProps> = ({
  visible,
  achievement,
  userAchievement,
  onClose,
}) => {
  const badgeScale = useSharedValue(0);
  const badgeRotate = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const isUnlocked = userAchievement?.isCompleted || false;
  const progress = userAchievement?.progress || 0;
  const maxProgress =
    userAchievement?.maxProgress || achievement?.requirements[0]?.target || 1;
  const progressPercent = Math.min((progress / maxProgress) * 100, 100);
  const tierColor = achievement
    ? (tierGradients[achievement.tier]?.[0] ?? chart[1])
    : chart[1];
  const tierGradient = achievement
    ? (tierGradients[achievement.tier] ?? ([chart[1], chart[1]] as const))
    : ([chart[1], chart[1]] as const);
  // Bright tiers (gold/silver) need a dark checkmark, not hardcoded white —
  // same WCAG-luminance rule AchievementCelebration uses for its button label.
  const heroStatusIconColor = isUnlocked
    ? getReadableTextColor(tierColor)
    : colors.text.muted;

  useEffect(() => {
    if (visible && achievement) {
      badgeScale.value = 0;
      badgeRotate.value = 0;
      contentOpacity.value = 0;

      badgeScale.value = withDelay(
        100,
        withSpring(1, { damping: 12, stiffness: 120 })
      );
      badgeRotate.value = withDelay(
        100,
        withSpring(1, { damping: 12, stiffness: 100 })
      );
      contentOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    }
  }, [visible, achievement]);

  const badgeStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      badgeRotate.value,
      [0, 1],
      [-180, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale: badgeScale.value }, { rotate: `${rotate}deg` }],
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!achievement) {
    return (
      <DialogShell visible={visible} animationType="fade" onRequestClose={onClose} bare>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </DialogShell>
    );
  }

  return (
    <DialogShell visible={visible} animationType="fade" onRequestClose={onClose} bare>
      <View style={styles.overlay}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]} />
        )}

        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Dismiss modal overlay"
          accessibilityRole="button"
        />

        <KeyboardAvoidingView
          style={styles.modalContent}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Hero badge with spring entrance — primary glyph is the
              achievement's own emoji (services/achievements/definitions.ts
              contract), not a generic trophy/lock icon. Completion/lock
              state is a small corner badge on the ring. */}
          <View style={styles.header}>
            <View style={styles.heroBadgeContainer}>
              <Animated.View style={[styles.heroBadgeWrap, badgeStyle]}>
                <LinearGradient
                  colors={tierGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroBadge}
                >
                  <Text style={styles.heroIcon}>{achievement.icon}</Text>
                </LinearGradient>
              </Animated.View>
              <View
                style={[
                  styles.heroStatusBadge,
                  { backgroundColor: isUnlocked ? tierColor : surface[2] },
                ]}
              >
                <Ionicons
                  name={isUnlocked ? "checkmark" : "lock-closed"}
                  size={rf(14)}
                  color={heroStatusIconColor}
                />
              </View>
            </View>
            <AnimatedPressable
              onPress={onClose}
              scaleValue={0.9}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close achievement details"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={rf(22)}
                color={colors.text.primary}
              />
            </AnimatedPressable>
          </View>

          <Animated.View style={contentStyle}>
            <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
              {achievement.title}
            </Text>

            <View style={[styles.tierChip, { backgroundColor: `${tierColor}18` }]}>
              <Text style={[styles.tierChipText, { color: tierColor }]} numberOfLines={1}>
                {(achievement.tier ?? "unknown").toUpperCase()} TIER
              </Text>
            </View>

            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentInner}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.description}>{achievement.description}</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>REQUIREMENTS</Text>
                {achievement.requirements.map((req, index) => (
                  <View key={index} style={styles.requirementRow}>
                    <Ionicons
                      name={
                        isUnlocked || progress >= req.target
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={rf(20)}
                      color={
                        isUnlocked || progress >= req.target
                          ? chart[4]
                          : colors.text.muted
                      }
                    />
                    <Text style={styles.requirementText} numberOfLines={3}>
                      {req.target} {req.type.replace(/_/g, " ")}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>REWARDS</Text>
                <View style={styles.rewardRow}>
                  <Ionicons
                    name="ribbon-outline"
                    size={rf(18)}
                    color={chart[5]}
                    style={styles.rewardIcon}
                  />
                  <Text style={styles.rewardText} numberOfLines={1}>
                    {achievement.reward.value} FitCoins
                  </Text>
                </View>
                <Text style={styles.rewardDesc} numberOfLines={3}>
                  {achievement.reward.description}
                </Text>
              </View>

              {!isUnlocked && progress > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel} numberOfLines={1}>
                      Current Progress
                    </Text>
                    <Text style={styles.progressValue} numberOfLines={1}>
                      {Math.round(progressPercent)}%
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: tierColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {isUnlocked && userAchievement?.unlockedAt && (
                <View style={styles.unlockedContainer}>
                  <Ionicons name="trophy" size={rf(20)} color={chart[5]} />
                  <Text style={styles.unlockedText} numberOfLines={2}>
                    Unlocked on{" "}
                    {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </DialogShell>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  modalContent: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: surface[2],
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    zIndex: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  heroBadgeContainer: {
    width: 88,
    height: 88,
  },
  heroBadgeWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
  },
  heroBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  heroIcon: {
    fontSize: rf(40),
  },
  heroStatusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: surface[2],
  },
  title: {
    ...typography.variants.pageTitle,
    fontSize: rf(22),
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  tierChip: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  tierChipText: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(11),
    letterSpacing: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentInner: {
    paddingBottom: spacing.md,
  },
  description: {
    ...typography.variants.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: rf(20),
  },
  section: {
    marginBottom: spacing.md,
    backgroundColor: hexToRgba("#FFFFFF", 0.03),
    padding: spacing.md,
    borderRadius: 16,
  },
  sectionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(11),
    color: colors.text.muted,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  requirementText: {
    marginLeft: spacing.sm,
    ...typography.variants.body,
    color: colors.text.primary,
    flex: 1,
    flexShrink: 1,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  rewardIcon: {
    marginRight: spacing.sm,
  },
  rewardText: {
    fontFamily: "Manrope_700Bold",
    color: chart[5],
    fontSize: rf(16),
  },
  rewardDesc: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.variants.caption,
    color: colors.text.secondary,
  },
  progressValue: {
    fontFamily: "Manrope_700Bold",
    color: colors.text.primary,
    fontSize: rf(12),
  },
  progressBarBg: {
    height: 8,
    backgroundColor: surface[1],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  unlockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: hexToRgba(chart[5], 0.18),
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  unlockedText: {
    fontFamily: "Manrope_700Bold",
    color: chart[5],
    fontSize: rf(12),
    flex: 1,
  },
});
