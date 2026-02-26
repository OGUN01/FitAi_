/**
 * ClearCacheConfirmModal - Platform-aware cache-clear confirmation
 *
 * Uses Modal instead of Alert.alert (which silently fails on Expo web
 * when given multiple buttons). Matches LogoutConfirmationModal pattern.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rp, rbr } from "../../../../utils/responsive";
import { gradients, toLinearGradientProps } from "../../../../theme/gradients";

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
      <Pressable onPress={onCancel}>
        <BlurView intensity={80} style={styles.blurContainer}>
          <Pressable onPress={() => {}}>
            <View style={styles.dialogContainer} accessibilityRole="alert">
              <GlassCard
                elevation={5}
                blurIntensity="heavy"
                padding="lg"
                borderRadius="xl"
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="trash-outline"
                    size={rf(48)}
                    color={ResponsiveTheme.colors.error}
                  />
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
                    scaleValue={0.95}
                    disabled={isClearing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    style={[styles.button, styles.confirmButton]}
                    onPress={handleConfirm}
                    scaleValue={0.95}
                    disabled={isClearing}
                  >
                    <LinearGradient
                      {...toLinearGradientProps(gradients.button.error)}
                      style={styles.confirmGradient}
                    >
                      {isClearing ? (
                        <ActivityIndicator color={ResponsiveTheme.colors.white} size="small" />
                      ) : (
                        <Text style={styles.confirmButtonText}>
                          Clear Cache
                        </Text>
                      )}
                    </LinearGradient>
                  </AnimatedPressable>
                </View>
              </GlassCard>
            </View>
          </Pressable>
        </BlurView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.overlay,
  },
  dialogContainer: {
    width: "85%",
    maxWidth: 340,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  message: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  confirmButton: {
    overflow: "hidden",
  },
  confirmGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
  confirmButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
});

export default ClearCacheConfirmModal;
