/**
 * SettingsModalWrapper - Consistent modal container with Aurora 2026 tokens
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../../components/ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../../../../components/ui/aurora/AuroraSpinner";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
} from "../../../../theme/aurora-tokens";
import { rf, rw, rh } from "../../../../utils/responsive";
import { haptics } from "../../../../utils/haptics";

const { variants } = typography;

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
  iconColor = colors.primary.DEFAULT,
  onClose,
  onSave,
  isSaving = false,
  saveDisabled = false,
  saveLabel = "Save Changes",
  children,
}) => {
  const handleClose = useCallback(() => {
    haptics.light();
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (onSave && !saveDisabled && !isSaving) {
      haptics.medium();
      onSave();
    }
  }, [onSave, saveDisabled, isSaving]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor={surface[0]} />
      <View style={styles.modalContainer}>
        {/* WEB/TABLET: mirror App.tsx's appColumn 480px phone-width column so
            this full-screen Modal (which portals outside that wrapper) doesn't
            stretch edge-to-edge on wide viewports. No-op on phones. */}
        <View style={styles.contentColumn}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                <Ionicons name="close" size={rf(22)} color={colors.text.primary} />
              </AnimatedPressable>

              <View style={styles.headerCenter}>
                {icon && (
                  <View
                    style={[
                      styles.headerIcon,
                      { backgroundColor: `${iconColor}14` },
                    ]}
                  >
                    <Ionicons name={icon} size={rf(18)} color={iconColor} />
                  </View>
                )}
                <View style={styles.headerTitleText}>
                  <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
                    {title}
                  </Text>
                  {subtitle && (
                    <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
                      {subtitle}
                    </Text>
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
              <Animated.View entering={FadeInDown.delay(200).duration(350)}>
                {children}
              </Animated.View>
            </ScrollView>

            {/* Save Button */}
            {onSave && (
              <Animated.View
                entering={FadeIn.delay(300).duration(350)}
                style={styles.footer}
              >
                <AnimatedPressable
                  onPress={handleSave}
                  scaleValue={0.97}
                  hapticFeedback={false}
                  disabled={saveDisabled || isSaving}
                  style={styles.saveButtonContainer}
                  accessibilityRole="button"
                  accessibilityLabel={isSaving ? `${saveLabel} (saving)` : saveLabel}
                  accessibilityState={{ disabled: saveDisabled || isSaving }}
                >
                  <LinearGradient
                    colors={
                      saveDisabled
                        ? [colors.text.tertiary, colors.text.tertiary]
                        : [colors.primary.DEFAULT, colors.primary.light]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.saveButton,
                      (saveDisabled || isSaving) && styles.saveButtonDisabled,
                    ]}
                  >
                    {isSaving ? (
                      <AuroraSpinner customSize={rf(16)} theme="dark" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={rf(18)}
                          color={colors.background.DEFAULT}
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: surface[0],
  },
  contentColumn: {
    flex: 1,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: Math.max(rw(20), 22),
    backgroundColor: surface[2],
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  headerIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...variants.sectionTitle,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  headerSpacer: {
    width: Math.max(rw(40), 44),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.DEFAULT,
    marginHorizontal: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: surface[0],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: border.DEFAULT,
    minHeight: rh(76),
  },
  saveButtonContainer: {
    borderRadius: 14,
    overflow: "hidden",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 44,
    borderRadius: 14,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...variants.cardHeadline,
    // White-on-primary gradient computes to 2.32-2.84:1, failing WCAG AA;
    // near-black computes to a safe ratio across the whole gradient span.
    color: colors.background.DEFAULT,
  },
});

export default SettingsModalWrapper;
