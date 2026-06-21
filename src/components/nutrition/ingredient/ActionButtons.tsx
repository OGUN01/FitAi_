import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { rbr, rh } from "../../../utils/responsive";

interface ActionButtonsProps {
  isCompleted: boolean;
  isCompleting: boolean;
  onMarkComplete: () => void;
  onClose: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isCompleted,
  isCompleting,
  onMarkComplete,
  onClose,
}) => {
  return (
    <View style={styles.actionSection}>
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.navButton, styles.previousButton]}
          onPress={onClose}
        >
          <Ionicons name="chevron-back" size={24} color="#6B7280" />
          <Text style={[styles.navButtonText, styles.previousButtonText]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.completeButton,
            isCompleted && styles.completedButton,
            isCompleting && styles.loadingButton,
          ]}
          onPress={onMarkComplete}
          disabled={isCompleted || isCompleting}
          activeOpacity={isCompleted ? 1.0 : 0.8}
        >
          {isCompleting ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.navButtonText, styles.completeButtonText]}>
                Completing...
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name={
                  isCompleted ? "checkmark-circle" : "checkmark-circle-outline"
                }
                size={24}
                color="#FFFFFF"
              />
              <Text style={[styles.navButtonText, styles.completeButtonText]}>
                {isCompleted ? "✅ Completed" : "Mark Complete"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={onClose}
        >
          <Text style={[styles.navButtonText, styles.nextButtonText]}>
            Next Step
          </Text>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionSection: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: rbr(12),
    minHeight: rh(48),
  },
  previousButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completeButton: {
    backgroundColor: colors.primary,
  },
  completedButton: {
    backgroundColor: colors.success,
  },
  loadingButton: {
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  nextButton: {
    backgroundColor: "#6B7280",
  },
  navButtonText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    marginHorizontal: spacing.xs,
  },
  previousButtonText: {
    color: colors.textSecondary,
  },
  completeButtonText: {
    color: colors.surface,
  },
  nextButtonText: {
    color: colors.surface,
  },
});
