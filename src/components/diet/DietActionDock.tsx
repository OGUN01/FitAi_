/**
 * DietActionDock — floating add button above the tab bar. Tapping it expands
 * every diet action into an opaque radial menu, keeping dashboard content clear.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  flatShadows,
} from '../../theme/aurora-tokens';
import { springConfig } from '../../theme/animations';
import { dimensions, rf, rh } from '../../utils/responsive';
import { fontFamilyForWeight } from '../../theme/fonts';

export interface DietActionDockProps {
  onScan: () => void;
  onBarcode: () => void;
  onLabel: () => void;
  onLog: () => void;
  onWater: () => void;
  testID?: string;
  hide?: SharedValue<number>;
}

interface DockAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  ariaLabel: string;
  onPress: () => void;
  testID: string;
  x: number;
  y: number;
}

const MENU_WIDTH = Math.min(dimensions.screenWidth, 393);
const MENU_HEIGHT = 220;
const ACTION_SIZE = 72;
const FAB_SIZE = 64;
const FAB_BOTTOM = 0;
const FAB_CENTER_X = MENU_WIDTH / 2;
const FAB_CENTER_Y = MENU_HEIGHT - FAB_SIZE / 2;
const RADIAL_RADIUS = Math.min(126, MENU_WIDTH / 2 - ACTION_SIZE / 2 - spacing.xs);
// Screen Y grows downward, so 180–360° keeps every action above the FAB.
const RADIAL_ANGLES = [200, 235, 270, 305, 340];

const RadialAction: React.FC<{
  action: DockAction;
  progress: SharedValue<number>;
  isOpen: boolean;
  onPress: (action: () => void) => void;
}> = React.memo(({ action, progress, isOpen, onPress }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [FAB_CENTER_X - (action.x + ACTION_SIZE / 2), 0]
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [FAB_CENTER_Y - (action.y + ACTION_SIZE / 2), 0]
        ),
      },
      { scale: interpolate(progress.value, [0, 1], [0.4, 1]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={isOpen ? 'auto' : 'none'}
      style={[styles.actionPosition, { left: action.x, top: action.y }, animatedStyle]}
    >
      <AnimatedPressable
        onPress={() => onPress(action.onPress)}
        scaleValue={0.9}
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel={action.ariaLabel}
        testID={action.testID}
        style={styles.actionButton}
      >
        <Ionicons name={action.icon} size={rf(22)} color={colors.primary} />
      </AnimatedPressable>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {action.label}
      </Text>
    </Animated.View>
  );
});

export const DietActionDock: React.FC<DietActionDockProps> = ({
  onScan,
  onBarcode,
  onLabel,
  onLog,
  onWater,
  testID,
  hide,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuProgress = useSharedValue(0);
  const hiddenOffset = rh(100);

  useEffect(() => {
    menuProgress.value = withSpring(isOpen ? 1 : 0, springConfig.smooth);
  }, [isOpen, menuProgress]);

  const containerStyle = useAnimatedStyle(() => {
    if (!hide) return { transform: [{ translateY: 0 }], opacity: 1 };
    const isHidden = hide.value > 0.5;
    return {
      transform: [
        { translateY: withSpring(isHidden ? hiddenOffset : 0, springConfig.smooth) },
      ],
      opacity: withSpring(isHidden ? 0 : 1, springConfig.smooth),
    };
  });

  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(menuProgress.value, [0, 1], [0, 45])}deg` }],
  }));

  const runAction = useCallback((action: () => void) => {
    setIsOpen(false);
    action();
  }, []);

  const actionDefinitions = [
    ['scan', 'camera-outline', 'Scan Food', 'Scan food', onScan, 'diet-dock-scan'],
    ['barcode', 'barcode-outline', 'Barcode', 'Scan barcode', onBarcode, 'diet-dock-barcode'],
    [
      'label',
      'document-text-outline',
      'Scan Label',
      'Scan nutrition label',
      onLabel,
      'diet-dock-label',
    ],
    ['log', 'restaurant-outline', 'Log Meal', 'Log meal', onLog, 'diet-dock-log'],
    ['water', 'water-outline', 'Water', 'Log water', onWater, 'diet-dock-water'],
  ] as const;

  const actions: DockAction[] = actionDefinitions.map((definition, index) => {
    const angle = (RADIAL_ANGLES[index] * Math.PI) / 180;
    return {
      id: definition[0],
      icon: definition[1],
      label: definition[2],
      ariaLabel: definition[3],
      onPress: definition[4],
      testID: definition[5],
      x: FAB_CENTER_X + Math.cos(angle) * RADIAL_RADIUS - ACTION_SIZE / 2,
      y: FAB_CENTER_Y + Math.sin(angle) * RADIAL_RADIUS - ACTION_SIZE / 2,
    };
  });

  return (
    <>
      {isOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close diet actions"
          onPress={() => setIsOpen(false)}
          style={styles.backdrop}
          testID="diet-dock-backdrop"
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={styles.backdropTint} />
        </Pressable>
      ) : null}

      <Animated.View
        pointerEvents="box-none"
        style={[styles.container, containerStyle]}
        testID={testID}
      >
        {actions.map((action) => (
        <RadialAction
          key={action.id}
          action={action}
          progress={menuProgress}
          isOpen={isOpen}
          onPress={runAction}
        />
      ))}

        <AnimatedPressable
          onPress={() => setIsOpen((open) => !open)}
          scaleValue={0.9}
          hapticType="medium"
          accessibilityRole="button"
          accessibilityLabel={isOpen ? 'Close diet actions' : 'Open diet actions'}
          accessibilityState={{ expanded: isOpen }}
          testID="diet-dock-more"
          containerStyle={styles.fabPosition}
          style={[styles.fab, isOpen && styles.fabOpen]}
        >
          <Animated.View style={fabIconStyle}>
            <Ionicons name="add" size={rf(32)} color={colors.background} />
          </Animated.View>
        </AnimatedPressable>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  container: {
    position: 'absolute' as const,
    left: '50%' as const,
    bottom: 0,
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
    marginLeft: -MENU_WIDTH / 2,
    zIndex: 11,
    elevation: 11,
  },
  actionPosition: {
    position: 'absolute' as const,
    width: ACTION_SIZE,
    alignItems: 'center' as const,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    ...flatShadows.md,
  },
  actionLabel: {
    minWidth: 68,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    overflow: 'hidden' as const,
    backgroundColor: colors.backgroundSecondary,
    color: colors.text,
    fontSize: rf(fontSize.micro),
    lineHeight: rf(14),
    fontFamily: fontFamilyForWeight('600'),
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  fabPosition: {
    position: 'absolute' as const,
    left: FAB_CENTER_X - FAB_SIZE / 2,
    bottom: FAB_BOTTOM,
    zIndex: 12,
    elevation: 12,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.backgroundSecondary,
    ...flatShadows.lg,
  },
  fabOpen: {
    backgroundColor: colors.primaryLight,
  },
});

export default DietActionDock;
