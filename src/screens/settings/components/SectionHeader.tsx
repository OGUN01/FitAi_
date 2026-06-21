import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing } from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";

interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons
        name={icon}
        size={rf(14)}
        color={colors.textSecondary}
      />
      <Text style={styles.sectionTitle}>{title}</Text>
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
    fontSize: rf(12),
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
