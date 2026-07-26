import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";

interface ProfileStatusBannerProps {
  status: "complete" | "partial" | "incomplete";
  message: string;
}

export const ProfileStatusBanner: React.FC<ProfileStatusBannerProps> = ({
  status,
  message,
}) => {
  const isComplete = status === "complete";
  const accentColor = isComplete ? colors.success : colors.warning;
  const iconName = isComplete ? "checkmark-circle-outline" : "alert-circle-outline";

  return (
    <View style={[styles.statusBanner, { backgroundColor: hexToRgba(accentColor, TINT_ALPHA_LOW) }]}>
      <Ionicons name={iconName} size={rf(16)} color={accentColor} style={styles.statusIcon} />
      <Text style={[styles.statusText, { color: accentColor }]}>{message}</Text>
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
    borderWidth: 1,
    borderColor: "transparent",
  },

  statusIcon: {
    marginRight: spacing.sm,
  },

  statusText: {
    fontSize: fontSize.sm,
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },
});
