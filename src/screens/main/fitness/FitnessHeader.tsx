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
  /**
   * Top safe-area inset, applied as the header's paddingTop so the greeting
   * clears the status bar. Passed from FitnessScreen (which reads it via
   * useSafeAreaInsets) because the wrapping SafeAreaView only owns the bottom
   * edge. Falls back to spacing.lg when unset (e.g. tests / no provider).
   */
  paddingTop?: number;
}

export const FitnessHeader: React.FC<FitnessHeaderProps> = ({
  userName,
  onCalendarPress,
  paddingTop,
}) => {
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
    <Animated.View
      entering={FadeInDown.delay(100).duration(400)}
      // paddingTop = top safe-area inset + spacing.lg, mirroring DietScreen's
      // rhythm (SafeAreaView top inset + topBar paddingTop spacing.lg) so the
      // Workout greeting sits at the same vertical position as the Diet title.
      style={[
        styles.container,
        { paddingTop: (paddingTop ?? 0) + rp(spacing.lg) },
      ]}
    >
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
    // paddingTop is set inline from the top safe-area inset (see paddingTop
    // prop) so the greeting clears the status bar reliably across devices.
    paddingBottom: rp(spacing.xs),
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  // Sized to match HomeHeader.userName (rf(22)) — the proven "fine" tab —
  // instead of the oversized rf(32) that crowded the top. Keeps the greeting
  // identity but at a scale consistent with Diet/Home.
  greeting: {
    fontSize: rf(22),
    fontFamily: FONT_FAMILY.extrabold,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: rf(28),
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
