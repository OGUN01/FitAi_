import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp, rw, rh } from "../../utils/responsive";
import { flatColors as colors, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from "../../utils/colors";
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
    <Text style={placeholderStyles.title} numberOfLines={2}>{title}</Text>
    <Text style={placeholderStyles.message} numberOfLines={5}>{message}</Text>
    {actionText && onAction && (
      <AnimatedPressable
        onPress={onAction}
        style={placeholderStyles.actionButton}
        accessibilityRole="button"
        accessibilityLabel={actionText}
      >
        <Text style={placeholderStyles.actionText} numberOfLines={1}>{actionText}</Text>
      </AnimatedPressable>
    )}
  </View>
);

const placeholderStyles = StyleSheet.create({
  container: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: rp(24),
    backgroundColor: hexToRgba(colors.surface, TINT_ALPHA_MEDIUM + 0.3),
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: hexToRgba(colors.border, TINT_ALPHA_MEDIUM + 0.2),
    borderStyle: "dashed",
  },
  iconContainer: {
    width: rf(56),
    height: rf(56),
    borderRadius: rf(28),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW + 0.03),
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
    minHeight: Math.max(rh(44), 44),
    justifyContent: "center",
    paddingVertical: rp(8),
    paddingHorizontal: rp(16),
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    borderRadius: borderRadius.md,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
});

