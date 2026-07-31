/**
 * SectionHeader — in-section title (blueprint §7.9)
 *
 * Used inside a SectionShell. title = sectionTitle variant (Manrope_600SemiBold
 * 18), subtitle = caption variant (Manrope_500Medium 12) in text.secondary.
 * Static (no motion). An optional icon + right adornment (e.g. InfoTap) render
 * inline.
 */

import React from "react";
import { StyleSheet, View, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../../../theme/aurora-tokens";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Right-aligned slot (e.g. an <InfoTap /> trigger). */
  rightAdornment?: React.ReactNode;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  rightAdornment,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.left}>
        {icon && (
          <Ionicons
            name={icon as React.ComponentProps<typeof Ionicons>["name"]}
            size={20}
            color={colors.text.tertiary}
            style={styles.icon}
          />
        )}
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightAdornment && <View style={styles.right}>{rightAdornment}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  left: {
    flexDirection: "row",
    flex: 1,
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: spacing.xxs,
  },
  text: {
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
  right: {
    marginLeft: spacing.sm,
    alignSelf: "center",
  },
});
