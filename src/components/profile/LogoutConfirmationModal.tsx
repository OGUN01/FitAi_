import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf } from "../../utils/responsive";
import { gradients, toLinearGradientProps } from "../../theme/gradients";

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
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <BlurView intensity={80} style={styles.blurContainer} pointerEvents="none" />
        <View style={styles.confirmationDialog}>
          <GlassCard
            elevation={5}
            blurIntensity="heavy"
            padding="lg"
            borderRadius="xl"
          >
            <View style={styles.confirmationIconContainer}>
              <Ionicons
                name="log-out-outline"
                size={rf(48)}
                color={ResponsiveTheme.colors.error}
              />
            </View>
            <Text style={styles.confirmationTitle}>Sign Out</Text>
            <Text style={styles.confirmationMessage}>
              Are you sure you want to sign out? Your progress will be
              saved.
            </Text>

            <View style={styles.confirmationActions}>
              <AnimatedPressable
                style={[
                  styles.confirmationButton,
                  styles.confirmationButtonCancel,
                ]}
                onPress={onCancel}
                scaleValue={0.95}
                disabled={isLoading}
              >
                <Text style={styles.confirmationButtonTextCancel}>
                  Cancel
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={[
                  styles.confirmationButton,
                  styles.confirmationButtonConfirm,
                ]}
                onPress={onConfirm}
                scaleValue={0.95}
                disabled={isLoading}
              >
                <LinearGradient
                  {...toLinearGradientProps(gradients.button.error)}
                  style={styles.confirmationButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={ResponsiveTheme.colors.white} />
                  ) : (
                    <Text style={styles.confirmationButtonText}>
                      Sign Out
                    </Text>
                  )}
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ResponsiveTheme.colors.overlay,
  },
  confirmationDialog: {
    width: "85%",
    maxWidth: 340,
  },
  confirmationIconContainer: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  confirmationTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  confirmationMessage: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
  },
  confirmationButton: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.md,
    overflow: "hidden",
  },
  confirmationButtonCancel: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  confirmationButtonConfirm: {
    overflow: "hidden",
  },
  confirmationButtonGradient: {
    paddingVertical: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },
  confirmationButtonTextCancel: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
  confirmationButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
});
