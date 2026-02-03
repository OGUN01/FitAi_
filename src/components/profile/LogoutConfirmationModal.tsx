import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TouchableWithoutFeedback,
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
}

export const LogoutConfirmationModal: React.FC<
  LogoutConfirmationModalProps
> = ({ visible, onConfirm, onCancel }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <BlurView intensity={80} style={styles.blurContainer}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
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
                  >
                    <LinearGradient
                      {...toLinearGradientProps(gradients.button.error)}
                      style={styles.confirmationButtonGradient}
                    >
                      <Text style={styles.confirmationButtonText}>
                        Sign Out
                      </Text>
                    </LinearGradient>
                  </AnimatedPressable>
                </View>
              </GlassCard>
            </View>
          </TouchableWithoutFeedback>
        </BlurView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    color: "#fff",
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
    color: "#fff",
  },
  confirmationButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
  },
});
