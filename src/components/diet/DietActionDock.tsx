/**
 * DietActionDock — horizontally-scrolling "dial" of quick actions pinned above
 * the tab bar. Restores the full action set the old DietQuickActions carried
 * (Scan Dish, Barcode, Label, Log Meal, Water, Recipes) so no capability is
 * hidden behind a modal — every entry point is one tap away from the tab.
 *
 * Design: a single accent (colors.primary) so the row reads as one cohesive
 * control, not a christmas tree of per-action hues (the old multi-color row
 * was noisy). Tints lift only on the icon disc. Auto-hides on scroll-down /
 * reveals on scroll-up via the optional `hide` shared value.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { springConfig } from '../../theme/animations';
import { rf, rh, rw } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW } from '../../utils/colors';
import { fontFamilyForWeight } from '../../theme/fonts';

export interface DietActionDockProps {
  onScan: () => void;
  onBarcode: () => void;
  onLabel: () => void;
  onLog: () => void;
  onWater: () => void;
  onRecipes: () => void;
  testID?: string;
  /**
   * Reanimated shared value carrying a boolean (0 = visible, 1 = hidden).
   * The dock auto-hides on scroll-down and reveals on scroll-up, mirroring the
   * Google/Apple premium pattern so it never covers content while reading.
   * When omitted, the dock is always visible.
   */
  hide?: SharedValue<number>;
}

interface DockAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  ariaLabel: string;
  onPress: () => void;
  testID: string;
}

const DockButton: React.FC<{ action: DockAction }> = React.memo(({ action }) => {
  const glow = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4 * glow.value,
    shadowRadius: 14,
    elevation: 5 * glow.value,
  }));

  return (
    <AnimatedPressable
      onPress={action.onPress}
      scaleValue={0.92}
      hapticType="light"
      accessibilityRole="button"
      accessibilityLabel={action.ariaLabel}
      testID={action.testID}
      style={styles.button}
      onPressIn={() => {
        glow.value = withTiming(1, { duration: 100 });
      }}
      onPressOut={() => {
        glow.value = withTiming(0, { duration: 300 });
      }}
    >
      <Animated.View style={[styles.iconWrap, glowStyle]}>
        <Ionicons name={action.icon} size={rf(16)} color={colors.primary} />
      </Animated.View>
      <Text
        style={styles.label}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {action.label}
      </Text>
    </AnimatedPressable>
  );
});

export const DietActionDock: React.FC<DietActionDockProps> = ({
  onScan,
  onBarcode,
  onLabel,
  onLog,
  onWater,
  onRecipes,
  testID,
  hide,
}) => {
  // Auto-hide on scroll-down / reveal on scroll-up. `hide` is a shared value
  // (0 = visible, 1 = hidden) driven by DietScreen's onScroll handler. We
  // animate translateY + opacity with a spring so the dock glides off the
  // bottom edge instead of snapping. When `hide` is undefined (no scroll
  // wiring) the dock stays permanently visible — the original behaviour.
  const animatedStyle = useAnimatedStyle(() => {
    if (!hide) {
      return { transform: [{ translateY: 0 }], opacity: 1 };
    }
    const isHidden = hide.value > 0.5;
    return {
      transform: [
        {
          translateY: withSpring(isHidden ? rh(100) : 0, springConfig.smooth),
        },
      ],
      opacity: withSpring(isHidden ? 0 : 1, springConfig.smooth),
    };
  });

  const actions: DockAction[] = [
    { id: 'scan', icon: 'camera-outline', label: 'Scan', ariaLabel: 'Scan dish', onPress: onScan, testID: 'diet-dock-scan' },
    { id: 'barcode', icon: 'barcode-outline', label: 'Barcode', ariaLabel: 'Scan barcode', onPress: onBarcode, testID: 'diet-dock-barcode' },
    { id: 'label', icon: 'document-text-outline', label: 'Label', ariaLabel: 'Scan nutrition label', onPress: onLabel, testID: 'diet-dock-label' },
    { id: 'log', icon: 'restaurant-outline', label: 'Log', ariaLabel: 'Log meal', onPress: onLog, testID: 'diet-dock-log' },
    { id: 'water', icon: 'water-outline', label: 'Water', ariaLabel: 'Log water', onPress: onWater, testID: 'diet-dock-water' },
    { id: 'recipes', icon: 'book-outline', label: 'Recipes', ariaLabel: 'Recipes', onPress: onRecipes, testID: 'diet-dock-recipes' },
  ];

  return (
    <Animated.View style={[styles.dock, animatedStyle]} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {actions.map((action) => (
          <DockButton key={action.id} action={action} />
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dock: {
    position: 'absolute' as const,
    left: spacing.md,
    right: spacing.md,
    // Sit just above the tab bar, not floating mid-screen. rh(72) clears the
    // tab bar (~56px) + a small gap; clamped so short viewports keep it on-screen.
    bottom: Math.max(rh(72), 72),
    backgroundColor: hexToRgba(colors.backgroundSecondary, 0.96),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    // Subtle elevation so the dock floats above the feed, not flush with it.
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: rh(3) },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  scrollContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 0,
  },
  button: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flex: 1 as const,
    paddingVertical: spacing.xs,
    minHeight: 48, // ≥44px touch target
  },
  iconWrap: {
    width: rw(30),
    height: rw(30),
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
  },
  label: {
    fontSize: rf(fontSize.micro),
    fontFamily: fontFamilyForWeight('600'),
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default DietActionDock;
