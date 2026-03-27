import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.surface,
  },

  headerContent: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.md,
  },

  modalTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  qualityBadge: {
    backgroundColor: ResponsiveTheme.colors.success + "20",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    alignSelf: "flex-start",
  },

  qualityBadgeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.success,
    fontWeight: "600",
  },

  closeButton: {
    width: Math.max(rs(40), 44),
    height: Math.max(rs(40), 44),
    borderRadius: Math.max(rbr(20), 22),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    fontSize: rf(18),
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "bold",
  },
});
