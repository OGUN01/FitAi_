/**
 * SectionShell — section container, replaces the legacy glass card (blueprint §7.3)
 *
 * The ONLY section container allowed in onboarding. surface.1, border.subtle
 * 1dp, radius 20, padding spacing.lg. Supports an optional collapsible header
 * (title/subtitle + chevron) that animates height+opacity over 250ms and a
 * 0.97 spring press on the header. Enters via FadeInDown 300ms with `delay`.
 *
 * Rules: NO drop shadows, NO nested SectionShells, max ONE surface depth
 * (surface.1) inside.
 */

import React, { useEffect } from "react";
import { StyleSheet, View, Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  spacing,
  typography,
  colors,
} from "../../../theme/aurora-tokens";

// Header press spring (blueprint §7.3).
const HEADER_SPRING = { damping: 14, stiffness: 140 };

export interface SectionShellProps {
  title?: string;
  subtitle?: string;
  /** When provided (with onToggleCollapse), the shell becomes collapsible. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
  /** FadeInDown stagger delay in ms. @default 0 */
  delay?: number;
  /** Extra container style. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SectionShell: React.FC<SectionShellProps> = ({
  title,
  subtitle,
  collapsed,
  onToggleCollapse,
  children,
  delay = 0,
  style,
  testID,
}) => {
  const collapsible = typeof collapsed === "boolean" && !!onToggleCollapse;
  const headerScale = useSharedValue(1);
  const contentOpacity = useSharedValue(collapsed ? 0 : 1);

  useEffect(() => {
    contentOpacity.value = withTiming(collapsed ? 0 : 1, { duration: 250 });
  }, [collapsed, contentOpacity]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const onPressIn = () => {
    if (collapsible) headerScale.value = withSpring(0.97, HEADER_SPRING);
  };
  const onPressOut = () => {
    if (collapsible) headerScale.value = withSpring(1, HEADER_SPRING);
  };

  const hasHeader = !!title || collapsible;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(delay)}
      style={[styles.container, style]}
      testID={testID}
    >
      {hasHeader && (
        <Pressable
          onPress={collapsible ? onToggleCollapse : undefined}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={!collapsible}
          accessibilityRole={collapsible ? "button" : "header"}
          accessibilityState={collapsible ? { expanded: !collapsed } : undefined}
          accessibilityLabel={title}
        >
          <Animated.View style={styles.header}>
            <Animated.View style={headerAnimatedStyle}>
              <View style={styles.headerText}>
                {title && (
                  <Animated.Text style={styles.title}>{title}</Animated.Text>
                )}
                {subtitle && (
                  <Animated.Text style={styles.subtitle}>
                    {subtitle}
                  </Animated.Text>
                )}
              </View>
            </Animated.View>
            {collapsible && (
              <Ionicons
                name={collapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color={colors.text.tertiary}
                style={styles.chevron}
              />
            )}
          </Animated.View>
        </Pressable>
      )}
      <Animated.View style={[styles.body, contentStyle]} pointerEvents={collapsed ? "none" : "auto"}>
        {children}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: typography.variants.sectionTitle.fontFamily,
    fontSize: typography.variants.sectionTitle.fontSize,
    lineHeight: typography.variants.sectionTitle.lineHeight,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.xxs,
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.lineHeight,
    color: colors.text.secondary,
  },
  body: {
    // Children provide their own layout; the body just holds the animated
    // opacity for collapse.
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
