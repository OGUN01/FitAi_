import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { THEME } from "../../ui";

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
          <Text style={styles.qualityBadgeText}>✅ Verified</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },

  headerContent: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },

  modalTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  qualityBadge: {
    backgroundColor: THEME.colors.success + "20",
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    alignSelf: "flex-start",
  },

  qualityBadgeText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.success,
    fontWeight: "600",
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  closeButtonText: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
    fontWeight: "bold",
  },
});
