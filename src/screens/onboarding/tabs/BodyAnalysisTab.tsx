import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { rf } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";
import { AnimatedSection, HeroSection } from "../../../components/ui/aurora";
import { gradients } from "../../../theme/gradients";
import { Camera } from "../../../components/advanced/Camera";
import { ImagePicker } from "../../../components/advanced/ImagePicker";
import {
  BodyAnalysisData,
  PersonalInfoData,
  TabValidationResult,
} from "../../../types/onboarding";
import { useBodyAnalysis } from "../../../hooks/onboarding/useBodyAnalysis";

// Components
import { MeasurementsSection } from "../../../components/onboarding/body/MeasurementsSection";
import { GoalVisualizationSection } from "../../../components/onboarding/body/GoalVisualizationSection";
import { BodyCompositionSection } from "../../../components/onboarding/body/BodyCompositionSection";
import { PhotoAnalysisSection } from "../../../components/onboarding/body/PhotoAnalysisSection";
import { MedicalSection } from "../../../components/onboarding/body/MedicalSection";
import { ValidationSection } from "../../../components/onboarding/shared/ValidationSection";

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
}

const BodyAnalysisTab: React.FC<BodyAnalysisTabProps> = ({
  data,
  personalInfoData,
  validationResult,
  onNext,
  onBack,
  onUpdate,
  isAutoSaving = false,
}) => {
  const {
    formData,
    showCamera,
    setShowCamera,
    showImagePicker,
    setShowImagePicker,
    currentPhotoType,
    isAnalyzingPhotos,
    showMeasurementGuide,
    setShowMeasurementGuide,
    updateField,
    handleNumberInput,
    handlePhotoCapture,
    handleImagePickerSelect,
    openPhotoOptions,
    removePhoto,
    analyzePhotos,
    getBMICategory,
    getFieldError,
    hasFieldError,
  } = useBodyAnalysis({
    data,
    personalInfoData,
    validationResult,
    onUpdate,
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Camera Modal */}
      <Camera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handlePhotoCapture}
        mode="progress"
      />

      {/* Image Picker Modal */}
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
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <HeroSection
            image={{
              uri: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
            }}
            overlayGradient={gradients.overlay.dark}
            contentPosition="center"
            height={200}
          >
            <Text style={styles.title}>Body Analysis</Text>
            <Text style={styles.subtitle}>
              Track your measurements and visualize your progress
            </Text>

            {/* Auto-save Indicator */}
            {isAutoSaving && (
              <View style={styles.autoSaveIndicator}>
                <Ionicons
                  name="save-outline"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.success}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.autoSaveText}>Saving...</Text>
              </View>
            )}
          </HeroSection>

          {/* Form Sections */}
          <View style={styles.content}>
            <AnimatedSection delay={0}>
              <MeasurementsSection
                formData={formData}
                updateField={updateField}
                handleNumberInput={handleNumberInput}
                getFieldError={getFieldError}
                hasFieldError={hasFieldError}
                getBMICategory={getBMICategory}
              />
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <GoalVisualizationSection formData={formData} />
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <BodyCompositionSection
                formData={formData}
                updateField={updateField}
                handleNumberInput={handleNumberInput}
                showMeasurementGuide={showMeasurementGuide}
                setShowMeasurementGuide={setShowMeasurementGuide}
                personalInfoData={personalInfoData}
              />
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <PhotoAnalysisSection
                formData={formData}
                openPhotoOptions={openPhotoOptions}
                removePhoto={removePhoto}
                analyzePhotos={analyzePhotos}
                isAnalyzingPhotos={isAnalyzingPhotos}
              />
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <MedicalSection
                formData={formData}
                updateField={updateField}
                personalInfoData={personalInfoData}
              />
            </AnimatedSection>
          </View>

          {/* Validation Summary */}
          <ValidationSection validationResult={validationResult} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
    marginBottom: ResponsiveTheme.spacing.sm,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: ResponsiveTheme.fontSize.md * 1.5,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },
  autoSaveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: `${ResponsiveTheme.colors.success}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  autoSaveText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  content: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
});

export default BodyAnalysisTab;
