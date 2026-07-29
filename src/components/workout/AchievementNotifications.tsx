/**
 * FitAI — Achievement Notifications (Aurora, 2026 session redesign)
 *
 * Session toasts restyled to the flat dark language: dark surface strips with
 * a success accent icon (no solid green blocks), hairline borders, white
 * primary text + muted secondary text. All animation values, positioning
 * (safe-area aware), accessibility roles / live regions and the celebration
 * modal wiring are unchanged.
 */
import React from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, flatColors, spacing, typography } from '../../theme/aurora-tokens';
import { rf, rp, rbr } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import AchievementCelebration from '../achievements/AchievementCelebration';

/** Map legacy emoji icon strings (stored in DB) to Ionicons names. */
const ACHIEVEMENT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  '🎯': 'trophy-outline',
  '🌟': 'star-outline',
  '💪': 'fitness-outline',
  '🏆': 'trophy',
  '🥇': 'medal-outline',
  '🔥': 'flame-outline',
  '🌋': 'flame',
  '⚡': 'flash-outline',
  '🎨': 'color-palette-outline',
};
const iconToIonicons = (icon: string): keyof typeof Ionicons.glyphMap =>
  ACHIEVEMENT_ICON_MAP[icon] ?? 'trophy-outline';

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

export const AchievementNotifications: React.FC<AchievementNotificationsProps> = ({
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
              <Ionicons
                name={iconToIonicons(String(toastAchievement.icon ?? ''))}
                size={rf(20)}
                color={flatColors.successAlt}
              />
            </View>
            <View style={styles.achievementToastText}>
              <Text style={styles.achievementToastTitle} numberOfLines={1}>
                Achievement Unlocked!
              </Text>
              <Text style={styles.achievementToastDescription} numberOfLines={2}>
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
          <Text style={styles.miniToastText} numberOfLines={2}>
            {miniToastText}
          </Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  achievementToast: {
    position: 'absolute',
    top: rp(60),
    left: spacing.lg,
    right: spacing.lg,
    // Toasts sit above sticky footers (1100) and below modal dialogs (1300).
    zIndex: 1200,
    elevation: 12,
  },

  achievementToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    // Flat dark surface (was a solid green block). Success reads through the
    // icon + left accent bar, not a full-bleed fill.
    backgroundColor: colors.background.tertiary,
    borderLeftWidth: 3,
    borderLeftColor: flatColors.successAlt,
    borderWidth: 1,
    borderColor: hexToRgba(colors.text.primary, 0.1),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: rbr(12),
    shadowColor: flatColors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' } : {}),
  },

  achievementToastIconWrap: {
    // Fixed-width tinted anchor so the icon reads on the dark surface.
    width: rf(36),
    height: rf(36),
    borderRadius: rf(18),
    backgroundColor: flatColors.successTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  achievementToastText: {
    flex: 1,
  },

  achievementToastTitle: {
    fontSize: rf(13),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    marginBottom: rp(2),
  },

  achievementToastDescription: {
    fontSize: rf(12),
    color: colors.text.secondary,
  },

  miniToast: {
    position: 'absolute',
    top: rp(120),
    alignSelf: 'center',
    // Flat dark pill with a primary-tinted hairline (was a solid primary fill).
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: rbr(20),
    // Toasts sit above sticky footers (1100) and below modal dialogs (1300).
    zIndex: 1200,
    elevation: 12,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.45),
    shadowColor: flatColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' } : {}),
  },

  miniToastText: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
