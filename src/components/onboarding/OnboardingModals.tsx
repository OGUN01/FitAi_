import React from "react";
import { CustomDialog } from "../ui/CustomDialog";
import { OnboardingCompleteModal } from "../ui/OnboardingCompleteModal";
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
  return (
    <>
      <OnboardingCompleteModal
        visible={showCompletionModal}
        userName={personalInfo?.first_name || "Champion"}
        onGetStarted={onCompletionGetStarted}
        stats={{
          goal: (workoutPreferences?.primary_goals || [])[0] || "Get Fit",
          workoutsPerWeek: workoutPreferences?.workout_frequency_per_week || 3,
          calorieTarget: advancedReview?.daily_calories ?? undefined,
        }}
      />

      <CustomDialog
        visible={completionDialog.visible && completionDialog.type === "error"}
        title={completionDialog.title}
        message={completionDialog.message}
        type={completionDialog.type}
        actions={[
          {
            text: "OK",
            onPress: completionDialog.onConfirm || onDismissDialog,
            style: "default",
          },
        ]}
      />
    </>
  );
};
