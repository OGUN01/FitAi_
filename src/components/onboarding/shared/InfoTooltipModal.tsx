import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "../../ui/aurora/BottomSheet";
import { rf, rh } from "../../../utils/responsive";
interface InfoTooltipModalProps {
  visible: boolean;
  title: string;
  description: string;
  benefits?: string[];
  onClose: () => void;
}

/**
 * InfoTooltipModal — informational bottom sheet (blueprint §7.10).
 *
 * Editorial Dark migration: was a centered RN `Modal` overlay (D7) with a
 * frosted-glass card. Now a flat-surface bottom sheet — thumb-reachable,
 * swipe-dismissible, hairline-separated. Props contract and accessibility
 * labels are unchanged so the two onboarding tab consumers (DietPreferences,
 * WorkoutPreferences) keep their `showInfoTooltip` hook wiring untouched.
 */
export const InfoTooltipModal: React.FC<InfoTooltipModalProps> = ({
  visible,
  title,
  description,
  benefits,
  onClose,
}) => {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      closeOnOverlayPress
      dismissOnDrag
      contentStyle={styles.content}
    >
      {/* Header — flat, hairline-separated; preserves the per-title close
          affordance label the onboarding tests rely on. */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Close ${title}`}
        >
          <Ionicons
            name="close-circle"
            size={rf(24)}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>{description}</Text>
        {benefits && benefits.length > 0 && (
          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Benefits:</Text>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={rf(16)}
                  color={colors.success}
                />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer action — closes the sheet. Kept as an explicit "Got it" CTA so
          the sheet has one clear primary action (matches the previous modal's
          tap-to-dismiss affordance) and stays reachable above the keyboard. */}
      <Pressable
        onPress={onClose}
        style={styles.gotItButton}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${title} dialog`}
      >
        <Text style={styles.gotItText}>Got it</Text>
      </Pressable>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    maxHeight: rh(360),
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: spacing.md,
  },
  benefits: {
    // Flat surface separated by a hairline, not a tinted card.
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  benefitsTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  benefitText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  gotItButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gotItText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
});
