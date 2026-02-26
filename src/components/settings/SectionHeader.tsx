import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from "../../utils/responsive";

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  isDanger?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  iconColor,
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
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dangerTitle: {
    color: ResponsiveTheme.colors.error,
  },
});
