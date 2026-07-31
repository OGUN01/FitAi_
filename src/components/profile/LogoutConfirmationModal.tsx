/**
 * LogoutConfirmationModal - Aurora 2026: sign-out confirmation dialog.
 *
 * Flat surface.2 panel over a blur backdrop, destructive (error) CTA.
 * No GlassCard, no LinearGradient, no heavy shadow — depth comes from the
 * hairline border + surface step, per Editorial Dark. Mirrors the flat-dialog
 * pattern established by ClearCacheConfirmModal/SettingsSelectionModal so the
 * destructive confirmations share one surface treatment.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import {
  colors,
  flatColors,
  surface,
  border,
  spacing,
  typography,
  borderRadius,
} from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";

const { variants } = typography;

interface LogoutConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const LogoutConfirmationModal: React.FC<
  LogoutConfirmationModalProps
> = ({ visible, onConfirm, onCancel, isLoading = false }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Web-safe DOM: backdrop Pressable is an absolute-fill SIBLING behind
          the dialog (never an ancestor) — see AdjustmentWizard.tsx. */}
      <View style={styles.root}>
        <Pressable
          onPress={onCancel}
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Cancel sign out"
        />
        <View style={styles.dialogContainer} accessibilityRole="alert">
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconSquircle}>
              <Ionicons
                name="log-out-outline"
                size={rf(28)}
                color={colors.error.DEFAULT}
              />
            </View>
          </View>

          <Text style={styles.title}>Sign Out</Text>
          <Text style={styles.message}>
            Are you sure you want to sign out? Your progress will be saved.
          </Text>

          <View style={styles.actions}>
            <AnimatedPressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              scaleValue={0.97}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              scaleValue={0.97}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              {isLoading ? (
                <AuroraSpinner customSize={rf(16)} theme="white" />
              ) : (
                <Text style={styles.confirmButtonText}>Sign Out</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Flat scrim (no blur) — Editorial Dark uses an opaque overlay, not frosted glass.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: flatColors.overlay,
  },
  dialogContainer: {
    width: "85%",
    maxWidth: 340,
    backgroundColor: surface[2],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.lg,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  iconSquircle: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: `${colors.error.DEFAULT}1F`,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...variants.sectionTitle,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    ...variants.body,
    fontSize: rf(14),
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  button: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  cancelButton: {
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
  },
  confirmButton: {
    backgroundColor: colors.error.DEFAULT,
  },
  cancelButtonText: {
    ...variants.cardHeadline,
    color: colors.text.primary,
  },
  confirmButtonText: {
    ...variants.cardHeadline,
    color: colors.text.primary,
  },
});

export default LogoutConfirmationModal;
