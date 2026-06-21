import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rw } from "../../utils/responsive";
import { flatColors as colors, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { AnimatedPressable } from "./aurora/AnimatedPressable";

export interface DataPlaceholderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export const DataPlaceholder: React.FC<DataPlaceholderProps> = ({
  icon,
  title,
  message,
  actionText,
  onAction,
}) => (
  <View style={placeholderStyles.container}>
    <View style={placeholderStyles.iconContainer}>
      <Ionicons
        name={icon}
        size={rf(32)}
        color={colors.textMuted}
      />
    </View>
    <Text style={placeholderStyles.title}>{title}</Text>
    <Text style={placeholderStyles.message}>{message}</Text>
    {actionText && onAction && (
      <AnimatedPressable
        onPress={onAction}
        style={placeholderStyles.actionButton}
      >
        <Text style={placeholderStyles.actionText}>{actionText}</Text>
      </AnimatedPressable>
    )}
  </View>
);

const placeholderStyles = StyleSheet.create({
  container: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: rp(24),
    backgroundColor: `${colors.surface}40`,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.border}30`,
    borderStyle: "dashed",
  },
  iconContainer: {
    width: rf(56),
    height: rf(56),
    borderRadius: rf(28),
    backgroundColor: `${colors.primary}15`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: rp(12),
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: rp(4),
    textAlign: "center",
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(18),
    maxWidth: rw(280),
  },
  actionButton: {
    marginTop: rp(12),
    paddingVertical: rp(8),
    paddingHorizontal: rp(16),
    backgroundColor: `${colors.primary}20`,
    borderRadius: borderRadius.md,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
});
