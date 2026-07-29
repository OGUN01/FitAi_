/**
 * HomeHeader Component
 * Premium header with greeting, date, weather-style summary
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing } from '../../../theme/aurora-tokens';
import { rf, rw, rp, rs } from '../../../utils/responsive';

const avatarGradientShadow = {
  shadowColor: colors.black,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
};

interface HomeHeaderProps {
  userName: string;
  userInitial: string;
  streak: number;
  onProfilePress: () => void;
  onNotificationPress?: () => void;
  onStreakPress?: () => void;
  notificationCount?: number;
  dayLabel?: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = React.memo(
  ({ userName, userInitial, streak, onProfilePress, onStreakPress, dayLabel }) => {
    const hour = new Date().getHours();
    const { greeting, icon, gradientColors } = useMemo(() => {
      if (hour >= 5 && hour < 12) {
        return {
          greeting: 'Good morning',
          icon: 'sunny' as const,
          gradientColors: ['#FF9500', '#FF6B00'] as [string, string],
        };
      }
      if (hour >= 12 && hour < 18) {
        return {
          greeting: 'Good afternoon',
          icon: 'partly-sunny' as const,
          gradientColors: [colors.errorLight, colors.accent] as [string, string],
        };
      }
      return {
        greeting: 'Good evening',
        icon: 'moon' as const,
        gradientColors: [colors.primary, colors.primaryDark] as [string, string],
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const todayDate = useMemo(
      () =>
        new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    return (
      <View style={styles.container}>
        {/* Main Header Row */}
        <View style={styles.headerRow}>
          {/* Left: Avatar */}
          <AnimatedPressable
            onPress={onProfilePress}
            scaleValue={0.95}
            hapticFeedback={true}
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Profile"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatarGradient, Platform.OS !== 'web' && avatarGradientShadow]}
            >
              <Text style={styles.avatarText}>{(userInitial || '').toUpperCase()}</Text>
            </LinearGradient>
          </AnimatedPressable>

          {/* Center: Greeting + Name */}
          <View style={styles.greetingSection}>
            <View style={styles.greetingRow}>
              <Text style={styles.greetingText} numberOfLines={1}>
                {greeting},
              </Text>
              <Ionicons
                name={icon}
                size={rf(14)}
                color={gradientColors[0]}
                style={styles.greetingIcon}
              />
            </View>
            <Text
              style={styles.userName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {userName}
            </Text>
            <Text style={styles.dateText} numberOfLines={1}>
              {todayDate}
              {dayLabel ? (
                <Text style={styles.dayLabel} numberOfLines={1}>
                  {' · '}
                  {dayLabel}
                </Text>
              ) : null}
            </Text>
          </View>

          {/* Right: Actions */}
          <View style={styles.rightSection}>
            {/* Streak Badge */}
            {streak > 0 && (
              <AnimatedPressable
                onPress={onStreakPress}
                scaleValue={0.92}
                hapticFeedback={true}
                hapticType="light"
                style={styles.streakBadge}
                accessibilityRole="button"
                accessibilityLabel={`${streak} day streak`}
              >
                <Ionicons name="flame" size={rf(16)} color={colors.errorLight} />
                <Text style={styles.streakNumber} numberOfLines={1}>
                  {streak}
                </Text>
              </AnimatedPressable>
            )}
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: rp(16),
    paddingTop: rp(4),
    paddingBottom: rp(8),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarGradient: {
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    borderRadius: Math.max(rs(20), 22),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  avatarText: {
    fontSize: rf(16),
    fontWeight: '800',
    color: colors.white,
  },
  greetingSection: {
    flex: 1,
    minWidth: 0,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: rf(13),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  greetingIcon: {
    marginLeft: rp(4),
  },
  userName: {
    fontSize: rf(22),
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: rp(2),
  },
  dateText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: colors.text,
    marginTop: rp(2),
    opacity: 0.75,
  },
  dayLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.primary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(4),
    backgroundColor: colors.errorTint,
    paddingHorizontal: rp(10),
    paddingVertical: rp(6),
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: colors.primaryFaded,
  },
  streakNumber: {
    fontSize: rf(15),
    fontWeight: '800',
    color: colors.errorLight,
  },
});

export default HomeHeader;
