import React from "react";
import { View, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rs, rbr } from "../../utils/responsive";

interface IconProps {
  size?: number;
  color?: string;
  active?: boolean;
}

// Home Icon
export const HomeIcon: React.FC<IconProps> = ({
  size = 24,
  color = ResponsiveTheme.colors.textMuted,
  active = false,
}) => (
  <View
    style={[
      styles.iconBase,
      { width: size, height: size },
      active && styles.activeIcon,
    ]}
  >
    <View
      style={[
        styles.homeBase,
        {
          borderColor: active ? ResponsiveTheme.colors.primary : color,
          borderBottomColor: active ? ResponsiveTheme.colors.primary : color,
        },
      ]}
    />
    <View
      style={[
        styles.homeRoof,
        {
          borderBottomColor: active ? ResponsiveTheme.colors.primary : color,
        },
      ]}
    />
  </View>
);

// Fitness Icon (Dumbbell)
export const FitnessIcon: React.FC<IconProps> = ({
  size = 24,
  color = ResponsiveTheme.colors.textMuted,
  active = false,
}) => (
  <View
    style={[
      styles.iconBase,
      { width: size, height: size },
      active && styles.activeIcon,
    ]}
  >
    <View
      style={[
        styles.dumbbellBar,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    <View
      style={[
        styles.dumbbellWeight1,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    <View
      style={[
        styles.dumbbellWeight2,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
  </View>
);

// Diet Icon (Apple)
export const DietIcon: React.FC<IconProps> = ({
  size = 24,
  color = ResponsiveTheme.colors.textMuted,
  active = false,
}) => (
  <View
    style={[
      styles.iconBase,
      { width: size, height: size },
      active && styles.activeIcon,
    ]}
  >
    <View
      style={[
        styles.apple,
        {
          borderColor: active ? ResponsiveTheme.colors.primary : color,
          backgroundColor: active ? `${ResponsiveTheme.colors.primary}20` : "transparent",
        },
      ]}
    />
    <View
      style={[
        styles.appleLeaf,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
  </View>
);

// Progress Icon (Chart)
export const ProgressIcon: React.FC<IconProps> = ({
  size = 24,
  color = ResponsiveTheme.colors.textMuted,
  active = false,
}) => (
  <View
    style={[
      styles.iconBase,
      { width: size, height: size },
      active && styles.activeIcon,
    ]}
  >
    <View
      style={[
        styles.chartBar1,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    <View
      style={[
        styles.chartBar2,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    <View
      style={[
        styles.chartBar3,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
  </View>
);

// Analytics Icon (Line Chart - redesigned with thicker strokes for web clarity)
export const AnalyticsIcon: React.FC<IconProps> = ({
  size = 24,
  color = ResponsiveTheme.colors.textMuted,
  active = false,
}) => (
  <View
    style={[
      styles.iconBase,
      { width: size, height: size },
      active && styles.activeIcon,
    ]}
  >
    {/* Three vertical bars at different heights to represent a chart */}
    <View
      style={[
        styles.analyticsBar1,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    <View
      style={[
        styles.analyticsBar2,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    <View
      style={[
        styles.analyticsBar3,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    {/* Baseline */}
    <View
      style={[
        styles.analyticsBaseline,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
    {/* Trend dot on top of tallest bar */}
    <View
      style={[
        styles.analyticsDot,
        { backgroundColor: active ? ResponsiveTheme.colors.primary : color },
      ]}
    />
  </View>
);

// Profile Icon
export const ProfileIcon: React.FC<IconProps> = ({
  size = 24,
  color = ResponsiveTheme.colors.textMuted,
  active = false,
}) => (
  <View
    style={[
      styles.iconBase,
      { width: size, height: size },
      active && styles.activeIcon,
    ]}
  >
    <View
      style={[
        styles.profileHead,
        {
          borderColor: active ? ResponsiveTheme.colors.primary : color,
          backgroundColor: active ? `${ResponsiveTheme.colors.primary}20` : "transparent",
        },
      ]}
    />
    <View
      style={[
        styles.profileBody,
        {
          borderColor: active ? ResponsiveTheme.colors.primary : color,
          backgroundColor: active ? `${ResponsiveTheme.colors.primary}20` : "transparent",
        },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  iconBase: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  activeIcon: {
    // Active icon glow effect could be added here
  },

  // Home Icon Styles
  homeBase: {
    width: rs(14),
    height: rs(10),
    borderWidth: 1.5,
    borderTopWidth: 0,
    position: "absolute",
    bottom: 2,
  },

  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    position: "absolute",
    top: 2,
  },

  // Dumbbell Icon Styles
  dumbbellBar: {
    width: rs(12),
    height: rs(2),
    position: "absolute",
  },

  dumbbellWeight1: {
    width: rs(3),
    height: rs(8),
    position: "absolute",
    left: -2,
  },

  dumbbellWeight2: {
    width: rs(3),
    height: rs(8),
    position: "absolute",
    right: -2,
  },

  // Apple Icon Styles
  apple: {
    width: rs(12),
    height: rs(14),
    borderRadius: rbr(8),
    borderWidth: 1.5,
    position: "absolute",
    bottom: 1,
  },

  appleLeaf: {
    width: rs(7),
    height: rs(2),
    borderRadius: rbr(4),
    position: "absolute",
    top: 6,
    right: 3,
    transform: [{ rotate: "-45deg" }],
  },

  // Chart Icon Styles
  chartBar1: {
    width: rs(3),
    height: rs(8),
    position: "absolute",
    left: 2,
    bottom: 2,
  },

  chartBar2: {
    width: rs(3),
    height: rs(12),
    position: "absolute",
    left: 7,
    bottom: 2,
  },

  chartBar3: {
    width: rs(3),
    height: rs(6),
    position: "absolute",
    right: 2,
    bottom: 2,
  },

  // Profile Icon Styles
  profileHead: {
    width: rs(8),
    height: rs(8),
    borderRadius: rbr(4),
    borderWidth: 1.5,
    position: "absolute",
    top: 2,
  },

  profileBody: {
    width: rs(14),
    height: rs(8),
    borderRadius: rbr(7),
    borderWidth: 1.5,
    position: "absolute",
    bottom: 2,
  },

  // Analytics Icon Styles (Bar Chart with trend dot)
  analyticsBar1: {
    width: rs(3),
    height: rs(6),
    borderRadius: rbr(1),
    position: "absolute",
    left: 3,
    bottom: 3,
  },

  analyticsBar2: {
    width: rs(3),
    height: rs(12),
    borderRadius: rbr(1),
    position: "absolute",
    left: 8,
    bottom: 3,
  },

  analyticsBar3: {
    width: rs(3),
    height: rs(8),
    borderRadius: rbr(1),
    position: "absolute",
    right: 3,
    bottom: 3,
  },

  analyticsBaseline: {
    width: rs(18),
    height: rs(1.5),
    position: "absolute",
    bottom: 2,
    borderRadius: rbr(1),
  },

  analyticsDot: {
    width: rs(3),
    height: rs(3),
    borderRadius: rbr(2),
    position: "absolute",
    left: 8,
    top: 3,
  },
});
