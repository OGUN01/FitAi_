import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rbr, rs } from "../../../utils/responsive";

interface ModalHeaderProps {
  displayName: string;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  displayName,
  onClose,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.modalTitle} numberOfLines={2}>
          {displayName}
        </Text>
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityBadgeText}>Verified</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Close ${displayName}`}
      >
        <Text style={styles.closeButtonText}>X</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },

  headerContent: {
    flex: 1,
    marginRight: spacing.md,
  },

  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  qualityBadge: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: "flex-start",
  },

  qualityBadgeText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: "600",
  },

  closeButton: {
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    borderRadius: Math.max(rbr(20), 22),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    fontSize: rf(18),
    color: colors.textSecondary,
    fontWeight: "bold",
  },
});
