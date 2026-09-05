import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { rp, rh, rw, rf } from '../../utils/responsive';
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  borderRadius,
} from '../../theme/aurora-tokens';
import { FONT_FAMILY } from '../../theme/fonts';
import { useReducedMotion } from '../../utils/accessibility/hooks';

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth } = Dimensions.get('window');

interface TabItem {
  key: string;
  title: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  // Sliding active-tab indicator — a short accent hairline bar that hangs just
  // below the container's top border, centered over the active tab. One shared
  // bar slides between tabs (reanimated spring) instead of every tab rendering
  // its own opacity-toggled dot. Absolutely positioned, so tab content never
  // reflows when the active tab changes. Measurement technique mirrors
  // AuroraStepRail: onLayout on the row + first layout lands silently.
  const paddingH = rp(spacing.sm);
  const barWidth = rw(24);
  const [rowWidth, setRowWidth] = useState(0);
  const slideX = useSharedValue(0);
  const hasLaidOut = useRef(false);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === activeTab),
  );
  const innerWidth = rowWidth > 0 ? rowWidth - paddingH * 2 : 0;
  const segmentWidth = innerWidth > 0 && tabs.length > 0 ? innerWidth / tabs.length : 0;

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = paddingH + activeIndex * segmentWidth + (segmentWidth - barWidth) / 2;
    if (!hasLaidOut.current) {
      // First layout: land silently, springs only for user-driven moves.
      slideX.value = target;
      hasLaidOut.current = true;
    } else if (reducedMotion) {
      slideX.value = target;
    } else {
      slideX.value = withSpring(target, {
        damping: 17,
        stiffness: 170,
        mass: 0.7,
      });
    }
  }, [activeIndex, segmentWidth, paddingH, barWidth, reducedMotion, slideX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const handleRowLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== rowWidth) setRowWidth(w);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: surface[1],
          paddingBottom: Math.max(insets.bottom, rp(spacing.sm)),
          borderTopWidth: 1,
          borderTopColor: border.subtle,
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            height: rh(60),
            paddingHorizontal: paddingH,
          },
        ]}
        onLayout={handleRowLayout}
      >
        {/* Rendered only once the row has been measured (graceful on web while
            measurement is pending — no off-screen flash, no wrong-position
            frame). pointerEvents none so it never intercepts tab presses. */}
        {segmentWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: barWidth,
                height: rh(3),
                borderRadius: borderRadius.full,
                backgroundColor: colors.primary.DEFAULT,
              },
              indicatorStyle,
            ]}
          />
        )}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.tab,
                {
                  paddingVertical: rp(spacing.sm),
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => onTabPress(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.title}
              accessibilityState={{ selected: isActive }}
              testID={`tab-${tab.key}`}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    marginBottom: rp(4),
                  },
                ]}
              >
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
              </View>

              <Text
                style={[
                  styles.tabText,
                  {
                    fontFamily: isActive ? FONT_FAMILY.semibold : typography.variants.caption.fontFamily,
                    fontSize: rf(typography.variants.caption.fontSize),
                    color: isActive ? colors.primary.DEFAULT : colors.text.tertiary,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // All responsive styles moved to inline to prevent module-level crash
  },

  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },

  // Active-tab indicator — flat accent hairline bar (Editorial Dark: no
  // gradient, no glow, no shadow). Slides horizontally via translateX; sits at
  // the top edge of the row so it reads as one system with the container's
  // hairline top border.
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 44,
  },

  iconContainer: {
    // All responsive styles moved to inline
  },

  tabText: {
    textAlign: 'center',
  },
});
