import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rbr, rf } from '../../../utils/responsive';

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
        <Ionicons name="close" size={rf(22)} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <TouchableOpacity
        style={styles.flashButton}
        onPress={onToggleFlash}
        accessibilityLabel={`Flash ${flashMode === "on" ? "on" : "off"}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to toggle flash"
      >
        <Ionicons
          name={flashMode === "on" ? "flash" : "flash-off"}
          size={rf(22)}
          color={flashMode === "on" ? colors.primary : colors.text}
        />
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

  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    textAlign: "center",
  },

  flashButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
