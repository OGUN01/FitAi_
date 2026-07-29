/**
 * CollapsibleSection — THE replacement for SectionShell (docs/onboarding-fresh-design.md)
 *
 * NOT a card. A header row (SectionLabel + optional subtitle + chevron on the
 * right, hairline below). Tap toggles.
 *
 * CRITICAL BUG FIX (vs aurora SectionShell): when collapsed, content is
 * REMOVED from layout — the body height animates to 0 with `overflow: hidden`
 * (measured Reanimated height animation). The old shell collapsed OPACITY
 * only, leaving an invisible-but-full-height empty box. Never reintroduce
 * that: height must collapse, not just opacity.
 *
 * When expanded, the hairline sits above the content, then the content rows
 * render inline. Height changes inside an expanded section (e.g. chips added)
 * re-measure and animate smoothly.
 *
 * Controlled: pass `expanded` + `onToggle`. Uncontrolled: omit them and
 * optionally pass `defaultExpanded` (initial state; sections default to
 * collapsed).
 */

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { tokens, type as typeScale, spacing } from "./tokens";
import { SectionLabel } from "./SectionLabel";

const TOGGLE_DURATION = 250;
const PRESS_DURATION = 120;
const PRESS_OPACITY = 0.6;

export interface CollapsibleSectionProps {
  title: string;
  /** Optional helper line under the title (body type). */
  subtitle?: string;
  /** Controlled expanded state. Omit for uncontrolled. */
  expanded?: boolean;
  /** Called on every header tap. */
  onToggle?: () => void;
  /** Initial state for uncontrolled usage. @default false (collapsed) */
  defaultExpanded?: boolean;
  children: React.ReactNode;
  /** Extra container style. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  expanded,
  onToggle,
  defaultExpanded = false,
  children,
  style,
  testID,
}) => {
  const controlled = expanded !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlled ? (expanded as boolean) : internalExpanded;

  const [contentHeight, setContentHeight] = useState(0);
  const height = useSharedValue(isExpanded ? -1 : 0); // -1 = auto until measured
  const headerOpacity = useSharedValue(1);
  const chevron = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    height.value = withTiming(isExpanded ? contentHeight : 0, {
      duration: TOGGLE_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    chevron.value = withTiming(isExpanded ? 1 : 0, {
      duration: TOGGLE_DURATION,
    });
  }, [isExpanded, contentHeight, height, chevron]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: height.value < 0 ? undefined : height.value,
    overflow: "hidden",
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  const onContentLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - contentHeight) > 0.5) {
      setContentHeight(h);
    }
  };

  const handleToggle = () => {
    if (!controlled) setInternalExpanded((v) => !v);
    onToggle?.();
  };

  const onPressIn = () => {
    headerOpacity.value = withTiming(PRESS_OPACITY, { duration: PRESS_DURATION });
  };
  const onPressOut = () => {
    headerOpacity.value = withTiming(1, { duration: PRESS_DURATION });
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Pressable
        onPress={handleToggle}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={title}
      >
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <View style={styles.headerText}>
            <SectionLabel>{title}</SectionLabel>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={18} color={tokens.ink3} />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* Hairline: below the header / above the content. */}
      <View style={styles.hairline} />

      {/* Collapsing body — height animates to 0 when collapsed so content is
          removed from layout (the SectionShell empty-box bug fix). */}
      <Animated.View style={bodyStyle}>
        <View onLayout={onContentLayout} style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  header: {
    minHeight: spacing.rowH,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.m,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.m,
  },
  subtitle: {
    ...typeScale.body,
    marginTop: spacing.xs,
  },
  hairline: {
    height: spacing.hair,
    backgroundColor: tokens.hairline,
    alignSelf: "stretch",
  },
  content: {
    paddingTop: spacing.l,
  },
});

export default CollapsibleSection;
