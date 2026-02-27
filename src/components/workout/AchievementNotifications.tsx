import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
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
            <Text style={styles.achievementToastIcon}>
              {toastAchievement.icon}
            </Text>
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
    left: ResponsiveTheme.spacing.lg,
    right: ResponsiveTheme.spacing.lg,
    zIndex: 1000,
  },

  achievementToastContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.success,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: rbr(12),
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
  },

  achievementToastIcon: {
    fontSize: rf(28),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  achievementToastText: {
    flex: 1,
  },

  achievementToastTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    marginBottom: rp(2),
  },

  achievementToastDescription: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.white + "CC",
  },

  miniToast: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    backgroundColor: ResponsiveTheme.colors.primary + "E6",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: rbr(20),
    zIndex: 999,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
  },

  miniToastText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
    textAlign: "center",
  },
});
