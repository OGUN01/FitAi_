/**
 * BodyTab — S3 "Body" ("Better than 2026" redesign).
 *
 * The ONE signature visual screen. One focal question: "Let's size your plan."
 * Just the live Skia BMI ring + height/weight sliders — the screen Apple
 * Fitness/Whoop aspire to, with generous negative space. Body is OPTIONAL
 * (skippable with safe defaults), so Next is never disabled.
 *
 * Deferred (per plan): photos, medical, body composition, the goal arc.
 * Data wiring UNCHANGED: uses useBodyAnalysis → updateBodyAnalysis.
 */

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  colors,
  spacing,
} from "../../../theme/aurora-tokens";
import { ScreenFrame } from "../../../components/onboarding/aurora";
import { MeasurementsSection } from "../../../components/onboarding/body/MeasurementsSection";
import { useBodyAnalysis } from "../../../hooks/onboarding/useBodyAnalysis";
import {
  BodyAnalysisData,
  PersonalInfoData,
  WorkoutPreferencesData,
} from "../../../types/onboarding";

const ACCENT = colors.primary.DEFAULT;

interface BodyTabProps {
  data: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;
  onUpdate: (data: Partial<BodyAnalysisData>) => void;
  onUpdateWorkoutPreferences?: (data: Partial<WorkoutPreferencesData>) => void;
  onNext: () => void;
  onBack: () => void;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
}

export const BodyTab: React.FC<BodyTabProps> = ({
  data,
  personalInfoData,
  onUpdate,
  onNext,
  onBack,
  isEditingFromReview,
  onReturnToReview,
}) => {
  // useBodyAnalysis calls onUpdate(computed) inside an effect, so onUpdate is
  // required — pass it through or the hook crashes on the first BMI recompute.
  const { formData, updateField, getBMICategory, getFieldError, hasFieldError } =
    useBodyAnalysis({ data, personalInfoData, onUpdate });

  // One-shot mount-sync: useBodyAnalysis seeds local formData with measurement
  // defaults (height/weight/target/timeline) and only writes the COMPUTED
  // bmi/bmr to the store via its effect — never the raw measurements. Without
  // this, the Plan screen's review engine (performCalculations) lacks
  // height/current_weight and cannot compute BMR/TDEE → the payoff MetricTiles
  // show "—". Surfacing the measurements lets the engine compute a real daily
  // calorie target. Idempotent for returning users (formData initializes from
  // `data`); the BMI effect's bmi/bmr patch still applies on top.
  useEffect(() => {
    onUpdate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenFrame
      question="Let’s size your plan."
      reassurance="Optional — skip and we’ll use safe defaults."
      onBack={onBack}
      onNext={onNext}
      nextLabel={isEditingFromReview ? "Review" : "Next"}
      isEditingFromReview={isEditingFromReview}
      onReturnToReview={onReturnToReview}
      bloomColor={ACCENT}
      testID="onboarding-body-tab"
    >
      <View style={styles.ringWrap}>
        <MeasurementsSection
          formData={formData}
          updateField={updateField}
          getBMICategory={getBMICategory}
          getFieldError={getFieldError}
          hasFieldError={hasFieldError}
          accentColor={ACCENT}
        />
      </View>
    </ScreenFrame>
  );
};

const styles = StyleSheet.create({
  ringWrap: {
    paddingVertical: spacing.lg,
  },
});

export default BodyTab;
