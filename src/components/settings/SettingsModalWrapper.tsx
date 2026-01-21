/**
 * SettingsModalWrapper - Consistent Modal Container for Profile Settings
 *
 * Features:
 * - Glassmorphic header with title and close button
 * - ScrollView for content
 * - Save button with loading state
 * - Entry animations
 * - Haptic feedback
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface SettingsModalWrapperProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onClose: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  children: React.ReactNode;
}

export const SettingsModalWrapper: React.FC<SettingsModalWrapperProps> = ({
  visible,
  title,
  subtitle,
  icon,
  iconColor = ResponsiveTheme.colors.primary,
  onClose,
  onSave,
  isSaving = false,
  saveDisabled = false,
  saveLabel = "Save Changes",
  children,
}) => {
  const handleClose = () => {
    haptics.light();
    onClose();
  };

  const handleSave = () => {
    if (onSave && !saveDisabled && !isSaving) {
      haptics.medium();
      onSave();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            {/* Header */}
            <Animated.View
              entering={FadeIn.delay(100).duration(300)}
              style={styles.header}
            >
              <AnimatedPressable
                onPress={handleClose}
                scaleValue={0.9}
                hapticFeedback={false}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={rf(22)}
                  color={ResponsiveTheme.colors.text}
                />
              </AnimatedPressable>

              <View style={styles.headerCenter}>
                {icon && (
                  <View
                    style={[
                      styles.headerIcon,
                      { backgroundColor: `${iconColor}20` },
                    ]}
                  >
                    <Ionicons name={icon} size={rf(18)} color={iconColor} />
                  </View>
                )}
                <View>
                  <Text style={styles.headerTitle}>{title}</Text>
                  {subtitle && (
                    <Text style={styles.headerSubtitle}>{subtitle}</Text>
                  )}
                </View>
              </View>

              <View style={styles.headerSpacer} />
            </Animated.View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                {children}
              </Animated.View>

              {/* Bottom spacing */}
              <View style={styles.bottomSpacing} />
            </ScrollView>

            {/* Save Button */}
            {onSave && (
              <Animated.View
                entering={SlideInUp.delay(300).duration(400)}
                style={styles.footer}
              >
                <AnimatedPressable
                  onPress={handleSave}
                  scaleValue={0.97}
                  hapticFeedback={false}
                  disabled={saveDisabled || isSaving}
                  style={styles.saveButtonContainer}
                >
                  <LinearGradient
                    colors={
                      saveDisabled ? ["#666", "#555"] : ["#FF6B6B", "#FF8E53"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.saveButton,
                      (saveDisabled || isSaving) && styles.saveButtonDisabled,
                    ]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={rf(18)}
                          color="#fff"
                        />
                        <Text style={styles.saveButtonText}>{saveLabel}</Text>
                      </>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </Animated.View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  closeButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
  },
  headerIcon: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: rw(40),
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginHorizontal: ResponsiveTheme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.lg,
  },
  bottomSpacing: {
    height: rh(100),
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  saveButtonContainer: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#fff",
  },
});

export default SettingsModalWrapper;
