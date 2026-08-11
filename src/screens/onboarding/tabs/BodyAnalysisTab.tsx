import React, { useEffect, useRef } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Camera } from "../../../components/advanced/Camera";
import { ImagePicker } from "../../../components/advanced/ImagePicker";
import {
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import {
  useBodyAnalysis,
  GENDER_MEDIANS,
} from "../../../hooks/onboarding/useBodyAnalysis";
import {
  ScreenScaffold,
  CollapsibleSection,
} from "../../../components/onboarding/fresh";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";
import {
  tokens,
  spacing as freshSpacing,
} from "../../../components/onboarding/fresh/tokens";

// Section components
import { MeasurementsSection } from "../../../components/onboarding/body/MeasurementsSection";
import { GoalVisualizationSection } from "../../../components/onboarding/body/GoalVisualizationSection";
import { BodyCompositionSection } from "../../../components/onboarding/body/BodyCompositionSection";
import { PhotoAnalysisSection } from "../../../components/onboarding/body/PhotoAnalysisSection";
import { MedicalSection } from "../../../components/onboarding/body/MedicalSection";

interface BodyAnalysisTabProps {
  data: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null;
  validationResult?: TabValidationResult;
  onNext: (currentData?: BodyAnalysisData) => void;
  onBack: () => void;
  onUpdate: (data: Partial<BodyAnalysisData>) => void;
  onNavigateToTab?: (tabNumber: number) => void;
  isLoading?: boolean;
  isAutoSaving?: boolean;
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
  /** §4 gender-aware slider defaults. The container passes S1's gender in
   * Phase 2c; until then we fall back to personalInfoData?.gender. */
  gender?: string;
}

const BodyAnalysisTab: React.FC<BodyAnalysisTabProps> = ({
  data,
  personalInfoData,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isEditingFromReview = false,
  onReturnToReview,
  gender,
}) => {
  const {
    formData,
    showCamera,
    setShowCamera,
    showImagePicker,
    setShowImagePicker,
    showMeasurementGuide,
    setShowMeasurementGuide,
    updateField,
    updateFields,
    handlePhotoCapture,
    handleImagePickerSelect,
    openPhotoOptions,
    removePhoto,
    getBMICategory,
    getFieldError,
    hasFieldError,
  } = useBodyAnalysis({
    data,
    personalInfoData,
    validationResult,
    onUpdate,
  });

  // Progressive disclosure: optional sections default to collapsed and persist
  // for the session.
  const [showComposition, setShowComposition] = React.useState(false);
  const [showPhotos, setShowPhotos] = React.useState(false);
  const [showMedical, setShowMedical] = React.useState(false);

  // §4 gender-aware defaults: IF the sliders are still at the untouched
  // neutral "other" default AND a gender is available, swap to the
  // gender-specific median as the starting position. Runs once per gender.
  const effectiveGender = gender || personalInfoData?.gender;
  const genderDefaultsApplied = useRef(false);
  useEffect(() => {
    if (genderDefaultsApplied.current) return;
    if (!effectiveGender) return;
    const m = GENDER_MEDIANS[effectiveGender] ?? GENDER_MEDIANS.other;
    const atNeutralDefault =
      formData.height_cm === GENDER_MEDIANS.other.height &&
      formData.current_weight_kg === GENDER_MEDIANS.other.weight &&
      formData.target_weight_kg === GENDER_MEDIANS.other.target;
    if (atNeutralDefault && m !== GENDER_MEDIANS.other) {
      updateFields({
        height_cm: m.height,
        current_weight_kg: m.weight,
        target_weight_kg: m.target,
      });
    }
    genderDefaultsApplied.current = true;
  }, [
    effectiveGender,
    formData.height_cm,
    formData.current_weight_kg,
    formData.target_weight_kg,
    updateFields,
  ]);

  const isSubmittingRef = useRef(false);

  const handleNext = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      onUpdate(formData);
      if (isEditingFromReview && onReturnToReview) {
        onReturnToReview();
      } else {
        setTimeout(() => onNext(formData), 100);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera Modal — existing capture flow intact */}
      <Camera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handlePhotoCapture}
        mode="progress"
      />

      {/* Image Picker Modal — existing capture flow intact */}
      <ImagePicker
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onImagesSelected={handleImagePickerSelect}
        mode="single"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScreenScaffold
          question="Your body"
          subtext="Just a starting point. Everything updates as you go."
          onBack={onBack}
          onNext={handleNext}
          nextLabel={isEditingFromReview ? "Review" : "Next"}
        >
          <View style={styles.sections}>
            {/* Default visible: measurements + live BMI ring */}
            <MeasurementsSection
              formData={formData}
              updateField={updateField}
              getBMICategory={getBMICategory}
              getFieldError={getFieldError}
              hasFieldError={hasFieldError}
              units={personalInfoData?.units ?? null}
            />

            {/* Default visible: goal ring (target_weight) + timeline */}
            <GoalVisualizationSection
              formData={formData}
              updateField={updateField}
              updateFields={updateFields}
              personalInfoData={personalInfoData}
            />

            {/* Collapsed — "Body composition" (Add details) */}
            <CollapsibleSection
              title="Body composition"
              subtitle="Add details for a sharper analysis"
              expanded={showComposition}
              onToggle={() => setShowComposition((v) => !v)}
              testID="body-composition-section"
            >
              <BodyCompositionSection
                formData={formData}
                updateField={updateField}
                showMeasurementGuide={showMeasurementGuide}
                setShowMeasurementGuide={setShowMeasurementGuide}
                personalInfoData={personalInfoData}
              />
            </CollapsibleSection>

            {/* Collapsed — "Progress photos" (Optional) */}
            <CollapsibleSection
              title="Progress photos"
              subtitle="Optional — AI body-fat estimate"
              expanded={showPhotos}
              onToggle={() => setShowPhotos((v) => !v)}
              testID="progress-photos-section"
            >
              <PhotoAnalysisSection
                formData={formData}
                openPhotoOptions={openPhotoOptions}
                removePhoto={removePhoto}
              />
            </CollapsibleSection>

            {/* Collapsed — "Medical & safety" (Add details) */}
            <CollapsibleSection
              title="Medical & safety"
              subtitle="Add details so we keep recommendations safe"
              expanded={showMedical}
              onToggle={() => setShowMedical((v) => !v)}
              testID="medical-section"
            >
              <MedicalSection
                formData={formData}
                updateField={updateField}
                personalInfoData={personalInfoData}
              />
            </CollapsibleSection>
          </View>

          {/* Validation summary — matches Diet/Workout tabs (fresh design). */}
          <ValidationSection validationResult={validationResult} />
        </ScreenScaffold>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  sections: {
    gap: freshSpacing.sectionGap,
  },
});

export default BodyAnalysisTab;
