import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  MigrationProgress,
  MigrationResult,
} from "../../../services/migration";
import { rf, rp, rbr } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

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
    gap: rp(15),
  },
  completeButton: {
    backgroundColor: ResponsiveTheme.colors.successAlt,
    paddingVertical: rp(15),
    paddingHorizontal: rp(30),
    borderRadius: rbr(12),
    alignItems: "center",
  },
  completeButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(16),
    fontWeight: "600",
  },
  retryButton: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.primaryDark,
    paddingVertical: rp(15),
    borderRadius: rbr(12),
    alignItems: "center",
  },
  retryButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(16),
    fontWeight: "600",
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
});
