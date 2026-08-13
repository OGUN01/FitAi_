/**
 * DestructiveConfirmModal - Aurora 2026: shared destructive-action confirmation dialog.
 *
 * Flat surface.2 panel over a BlurView backdrop, destructive (error) CTA.
 * No GlassCard, no LinearGradient, no heavy shadow — depth comes from the
 * hairline border + surface step, per Editorial Dark. This is the single
 * confirmation surface used by every destructive account action (sign out,
 * unlink Google, delete account, clear cache) so the app never mixes a
 * branded dialog with a raw OS Alert for actions of the same weight.
 *
 * For the most irreversible actions (e.g. account deletion), pass
 * `requireTypedConfirmation` — the confirm button stays disabled until the
 * user types the exact phrase into the inline field.
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { DialogShell } from "../ui/CustomDialog";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  borderRadius,
} from "../../theme/aurora-tokens";
import { rf } from "../../utils/responsive";

const { variants } = typography;

export interface DestructiveConfirmModalProps {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  /**
   * When set, the confirm button stays disabled until the user types this
   * exact phrase (case-insensitive, trimmed) into an inline field — used for
   * the most irreversible actions (e.g. account deletion).
   */
  requireTypedConfirmation?: string;
  typedConfirmationLabel?: string;
}

export const DestructiveConfirmModal: React.FC<
  DestructiveConfirmModalProps
> = ({
  visible,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  requireTypedConfirmation,
  typedConfirmationLabel,
}) => {
  const [typedValue, setTypedValue] = useState("");

  // Reset the typed field whenever the dialog is dismissed/reopened so a
  // stale confirmation string can't linger across unrelated destructive
  // actions that share this component.
  React.useEffect(() => {
    if (!visible) setTypedValue("");
  }, [visible]);

  const isTypedMatchRequired = !!requireTypedConfirmation;
  const isTypedMatchSatisfied = useMemo(() => {
    if (!isTypedMatchRequired) return true;
    return (
      typedValue.trim().toLowerCase() ===
      requireTypedConfirmation!.trim().toLowerCase()
    );
  }, [isTypedMatchRequired, requireTypedConfirmation, typedValue]);

  const isConfirmDisabled = isLoading || !isTypedMatchSatisfied;

  return (
    <DialogShell
      visible={visible}
      animationType="fade"
      onRequestClose={isLoading ? undefined : onCancel}
      bare
    >
      {/* Web-safe DOM: backdrop Pressable is an absolute-fill SIBLING behind
          the dialog (never an ancestor) — see AdjustmentWizard.tsx. */}
      <View style={styles.root}>
        <Pressable
          onPress={isLoading ? undefined : onCancel}
          disabled={isLoading}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={`Cancel ${title}`}
        >
          <BlurView intensity={80} style={styles.blurFill} />
        </Pressable>
        <View style={styles.dialogContainer} accessibilityRole="alert">
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconSquircle}>
              <Ionicons name={icon} size={rf(28)} color={colors.error.DEFAULT} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {isTypedMatchRequired && (
            <View style={styles.typedFieldWrap}>
              {typedConfirmationLabel && (
                <Text style={styles.typedFieldLabel}>
                  {typedConfirmationLabel}
                </Text>
              )}
              <TextInput
                style={styles.typedField}
                value={typedValue}
                onChangeText={setTypedValue}
                placeholder={requireTypedConfirmation}
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isLoading}
                selectionColor={colors.error.DEFAULT}
                accessibilityLabel={`Type ${requireTypedConfirmation} to confirm`}
              />
            </View>
          )}

          <View style={styles.actions}>
            <AnimatedPressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              scaleValue={0.97}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[
                styles.button,
                styles.confirmButton,
                isConfirmDisabled && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              scaleValue={0.97}
              disabled={isConfirmDisabled}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {isLoading ? (
                <AuroraSpinner customSize={rf(16)} theme="dark" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </DialogShell>
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
  typedFieldWrap: {
    width: "100%",
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  typedFieldLabel: {
    ...variants.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  typedField: {
    ...variants.body,
    width: "100%",
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: surface[1],
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    textAlign: "center",
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
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  cancelButtonText: {
    ...variants.cardHeadline,
    color: colors.text.primary,
  },
  confirmButtonText: {
    ...variants.cardHeadline,
    // White on colors.error.DEFAULT (#F44336) computes to 3.68:1, failing
    // the 4.5:1 threshold for 16px/600 text; near-black comfortably passes.
    color: colors.background.DEFAULT,
  },
});

export default DestructiveConfirmModal;
