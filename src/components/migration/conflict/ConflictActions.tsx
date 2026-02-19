import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

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
    padding: 20,
    paddingBottom: 40,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(75, 85, 99, 0.3)",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  resolveButton: {
    flex: 2,
    backgroundColor: "#10B981",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  resolveButtonDisabled: {
    backgroundColor: "rgba(107, 114, 128, 0.3)",
  },
  resolveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
