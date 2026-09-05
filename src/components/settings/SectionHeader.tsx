import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf } from "../../utils/responsive";

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** @default colors.text.secondary */
  iconColor?: string;
  title: string;
  isDanger?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  iconColor = colors.text.secondary,
  title,
  isDanger = false,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={rf(14)} color={iconColor} />
      <Text style={[styles.sectionTitle, isDanger && styles.dangerTitle]}>
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(12),
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dangerTitle: {
    color: colors.error.DEFAULT,
  },
});
