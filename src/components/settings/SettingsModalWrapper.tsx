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
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
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
  iconColor = colors.primary,
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
                accessibilityRole="button"
                accessibilityLabel={`Close ${title}`}
              >
                <Ionicons
                  name="close"
                  size={rf(22)}
                  color={colors.text}
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
                  accessibilityRole="button"
                  accessibilityLabel={saveLabel}
                >
                  <LinearGradient
                    colors={
                      saveDisabled ? ["#666", "#555"] : [colors.errorLight, colors.primaryLight]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.saveButton,
                      (saveDisabled || isSaving) && styles.saveButtonDisabled,
                    ]}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={rf(18)}
                          color={colors.white}
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
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: Math.max(rbr(20), 22),
    backgroundColor: colors.glassBorder,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  headerIcon: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(18),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  headerSpacer: {
    width: Math.max(rw(40), 44),
  },
  divider: {
    height: rp(1),
    backgroundColor: colors.glassSurface,
    marginHorizontal: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  bottomSpacing: {
    height: rh(80),
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.glassSurface,
  },
  saveButtonContainer: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: borderRadius.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
  },
});

export default SettingsModalWrapper;
