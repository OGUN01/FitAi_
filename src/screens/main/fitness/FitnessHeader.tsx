/**
 * FitnessHeader Component
 * Editorial header: oversized extrabold greeting + muted date subline.
 * Right side: circular calendar quick access (subtle tinted bg, no border box).
 *
 * Greeting logic (morning/afternoon/evening by hour) is unchanged from the
 * previous compact header — only the typography is now editorial.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing } from '../../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../../theme/fonts';
import { rf, rw, rp, rbr } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';

interface FitnessHeaderProps {
  userName: string;
  onCalendarPress?: () => void;
}

export const FitnessHeader: React.FC<FitnessHeaderProps> = ({ userName, onCalendarPress }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    // Daypart boundaries match HomeHeader (afternoon = 12–18) so the greeting
    // stays consistent when the user switches between Home and Workout tabs.
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Single editorial line: "Good morning, Alex" (no trailing comma when the
  // name is unavailable — e.g. profile still loading).
  const greeting = userName ? `${getGreeting()}, ${userName}` : getGreeting();
  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.container}>
      {/* Left: editorial greeting + muted date subline */}
      <View style={styles.textContainer}>
        <Text style={styles.greeting} numberOfLines={2} ellipsizeMode="tail">
          {greeting}
        </Text>
        <Text style={styles.dateLine} numberOfLines={1}>
          {dateLine}
        </Text>
      </View>

      {/* Right: circular calendar quick access */}
      <AnimatedPressable
        onPress={onCalendarPress}
        scaleValue={0.92}
        hapticFeedback={true}
        hapticType="light"
        style={styles.calendarButton}
        accessibilityRole="button"
        accessibilityLabel="Calendar"
      >
        <View style={styles.calendarIconContainer}>
          <Ionicons name="calendar-outline" size={rf(20)} color={colors.text} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rp(spacing.lg),
    paddingTop: rp(spacing.md),
    paddingBottom: rp(spacing.lg),
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: rf(32),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: rf(38),
  },
  dateLine: {
    fontSize: rf(13),
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.1,
    marginTop: rp(spacing.xs),
  },
  calendarButton: {
    marginLeft: rp(spacing.md),
  },
  calendarIconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rbr(22),
    backgroundColor: hexToRgba(colors.text, 0.08),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FitnessHeader;
