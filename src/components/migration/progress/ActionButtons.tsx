import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  MigrationProgress,
  MigrationResult,
} from "../../../services/migration";

interface ActionButtonsProps {
  progress: MigrationProgress | null;
  result: MigrationResult | null;
  allowCancel: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  progress,
  result,
  allowCancel,
  onComplete,
  onCancel,
}) => {
  if (result?.success) {
    return (
      <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
        <Text style={styles.completeButtonText}>Continue</Text>
      </TouchableOpacity>
    );
  }

  if (result && !result.success) {
    return (
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.retryButton} onPress={onCancel}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (allowCancel && progress?.status === "running") {
    return (
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel Migration</Text>
      </TouchableOpacity>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  completeButton: {
    backgroundColor: "#10B981",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    flex: 1,
    backgroundColor: "#E55A2B",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
});
