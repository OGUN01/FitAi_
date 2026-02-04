import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { THEME } from "../ui";
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

      {showMiniToast && (
        <Animated.View
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
    top: 60,
    left: THEME.spacing.lg,
    right: THEME.spacing.lg,
    zIndex: 1000,
  },

  achievementToastContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.success,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  achievementToastIcon: {
    fontSize: 28,
    marginRight: THEME.spacing.sm,
  },

  achievementToastText: {
    flex: 1,
  },

  achievementToastTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
    marginBottom: 2,
  },

  achievementToastDescription: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.white + "CC",
  },

  miniToast: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    backgroundColor: THEME.colors.primary + "E6",
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderRadius: 20,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  miniToastText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.white,
    textAlign: "center",
  },
});
