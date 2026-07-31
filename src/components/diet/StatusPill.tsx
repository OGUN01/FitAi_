import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
} from '../../theme/aurora-tokens';
import { rf } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW } from '../../utils/colors';
import { MealPlanStatus } from './dietViewModel';
import { fontFamilyForWeight } from '../../theme/fonts';

export interface StatusPillProps {
  status: MealPlanStatus;
  size?: 'sm' | 'md';
  testID?: string;
}

const STATUS_CONFIG: Record<
  MealPlanStatus,
  {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    bg: string;
  }
> = {
  completed: {
    icon: 'checkmark-circle',
    label: 'Completed',
    color: colors.success,
    bg: hexToRgba(colors.success, TINT_ALPHA_LOW),
  },
  in_progress: {
    icon: 'time-outline',
    label: 'In Progress',
    // info (blue) — "active now", not the warning/caution semantics amber
    // carries. Collapses the dashboard accent palette from 7 → 4.
    color: colors.info,
    bg: hexToRgba(colors.info, TINT_ALPHA_LOW),
  },
  upcoming: {
    icon: 'hourglass-outline',
    label: 'Upcoming',
    // muted — a future meal isn't a separate semantic category; the pill
    // reads as neutral until the meal is active or done.
    color: colors.textMuted,
    bg: colors.surface,
  },
};

export const StatusPill: React.FC<StatusPillProps> = React.memo(
  ({ status, size = 'md', testID }) => {
    const config = STATUS_CONFIG[status];
    const isSmall = size === 'sm';
    const iconSize = isSmall ? rf(14) : rf(16);
    const textSize = isSmall ? fontSize.xs : fontSize.sm;

    return (
      <View testID={testID} style={[styles.container, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={iconSize} color={config.color} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[styles.label, { color: config.color, fontSize: rf(textSize) }]}
        >
          {config.label}
        </Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  label: {
    fontFamily: fontFamilyForWeight('600'),
    fontWeight: '600' as const,
  },
});

export default StatusPill;
