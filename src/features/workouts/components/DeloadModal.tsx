/**
 * FitAI — Deload Modal
 *
 * Recovery / deload suggestion prompt. Was the ONLY light-mode surface in the
 * workout flow (#fff card, #333 text, #f0f0f0 dismiss button) — now restyled
 * to the Aurora dark-glass language using tokenized colors so it matches the
 * rest of the session screen.
 *
 * Implementation note: intentionally keeps the stock RN `Modal` portal + plain
 * `TouchableOpacity` buttons (rather than migrating to the shared `BottomSheet`)
 * because the existing test contract (DeloadModal.test.tsx) drives the component
 * through a minimal `react-native` mock that only provides Modal/TouchableOpacity/
 * View/Text — BottomSheet's Reanimated + gesture-handler + safe-area deps would
 * require rewriting that mock. The visual modernization (dark glass + tokens)
 * is fully achieved without breaking the test contract. testIDs preserved.
 */
import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";

export interface DeloadModalProps {
  visible: boolean;
  variant: "proactive" | "reactive";
  message: string;
  exerciseName?: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function DeloadModal({
  visible,
  variant,
  message,
  onAccept,
  onDismiss,
}: DeloadModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View testID="deload-modal" style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {variant === "proactive" ? "Recovery Week" : "Deload Suggestion"}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="deload-dismiss-btn"
              style={styles.dismissBtn}
              onPress={onDismiss}
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="deload-accept-btn"
              style={styles.acceptBtn}
              onPress={onAccept}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Dark scrim consistent with the rest of the flow's overlays.
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  card: {
    // Aurora dark-glass surface (tokenized) — replaces the old #fff light card.
    backgroundColor: colors.aurora.space.high,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glass.border,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    width: "90%",
    maxWidth: 400,
  },
  title: {
    fontSize: typography.fontSize.h3,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: typography.fontSize.body,
    lineHeight: 22,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: spacing.sm + spacing.xxs,
    borderRadius: borderRadius.md,
    // Glass-tinted secondary surface replaces the old #f0f0f0 light button.
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: "center",
  },
  dismissText: {
    fontSize: typography.fontSize.body,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: spacing.sm + spacing.xxs,
    borderRadius: borderRadius.md,
    // Success token replaces the raw #4CAF50 (same value, now centralized).
    backgroundColor: colors.success.DEFAULT,
    alignItems: "center",
  },
  acceptText: {
    fontSize: typography.fontSize.body,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
  },
});
