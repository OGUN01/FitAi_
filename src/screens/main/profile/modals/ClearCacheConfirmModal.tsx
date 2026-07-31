/**
 * ClearCacheConfirmModal - Aurora 2026: cache-clear confirmation dialog.
 * Flat surface.2 panel over blur, destructive CTA. No GlassCard, no shadows.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../../components/ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../../../../components/ui/aurora/AuroraSpinner";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
} from "../../../../theme/aurora-tokens";
import { rf } from "../../../../utils/responsive";
import { crossPlatformAlert } from "../../../../utils/crossPlatformAlert";

const { variants } = typography;

interface ClearCacheConfirmModalProps {
  visible: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ClearCacheConfirmModal: React.FC<ClearCacheConfirmModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const [isClearing, setIsClearing] = useState(false);

  const handleConfirm = async () => {
    setIsClearing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("ClearCacheConfirmModal: cache clear failed:", error);
      setIsClearing(false);
      crossPlatformAlert(
        "Error",
        "Failed to clear cache. Please try again.",
      );
    } finally {
      setIsClearing(false);
    }
  };

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
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Cancel cache clear"
        >
          <BlurView intensity={80} style={styles.blurFill} />
        </Pressable>
        <View style={styles.dialogContainer} accessibilityRole="alert">
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconSquircle}>
                  <Ionicons
                    name="trash-outline"
                    size={rf(28)}
                    color={colors.error.DEFAULT}
                  />
                </View>
              </View>

              <Text style={styles.title}>Clear Cache</Text>
              <Text style={styles.message}>
                Are you sure you want to clear the cache? This will remove
                temporary data and may briefly slow down the app while it
                rebuilds.
              </Text>

              <View style={styles.actions}>
                <AnimatedPressable
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  scaleValue={0.97}
                  disabled={isClearing}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={[styles.button, styles.confirmButton]}
                  onPress={handleConfirm}
                  scaleValue={0.97}
                  disabled={isClearing}
                  accessibilityRole="button"
                  accessibilityLabel="Clear cache"
                >
                  {isClearing ? (
                    <AuroraSpinner customSize={rf(16)} theme="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Clear Cache</Text>
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
  blurFill: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dialogContainer: {
    width: "85%",
    maxWidth: 340,
    backgroundColor: surface[2],
    borderRadius: 20,
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
    borderRadius: 16,
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
    borderRadius: 12,
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

export default ClearCacheConfirmModal;
