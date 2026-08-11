import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors } from "../../theme/aurora-tokens";

interface IconProps {
  size?: number;
  color?: string;
  active?: boolean;
}

// Bottom tab-bar icons. These render via Ionicons (the same icon set used
// everywhere else in the app — GlassButton, EmptyState, CustomDialog,
// BottomSheet) rather than hand-drawn View shapes, so the tab bar matches
// the fidelity of the rest of the chrome. Active state swaps the filled
// glyph in and tints it primary; inactive uses the outline glyph.

export const HomeIcon: React.FC<IconProps> = ({
  size = 24,
  color = colors.textMuted,
  active = false,
}) => (
  <Ionicons
    name={active ? "home" : "home-outline"}
    size={size}
    color={active ? colors.primary : color}
  />
);

export const FitnessIcon: React.FC<IconProps> = ({
  size = 24,
  color = colors.textMuted,
  active = false,
}) => (
  <Ionicons
    name={active ? "barbell" : "barbell-outline"}
    size={size}
    color={active ? colors.primary : color}
  />
);

export const DietIcon: React.FC<IconProps> = ({
  size = 24,
  color = colors.textMuted,
  active = false,
}) => (
  <Ionicons
    name={active ? "nutrition" : "nutrition-outline"}
    size={size}
    color={active ? colors.primary : color}
  />
);

export const AnalyticsIcon: React.FC<IconProps> = ({
  size = 24,
  color = colors.textMuted,
  active = false,
}) => (
  <Ionicons
    name={active ? "stats-chart" : "stats-chart-outline"}
    size={size}
    color={active ? colors.primary : color}
  />
);

export const ProfileIcon: React.FC<IconProps> = ({
  size = 24,
  color = colors.textMuted,
  active = false,
}) => (
  <Ionicons
    name={active ? "person" : "person-outline"}
    size={size}
    color={active ? colors.primary : color}
  />
);
