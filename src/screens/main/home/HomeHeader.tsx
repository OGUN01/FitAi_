/**
 * HomeHeader Component
 * Premium header with greeting, date, weather-style summary
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing, typography } from '../../../theme/aurora-tokens';
import { rf, rw, rp, rs } from '../../../utils/responsive';

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
    // Tab screens stay mounted for the whole session, so time-of-day must be
    // live state, not a mount-time memo — otherwise a session crossing noon
    // keeps saying "Good morning". Refresh on app foregrounding and on a slow
    // interval so the greeting/date roll over while the tab sits mounted.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
      const refresh = () => setNow(new Date());
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') refresh();
      });
      const interval = setInterval(refresh, 60_000);
      return () => {
        subscription.remove();
        clearInterval(interval);
      };
    }, []);

    const { greeting, icon, accentColor } = useMemo(() => {
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) {
        return {
          greeting: 'Good morning',
          icon: 'sunny' as const,
          accentColor: colors.warning,
        };
      }
      if (hour >= 12 && hour < 18) {
        return {
          greeting: 'Good afternoon',
          icon: 'partly-sunny' as const,
          accentColor: colors.accent,
        };
      }
      return {
        greeting: 'Good evening',
        icon: 'moon' as const,
        accentColor: colors.primary,
      };
    }, [now]);

    const todayDate = useMemo(
      () =>
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
      [now]
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
            <View style={[styles.avatar, { backgroundColor: accentColor }]}>
              <Text style={styles.avatarText}>{(userInitial || '').toUpperCase()}</Text>
            </View>
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
                color={accentColor}
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
  avatar: {
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    borderRadius: Math.max(rs(20), 22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: rf(16),
    fontWeight: typography.fontWeight.extrabold,
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
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  greetingIcon: {
    marginLeft: rp(4),
  },
  userName: {
    fontSize: rf(22),
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: rp(2),
  },
  dateText: {
    fontSize: rf(12),
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginTop: rp(2),
    opacity: 0.75,
  },
  dayLabel: {
    fontSize: rf(12),
    fontWeight: typography.fontWeight.semibold,
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
    fontWeight: typography.fontWeight.extrabold,
    color: colors.errorLight,
    fontVariant: ['tabular-nums'],
  },
});

export default HomeHeader;
