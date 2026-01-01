/**
 * SectionHeader Component
 * Standardized section header with icon, title, and optional action button
 * Fixes Issue #6, #25 - Consistent section title patterns
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw } from '../../utils/responsive';

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  actionText?: string;
  onActionPress?: () => void;
  accessibilityLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  iconColor = ResponsiveTheme.colors.primary,
  actionText,
  onActionPress,
  accessibilityLabel,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={rf(20)} 
            color={iconColor} 
            style={styles.icon}
          />
        )}
        <Text 
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel={accessibilityLabel || title}
        >
          {title}
        </Text>
      </View>
      {actionText && onActionPress && (
        <AnimatedPressable
          onPress={onActionPress}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="light"
          accessibilityLabel={actionText}
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>{actionText}</Text>
        </AnimatedPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: ResponsiveTheme.spacing.xs,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  actionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});

export default SectionHeader;

