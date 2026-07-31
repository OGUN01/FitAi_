import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "../ui/aurora/BottomSheet";
import { OnboardingCompleteModal } from "../ui/OnboardingCompleteModal";
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from "../../theme/aurora-tokens";
import { rf, rbr } from "../../utils/responsive";
import type { PersonalInfoData } from "../../types/onboarding";
import type { WorkoutPreferencesData } from "../../types/onboarding";
import type { AdvancedReviewData } from "../../types/onboarding";

interface OnboardingModalsProps {
  completionDialog: {
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
    onConfirm?: () => void;
  };
  showCompletionModal: boolean;
  personalInfo: PersonalInfoData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;
  onCompletionGetStarted: () => void;
  onDismissDialog: () => void;
}

export const OnboardingModals: React.FC<OnboardingModalsProps> = ({
  completionDialog,
  showCompletionModal,
  personalInfo,
  workoutPreferences,
  advancedReview,
  onCompletionGetStarted,
  onDismissDialog,
}) => {
  // No hardcoded user-data fallbacks (principle #8): when a real value is
  // missing we omit the stat and warn, instead of rendering placeholder
  // name/goal/frequency on the payoff screen.
  const firstName = personalInfo?.first_name?.trim() || undefined;
  const primaryGoal = (workoutPreferences?.primary_goals || [])[0] || undefined;
  const workoutsPerWeek =
    workoutPreferences?.workout_frequency_per_week || undefined;
  const calorieTarget = advancedReview?.daily_calories ?? undefined;
  const stats =
    primaryGoal || workoutsPerWeek != null || calorieTarget != null
      ? { goal: primaryGoal, workoutsPerWeek, calorieTarget }
      : undefined;

  if (showCompletionModal) {
    if (!firstName) {
      console.warn(
        "[OnboardingModals] Completion modal shown without personalInfo.first_name — name line omitted.",
      );
    }
    if (!primaryGoal) {
      console.warn(
        "[OnboardingModals] Completion modal shown without primary_goals — goal stat omitted.",
      );
    }
    if (workoutsPerWeek == null) {
      console.warn(
        "[OnboardingModals] Completion modal shown without workout_frequency_per_week — frequency stat omitted.",
      );
    }
  }

  // The error dialog is shown only for type === "error" (success never routes
  // here — completion is the full-screen OnboardingCompleteModal payoff).
  const errorVisible =
    completionDialog.visible && completionDialog.type === "error";
  const onConfirm = completionDialog.onConfirm || onDismissDialog;

  return (
    <>
      <OnboardingCompleteModal
        visible={showCompletionModal}
        userName={firstName}
        onGetStarted={onCompletionGetStarted}
        stats={stats}
      />

      {/* Editorial Dark: the centered CustomDialog (old Card + gradient Button
          inside a 85%-width fade overlay) is replaced by a flat bottom sheet —
          thumb-reachable, swipe-dismissible, hairline-separated. One accent CTA. */}
      <BottomSheet
        visible={errorVisible}
        onClose={onDismissDialog}
        showCloseButton={false}
        closeOnOverlayPress
        dismissOnDrag
        contentStyle={styles.errorContent}
      >
        <View style={styles.errorHeader}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle" size={rf(28)} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>{completionDialog.title}</Text>
        </View>
        <Text style={styles.errorMessage}>{completionDialog.message}</Text>
        <Pressable
          onPress={onConfirm}
          style={styles.errorAction}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error dialog"
        >
          <Text style={styles.errorActionText}>OK</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  errorContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorIcon: {
    width: rf(44),
    height: rf(44),
    borderRadius: rbr(22),
    backgroundColor: colors.errorTint,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  errorMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: rf(22),
    marginBottom: spacing.lg,
  },
  // Single flat accent CTA — no gradient fill.
  errorAction: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  errorActionText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
