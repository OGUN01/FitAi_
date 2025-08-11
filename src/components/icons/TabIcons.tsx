import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../../utils/constants';

interface IconProps {
  size?: number;
  color?: string;
  active?: boolean;
}

// Home Icon
export const HomeIcon: React.FC<IconProps> = ({
  size = 24,
  color = THEME.colors.textMuted,
  active = false,
}) => (
  <View style={[styles.iconBase, { width: size, height: size }, active && styles.activeIcon]}>
    <View
      style={[
        styles.homeBase,
        {
          borderColor: active ? THEME.colors.primary : color,
          borderBottomColor: active ? THEME.colors.primary : color,
        },
      ]}
    />
    <View
      style={[
        styles.homeRoof,
        {
          borderBottomColor: active ? THEME.colors.primary : color,
        },
      ]}
    />
  </View>
);

// Fitness Icon (Dumbbell)
export const FitnessIcon: React.FC<IconProps> = ({
  size = 24,
  color = THEME.colors.textMuted,
  active = false,
}) => (
  <View style={[styles.iconBase, { width: size, height: size }, active && styles.activeIcon]}>
    <View
      style={[styles.dumbbellBar, { backgroundColor: active ? THEME.colors.primary : color }]}
    />
    <View
      style={[styles.dumbbellWeight1, { backgroundColor: active ? THEME.colors.primary : color }]}
    />
    <View
      style={[styles.dumbbellWeight2, { backgroundColor: active ? THEME.colors.primary : color }]}
    />
  </View>
);

// Diet Icon (Apple)
export const DietIcon: React.FC<IconProps> = ({
  size = 24,
  color = THEME.colors.textMuted,
  active = false,
}) => (
  <View style={[styles.iconBase, { width: size, height: size }, active && styles.activeIcon]}>
    <View
      style={[
        styles.apple,
        {
          borderColor: active ? THEME.colors.primary : color,
          backgroundColor: active ? `${THEME.colors.primary}20` : 'transparent',
        },
      ]}
    />
    <View style={[styles.appleLeaf, { backgroundColor: active ? THEME.colors.primary : color }]} />
  </View>
);

// Progress Icon (Chart)
export const ProgressIcon: React.FC<IconProps> = ({
  size = 24,
  color = THEME.colors.textMuted,
  active = false,
}) => (
  <View style={[styles.iconBase, { width: size, height: size }, active && styles.activeIcon]}>
    <View style={[styles.chartBar1, { backgroundColor: active ? THEME.colors.primary : color }]} />
    <View style={[styles.chartBar2, { backgroundColor: active ? THEME.colors.primary : color }]} />
    <View style={[styles.chartBar3, { backgroundColor: active ? THEME.colors.primary : color }]} />
  </View>
);

// Profile Icon
export const ProfileIcon: React.FC<IconProps> = ({
  size = 24,
  color = THEME.colors.textMuted,
  active = false,
}) => (
  <View style={[styles.iconBase, { width: size, height: size }, active && styles.activeIcon]}>
    <View
      style={[
        styles.profileHead,
        {
          borderColor: active ? THEME.colors.primary : color,
          backgroundColor: active ? `${THEME.colors.primary}20` : 'transparent',
        },
      ]}
    />
    <View
      style={[
        styles.profileBody,
        {
          borderColor: active ? THEME.colors.primary : color,
          backgroundColor: active ? `${THEME.colors.primary}20` : 'transparent',
        },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  iconBase: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  activeIcon: {
    // Active icon glow effect could be added here
  },

  // Home Icon Styles
  homeBase: {
    width: 14,
    height: 10,
    borderWidth: 1.5,
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 2,
  },

  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 2,
  },

  // Dumbbell Icon Styles
  dumbbellBar: {
    width: 12,
    height: 2,
    position: 'absolute',
  },

  dumbbellWeight1: {
    width: 3,
    height: 8,
    position: 'absolute',
    left: -2,
  },

  dumbbellWeight2: {
    width: 3,
    height: 8,
    position: 'absolute',
    right: -2,
  },

  // Apple Icon Styles
  apple: {
    width: 12,
    height: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    position: 'absolute',
    bottom: 1,
  },

  appleLeaf: {
    width: 4,
    height: 2,
    borderRadius: 2,
    position: 'absolute',
    top: 2,
    right: 4,
  },

  // Chart Icon Styles
  chartBar1: {
    width: 3,
    height: 8,
    position: 'absolute',
    left: 2,
    bottom: 2,
  },

  chartBar2: {
    width: 3,
    height: 12,
    position: 'absolute',
    left: 7,
    bottom: 2,
  },

  chartBar3: {
    width: 3,
    height: 6,
    position: 'absolute',
    right: 2,
    bottom: 2,
  },

  // Profile Icon Styles
  profileHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    position: 'absolute',
    top: 2,
  },

  profileBody: {
    width: 14,
    height: 8,
    borderRadius: 7,
    borderWidth: 1.5,
    position: 'absolute',
    bottom: 2,
  },
});
