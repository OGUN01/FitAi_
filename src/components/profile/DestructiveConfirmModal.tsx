/**
 * DestructiveConfirmModal - Aurora 2026: shared destructive-action confirmation.
 *
 * Migrated off the centered CustomDialog/DialogShell + BlurView-backdrop
 * pattern onto the shared `BottomSheet` primitive (Stage 3 bottom-sheet
 * migration — DESIGN.md's modal-presentation standard: centered `RNModal`
 * overlays are retired in favor of the app's bottom-sheet pattern). Flat
 * surface content, no GlassCard, no heavy shadow — depth comes from the
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
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import {
  colors,
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
    <BottomSheet
      visible={visible}
      onClose={isLoading ? () => {} : onCancel}
      showCloseButton={false}
      closeOnOverlayPress={!isLoading}
      dismissOnDrag={!isLoading}
      contentStyle={styles.content}
      testID="destructive-confirm-sheet"
    >
      <View accessibilityRole="alert">
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
              returnKeyType="done"
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
            <Text style={styles.cancelButtonText} numberOfLines={2}>
              {cancelLabel}
            </Text>
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
              <Text style={styles.confirmButtonText} numberOfLines={2}>
                {confirmLabel}
              </Text>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    backgroundColor: colors.background.secondary,
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
    backgroundColor: colors.background.secondary,
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
    textAlign: "center",
  },
  confirmButtonText: {
    ...variants.cardHeadline,
    // White on colors.error.DEFAULT (#F44336) computes to 3.68:1, failing
    // the 4.5:1 threshold for 16px/600 text; near-black comfortably passes.
    color: colors.background.DEFAULT,
    textAlign: "center",
  },
});

export default DestructiveConfirmModal;
