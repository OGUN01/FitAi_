import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { rf, rp, rbr } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

interface ConflictActionsProps {
  resolved: number;
  total: number;
  onCancel: () => void;
  onResolveAll: () => void;
}

export const ConflictActions: React.FC<ConflictActionsProps> = ({
  resolved,
  total,
  onCancel,
  onResolveAll,
}) => {
  return (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.resolveButton,
          resolved < total && styles.resolveButtonDisabled,
        ]}
        onPress={onResolveAll}
        disabled={resolved < total}
      >
        <Text style={styles.resolveButtonText}>
          Resolve All ({resolved}/{total})
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    padding: rp(20),
    paddingBottom: rp(40),
    gap: rp(15),
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.errorTint,
    paddingVertical: rp(15),
    borderRadius: rbr(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.errorAlt,
  },
  cancelButtonText: {
    color: ResponsiveTheme.colors.errorAlt,
    fontSize: rf(16),
    fontWeight: "600",
  },
  resolveButton: {
    flex: 2,
    backgroundColor: ResponsiveTheme.colors.successAlt,
    paddingVertical: rp(15),
    borderRadius: rbr(12),
    alignItems: "center",
  },
  resolveButtonDisabled: {
    backgroundColor: ResponsiveTheme.colors.glassBorder,
  },
  resolveButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(16),
    fontWeight: "600",
  },
});
