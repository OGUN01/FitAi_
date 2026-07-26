import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../utils/responsive";
import AchievementCelebration from "../achievements/AchievementCelebration";

interface AchievementNotificationsProps {
  showCelebration: boolean;
  celebrationAchievement: any;
  onCloseCelebration: () => void;
  showAchievementToast: boolean;
  toastAchievement: any;
  achievementToastAnim: Animated.Value;
  showMiniToast: boolean;
  miniToastText: string;
  miniToastAnim: Animated.Value;
}

export const AchievementNotifications: React.FC<
  AchievementNotificationsProps
> = ({
  showCelebration,
  celebrationAchievement,
  onCloseCelebration,
  showAchievementToast,
  toastAchievement,
  achievementToastAnim,
  showMiniToast,
  miniToastText,
  miniToastAnim,
}) => {
  // Top inset so toasts clear the status bar on notched devices (was a fixed
  // rp(60)/rp(120) top that underlapped the status bar on notched phones).
  const insets = useSafeAreaInsets();
  return (
    <>
      <AchievementCelebration
        visible={showCelebration}
        achievement={celebrationAchievement}
        onClose={onCloseCelebration}
      />

      {showAchievementToast && toastAchievement && (
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.achievementToast,
            {
              top: rp(60) + insets.top,
              opacity: achievementToastAnim,
              transform: [
                {
                  translateY: achievementToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.achievementToastContent}>
            <View style={styles.achievementToastIconWrap}>
              <Text style={styles.achievementToastIcon}>
                {toastAchievement.icon}
              </Text>
            </View>
            <View style={styles.achievementToastText}>
              <Text style={styles.achievementToastTitle}>
                Achievement Unlocked!
              </Text>
              <Text style={styles.achievementToastDescription}>
                {toastAchievement.title}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {showMiniToast && !showAchievementToast && (
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            styles.miniToast,
            {
              top: rp(120) + insets.top,
              opacity: miniToastAnim,
              transform: [
                {
                  scale: miniToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.miniToastText}>{miniToastText}</Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  achievementToast: {
    position: "absolute",
    top: rp(60),
    left: spacing.lg,
    right: spacing.lg,
    // Toasts sit above sticky footers (1100) and below modal dialogs (1300).
    zIndex: 1200,
    elevation: 12,
  },

  achievementToastContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: rbr(12),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
  },

  achievementToastIconWrap: {
    // Fixed-width wrapper so multi-char emoji icons don't shift the toast
    // layout when the icon string length varies between achievements.
    width: rf(36),
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  achievementToastIcon: {
    fontSize: rf(28),
  },

  achievementToastText: {
    flex: 1,
  },

  achievementToastTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: rp(2),
  },

  achievementToastDescription: {
    fontSize: fontSize.xs,
    // Explicit rgba (was colors.white + "CC" — fragile hex append breaks
    // if colors.white isn't a 6-digit hex string).
    color: "rgba(255, 255, 255, 0.85)",
  },

  miniToast: {
    position: "absolute",
    top: rp(120),
    alignSelf: "center",
    // Explicit rgba (was colors.primary + "E6" — fragile hex append).
    backgroundColor: "rgba(255, 107, 53, 0.9)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: rbr(20),
    // Toasts sit above sticky footers (1100) and below modal dialogs (1300).
    zIndex: 1200,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
  },

  miniToastText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
    textAlign: "center",
  },
});
