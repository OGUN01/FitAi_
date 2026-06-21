import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rbr } from '../../../utils/responsive';

interface CameraHeaderProps {
  title: string;
  flashMode: "off" | "on";
  onClose: () => void;
  onToggleFlash: () => void;
}

export const CameraHeader: React.FC<CameraHeaderProps> = ({
  title,
  flashMode,
  onClose,
  onToggleFlash,
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        accessibilityLabel="Close camera"
        accessibilityRole="button"
        accessibilityHint="Double tap to close the camera"
      >
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity
        style={styles.flashButton}
        onPress={onToggleFlash}
        accessibilityLabel={`Flash ${flashMode === "on" ? "on" : "off"}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to toggle flash"
      >
        <Text style={styles.flashIcon}>{flashMode === "on" ? "⚡" : "⚡"}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.lg,
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  closeIcon: {
    fontSize: fontSize.lg,
    color: colors.text,
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
  },

  flashButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  flashIcon: {
    fontSize: fontSize.lg,
  },
});
