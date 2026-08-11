/**
 * AuroraStepRail — the single signature onboarding progress indicator (2026).
 *
 * Replaces the legacy stacked trio (gradient bar + numbered circles + "1/5"
 * counter) with ONE editorial element: a hairline glass capsule holding equal
 * step segments. The active step carries a spring-loaded aurora glow pill that
 * slides under it and shows the step name inline; completed steps get a tinted
 * fill + check; locked steps fade back. Completion reads through the rail
 * itself — no separate bar, no counter widget.
 *
 * Design language: Editorial Dark + aurora (surface tiers, hairline borders,
 * Manrope micro-caps). Research basis: 2026 segmented-gradient progress meters
 * (shadcn/SaaS UI blocks) + single-header-indicator onboarding patterns.
 *
 * Touch targets: every segment is >= 44x44pt — segments share the rail width
 * equally (flex: 1) and `minWidth: TOUCH` (Math.max floor) guarantees the
 * 44pt minimum even if the tab count grows or the rail narrows; labels keep
 * the "<Title> step" a11y contract used by existing tests.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { flatColors as colors, flatShadows, typography } from "../../theme/aurora-tokens";
import { rf, rw, rp, rbr } from "../../utils/responsive";

// ============================================================================
// TYPES
// ============================================================================

export interface AuroraStepRailTab {
  id: number;
  title: string;
  isCompleted: boolean;
  isAccessible: boolean;
}

interface AuroraStepRailProps {
  tabs: AuroraStepRailTab[];
  activeTab: number;
  /** When provided, accessible/completed/active segments become tappable. */
  onTabPress?: (tabId: number) => void;
}

// ============================================================================
// SEGMENT
// ============================================================================

interface SegmentProps {
  tab: AuroraStepRailTab;
  isActive: boolean;
  isInteractive: boolean;
  onPress?: () => void;
}

const TOUCH = Math.max(rw(24), 44);

const Segment: React.FC<SegmentProps> = ({
  tab,
  isActive,
  isInteractive,
  onPress,
}) => {
  const popAnim = useSharedValue(tab.isCompleted ? 1 : 0);

  useEffect(() => {
    popAnim.value = withSpring(tab.isCompleted ? 1 : 0, {
      damping: 11,
      stiffness: 180,
    });
  }, [tab.isCompleted]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + popAnim.value * 0.4 }],
    opacity: 0.4 + popAnim.value * 0.6,
  }));

  const isLocked = !tab.isAccessible && !tab.isCompleted && !isActive;
  const canPress = isInteractive && !isLocked;

  return (
    <Pressable
      style={[
        styles.segment,
        tab.isCompleted && !isActive && styles.segmentCompleted,
      ]}
      onPress={canPress ? onPress : undefined}
      disabled={!canPress}
      accessibilityRole={isInteractive ? "button" : "text"}
      accessibilityLabel={`${tab.title} step`}
      accessibilityState={
        isInteractive ? { selected: isActive, disabled: !canPress } : undefined
      }
    >
      {tab.isCompleted && !isActive ? (
        <Animated.View style={popStyle}>
          <Ionicons
            name="checkmark"
            size={rf(13)}
            color={colors.successAlt}
          />
        </Animated.View>
      ) : isActive ? (
        <Text style={styles.segmentTitleActive} numberOfLines={1}>
          {tab.title.toUpperCase()}
        </Text>
      ) : (
        <Text
          style={[
            styles.segmentNumber,
            tab.isAccessible && styles.segmentNumberAccessible,
            isLocked && styles.segmentNumberLocked,
          ]}
        >
          {tab.id}
        </Text>
      )}
    </Pressable>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AuroraStepRail: React.FC<AuroraStepRailProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const slideX = useSharedValue(0);
  const hasLaidOut = useRef(false);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab),
  );
  const segmentWidth = trackWidth > 0 ? trackWidth / tabs.length : 0;

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = activeIndex * segmentWidth;
    if (!hasLaidOut.current) {
      // First layout: land silently, springs only for user-driven moves.
      slideX.value = target;
      hasLaidOut.current = true;
    } else {
      slideX.value = withSpring(target, {
        damping: 17,
        stiffness: 170,
        mass: 0.7,
      });
    }
  }, [activeIndex, segmentWidth]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trackWidth) setTrackWidth(w);
  };

  return (
    <View style={styles.capsule}>
      <View style={styles.track} onLayout={handleLayout}>
        {segmentWidth > 0 && (
          <Animated.View
            style={[styles.glowPill, { width: segmentWidth }, glowStyle]}
            pointerEvents="none"
          />
        )}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Segment
              key={tab.id}
              tab={tab}
              isActive={isActive}
              isInteractive={!!onTabPress}
              onPress={() => onTabPress?.(tab.id)}
            />
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  capsule: {
    borderRadius: rbr(999),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    padding: rp(3),
  },

  track: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },

  // Active-step pill — flat accent fill (Editorial Dark: gradient is a scarce
  // brand resource, reserved for aurora/bloom moments, not the nav rail). The
  // old glow shadow stack (shadowOpacity 0.55 / elevation 6 / boxShadow) is
  // removed — depth comes from the hairline capsule, not cast shadows.
  glowPill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: rbr(999),
    backgroundColor: colors.primary,
    ...flatShadows.sm,
  },

  segment: {
    flex: 1,
    minWidth: TOUCH,
    height: TOUCH,
    borderRadius: rbr(999),
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  segmentCompleted: {
    backgroundColor: `${colors.successAlt}1F`,
  },

  segmentTitleActive: {
    fontSize: rf(9),
    fontWeight: typography.fontWeight.extrabold,
    letterSpacing: 1,
    color: colors.white,
  },

  segmentNumber: {
    fontSize: rf(10),
    fontWeight: typography.fontWeight.bold,
    color: `${colors.white}59`,
  },

  segmentNumberAccessible: {
    color: `${colors.white}A6`,
  },

  segmentNumberLocked: {
    color: `${colors.white}2E`,
  },
});

export default AuroraStepRail;
