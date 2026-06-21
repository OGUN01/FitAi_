import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from "../../../theme/aurora-tokens";
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
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  statusIcon: {
    fontSize: rf(16),
    marginRight: spacing.sm,
  },

  statusText: {
    fontSize: fontSize.sm,
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },
});
