import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

interface ProfileStatusBannerProps {
  status: "complete" | "partial" | "incomplete";
  message: string;
}

export const ProfileStatusBanner: React.FC<ProfileStatusBannerProps> = ({
  status,
  message,
}) => {
  const backgroundColor = status === "complete" ? "#dcfce7" : "#fef3c7";
  const textColor = status === "complete" ? "#15803d" : "#92400e";
  const icon = status === "complete" ? "✅" : "⚠️";

  return (
    <View style={[styles.statusBanner, { backgroundColor }]}>
      <Text style={styles.statusIcon}>{icon}</Text>
      <Text style={[styles.statusText, { color: textColor }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    margin: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  statusIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  statusText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    flex: 1,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
